import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Shadow Paper Generation API
 * 
 * Takes a PDF page image, extracts questions using vision AI,
 * then generates new "shadow" questions that test the same skills
 * but with different numbers/contexts.
 * 
 * Uses:
 * - Qwen VL for OCR/question extraction
 * - GPT for generating shadow questions
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

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
  // The AI often outputs LaTeX with single backslashes that aren't properly escaped
  try {
    // Fix unescaped backslashes in common LaTeX commands
    // We need to be careful not to break already-escaped sequences
    const latexFixed = cleaned
      // Replace single backslashes followed by LaTeX commands with double backslashes
      // But only if they're not already escaped
      .replace(/(?<!\\)\\(?!\\|"|n|r|t|b|f|u[0-9a-fA-F]{4})/g, '\\\\')
    
    return JSON.parse(latexFixed)
  } catch {
    // Continue to more aggressive cleanup
  }

  // Third attempt: More aggressive cleaning
  try {
    const aggressive = cleaned
      // Remove control characters except newlines in strings
      .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Fix newlines that might be inside strings (convert to escaped)
      .replace(/\n/g, '\\n')
      // Fix tabs
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
  /** Base64 encoded images of PDF pages */
  pageImages: string[]
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
// Helper: Extract questions from a page image
// =====================================================

async function extractQuestionsFromPage(
  imageData: string,
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
            {
              type: 'image_url',
              image_url: { url: imageData }
            },
            { type: 'text', text: userPrompt }
          ]
        }
      ],
      temperature: 0.2,
      max_tokens: 4000,
    }),
  })

  if (!response.ok) {
    console.error('OCR extraction failed for page', pageNumber)
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
  const systemPrompt = `You are an expert UK mathematics question generator. Your task is to create a "shadow" question - a NEW question that tests the EXACT SAME mathematical skill as the original, but with:
1. Different numbers and values
2. Different context (if applicable)
3. Different variable names
4. Similar difficulty and format

The new question should be indistinguishable from a real exam question.

IMPORTANT:
- Maintain the exact same mathematical concept being tested
- Ensure the answer is a "nice" number (no complex decimals for Foundation)
- Use proper LaTeX notation
- Provide a complete step-by-step solution

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

**REQUIREMENTS:**
1. Create a NEW question testing the SAME skill
2. Use DIFFERENT numbers that give clean answers
3. If there's a context (word problem), use a DIFFERENT but similar context
4. Provide a complete solution with working

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
    if (!body.pageImages || body.pageImages.length === 0) {
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

    const { pageImages, targetYear, targetStream, classId, originalFilename } = body

    // Step 1: Extract questions from all pages
    console.log(`[Shadow Paper] Extracting questions from ${pageImages.length} pages...`)
    
    const allExtractedQuestions: ExtractedQuestion[] = []
    
    for (let i = 0; i < pageImages.length; i++) {
      const pageQuestions = await extractQuestionsFromPage(pageImages[i], i + 1)
      allExtractedQuestions.push(...pageQuestions)
    }

    console.log(`[Shadow Paper] Extracted ${allExtractedQuestions.length} questions`)

    if (allExtractedQuestions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No questions could be extracted from the uploaded document' },
        { status: 400 }
      )
    }

    // Step 2: Generate shadow questions for each extracted question
    console.log('[Shadow Paper] Generating shadow questions...')
    
    const shadowQuestions: GeneratedShadowQuestion[] = []
    
    for (const original of allExtractedQuestions) {
      const shadow = await generateShadowQuestion(original, targetStream)
      if (shadow) {
        shadowQuestions.push(shadow)
      }
    }

    console.log(`[Shadow Paper] Generated ${shadowQuestions.length} shadow questions`)

    if (shadowQuestions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate shadow questions' },
        { status: 500 }
      )
    }

    // Step 3: Save shadow questions to the question bank
    const questionIds: string[] = []
    const difficulty = targetStream.includes('Foundation') ? 'Foundation' : 'Higher'

    console.log(`[Shadow Paper] Saving ${shadowQuestions.length} questions to bank...`)

    for (const sq of shadowQuestions) {
      const { data: question, error: insertError } = await supabase
        .from('questions')
        .insert({
          created_by: user.id,
          content_type: 'generated_text',
          question_latex: sq.questionLatex,
          topic: sq.topic,
          sub_topic: sq.subTopic,
          curriculum_level: targetStream,
          difficulty: difficulty,
          marks: sq.marks,
          calculator_allowed: sq.calculatorAllowed,
          is_verified: false,
          answer_key: {
            answer: sq.answerKey.answer,
            explanation: sq.answerKey.explanation,
            type: 'ai_generated'
          },
          meta_tags: ['shadow_paper', `source_q${sq.originalQuestionNumber}`]
        })
        .select('id')
        .single()

      if (insertError) {
        console.error(`[Shadow Paper] Failed to insert question ${sq.originalQuestionNumber}:`, insertError.message)
      } else if (question) {
        questionIds.push(question.id)
      }
    }

    console.log(`[Shadow Paper] Successfully saved ${questionIds.length}/${shadowQuestions.length} questions`)

    // Step 4: Create an assignment with all the shadow questions
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
      // Don't fail the whole request - the assignment was created with question_ids in content
      // The fallback in getAssignmentDetails should pick them up
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
