import { NextRequest, NextResponse } from 'next/server'

/**
 * Extract Questions from PDF Page Image API
 * 
 * Takes a base64-encoded image of a PDF page and extracts
 * mathematical questions using Qwen VL (free tier via OpenRouter).
 * 
 * Note: PDF to image conversion is done client-side using pdf.js
 * This endpoint receives individual page images.
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

// =====================================================
// Types
// =====================================================

interface ExtractPdfRequest {
  /** Base64 encoded image of a PDF page OR a URL to the image */
  imageData: string
  /** Page number for tracking */
  pageNumber: number
  /** Whether this is a base64 string or URL */
  isBase64?: boolean
}

interface ExtractedQuestion {
  questionNumber: string
  questionLatex: string
  suggestedTopic: string
  suggestedSubTopic: string
  suggestedMarks: number
  suggestedDifficulty: 'Foundation' | 'Higher'
}

interface ExtractPdfResponse {
  success: boolean
  data?: {
    pageNumber: number
    questions: ExtractedQuestion[]
  }
  error?: string
  details?: unknown
}

// =====================================================
// Main Handler
// =====================================================

export async function POST(request: NextRequest): Promise<NextResponse<ExtractPdfResponse>> {
  try {
    // Verify API key
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'OpenRouter API key not configured' },
        { status: 500 }
      )
    }

    const body = await request.json() as ExtractPdfRequest

    // Validate required fields
    if (!body.imageData) {
      return NextResponse.json(
        { success: false, error: 'imageData is required' },
        { status: 400 }
      )
    }

    const pageNumber = body.pageNumber || 1
    const isBase64 = body.isBase64 !== false // default to true

    // Prepare image URL for the API
    let imageUrl: string
    if (isBase64) {
      // Ensure proper data URL format
      if (body.imageData.startsWith('data:')) {
        imageUrl = body.imageData
      } else {
        imageUrl = `data:image/png;base64,${body.imageData}`
      }
    } else {
      imageUrl = body.imageData
    }

    // Build the prompt for question extraction
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
  - Inequalities: \\leq, \\geq, <, >
  - Greek letters: \\pi, \\theta, etc.
- Use $...$ for inline math and $$...$$ for display math
- If marks are shown (e.g., "[3 marks]" or "(3)"), extract that value
- If no marks shown, estimate based on question complexity

TOPIC CLASSIFICATION:
Common topics: Algebra, Number, Geometry, Statistics, Probability, Ratio & Proportion, Trigonometry, Calculus
Common sub-topics vary by topic (e.g., for Algebra: Linear Equations, Quadratics, Simultaneous Equations, etc.)

DIFFICULTY:
- Foundation: Basic skills, straightforward application
- Higher: Complex multi-step, abstract reasoning, proofs

You MUST respond with valid JSON only, no additional text or markdown.`

    const userPrompt = `Extract all mathematical questions from this exam paper page (Page ${pageNumber}).

For each question found, provide:
1. The exact question number as shown
2. The complete question text in LaTeX format
3. Suggested topic and sub-topic
4. Estimated marks (if visible, or best estimate)
5. Suggested difficulty (Foundation or Higher)

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

If no questions are found on this page (e.g., it's a cover page or blank), return:
{
  "questions": []
}

Extract all questions now. Return ONLY the JSON object.`

    // Call OpenRouter API with vision model
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'Nicolaou Maths - PDF Question Extractor',
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
                image_url: {
                  url: imageUrl
                }
              },
              {
                type: 'text',
                text: userPrompt
              }
            ]
          }
        ],
        temperature: 0.2, // Low temperature for accurate OCR
        max_tokens: 4000, // Room for multiple questions
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('OpenRouter API Error:', errorData)
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to extract questions from page', 
          details: errorData 
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      return NextResponse.json(
        { success: false, error: 'No response from AI model' },
        { status: 500 }
      )
    }

    // Parse the JSON response
    let parsedContent: { questions: ExtractedQuestion[] }
    try {
      // Remove markdown code blocks if present
      const cleanedContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
      
      parsedContent = JSON.parse(cleanedContent)
    } catch {
      console.error('Failed to parse AI response:', content)
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid response format from AI', 
          details: { raw_content: content }
        },
        { status: 500 }
      )
    }

    // Validate response structure
    if (!parsedContent.questions || !Array.isArray(parsedContent.questions)) {
      // If no questions array, treat as empty page
      parsedContent = { questions: [] }
    }

    // Validate and clean each question
    const validQuestions: ExtractedQuestion[] = []
    for (const q of parsedContent.questions) {
      if (q.questionNumber && q.questionLatex) {
        validQuestions.push({
          questionNumber: q.questionNumber,
          questionLatex: q.questionLatex,
          suggestedTopic: q.suggestedTopic || 'General',
          suggestedSubTopic: q.suggestedSubTopic || 'Mixed',
          suggestedMarks: q.suggestedMarks || 2,
          suggestedDifficulty: q.suggestedDifficulty || 'Foundation'
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        pageNumber,
        questions: validQuestions
      }
    })

  } catch (error) {
    console.error('Extract PDF error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to extract questions from page',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
