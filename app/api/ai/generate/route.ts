import { NextRequest, NextResponse } from 'next/server'

/**
 * Unified AI Generation API Route
 * Supports two modes:
 * 1. Text Generation (GPT-OSS-120B) - Generate GCSE maths questions
 * 2. Image OCR (Qwen 2.5 VL) - Extract LaTeX from images
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

if (!OPENROUTER_API_KEY) {
  console.error('⚠️  OPENROUTER_API_KEY is not set in environment variables')
}

// Type definitions for request/response
interface TextGenRequest {
  type: 'text_gen'
  // Legacy fields (still supported)
  topic?: string
  tier?: 'Foundation' | 'Higher'
  // New curriculum-aware fields
  level?: string
  sub_topic?: string // Changed from sub_topic_name to match frontend
  question_type?: 'Fluency' | 'Problem Solving' | 'Reasoning/Proof'
  marks?: number
  calculator_allowed?: boolean
  context?: string
}

interface ImageOCRRequest {
  type: 'image_ocr'
  image_url: string
}

type AIRequest = TextGenRequest | ImageOCRRequest

interface TextGenResponse {
  question_latex: string
  answer: string
  explanation: string
  marks?: number
}

interface ImageOCRResponse {
  question_latex: string
  suggested_topic: string
  suggested_difficulty: 'Foundation' | 'Higher'
}

export async function POST(request: NextRequest) {
  try {
    // Verify API key
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      )
    }

    const body = await request.json() as AIRequest

    // Route to appropriate handler based on type
    if (body.type === 'text_gen') {
      return await handleTextGeneration(body)
    } else if (body.type === 'image_ocr') {
      return await handleImageOCR(body)
    } else {
      return NextResponse.json(
        { error: 'Invalid request type. Must be "text_gen" or "image_ocr"' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('AI API Error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

/**
 * Mode A: Text Generation using GPT-OSS-120B (Free)
 * Supports both legacy (topic/tier) and new curriculum-aware generation
 */
async function handleTextGeneration(request: TextGenRequest): Promise<NextResponse> {
  // Check if this is a curriculum-aware request
  const isCurriculumAware = Boolean(request.level && request.sub_topic)
  
  let systemPrompt: string
  let userPrompt: string

  if (isCurriculumAware) {
    // NEW: Curriculum-Aware Prompt Engineering
    const {
      level,
      sub_topic,
      question_type = 'Fluency',
      marks = 3,
      calculator_allowed = true,
      context,
    } = request

    systemPrompt = `You are an expert UK mathematics exam question writer with deep knowledge of:
- UK National Curriculum (KS3, GCSE Foundation, GCSE Higher)
- A-Level Mathematics specifications (Pure, Statistics, Mechanics)
- Exam board requirements (AQA, Edexcel, OCR)
- Assessment objectives and mark schemes

Your questions must be:
- Pedagogically sound and curriculum-aligned
- Written in clear, unambiguous exam language
- Mathematically rigorous with precise LaTeX notation
- Age-appropriate for the specified level
- Aligned with the specified question type and marks

Always respond with valid JSON only, no additional text or formatting.`

    userPrompt = `Create a unique ${level} mathematics question with the following specifications:

**CURRICULUM CONTEXT:**
- Level: ${level}
- Sub-Topic: ${sub_topic}

**QUESTION REQUIREMENTS:**
- Type: ${question_type}
- Marks: ${marks}
- Calculator: ${calculator_allowed ? 'Calculator allowed' : 'Non-calculator (students must show working)'}${context ? `\n- Context: ${context}` : ''}

**QUESTION TYPE GUIDELINES:**
${question_type === 'Fluency' ? '- Focus on fundamental skills and standard procedures\n- Test direct application of knowledge\n- Include 1-2 straightforward steps' : ''}${question_type === 'Problem Solving' ? '- Require multi-step reasoning\n- Include real-world or unfamiliar contexts\n- Test ability to select and apply appropriate methods' : ''}${question_type === 'Reasoning/Proof' ? '- Require mathematical reasoning or formal proof\n- Include "show that", "prove", or "explain why" language\n- Test understanding of mathematical structure' : ''}

**CALCULATOR GUIDANCE:**
${calculator_allowed ? '- Decimal/complex calculations are acceptable\n- Focus can be on mathematical reasoning rather than arithmetic' : '- Avoid calculations requiring calculator (e.g., √87, complex decimals)\n- Use integer values or simple fractions\n- Students must show all working'}

**MARK ALLOCATION:**
${marks === 1 ? '- Single-step question\n- One method or one answer' : ''}${marks === 2 ? '- Two clear steps or 1 method + 1 answer mark\n- Could be simple problem solving' : ''}${marks >= 3 && marks <= 4 ? '- Multi-step question with clear progression\n- Award marks for method and accuracy\n- Could include interpretation or explanation' : ''}${marks >= 5 ? '- Extended response question\n- Multiple methods or approaches\n- Include communication marks or proof elements' : ''}

**LATEX REQUIREMENTS:**
- Use proper LaTeX notation: \\frac{}{}, \\sqrt{}, \\times, \\div
- Inline math: $...$ for text integration
- Display math: $$...$$ for centered equations
- Examples: $\\frac{3}{4}$, $x^2 + 5x - 6 = 0$, $$\\int_{0}^{\\pi} \\sin(x) \\, dx$$

**OUTPUT FORMAT (JSON only):**
{
  "question_latex": "The complete question text with LaTeX notation",
  "answer": "The final answer (concise)",
  "explanation": "Full step-by-step solution with working and mark scheme breakdown",
  "marks": ${marks}
}

Generate ONE high-quality question now. Return ONLY the JSON object.`

  } else {
    // LEGACY: Simple topic/tier generation (backwards compatible)
    const { topic, tier } = request
    
    if (!topic || !tier) {
      return NextResponse.json(
        { error: 'Either (level, sub_topic_name) or (topic, tier) is required' },
        { status: 400 }
      )
    }

    systemPrompt = 'You are a GCSE mathematics question generator. Always respond with valid JSON only, no additional text or formatting.'
    
    userPrompt = `Create a unique GCSE Maths question on ${topic} for ${tier} tier.

Requirements:
- The question should be appropriate for ${tier} tier GCSE students
- Include proper mathematical notation
- Provide a clear, step-by-step solution
- Output ONLY valid JSON in this exact format:

{
  "question_latex": "The question text with math in LaTeX (use $...$ for inline math, $$...$$ for display math)",
  "answer": "The final answer",
  "explanation": "Step-by-step solution explanation"
}

Do not include any other text, markdown formatting, or code blocks. Only return the JSON object.`
  }

  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'Nicolaou Maths - Question Generator',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b:free',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.8, // Higher creativity for varied questions
        max_tokens: 1500, // Increased for detailed explanations
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('OpenRouter API Error:', errorData)
      return NextResponse.json(
        { 
          error: 'Failed to generate question', 
          details: errorData 
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      return NextResponse.json(
        { error: 'No response from AI model' },
        { status: 500 }
      )
    }

    // Parse the JSON response
    let parsedContent: TextGenResponse
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
          error: 'Invalid response format from AI', 
          raw_content: content 
        },
        { status: 500 }
      )
    }

    // Validate required fields
    if (!parsedContent.question_latex || !parsedContent.answer) {
      return NextResponse.json(
        { 
          error: 'Incomplete response from AI', 
          content: parsedContent 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: parsedContent,
      model: 'gpt-oss-120b',
      curriculum_aware: isCurriculumAware
    })

  } catch (error) {
    console.error('Text generation error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate question',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Mode B: Image OCR using Qwen 2.5 VL
 */
async function handleImageOCR(request: ImageOCRRequest): Promise<NextResponse> {
  const { image_url } = request

  if (!image_url) {
    return NextResponse.json(
      { error: 'image_url is required for OCR' },
      { status: 400 }
    )
  }

  const systemPrompt = `You are a specialized OCR engine for mathematics. Your task is to:
1. Extract ALL text and mathematical notation from the image
2. Convert equations and mathematical symbols to standard LaTeX format
3. Use $...$ for inline math and $$...$$ for display math
4. Preserve the structure and formatting of the original question
5. Suggest the most appropriate topic and difficulty level

Return ONLY valid JSON in this exact format:
{
  "question_latex": "The extracted question with LaTeX notation",
  "suggested_topic": "The most relevant topic (e.g., Algebra, Geometry, Statistics, Number, Ratio, Probability)",
  "suggested_difficulty": "Foundation or Higher"
}

Do not include any other text, explanations, or formatting. Only return the JSON object.`

  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'Nicolaou Maths - Question OCR',
      },
      body: JSON.stringify({
        model: 'qwen/qwen-2-vl-7b-instruct:free',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: image_url
                }
              },
              {
                type: 'text',
                text: 'Extract the mathematical question from this image and convert it to LaTeX format. Return only JSON.'
              }
            ]
          }
        ],
        temperature: 0.2, // Lower temperature for more accurate OCR
        max_tokens: 1500,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('OpenRouter OCR Error:', errorData)
      return NextResponse.json(
        { 
          error: 'Failed to process image', 
          details: errorData 
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      return NextResponse.json(
        { error: 'No response from OCR model' },
        { status: 500 }
      )
    }

    // Parse the JSON response
    let parsedContent: ImageOCRResponse
    try {
      // Remove markdown code blocks if present
      const cleanedContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
      
      parsedContent = JSON.parse(cleanedContent)
    } catch {
      console.error('Failed to parse OCR response:', content)
      return NextResponse.json(
        { 
          error: 'Invalid response format from OCR', 
          raw_content: content 
        },
        { status: 500 }
      )
    }

    // Validate required fields
    if (!parsedContent.question_latex) {
      return NextResponse.json(
        { 
          error: 'Incomplete response from OCR', 
          content: parsedContent 
        },
        { status: 500 }
      )
    }

    // Set defaults if suggestions are missing
    if (!parsedContent.suggested_topic) {
      parsedContent.suggested_topic = 'General'
    }
    if (!parsedContent.suggested_difficulty) {
      parsedContent.suggested_difficulty = 'Foundation'
    }

    return NextResponse.json({
      success: true,
      data: parsedContent,
      model: 'qwen-2-vl-7b'
    })

  } catch (error) {
    console.error('OCR error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process image',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
