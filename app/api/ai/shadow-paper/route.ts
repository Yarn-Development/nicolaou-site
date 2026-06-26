import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { fetchQuery, fetchMutation, api, getConvexUserIdByClerkId } from '@/lib/convex/server'
import type { Id } from '@/convex/_generated/dataModel'
import { sanitize } from '@/lib/question-sanitizer'
import {
  needsDiagram,
  sanitizeSvg,
  buildDiagramSystemPrompt,
} from '@/lib/diagram-utils'
import { uploadSvgToConvex } from '@/lib/convex-svg-upload'
import {
  normalizeGeneratedQuestion,
  qualityGateQuestion,
  safeParseJSON,
} from '@/lib/ai-question-quality'

/**
 * Shadow Paper Generation API
 * 
 * Takes uploaded page image storage ids from Convex storage, extracts questions 
 * using vision AI, then generates new "shadow" questions that test the same 
 * skills but with different numbers/contexts.
 * 
 * Optimized for Vercel deployment:
 * - Processes pages in parallel batches (avoids timeout)
 * - Uses signed URLs instead of downloading full images (avoids 413)
 * - Generates shadow questions in parallel batches
 * 
 * Uses:
 * - Qwen VL for OCR/question extraction
 * - GPT-4o-mini for generating shadow questions
 */

// Allow large payloads and long execution
export const maxDuration = 300 // 5 minutes (Vercel Pro)
export const dynamic = 'force-dynamic'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

// Batch size for parallel processing
const OCR_BATCH_SIZE = 3
const SHADOW_BATCH_SIZE = 5

// =====================================================
// Types
// =====================================================

interface ShadowPaperRequest {
  /** Storage paths for uploaded page images in the 'exam-papers' bucket */
  imagePaths: string[]
  /** Target year for the shadow paper */
  targetYear: string
  /** Target stream (curriculum level) */
  targetStream: string
  /** Class ID to assign the shadow paper to */
  classId: string
  /** Original filename for naming the assignment */
  originalFilename: string
  /** Source mode: ai_only (default) | bank_only | mixed */
  sourceMode?: 'ai_only' | 'bank_only' | 'mixed'
}

interface ExtractedQuestion {
  questionNumber: string
  questionLatex: string
  suggestedTopic: string
  suggestedSubTopic: string
  suggestedMarks: number
  suggestedDifficulty: 'Foundation' | 'Higher'
  pageNumber: number
  hasDiagram: boolean
  diagramDescription?: string
}

interface GeneratedShadowQuestion {
  originalQuestionNumber: string
  questionLatex: string
  topic: string
  subTopic: string
  marks: number
  difficulty: 'Foundation' | 'Higher'
  calculatorAllowed: boolean
  answerKey: {
    answer: string
    explanation: string
  }
  imageUrl?: string | null
}

interface ShadowPaperResponse {
  success: boolean
  data?: {
    assignmentId: string
    assignmentTitle: string
    questionCount: number
    extractedCount: number
    generatedCount: number
  }
  error?: string
  details?: unknown
}

// =====================================================
// Helper: Process array in parallel batches
// =====================================================

async function processBatch<T, R>(
  items: T[],
  batchSize: number,
  processor: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map(processor))
    results.push(...batchResults)
  }
  return results
}

// =====================================================
// Helper: Resolve a served URL for a Convex-stored page image
// =====================================================

async function getStorageUrl(storageId: string): Promise<string | null> {
  try {
    const url = await fetchQuery(api.files.getUrl, { storageId: storageId as Id<'_storage'> })
    if (!url) {
      console.error(`[Shadow Paper] Failed to resolve URL for storageId ${storageId}`)
      return null
    }
    return url
  } catch (err) {
    console.error(`[Shadow Paper] Error resolving URL for storageId ${storageId}:`, err)
    return null
  }
}

// =====================================================
// Helper: Extract questions from a page image
// =====================================================

async function extractQuestionsFromPage(
  imageSource: string,
  pageNumber: number
): Promise<ExtractedQuestion[]> {
  const systemPrompt = `You are an expert OCR system specialized in extracting mathematical questions from UK exam papers (GCSE and A-Level).

Your task is to:
1. Identify ALL distinct questions on the page
2. Extract the complete text of each question
3. Convert mathematical notation to LaTeX format
4. Suggest appropriate topic, sub-topic, marks, and difficulty
5. Detect whether each question has an associated diagram

EXTRACTION RULES:
- Each numbered question (1, 2, 3...) or sub-question (a, b, c... or i, ii, iii...) should be extracted separately
- Preserve the question number exactly as shown (e.g., "1", "2a", "3(b)(ii)")
- Convert ALL mathematical symbols to LaTeX:
  - Fractions: \\frac{num}{denom}
  - Square roots: \\sqrt{x}
  - Powers: x^2, x^{10}
  - Multiplication: \\times
  - Division: \\div
- Use $...$ for inline math and $$...$$ for display math
- If marks are shown (e.g., "[3 marks]" or "(3)"), extract that value
- If a question includes a diagram, figure, or shape on the page: set "hasDiagram": true and provide a one-sentence "diagramDescription" describing what the diagram shows (e.g., "A right-angled triangle ABC with sides 5 cm and 12 cm, hypotenuse marked as x"). If the question text says "the diagram" or "the figure", always set hasDiagram: true.
- If there is no diagram, set "hasDiagram": false and omit "diagramDescription".

You MUST respond with valid JSON only.`

  const userPrompt = `Extract all mathematical questions from this exam paper page (Page ${pageNumber}).

**OUTPUT FORMAT (JSON only):**
{
  "questions": [
    {
      "questionNumber": "1a",
      "questionLatex": "Solve the equation $3x + 7 = 22$",
      "suggestedTopic": "Algebra",
      "suggestedSubTopic": "Linear Equations",
      "suggestedMarks": 2,
      "suggestedDifficulty": "Foundation",
      "hasDiagram": false
    },
    {
      "questionNumber": "2",
      "questionLatex": "Find the value of $x$ in the diagram.",
      "suggestedTopic": "Geometry & Measures",
      "suggestedSubTopic": "Pythagoras' Theorem",
      "suggestedMarks": 3,
      "suggestedDifficulty": "Foundation",
      "hasDiagram": true,
      "diagramDescription": "A right-angled triangle with legs labelled 3 cm and 4 cm, hypotenuse labelled x"
    }
  ]
}

If no questions are found, return: { "questions": [] }
Return ONLY the JSON object.`

  // Determine if the source is a URL or base64 data URL
  const imageContent = imageSource.startsWith('http') 
    ? { type: 'image_url' as const, image_url: { url: imageSource } }
    : { type: 'image_url' as const, image_url: { url: imageSource } }

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      'X-Title': 'Nicolaou Maths - Shadow Paper OCR',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-4-6',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            imageContent,
            { type: 'text', text: userPrompt }
          ]
        }
      ],
      temperature: 0.2,
      max_tokens: 4000,
    }),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '(unreadable)')
    console.error(`[Shadow OCR] Page ${pageNumber} — API ${response.status} ${response.statusText}:`, errText)
    return []
  }

  const data = await response.json()
  const content = data.choices[0]?.message?.content

  if (!content) {
    console.error(`[Shadow OCR] Page ${pageNumber} — empty model response. Full data:`, JSON.stringify(data).slice(0, 500))
    return []
  }

  console.log(`[Shadow OCR] Page ${pageNumber} raw response (first 300 chars):`, content.slice(0, 300))

  const parsed = safeParseJSON(content) as { questions?: ExtractedQuestion[] } | null

  if (!parsed || !parsed.questions || !Array.isArray(parsed.questions)) {
    console.error(`[Shadow OCR] Page ${pageNumber} — JSON parse failure. Raw:`, content.slice(0, 400))
    return []
  }

  return parsed.questions.map((q: ExtractedQuestion) => ({
    ...q,
    pageNumber,
    suggestedMarks: q.suggestedMarks || 2,
    suggestedDifficulty: q.suggestedDifficulty || 'Foundation',
    hasDiagram: Boolean(q.hasDiagram),
    diagramDescription: q.diagramDescription || undefined,
  }))
}

// =====================================================
// Helper: Generate a shadow question from original
// =====================================================

async function generateShadowQuestion(
  original: ExtractedQuestion,
  targetStream: string
): Promise<GeneratedShadowQuestion | null> {
  const requiresDiagram = original.hasDiagram || needsDiagram(original.suggestedTopic, original.suggestedSubTopic)

  if (requiresDiagram) {
    return await generateShadowQuestionWithDiagram(original, targetStream)
  }
  return await generateShadowQuestionTextOnly(original, targetStream)
}

// ── Shadow question WITH diagram (Claude Haiku) ──────────────────────────────

async function generateShadowQuestionWithDiagram(
  original: ExtractedQuestion,
  targetStream: string
): Promise<GeneratedShadowQuestion | null> {
  const userPrompt = `Create a shadow question WITH SVG diagram based on this original:

**ORIGINAL QUESTION:**
${original.questionLatex}
${original.diagramDescription ? `\n**ORIGINAL DIAGRAM:** ${original.diagramDescription}` : ''}

**METADATA:**
- Question Number: ${original.questionNumber}
- Topic: ${original.suggestedTopic}
- Sub-Topic: ${original.suggestedSubTopic}
- Marks: ${original.suggestedMarks}
- Difficulty: ${original.suggestedDifficulty}
- Target Stream: ${targetStream}

**REQUIREMENTS:**
- Write in the precise, clinical style of Pearson Edexcel papers
- British English (metres not meters)
- Every piece of information needed to solve the question must be stated explicitly
- Use DIFFERENT numerical values from the original that still give clean answers
- The SVG diagram must show a DIFFERENT but similar geometric configuration
- All given values must appear in the diagram; unknown value (x or θ) marked in both

**OUTPUT FORMAT (JSON only, no markdown):**
{
  "questionLatex": "The new question in LaTeX format",
  "svg_markup": "<svg viewBox=\\"0 0 400 400\\" ...>...</svg>",
  "answerKey": {
    "answer": "The final answer",
    "explanation": "Step-by-step solution"
  },
  "calculatorAllowed": true,
  "diagram_description": "One sentence describing the new diagram"
}

Return ONLY the JSON object.`

  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'Nicolaou Maths - Shadow Diagram Generator',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4-6',
        messages: [
          { role: 'system', content: buildDiagramSystemPrompt() },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    })

    if (!response.ok) {
      console.warn('[Shadow Diagram] API error for Q', original.questionNumber)
      return null
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content
    if (!content) return null

    const parsed = safeParseJSON(content) as {
      questionLatex?: string
      svg_markup?: string
      answerKey?: { answer?: string; explanation?: string }
      calculatorAllowed?: boolean
    } | null

    if (!parsed || !parsed.questionLatex) {
      console.error('[Shadow Diagram] Parse failure for Q', original.questionNumber)
      return null
    }

    const normalized = normalizeGeneratedQuestion(parsed)
    normalized.marks = original.suggestedMarks
    const gated = await qualityGateQuestion(normalized, {
      expectedMarks: original.suggestedMarks,
      hasDiagram: true,
      runMathValidation: true,
      apiKey: OPENROUTER_API_KEY,
    })
    if (!gated.ok) {
      console.warn(`[Shadow Diagram] Q${original.questionNumber} failed quality gate:`, gated.issues)
      return null
    }

    // Upload SVG if present and valid
    let imageUrl: string | null = null
    if (parsed.svg_markup) {
      const sanitized = sanitizeSvg(parsed.svg_markup)
      if (sanitized.valid) {
        imageUrl = await uploadSvgToConvex(sanitized.svg)
      } else {
        console.warn('[Shadow Diagram] SVG sanitization failed for Q', original.questionNumber, sanitized.errors)
      }
    }
    if (!imageUrl) {
      console.warn('[Shadow Diagram] No usable SVG for Q', original.questionNumber)
      return null
    }

    return {
      originalQuestionNumber: original.questionNumber,
      questionLatex: gated.question.questionLatex,
      topic: original.suggestedTopic,
      subTopic: original.suggestedSubTopic,
      marks: original.suggestedMarks,
      difficulty: original.suggestedDifficulty,
      calculatorAllowed: parsed.calculatorAllowed ?? true,
      answerKey: {
        answer: gated.question.answer,
        explanation: gated.question.explanation,
      },
      imageUrl,
    }
  } catch (error) {
    console.error('[Shadow Diagram] Error for Q', original.questionNumber, error)
    return null
  }
}

// ── Shadow question text-only (GPT-4o-mini) ─────────────────────────────────

async function generateShadowQuestionTextOnly(
  original: ExtractedQuestion,
  targetStream: string
): Promise<GeneratedShadowQuestion | null> {
  const isALevel = targetStream.toLowerCase().includes('a level') || targetStream.toLowerCase().includes('a-level') || targetStream.toLowerCase().includes('as level')
  const levelDescriptor = isALevel ? 'A Level Mathematics' : 'GCSE Mathematics'
  const systemPrompt = `You are an expert UK ${levelDescriptor} exam question writer for Pearson Edexcel. Create a "shadow" question — a NEW question that tests the EXACT SAME mathematical skill as the original, but with different numbers, contexts, and variable names.

CRITICAL REQUIREMENTS — Your question MUST be indistinguishable from a real Edexcel exam question:

LANGUAGE & TONE:
1. Write in the precise, clinical style of Edexcel papers — clear, unambiguous, no filler words
2. Use British English spelling and conventions (e.g., "metres" not "meters", "favourite" not "favorite")
3. Use everyday British names and contexts (e.g., "Priya", "Tom", "Mrs Ahmed", shops, journeys in the UK)
4. Every piece of information needed to solve the question must be stated explicitly

MATHEMATICAL NOTATION:
5. Wrap ALL mathematical expressions in dollar signs: $3x + 7 = 22$
6. For display equations use double dollars: $$\\frac{x}{5} = 2\\frac{1}{2}$$
7. Use \\textbf{} for bold emphasis (e.g., \\textbf{all}, \\textbf{NOT})
8. Numbers should give "clean" answers (no messy decimals for Foundation tier)

STRUCTURE:
9. Match the original's mark allocation exactly
10. Include part labels (a), (b), (c) if the original has them
11. End multi-step questions with "You must show your working" or "Show that..." where appropriate
12. If the original asks "Is X correct? You must show how you get your answer." — keep this format

You MUST respond with valid JSON only.`

  const userPrompt = `Create a shadow question based on this original:

**ORIGINAL QUESTION:**
${original.questionLatex}

**METADATA:**
- Question Number: ${original.questionNumber}
- Topic: ${original.suggestedTopic}
- Sub-Topic: ${original.suggestedSubTopic}
- Marks: ${original.suggestedMarks}
- Difficulty: ${original.suggestedDifficulty}
- Target Stream: ${targetStream}

**OUTPUT FORMAT (JSON only):**
{
  "questionLatex": "The new question in LaTeX format",
  "answerKey": {
    "answer": "The final answer",
    "explanation": "Step-by-step solution"
  },
  "calculatorAllowed": true
}

Generate the shadow question now. Return ONLY the JSON object.`

  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'Nicolaou Maths - Shadow Question Generator',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4-6',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      console.error('Shadow generation failed for question', original.questionNumber)
      return null
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content
    if (!content) return null

    const parsed = safeParseJSON(content) as {
      questionLatex?: string
      answerKey?: { answer?: string; explanation?: string }
      calculatorAllowed?: boolean
    } | null

    if (!parsed || !parsed.questionLatex) {
      console.error('Failed to parse shadow question response for question', original.questionNumber)
      return null
    }

    const normalized = normalizeGeneratedQuestion(parsed)
    normalized.marks = original.suggestedMarks
    const gated = await qualityGateQuestion(normalized, {
      expectedMarks: original.suggestedMarks,
      hasDiagram: false,
      runMathValidation: true,
      apiKey: OPENROUTER_API_KEY,
    })
    if (!gated.ok) {
      console.warn(`[shadow] Q${original.questionNumber} failed quality gate:`, gated.issues)
      return null
    }

    return {
      originalQuestionNumber: original.questionNumber,
      questionLatex: gated.question.questionLatex,
      topic: original.suggestedTopic,
      subTopic: original.suggestedSubTopic,
      marks: original.suggestedMarks,
      difficulty: original.suggestedDifficulty,
      calculatorAllowed: parsed.calculatorAllowed ?? true,
      answerKey: {
        answer: gated.question.answer,
        explanation: gated.question.explanation,
      },
      imageUrl: null,
    }
  } catch (error) {
    console.error('Error generating shadow question:', error)
    return null
  }
}

// =====================================================
// Main Handler
// =====================================================

export async function POST(request: NextRequest): Promise<NextResponse<ShadowPaperResponse>> {
  try {
    // Verify API key
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'OpenRouter API key not configured' },
        { status: 500 }
      )
    }

    // Verify user authentication
    const authUser = await getAuthUser()

    if (!authUser?.clerkId) {
      return NextResponse.json(
        { success: false, error: 'You must be logged in' },
        { status: 401 }
      )
    }

    // Verify teacher role
    if (authUser.role !== 'teacher') {
      return NextResponse.json(
        { success: false, error: 'Only teachers can generate shadow papers' },
        { status: 403 }
      )
    }

    const teacherId = await getConvexUserIdByClerkId(authUser.clerkId)
    if (!teacherId) {
      return NextResponse.json(
        { success: false, error: 'You must be logged in' },
        { status: 401 }
      )
    }

    const body = await request.json() as ShadowPaperRequest

    // Validate required fields
    if (!body.imagePaths || body.imagePaths.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one page image is required' },
        { status: 400 }
      )
    }

    if (!body.targetYear || !body.targetStream) {
      return NextResponse.json(
        { success: false, error: 'Target year and stream are required' },
        { status: 400 }
      )
    }

    if (!body.classId) {
      return NextResponse.json(
        { success: false, error: 'Class ID is required' },
        { status: 400 }
      )
    }

    // Verify teacher owns the class
    const classData = await fetchQuery(api.classes.getClass, {
      classId: body.classId as Id<'classes'>,
      teacherId,
    })

    if (!classData) {
      return NextResponse.json(
        { success: false, error: 'Class not found or you do not have permission to create assignments for this class' },
        { status: 404 }
      )
    }

    const { imagePaths, targetYear, targetStream, classId, originalFilename, sourceMode = 'ai_only' } = body

    // ---- Step 1: Resolve served URLs for all page images (Convex storage) ----
    console.log(`[Shadow Paper] Resolving URLs for ${imagePaths.length} pages...`)

    const signedUrls: { url: string; pageNumber: number }[] = []
    for (let i = 0; i < imagePaths.length; i++) {
      const url = await getStorageUrl(imagePaths[i])
      if (url) {
        signedUrls.push({ url, pageNumber: i + 1 })
      }
    }

    if (signedUrls.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Failed to access uploaded page images' },
        { status: 500 }
      )
    }

    // ---- Step 2: Extract questions from pages in parallel batches ----
    console.log(`[Shadow Paper] Extracting questions from ${signedUrls.length} pages (batch size: ${OCR_BATCH_SIZE})...`)
    
    const extractionResults = await processBatch(
      signedUrls,
      OCR_BATCH_SIZE,
      async ({ url, pageNumber }) => extractQuestionsFromPage(url, pageNumber)
    )
    
    const allExtractedQuestions = extractionResults.flat()

    // Clean up uploaded images from storage (fire-and-forget)
    Promise.all(
      imagePaths.map((storageId) =>
        fetchMutation(api.files.remove, { storageId: storageId as Id<'_storage'> })
      )
    )
      .then(() => console.log(`[Shadow Paper] Cleaned up ${imagePaths.length} storage files`))
      .catch((error) =>
        console.error('[Shadow Paper] Failed to clean up storage files:', error)
      )

    console.log(`[Shadow Paper] Extracted ${allExtractedQuestions.length} questions`)

    if (allExtractedQuestions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No questions could be extracted from the uploaded document' },
        { status: 400 }
      )
    }

    // ---- Step 3: Build shadow questions (AI / Bank / Mixed) ----
    console.log(`[Shadow Paper] Source mode: ${sourceMode}. Extracted ${allExtractedQuestions.length} questions.`)

    // Helper: fetch bank questions matching extracted topics
    const fetchBankQuestions = async (count: number): Promise<GeneratedShadowQuestion[]> => {
      const topics = [...new Set(allExtractedQuestions.map(q => q.suggestedTopic).filter(Boolean))]
      const subTopics = [...new Set(allExtractedQuestions.map(q => q.suggestedSubTopic).filter(Boolean))]

      const bankRows = await fetchQuery(api.questions.getBankQuestionsForShadow, {
        level: targetStream,
        topics: topics.length > 0 ? topics : undefined,
        limit: count * 3,
      })

      // Shuffle and take what we need
      const shuffled = [...bankRows].sort(() => Math.random() - 0.5).slice(0, count)

      return shuffled.map((row, idx) => ({
        originalQuestionNumber: `B${idx + 1}`,
        questionLatex: row.questionLatex || '',
        topic: row.topic || subTopics[idx % Math.max(subTopics.length, 1)] || 'Mathematics',
        subTopic: row.subTopic || '',
        marks: row.marks || 4,
        difficulty: (targetStream.includes('Foundation') ? 'Foundation' : 'Higher') as 'Foundation' | 'Higher',
        calculatorAllowed: row.calculatorAllowed ?? true,
        answerKey: {
          answer: (row.answerKey as { answer?: string })?.answer || '',
          explanation: (row.answerKey as { explanation?: string })?.explanation || '',
        },
        imageUrl: null,
      }))
    }

    let shadowQuestions: GeneratedShadowQuestion[] = []

    if (sourceMode === 'bank_only') {
      // Pull all from bank
      shadowQuestions = await fetchBankQuestions(allExtractedQuestions.length)
      if (shadowQuestions.length === 0) {
        console.warn('[Shadow Paper] Bank returned no matching questions — falling back to AI mode')
        const results = await processBatch(allExtractedQuestions, SHADOW_BATCH_SIZE, async (q) => generateShadowQuestion(q, targetStream))
        shadowQuestions = results.filter((q): q is GeneratedShadowQuestion => q !== null)
      }
    } else if (sourceMode === 'mixed') {
      // Half from bank, half AI-generated
      const bankCount = Math.ceil(allExtractedQuestions.length / 2)
      const aiCount = allExtractedQuestions.length - bankCount
      const [bankQs, aiResults] = await Promise.all([
        fetchBankQuestions(bankCount),
        processBatch(allExtractedQuestions.slice(0, aiCount), SHADOW_BATCH_SIZE, async (q) => generateShadowQuestion(q, targetStream)),
      ])
      shadowQuestions = [...bankQs, ...aiResults.filter((q): q is GeneratedShadowQuestion => q !== null)]
    } else {
      // ai_only (default)
      const shadowResults = await processBatch(
        allExtractedQuestions,
        SHADOW_BATCH_SIZE,
        async (original) => generateShadowQuestion(original, targetStream)
      )
      shadowQuestions = shadowResults.filter((q): q is GeneratedShadowQuestion => q !== null)
    }

    console.log(`[Shadow Paper] Generated ${shadowQuestions.length} shadow questions`)

    if (shadowQuestions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate shadow questions' },
        { status: 500 }
      )
    }

    // ---- Step 4: Save shadow questions to the question bank ----
    const questionIds: Id<'questions'>[] = []
    const difficulty = targetStream.includes('Foundation') ? 'Foundation' : 'Higher'

    console.log(`[Shadow Paper] Saving ${shadowQuestions.length} questions to bank...`)

    for (const sq of shadowQuestions) {
      try {
        const id = await fetchMutation(api.questions.createQuestion, {
          createdBy: teacherId,
          contentType: sq.imageUrl ? 'synthetic_image' : 'generated_text',
          questionLatex: sanitize(sq.questionLatex),
          imageUrl: sq.imageUrl || undefined,
          examBoard: 'Edexcel',
          topic: sq.topic,
          subTopic: sq.subTopic,
          level: targetStream,
          difficulty,
          marks: sq.marks,
          calculatorAllowed: sq.calculatorAllowed,
          answerKey: {
            answer: sanitize(sq.answerKey.answer),
            explanation: sanitize(sq.answerKey.explanation),
            type: 'ai_generated',
          },
          tags: ['shadow_paper', `source_q${sq.originalQuestionNumber}`],
        })
        questionIds.push(id as Id<'questions'>)
      } catch (insertError) {
        console.error('[Shadow Paper] Question insert failed:', insertError)
      }
    }

    console.log(`[Shadow Paper] Successfully saved ${questionIds.length}/${shadowQuestions.length} questions`)

    // ---- Step 5: Create an assignment with all the shadow questions ----
    const baseFilename = (originalFilename || 'Past Paper')
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/[^a-zA-Z0-9\s]/g, ' ') // Clean special chars
      .trim() || 'Past Paper'

    const assignmentTitle = `Shadow of ${baseFilename} (${targetYear})`

    const created = await fetchMutation(api.assignments.createAssignmentFull, {
      classId: classId as Id<'classes'>,
      teacherId,
      title: assignmentTitle,
      mode: 'paper',
      status: 'draft',
      questionIds,
      metadata: {
        assignment_type: 'shadow_paper',
        question_ids: questionIds,
        description: `AI-generated shadow paper based on ${baseFilename}`,
      },
    })

    if (!created || 'error' in created) {
      console.error('Failed to create assignment:', created)
      return NextResponse.json(
        { success: false, error: 'Failed to create assignment' },
        { status: 500 }
      )
    }

    console.log(`[Shadow Paper] Successfully linked ${questionIds.length} questions to assignment`)

    return NextResponse.json({
      success: true,
      data: {
        assignmentId: created.assignmentId as string,
        assignmentTitle,
        questionCount: questionIds.length,
        extractedCount: allExtractedQuestions.length,
        generatedCount: shadowQuestions.length
      }
    })

  } catch (error) {
    console.error('Shadow paper generation error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate shadow paper',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
