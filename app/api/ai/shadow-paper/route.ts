import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitize } from '@/lib/question-sanitizer'

/**
 * Shadow Paper Generation API
 * 
 * Takes uploaded page image paths from Supabase Storage, extracts questions 
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
// Helper: Safe JSON parsing with LaTeX escape handling
// =====================================================

function safeParseJSON(content: string): unknown | null {
  // Remove markdown code blocks
  const cleaned = content
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()

  // First attempt: try parsing as-is
  try {
    return JSON.parse(cleaned)
  } catch {
    // Continue to cleanup attempts
  }

  // Second attempt: Fix common LaTeX escape issues
  try {
    const latexFixed = cleaned
      .replace(/(?<!\\)\\(?!\\|"|n|r|t|b|f|u[0-9a-fA-F]{4})/g, '\\\\')
    
    return JSON.parse(latexFixed)
  } catch {
    // Continue to more aggressive cleanup
  }

  // Third attempt: More aggressive cleaning
  try {
    const aggressive = cleaned
      .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .replace(/\n/g, '\\n')
      .replace(/\t/g, '\\t')
    
    return JSON.parse(aggressive)
  } catch {
    // Continue to final attempt
  }

  // Fourth attempt: Try to extract JSON object using regex
  try {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const extracted = jsonMatch[0]
        .replace(/(?<!\\)\\(?!\\|"|n|r|t|b|f|u[0-9a-fA-F]{4})/g, '\\\\')
      return JSON.parse(extracted)
    }
  } catch {
    // All attempts failed
  }

  console.error('All JSON parsing attempts failed for content:', content.substring(0, 200))
  return null
}

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
}

interface ExtractedQuestion {
  questionNumber: string
  questionLatex: string
  suggestedTopic: string
  suggestedSubTopic: string
  suggestedMarks: number
  suggestedDifficulty: 'Foundation' | 'Higher'
  pageNumber: number
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
// Helper: Get signed URL for a storage file
// =====================================================

async function getSignedUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('exam-papers')
    .createSignedUrl(path, 600) // 10-minute expiry

  if (error || !data?.signedUrl) {
    console.error(`[Shadow Paper] Failed to get signed URL for ${path}:`, error?.message)
    return null
  }
  return data.signedUrl
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
      "suggestedDifficulty": "Foundation"
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
      model: 'qwen/qwen-2.5-vl-7b-instruct',
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
    console.error(`OCR extraction failed for page ${pageNumber}:`, response.status, response.statusText)
    return []
  }

  const data = await response.json()
  const content = data.choices[0]?.message?.content

  if (!content) return []

  const parsed = safeParseJSON(content) as { questions?: ExtractedQuestion[] } | null
  
  if (!parsed || !parsed.questions || !Array.isArray(parsed.questions)) {
    console.error('Failed to parse OCR response for page', pageNumber)
    return []
  }

  return parsed.questions.map((q: ExtractedQuestion) => ({
    ...q,
    pageNumber,
    suggestedMarks: q.suggestedMarks || 2,
    suggestedDifficulty: q.suggestedDifficulty || 'Foundation'
  }))
}

// =====================================================
// Helper: Generate a shadow question from original
// =====================================================

async function generateShadowQuestion(
  original: ExtractedQuestion,
  targetStream: string
): Promise<GeneratedShadowQuestion | null> {
  const systemPrompt = `You are an expert UK GCSE Mathematics exam question writer for Pearson Edexcel. Create a "shadow" question — a NEW question that tests the EXACT SAME mathematical skill as the original, but with different numbers, contexts, and variable names.

CRITICAL REQUIREMENTS — Your question MUST be indistinguishable from a real Edexcel exam question:

LANGUAGE & TONE:
1. Write in the precise, clinical style of Edexcel papers — clear, unambiguous, no filler words
2. Use British English spelling and conventions (e.g., "metres" not "meters", "favourite" not "favorite")
3. Use everyday British names and contexts (e.g., "Priya", "Tom", "Mrs Ahmed", shops, journeys in the UK)
4. Every piece of information needed to solve the question must be stated explicitly
5. If the question requires a diagram, describe it textually (e.g., "Here is a right-angled triangle with sides labelled...")

MATHEMATICAL NOTATION:
6. Wrap ALL mathematical expressions in dollar signs: $3x + 7 = 22$
7. For display equations use double dollars: $$\\frac{x}{5} = 2\\frac{1}{2}$$
8. Use \\textbf{} for bold emphasis (e.g., \\textbf{all}, \\textbf{NOT})
9. Numbers should give "clean" answers (no messy decimals for Foundation tier)

STRUCTURE:
10. Match the original's mark allocation exactly
11. Include part labels (a), (b), (c) if the original has them
12. End multi-step questions with "You must show your working" or "Show that..." where appropriate
13. If the original asks "Is X correct? You must show how you get your answer." — keep this format

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
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
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

    return {
      originalQuestionNumber: original.questionNumber,
      questionLatex: parsed.questionLatex,
      topic: original.suggestedTopic,
      subTopic: original.suggestedSubTopic,
      marks: original.suggestedMarks,
      difficulty: original.suggestedDifficulty,
      calculatorAllowed: parsed.calculatorAllowed ?? true,
      answerKey: {
        answer: parsed.answerKey?.answer || '',
        explanation: parsed.answerKey?.explanation || ''
      }
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
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'You must be logged in' },
        { status: 401 }
      )
    }

    // Verify teacher role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'teacher') {
      return NextResponse.json(
        { success: false, error: 'Only teachers can generate shadow papers' },
        { status: 403 }
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
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, name, teacher_id')
      .eq('id', body.classId)
      .single()

    if (classError || !classData) {
      return NextResponse.json(
        { success: false, error: 'Class not found' },
        { status: 404 }
      )
    }

    if (classData.teacher_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to create assignments for this class' },
        { status: 403 }
      )
    }

    const { imagePaths, targetYear, targetStream, classId, originalFilename } = body

    // ---- Step 1: Get signed URLs for all pages (avoids downloading full images) ----
    console.log(`[Shadow Paper] Getting signed URLs for ${imagePaths.length} pages...`)
    
    const signedUrls: { url: string; pageNumber: number }[] = []
    for (let i = 0; i < imagePaths.length; i++) {
      const url = await getSignedUrl(supabase, imagePaths[i])
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
    supabase.storage
      .from('exam-papers')
      .remove(imagePaths)
      .then(({ error }) => {
        if (error) console.error('[Shadow Paper] Failed to clean up storage files:', error.message)
        else console.log(`[Shadow Paper] Cleaned up ${imagePaths.length} storage files`)
      })

    console.log(`[Shadow Paper] Extracted ${allExtractedQuestions.length} questions`)

    if (allExtractedQuestions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No questions could be extracted from the uploaded document' },
        { status: 400 }
      )
    }

    // ---- Step 3: Generate shadow questions in parallel batches ----
    console.log(`[Shadow Paper] Generating ${allExtractedQuestions.length} shadow questions (batch size: ${SHADOW_BATCH_SIZE})...`)
    
    const shadowResults = await processBatch(
      allExtractedQuestions,
      SHADOW_BATCH_SIZE,
      async (original) => generateShadowQuestion(original, targetStream)
    )
    
    const shadowQuestions = shadowResults.filter((q): q is GeneratedShadowQuestion => q !== null)

    console.log(`[Shadow Paper] Generated ${shadowQuestions.length} shadow questions`)

    if (shadowQuestions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate shadow questions' },
        { status: 500 }
      )
    }

    // ---- Step 4: Save shadow questions to the question bank ----
    const questionIds: string[] = []
    const difficulty = targetStream.includes('Foundation') ? 'Foundation' : 'Higher'

    console.log(`[Shadow Paper] Saving ${shadowQuestions.length} questions to bank...`)

    // Batch insert questions (5 at a time to avoid hitting DB limits)
    for (let i = 0; i < shadowQuestions.length; i += 5) {
      const batch = shadowQuestions.slice(i, i + 5)
      const insertData = batch.map(sq => ({
        created_by: user.id,
        content_type: 'generated_text' as const,
        question_latex: sanitize(sq.questionLatex),
        topic: sq.topic,
        sub_topic: sq.subTopic,
        curriculum_level: targetStream,
        difficulty: difficulty,
        marks: sq.marks,
        calculator_allowed: sq.calculatorAllowed,
        is_verified: false,
        answer_key: {
          answer: sanitize(sq.answerKey.answer),
          explanation: sanitize(sq.answerKey.explanation),
          type: 'ai_generated'
        },
        meta_tags: ['shadow_paper', `source_q${sq.originalQuestionNumber}`]
      }))

      const { data: questions, error: insertError } = await supabase
        .from('questions')
        .insert(insertData)
        .select('id')

      if (insertError) {
        console.error(`[Shadow Paper] Batch insert failed:`, insertError.message)
      } else if (questions) {
        questionIds.push(...questions.map(q => q.id))
      }
    }

    console.log(`[Shadow Paper] Successfully saved ${questionIds.length}/${shadowQuestions.length} questions`)

    // ---- Step 5: Create an assignment with all the shadow questions ----
    const baseFilename = originalFilename
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/[^a-zA-Z0-9\s]/g, ' ') // Clean special chars
      .trim()
    
    const assignmentTitle = `Shadow of ${baseFilename} (${targetYear})`

    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .insert({
        class_id: classId,
        title: assignmentTitle,
        status: 'draft',
        mode: 'paper',
        assignment_type: 'shadow_paper',
        content: {
          question_ids: questionIds,
          description: `AI-generated shadow paper based on ${baseFilename}`,
        },
      })
      .select('id')
      .single()

    if (assignmentError || !assignment) {
      console.error('Failed to create assignment:', assignmentError)
      return NextResponse.json(
        { success: false, error: 'Failed to create assignment' },
        { status: 500 }
      )
    }

    // Link questions to assignment
    const assignmentQuestions = questionIds.map((qId, index) => ({
      assignment_id: assignment.id,
      question_id: qId,
      order_index: index,
    }))

    const { error: linkError } = await supabase
      .from('assignment_questions')
      .insert(assignmentQuestions)

    if (linkError) {
      console.error('Failed to link questions to assignment:', linkError)
    } else {
      console.log(`[Shadow Paper] Successfully linked ${assignmentQuestions.length} questions to assignment`)
    }

    return NextResponse.json({
      success: true,
      data: {
        assignmentId: assignment.id,
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
