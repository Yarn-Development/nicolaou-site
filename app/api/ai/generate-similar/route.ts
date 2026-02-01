import { NextRequest, NextResponse } from 'next/server'

/**
 * Generate Similar Questions API
 * 
 * Takes an original question and generates 1-2 similar questions
 * that test the same concept but with different numbers/contexts.
 * 
 * Uses GPT-OSS-120B (free tier) via OpenRouter
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

// =====================================================
// Types
// =====================================================

interface GenerateSimilarRequest {
  /** The original question in LaTeX format */
  originalQuestion: string
  /** Topic for the question */
  topic: string
  /** Sub-topic for the question */
  subTopic: string
  /** Difficulty tier */
  difficulty: 'Foundation' | 'Higher'
  /** Number of similar questions to generate (1-2) */
  count?: 1 | 2
  /** Marks for the question */
  marks?: number
  /** Whether calculator is allowed */
  calculatorAllowed?: boolean
}

interface GeneratedQuestion {
  questionLatex: string
  answerKey: {
    answer: string
    explanation: string
  }
  marks: number
}

interface GenerateSimilarResponse {
  success: boolean
  data?: {
    questions: GeneratedQuestion[]
  }
  error?: string
  details?: unknown
}

// =====================================================
// Main Handler
// =====================================================

export async function POST(request: NextRequest): Promise<NextResponse<GenerateSimilarResponse>> {
  try {
    // Verify API key
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'OpenRouter API key not configured' },
        { status: 500 }
      )
    }

    const body = await request.json() as GenerateSimilarRequest

    // Validate required fields
    if (!body.originalQuestion) {
      return NextResponse.json(
        { success: false, error: 'originalQuestion is required' },
        { status: 400 }
      )
    }

    if (!body.topic || !body.subTopic) {
      return NextResponse.json(
        { success: false, error: 'topic and subTopic are required' },
        { status: 400 }
      )
    }

    const count = body.count || 2
    const marks = body.marks || 3
    const difficulty = body.difficulty || 'Foundation'
    const calculatorAllowed = body.calculatorAllowed ?? true

    // Build the prompt
    const systemPrompt = `You are an expert UK mathematics question generator specializing in creating similar practice questions for revision purposes.

Your task is to take an original exam question and generate ${count} similar question(s) that:
1. Test the SAME mathematical concept and skill
2. Use DIFFERENT numbers, values, or contexts
3. Are at a similar difficulty level (${difficulty} tier)
4. Are suitable for GCSE/A-Level revision practice
5. Are slightly varied to help students recognize patterns

IMPORTANT GUIDELINES:
- Maintain the same question structure and type
- Change numerical values while keeping the mathematics tractable
- If the original has a real-world context, use a different but similar context
- Ensure answers are "nice" numbers where appropriate (avoid complex decimals for non-calculator)
- Use proper LaTeX notation: \\frac{}{}, \\sqrt{}, \\times, \\div
- Inline math: $...$ for text integration
- Display math: $$...$$ for centered equations

You MUST respond with valid JSON only, no additional text or markdown formatting.`

    const userPrompt = `Generate ${count} similar question(s) based on this original:

**ORIGINAL QUESTION:**
${body.originalQuestion}

**METADATA:**
- Topic: ${body.topic}
- Sub-Topic: ${body.subTopic}
- Difficulty: ${difficulty}
- Marks: ${marks}
- Calculator: ${calculatorAllowed ? 'Allowed' : 'Not allowed'}

**REQUIREMENTS:**
1. Each question should test the same skill as the original
2. Use different numbers/values that give "nice" answers
3. ${!calculatorAllowed ? 'Ensure calculations can be done without a calculator' : 'Standard calculator-level difficulty is fine'}
4. Provide a clear, step-by-step solution for each

**OUTPUT FORMAT (JSON only):**
{
  "questions": [
    {
      "questionLatex": "The complete question text with LaTeX notation",
      "answerKey": {
        "answer": "The final answer (concise)",
        "explanation": "Step-by-step solution with working"
      },
      "marks": ${marks}
    }
  ]
}

Generate exactly ${count} similar question(s). Return ONLY the JSON object.`

    // Call OpenRouter API
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'Nicolaou Maths - Similar Question Generator',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b:free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7, // Moderate creativity for varied but valid questions
        max_tokens: 2000, // Room for multiple questions with explanations
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('OpenRouter API Error:', errorData)
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to generate similar questions', 
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
    let parsedContent: { questions: GeneratedQuestion[] }
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
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid response structure from AI', 
          details: parsedContent 
        },
        { status: 500 }
      )
    }

    // Validate each question has required fields
    for (const q of parsedContent.questions) {
      if (!q.questionLatex || !q.answerKey?.answer) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Incomplete question data from AI', 
            details: q 
          },
          { status: 500 }
        )
      }
      // Ensure marks is set
      q.marks = q.marks || marks
    }

    return NextResponse.json({
      success: true,
      data: {
        questions: parsedContent.questions
      }
    })

  } catch (error) {
    console.error('Generate similar error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate similar questions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
