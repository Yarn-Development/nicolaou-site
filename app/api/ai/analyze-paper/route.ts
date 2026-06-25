import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

// =====================================================
// Types
// =====================================================

interface AnalyzePaperRequest {
  pageImages: string[]
  examBoard?: string
  level?: string
  year?: string
  /** 'new-spec' | 'legacy-modular' | 'legacy-gcse' | null */
  spec?: string | null
  /** Module code when spec === 'legacy-modular', e.g. 'C3' */
  module?: string | null
}

export interface DetectedQuestion {
  id: string
  questionNumber: string
  suggestedTopic: string
  suggestedSubTopic: string
  marks: number
  pageStart: number
  pageEnd: number
  confidence: number
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
  'Statistics',
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
  'Vectors',
]

// Module-scoped topic lists for legacy modular A Level (PRD §7.2.3)
const LEGACY_MODULE_TOPICS: Record<string, string[]> = {
  C1: ['Indices and Surds', 'Quadratic Equations', 'Simultaneous Equations', 'Inequalities', 'Polynomials and Factor Theorem', 'Straight Lines', 'Circles', 'Differentiation of Polynomials', 'Integration of Polynomials', 'Stationary Points', 'Arithmetic Sequences'],
  C2: ['Binomial Expansion', 'Remainder and Factor Theorem', 'Geometric Sequences and Series', 'Trigonometric Functions', 'Sine and Cosine Rules', 'Radians, Arc Length, Sector Area', 'Trigonometric Equations', 'Exponential Functions', 'Logarithms', 'Differentiation (Chain Rule, Kinematics)', 'Integration (Areas, Trapezium Rule)'],
  C3: ['Functions and Mappings', 'Modulus Function', 'Algebraic Fractions', 'Partial Fractions', 'Trigonometric Identities', 'Inverse Trig Functions', 'Exponentials and Logarithms', 'Differentiation (Product, Quotient, Chain Rules)', 'Implicit Differentiation', 'Integration by Substitution', 'Integration by Parts', 'Numerical Methods'],
  C4: ['Binomial Expansion (Fractional/Negative n)', 'Implicit Differentiation', 'Parametric Equations', 'Differential Equations', 'Vectors (3D)', 'Integration (Partial Fractions, Trig)', 'Volumes of Revolution'],
  M1: ['Kinematics in 1D', 'Kinematics in 2D (SUVAT)', 'Forces and Newton\'s Laws', 'Friction', 'Moments', 'Connected Particles', 'Projectiles'],
  M2: ['Centre of Mass', 'Work, Energy and Power', 'Impulse and Momentum', 'Elastic Strings and Springs', 'Circular Motion', 'Variable Acceleration'],
  S1: ['Statistical Diagrams and Measures', 'Probability', 'Discrete Probability Distributions', 'Binomial Distribution', 'Normal Distribution', 'Correlation and Regression'],
  S2: ['Continuous Random Variables', 'Normal Distribution', 'Poisson Distribution', 'Hypothesis Testing', 'Chi-Squared Tests'],
  FP1: ['Complex Numbers', 'Numerical Methods', 'Coordinate Systems (Parabola, Ellipse)', 'Matrix Algebra', 'Series and Induction'],
  FP2: ['Inequalities', 'Series', 'Further Complex Numbers', 'First Order Differential Equations', 'Second Order Differential Equations', 'Maclaurin and Taylor Series'],
  D1: ['Algorithms', 'Graph Theory', 'Minimum Spanning Trees', 'Shortest Path', 'Linear Programming', 'Matchings'],
  D2: ['Transportation Problems', 'Allocation Problems', 'Game Theory', 'Dynamic Programming', 'Flows in Networks'],
}

// =====================================================
// Helper: Analyze a batch of pages
// =====================================================

async function analyzePages(
  pageImages: string[],
  examBoard?: string,
  level?: string,
  spec?: string | null,
  module?: string | null
): Promise<DetectedQuestion[]> {
  const isLegacyModular = spec === 'legacy-modular'
  const isALevel = level?.toLowerCase().includes('a-level') || level?.toLowerCase().includes('a level')

  let topicList: string[]
  let specContext = ''

  if (isLegacyModular && module) {
    const moduleUpper = module.toUpperCase()
    topicList = LEGACY_MODULE_TOPICS[moduleUpper] ?? ALEVEL_TOPICS
    specContext = `\nThis is an Edexcel A Level ${moduleUpper} paper (pre-2017 legacy modular spec). Only use topics from the ${moduleUpper} list above — do not use topics from other modules.\n`
  } else if (isALevel) {
    topicList = ALEVEL_TOPICS
  } else {
    topicList = GCSE_TOPICS
  }

  const moduleLabel = isLegacyModular && module ? ` ${module.toUpperCase()}` : ''
  const paperDesc = `${level || 'maths'}${moduleLabel} exam paper${examBoard ? ` from ${examBoard}` : ''}`

  const systemPrompt = [
    'You are an expert at analyzing UK mathematics exam papers. Your task is to identify the structure of the paper by detecting each question.',
    specContext,
    `For each question you detect, provide:`,
    `1. Question number (exactly as shown, e.g., "1", "2a", "3(b)(ii)")`,
    `2. Topic from this list: ${topicList.join(', ')}`,
    `3. More specific sub-topic`,
    `4. Marks (look for [X marks] or (X) notation, or estimate based on complexity)`,
    `5. Which page(s) the question appears on`,
    `6. Brief description (1 sentence max)`,
    '',
    'IMPORTANT:',
    '- Number sub-parts separately (1a, 1b, 1c should be separate entries)',
    '- If marks are shown, use the exact value',
    '- If marks are not shown, estimate based on question complexity (1-2 for simple, 3-4 for medium, 5+ for complex)',
    '- Track which page each question starts and ends on',
    '- Include a confidence score (0-1) for your detection',
    '',
    'You MUST respond with valid JSON only.',
  ].join('\n')

  const userPrompt = [
    `Analyze this ${paperDesc}.`,
    '',
    'Identify ALL questions and their structure. Look carefully at question numbering patterns.',
    '',
    '**OUTPUT FORMAT (JSON only):**',
    JSON.stringify({
      paperTitle: 'Paper title if visible (optional)',
      questions: [
        {
          questionNumber: '1a',
          suggestedTopic: topicList[0] ?? 'Algebra',
          suggestedSubTopic: 'Example sub-topic',
          marks: 3,
          pageStart: 1,
          pageEnd: 1,
          confidence: 0.95,
          description: 'Brief description',
        },
      ],
    }, null, 2),
    '',
    `Analyze ALL ${pageImages.length} pages and return the complete question structure.`,
    'Return ONLY the JSON object.',
  ].join('\n')

  const messageContent: Array<{ type: 'image_url'; image_url: { url: string } } | { type: 'text'; text: string }> = []

  for (let i = 0; i < pageImages.length; i++) {
    messageContent.push({ type: 'image_url', image_url: { url: pageImages[i] } })
    messageContent.push({ type: 'text', text: `[Page ${i + 1} of ${pageImages.length}]` })
  }

  messageContent.push({ type: 'text', text: userPrompt })

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      'X-Title': 'Nicolaou Maths - Paper Structure Analysis',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-4-6',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: messageContent },
      ],
      temperature: 0.1,
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

  if (!content) throw new Error('No response from AI model')

  try {
    const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleanedContent)

    if (!parsed.questions || !Array.isArray(parsed.questions)) return []

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
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json({ success: false, error: 'OpenRouter API key not configured' }, { status: 500 })
    }

    const authUser = await getAuthUser()

    if (!authUser) {
      return NextResponse.json({ success: false, error: 'You must be logged in' }, { status: 401 })
    }

    if (authUser.role !== 'teacher') {
      return NextResponse.json({ success: false, error: 'Only teachers can analyze papers' }, { status: 403 })
    }

    const body = await request.json() as AnalyzePaperRequest

    if (!body.pageImages || body.pageImages.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one page image is required' }, { status: 400 })
    }

    const pagesToAnalyze = body.pageImages.slice(0, 20)

    if (body.pageImages.length > 20) {
      console.log(`[Analyze Paper] Limiting analysis to first 20 of ${body.pageImages.length} pages`)
    }

    console.log(`[Analyze Paper] Analyzing ${pagesToAnalyze.length} pages, spec=${body.spec ?? 'null'}, module=${body.module ?? 'none'}`)

    const questions = await analyzePages(
      pagesToAnalyze,
      body.examBoard,
      body.level,
      body.spec,
      body.module
    )

    console.log(`[Analyze Paper] Detected ${questions.length} questions`)

    const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0)

    return NextResponse.json({
      success: true,
      data: {
        questions,
        totalMarks,
        pageCount: body.pageImages.length,
      },
    })
  } catch (error) {
    console.error('Paper analysis error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze paper',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
