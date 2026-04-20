import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  needsDiagram,
  sanitizeSvg,
  buildDiagramSystemPrompt,
  uploadSvgToStorage,
} from '@/lib/diagram-utils'
import { repairLatex } from '@/lib/latex-utils'

/**
 * Generate Similar Questions API
 *
 * Takes an original question and generates 1-2 similar questions
 * that test the same concept but with different numbers/contexts.
 *
 * If the original question had a diagram (or the topic auto-detects as needing one),
 * similar questions are generated with matching SVG diagrams via Claude Haiku.
 * Otherwise uses GPT-OSS-120B (free).
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

// =====================================================
// Types
// =====================================================

interface GenerateSimilarRequest {
  originalQuestion: string
  topic: string
  subTopic: string
  difficulty: 'Foundation' | 'Higher'
  count?: 1 | 2
  marks?: number
  calculatorAllowed?: boolean
  // NEW: diagram context from the original question
  originalHadDiagram?: boolean
  originalDiagramDescription?: string
}

interface GeneratedQuestion {
  questionLatex: string
  answerKey: {
    answer: string
    explanation: string
  }
  marks: number
  imageUrl?: string | null
  contentType?: 'generated_text' | 'synthetic_image'
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
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'OpenRouter API key not configured' },
        { status: 500 }
      )
    }

    const body = await request.json() as GenerateSimilarRequest

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

    // Determine if diagrams are needed
    const requiresDiagram = body.originalHadDiagram ?? needsDiagram(body.topic, body.subTopic)

    if (requiresDiagram) {
      return await generateSimilarWithDiagrams(body, count, marks, difficulty, calculatorAllowed)
    }

    return await generateSimilarTextOnly(body, count, marks, difficulty, calculatorAllowed)
  } catch (error) {
    console.error('Generate similar error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate similar questions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// =====================================================
// Diagram-aware generation (Claude Haiku)
// =====================================================

async function generateSimilarWithDiagrams(
  body: GenerateSimilarRequest,
  count: number,
  marks: number,
  difficulty: string,
  calculatorAllowed: boolean
): Promise<NextResponse<GenerateSimilarResponse>> {
  const userPrompt = `Based on this original question, generate ${count} similar question(s) WITH SVG diagrams.

**ORIGINAL QUESTION:**
${body.originalQuestion}
${body.originalDiagramDescription ? `\n**ORIGINAL DIAGRAM:** ${body.originalDiagramDescription}` : ''}

**METADATA:**
- Topic: ${body.topic}
- Sub-Topic: ${body.subTopic}
- Difficulty: ${difficulty}
- Marks: ${marks}
- Calculator: ${calculatorAllowed ? 'Allowed' : 'Not allowed'}
- Count: Generate exactly ${count} question(s)

**REQUIREMENTS:**
- Each question tests the SAME mathematical skill as the original but with DIFFERENT values.
- The SVG diagram must show a DIFFERENT but similar geometric configuration.
- All given values in the question must appear in the SVG; unknowns (x, θ) marked in both.
- ${calculatorAllowed ? 'Standard difficulty values.' : 'Use integer/simple fraction values (non-calculator).'}
- question_latex must contain ONLY the question text — NEVER include "Show your answer", answer lines, blank boxes, or any answer-section language.
- NEVER use markdown tables (|col|col|) anywhere. For tabular data use a LaTeX array environment.
- NEVER use markdown formatting (**bold**, *italic*, ## headings) inside question_latex.
- Use plain prose with $...$ for inline math and $$...$$ for display math.

**OUTPUT FORMAT (JSON only, no markdown):**
{
  "questions": [
    {
      "question_latex": "Complete question with LaTeX",
      "svg_markup": "<svg viewBox=\\"0 0 400 400\\" ...>...</svg>",
      "answer": "Final answer",
      "explanation": "Step-by-step mark scheme",
      "marks": ${marks},
      "diagram_description": "One sentence describing the diagram"
    }
  ]
}

Return ONLY the JSON object with exactly ${count} question(s) in the array.`

  let rawContent: string
  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'Nicolaou Maths - Similar Diagram Generator',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-haiku-4-5',
        messages: [
          { role: 'system', content: buildDiagramSystemPrompt() },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 6000,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('[Similar Diagram] API error:', errorData)
      // Fall back to text-only
      return generateSimilarTextOnly(body, count, marks, difficulty, calculatorAllowed)
    }

    const data = await response.json()
    rawContent = data.choices[0]?.message?.content || ''
  } catch (err) {
    console.error('[Similar Diagram] Network error:', err)
    return generateSimilarTextOnly(body, count, marks, difficulty, calculatorAllowed)
  }

  let parsed: { questions: Array<{ question_latex: string; svg_markup: string; answer: string; explanation: string; marks: number; diagram_description?: string }> }
  try {
    const cleaned = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    parsed = JSON.parse(cleaned)
  } catch {
    console.error('[Similar Diagram] Parse failure — falling back to text-only')
    return generateSimilarTextOnly(body, count, marks, difficulty, calculatorAllowed)
  }

  if (!parsed.questions || !Array.isArray(parsed.questions)) {
    return generateSimilarTextOnly(body, count, marks, difficulty, calculatorAllowed)
  }

  // Upload SVGs and build result
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id || 'anon'

  const questions: GeneratedQuestion[] = []

  for (const q of parsed.questions) {
    if (!q.question_latex || !q.answer) continue

    let imageUrl: string | null = null

    if (q.svg_markup) {
      const sanitized = sanitizeSvg(q.svg_markup)
      if (sanitized.valid) {
        imageUrl = await uploadSvgToStorage(sanitized.svg, body.topic, userId, supabase)
      } else {
        console.warn('[Similar Diagram] SVG sanitization failed:', sanitized.errors)
      }
    }

    questions.push({
      questionLatex: repairLatex(q.question_latex),
      answerKey: {
        answer: repairLatex(q.answer),
        explanation: repairLatex(q.explanation || ''),
      },
      marks: q.marks || marks,
      imageUrl,
      contentType: imageUrl ? 'synthetic_image' : 'generated_text',
    })
  }

  if (questions.length === 0) {
    return generateSimilarTextOnly(body, count, marks, difficulty, calculatorAllowed)
  }

  return NextResponse.json({ success: true, data: { questions } })
}

// =====================================================
// Text-only generation (GPT-OSS-120B, free)
// =====================================================

async function generateSimilarTextOnly(
  body: GenerateSimilarRequest,
  count: number,
  marks: number,
  difficulty: string,
  calculatorAllowed: boolean
): Promise<NextResponse<GenerateSimilarResponse>> {
  const systemPrompt = `You are an expert UK mathematics question generator specializing in creating similar practice questions for revision purposes.

Your task is to take an original exam question and generate ${count} similar question(s) that:
1. Test the SAME mathematical concept and skill
2. Use DIFFERENT numbers, values, or contexts
3. Are at a similar difficulty level (${difficulty} tier)
4. Are suitable for GCSE/A-Level revision practice
5. Are slightly varied to help students recognize patterns

═══ FORMATTING RULES — READ CAREFULLY ═══

LaTeX (questionLatex field):
- Inline math: $...$ for expressions within prose (e.g. "Find the value of $x$.")
- Display math: $$...$$ for equations on their own line
- Use \\frac{}{}, \\sqrt{}, \\times, \\div, \\sin, \\cos, \\tan, \\pi
- Separate question parts with a plain newline character \\n in the JSON string
- Multi-part questions: label as (a), (b), (c); include mark count in parentheses e.g. "(3)"

STRICT PROHIBITIONS — never do any of these:
- NEVER use markdown tables (| col | col | --- |). For tabular data use a LaTeX array: $$\\begin{array}{|c|c|}\\hline ... \\hline\\end{array}$$
- NEVER use markdown formatting (**bold**, *italic*, ## headings, - bullets) inside questionLatex
- NEVER include "Show your answer", "Show your working", "Answer:", blank answer lines, dotted lines, or any answer-box language anywhere in questionLatex
- NEVER add placeholder text like "...", "[answer here]", or boxes for students to write in
- NEVER end a question with a colon followed by a blank line expecting the student to fill in

explanation field:
- Write step-by-step working as plain prose separated by \\n in the JSON string
- Label marks: M1 (method), A1 (accuracy), B1 (independent)
- No markdown tables or bullet lists — use numbered steps or M1/A1 labels inline

You MUST respond with valid JSON only — no markdown code fences, no preamble, no trailing text.`

  const userPrompt = `Generate ${count} similar question(s) based on this original:

ORIGINAL QUESTION:
${body.originalQuestion}

METADATA:
- Topic: ${body.topic}
- Sub-Topic: ${body.subTopic}
- Difficulty: ${difficulty}
- Marks: ${marks}
- Calculator: ${calculatorAllowed ? 'Allowed' : 'Not allowed'}

REQUIREMENTS:
1. Test the same mathematical skill as the original with different values
2. Use values that give "nice" answers${!calculatorAllowed ? ' (integers or simple fractions — no calculator)' : ''}
3. questionLatex must be ONLY the question text — no answer section, no blank lines, no "Show your answer"
4. If the question involves a table of data, use a LaTeX array ($$\\begin{array}...) — never a markdown table
5. Use plain \\n between lines/parts in JSON strings — no markdown formatting

OUTPUT FORMAT (JSON only, no code fences):
{
  "questions": [
    {
      "questionLatex": "Complete question text with $LaTeX$ math only — no markdown",
      "answerKey": {
        "answer": "Concise final answer with LaTeX where needed",
        "explanation": "Step-by-step solution: M1 ... A1 ... (plain text, no markdown tables)"
      },
      "marks": ${marks}
    }
  ]
}

Return ONLY the JSON object with exactly ${count} question(s).`

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      'X-Title': 'Nicolaou Maths - Similar Question Generator',
    },
    body: JSON.stringify({
      model: 'deepseek/deepseek-v3.2',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    return NextResponse.json(
      { success: false, error: 'Failed to generate similar questions', details: errorData },
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

  let parsedContent: { questions: GeneratedQuestion[] }
  try {
    const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    parsedContent = JSON.parse(cleanedContent)
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid response format from AI', details: { raw_content: content } },
      { status: 500 }
    )
  }

  if (!parsedContent.questions || !Array.isArray(parsedContent.questions)) {
    return NextResponse.json(
      { success: false, error: 'Invalid response structure from AI', details: parsedContent },
      { status: 500 }
    )
  }

  for (const q of parsedContent.questions) {
    if (!q.questionLatex || !q.answerKey?.answer) {
      return NextResponse.json(
        { success: false, error: 'Incomplete question data from AI', details: q },
        { status: 500 }
      )
    }
    q.questionLatex = repairLatex(q.questionLatex)
    q.answerKey.answer = repairLatex(q.answerKey.answer)
    if (q.answerKey.explanation) q.answerKey.explanation = repairLatex(q.answerKey.explanation)
    q.marks = q.marks || marks
    q.imageUrl = null
    q.contentType = 'generated_text'
  }

  return NextResponse.json({ success: true, data: { questions: parsedContent.questions } })
}
