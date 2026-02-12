import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Paper Structure Analysis API
 * 
 * Takes PDF page images and uses GPT-4o Vision to detect question structure:
 * - Question numbers
 * - Likely topics
 * - Mark allocations
 * - Page locations
 * 
 * This is used by the Smart Digitizer to auto-map external papers.
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

// =====================================================
// Types
// =====================================================

interface AnalyzePaperRequest {
  /** Base64 encoded images of PDF pages */
  pageImages: string[]
  /** Exam board (AQA, Edexcel, OCR, etc.) */
  examBoard?: string
  /** Curriculum level (GCSE Foundation, GCSE Higher, A-Level, etc.) */
  level?: string
  /** Year of the paper */
  year?: string
}

export interface DetectedQuestion {
  /** Unique ID for this detected question */
  id: string
  /** Question number as shown on paper (e.g., "1", "2a", "3(b)(ii)") */
  questionNumber: string
  /** AI-suggested topic based on content */
  suggestedTopic: string
  /** AI-suggested sub-topic */
  suggestedSubTopic: string
  /** Detected or estimated marks */
  marks: number
  /** Page number where question starts (1-indexed) */
  pageStart: number
  /** Page number where question ends (1-indexed) */
  pageEnd: number
  /** Confidence score 0-1 */
  confidence: number
  /** Brief description of what the question is about */
  description?: string
}

interface AnalyzePaperResponse {
  success: boolean
  data?: {
    questions: DetectedQuestion[]
    totalMarks: number
    pageCount: number
    paperTitle?: string
  }
  error?: string
  details?: unknown
}

// =====================================================
// Topic Classification
// =====================================================

const GCSE_TOPICS = [
  'Number',
  'Algebra',
  'Ratio, Proportion and Rates of Change',
  'Geometry and Measures',
  'Probability',
  'Statistics'
]

const ALEVEL_TOPICS = [
  'Pure Mathematics',
  'Statistics',
  'Mechanics',
  'Proof',
  'Algebra and Functions',
  'Coordinate Geometry',
  'Sequences and Series',
  'Trigonometry',
  'Exponentials and Logarithms',
  'Differentiation',
  'Integration',
  'Numerical Methods',
  'Vectors'
]

// =====================================================
// Helper: Analyze a batch of pages
// =====================================================

async function analyzePages(
  pageImages: string[],
  examBoard?: string,
  level?: string
): Promise<DetectedQuestion[]> {
  const isALevel = level?.toLowerCase().includes('a-level') || level?.toLowerCase().includes('a level')
  const topicList = isALevel ? ALEVEL_TOPICS : GCSE_TOPICS
  
  const systemPrompt = `You are an expert at analyzing UK mathematics exam papers. Your task is to identify the structure of the paper by detecting each question.

For each question you detect, provide:
1. Question number (exactly as shown, e.g., "1", "2a", "3(b)(ii)")
2. Topic from this list: ${topicList.join(', ')}
3. More specific sub-topic
4. Marks (look for [X marks] or (X) notation, or estimate based on complexity)
5. Which page(s) the question appears on
6. Brief description (1 sentence max)

IMPORTANT:
- Number sub-parts separately (1a, 1b, 1c should be separate entries)
- If marks are shown, use the exact value
- If marks are not shown, estimate based on question complexity (1-2 for simple, 3-4 for medium, 5+ for complex)
- Track which page each question starts and ends on
- Include a confidence score (0-1) for your detection

You MUST respond with valid JSON only.`

  const userPrompt = `Analyze this ${level || 'maths'} exam paper${examBoard ? ` from ${examBoard}` : ''}.

Identify ALL questions and their structure. Look carefully at question numbering patterns.

**OUTPUT FORMAT (JSON only):**
{
  "paperTitle": "Paper title if visible (optional)",
  "questions": [
    {
      "questionNumber": "1a",
      "suggestedTopic": "Algebra",
      "suggestedSubTopic": "Linear Equations",
      "marks": 3,
      "pageStart": 1,
      "pageEnd": 1,
      "confidence": 0.95,
      "description": "Solve a linear equation"
    }
  ]
}

Analyze ALL ${pageImages.length} pages and return the complete question structure.
Return ONLY the JSON object.`

  // Build the message content with all page images
  const messageContent: Array<{ type: 'image_url'; image_url: { url: string } } | { type: 'text'; text: string }> = []
  
  for (let i = 0; i < pageImages.length; i++) {
    messageContent.push({
      type: 'image_url',
      image_url: { url: pageImages[i] }
    })
    messageContent.push({
      type: 'text',
      text: `[Page ${i + 1} of ${pageImages.length}]`
    })
  }
  
  messageContent.push({
    type: 'text',
    text: userPrompt
  })

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      'X-Title': 'Nicolaou Maths - Paper Structure Analysis',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: messageContent }
      ],
      temperature: 0.1, // Low temperature for consistent structure detection
      max_tokens: 8000,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Paper analysis API error:', errorText)
    throw new Error('Failed to analyze paper structure')
  }

  const data = await response.json()
  const content = data.choices[0]?.message?.content

  if (!content) {
    throw new Error('No response from AI model')
  }

  try {
    // Clean the response
    const cleanedContent = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()
    
    const parsed = JSON.parse(cleanedContent)
    
    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      return []
    }

    // Add unique IDs and validate/normalize the data
    return parsed.questions.map((q: Partial<DetectedQuestion>, index: number) => ({
      id: `q-${index + 1}-${Date.now()}`,
      questionNumber: q.questionNumber || `${index + 1}`,
      suggestedTopic: q.suggestedTopic || 'Unknown',
      suggestedSubTopic: q.suggestedSubTopic || 'Unknown',
      marks: typeof q.marks === 'number' ? q.marks : 2,
      pageStart: typeof q.pageStart === 'number' ? q.pageStart : 1,
      pageEnd: typeof q.pageEnd === 'number' ? q.pageEnd : (q.pageStart || 1),
      confidence: typeof q.confidence === 'number' ? Math.min(1, Math.max(0, q.confidence)) : 0.8,
      description: q.description || undefined,
    }))
  } catch (parseError) {
    console.error('Failed to parse AI response:', parseError)
    console.error('Raw content:', content)
    throw new Error('Failed to parse paper structure')
  }
}

// =====================================================
// Main Handler
// =====================================================

export async function POST(request: NextRequest): Promise<NextResponse<AnalyzePaperResponse>> {
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
        { success: false, error: 'Only teachers can analyze papers' },
        { status: 403 }
      )
    }

    const body = await request.json() as AnalyzePaperRequest

    // Validate required fields
    if (!body.pageImages || body.pageImages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one page image is required' },
        { status: 400 }
      )
    }

    // Limit pages to prevent timeout (analyze first 20 pages max)
    const pagesToAnalyze = body.pageImages.slice(0, 20)
    
    if (body.pageImages.length > 20) {
      console.log(`[Analyze Paper] Limiting analysis to first 20 of ${body.pageImages.length} pages`)
    }

    console.log(`[Analyze Paper] Analyzing ${pagesToAnalyze.length} pages...`)

    // Analyze all pages together for context
    const questions = await analyzePages(
      pagesToAnalyze,
      body.examBoard,
      body.level
    )

    console.log(`[Analyze Paper] Detected ${questions.length} questions`)

    // Calculate total marks
    const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0)

    return NextResponse.json({
      success: true,
      data: {
        questions,
        totalMarks,
        pageCount: body.pageImages.length,
      }
    })

  } catch (error) {
    console.error('Paper analysis error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze paper',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
