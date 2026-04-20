import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  needsDiagram,
  sanitizeSvg,
  buildDiagramSystemPrompt,
  uploadSvgToStorage,
} from '@/lib/diagram-utils'
import { repairLatex } from '@/lib/latex-utils'

/**
 * Unified AI Generation API Route
 *
 * Supports three modes:
 * 1. Text Generation (GPT-OSS-120B, free) — topics that don't need diagrams
 * 2. Diagram Generation (Claude Haiku) — topics that benefit from visual diagrams,
 *    generates question + SVG in a single call so values always stay in sync
 * 3. Image OCR (Qwen 2.5 VL) — extract LaTeX from uploaded images
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

if (!OPENROUTER_API_KEY) {
  console.error('⚠️  OPENROUTER_API_KEY is not set in environment variables')
}

// =====================================================
// Types
// =====================================================

interface TextGenRequest {
  type: 'text_gen'
  // Legacy fields (still supported)
  topic?: string
  tier?: 'Foundation' | 'Higher'
  // Curriculum-aware fields
  level?: string
  /** Parent topic name (e.g. "Geometry & Measures") used for diagram detection */
  topic_name?: string
  sub_topic?: string
  question_type?: 'Fluency' | 'Problem Solving' | 'Reasoning/Proof'
  marks?: number
  calculator_allowed?: boolean
  context?: string
  // Diagram control — if omitted, auto-detected via needsDiagram()
  force_diagram?: boolean
  force_no_diagram?: boolean
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

interface DiagramGenResponse {
  question_latex: string
  svg_markup: string
  answer: string
  explanation: string
  marks: number
  diagram_description?: string
}

interface ImageOCRResponse {
  question_latex: string
  suggested_topic: string
  suggested_difficulty: 'Foundation' | 'Higher'
}

// =====================================================
// Main handler
// =====================================================

export async function POST(request: NextRequest) {
  try {
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      )
    }

    const body = await request.json() as AIRequest

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
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// =====================================================
// Mode A: Text (or diagram) generation
// =====================================================

async function handleTextGeneration(request: TextGenRequest): Promise<NextResponse> {
  const isCurriculumAware = Boolean(request.level && request.sub_topic)

  if (!isCurriculumAware) {
    return await handleLegacyTextGeneration(request)
  }

  const {
    level,
    sub_topic,
    question_type = 'Fluency',
    marks = 3,
    calculator_allowed = true,
    context,
  } = request

  // Resolve topic name from the sub_topic string for diagram detection.
  // The caller passes sub_topic as the name string (e.g., "Circle Theorems"), not an ID.
  // We also need the parent topic name. The level and sub_topic together identify the topic.
  // We derive the parent topic name by checking if the sub_topic or level implies geometry etc.
  // For now, we pass the sub_topic itself to needsDiagram — the function also checks
  // the sub-topic name directly in SELECTIVE_DIAGRAM_SUBTOPICS.
  // For ALWAYS_DIAGRAM_TOPICS we need the topic name — callers using the new curriculum-aware
  // path should pass `topic_name` as an additional field if available; otherwise we default
  // to sub_topic based detection only for selective topics, and check level-based geometry heuristic.
  const topicName = request.topic_name || ''
  const subTopicName = sub_topic || ''

  // Determine whether to generate a diagram
  let requiresDiagram: boolean
  if (request.force_diagram === true) {
    requiresDiagram = true
  } else if (request.force_no_diagram === true) {
    requiresDiagram = false
  } else {
    requiresDiagram = needsDiagram(topicName, subTopicName)
  }

  if (requiresDiagram) {
    return await handleDiagramGeneration({
      level: level!,
      sub_topic: subTopicName,
      topic_name: topicName,
      question_type,
      marks,
      calculator_allowed,
      context,
    })
  }

  // ---- Text-only path (free model) ----
  const systemPrompt = `You are an expert Pearson Edexcel mathematics exam question writer with mastery of:
- UK National Curriculum (KS3, GCSE Foundation, GCSE Higher)
- A-Level Mathematics specifications (Pure, Statistics, Mechanics)
- Edexcel mark scheme conventions (M1, A1, B1, ft, cao, oe)

LANGUAGE RULES — follow these exactly:
1. Use ONLY these Edexcel command words: Work out, Find, Calculate, Solve, Factorise, Expand, Simplify, Show that, Prove that, Explain why, Write down, Express, Give, Determine, Sketch, Hence, Hence or otherwise.
2. British English throughout (e.g. "factorise" not "factor", "centre" not "center").
3. "Given that ..." for conditional information. "Hence, ..." for follow-on parts.
4. NEVER start with "A student...", "You are given...", or conversational framing.
5. Every number and variable in the question must be unambiguous. State units explicitly.
6. For non-calculator: use integers, simple fractions, or surds (e.g. $\\sqrt{3}$). No ugly decimals.
7. For calculator: decimals are acceptable. Round answers to 3 significant figures unless stated otherwise.

STRUCTURE RULES:
- Single-part questions (≤ 3 marks): one direct command.
- Multi-part questions (≥ 4 marks): split into (a), (b), (c) and sub-parts (i), (ii) where appropriate.
  - End each part with its mark count in parentheses: "(2)" or "(3 marks)".
  - Use "Hence" or "Hence, or otherwise," to link dependent parts.
- "Show that" / "Prove that" questions: give the target result in the question; explanation must show every algebraic step.
- "Reasoning/Proof" questions: require "Show that", "Prove that", "Explain why", or "Justify".

MARK SCHEME (explanation field):
- Label every mark: M1 (method mark), A1 (accuracy mark), B1 (independent mark).
- Include "ft" where follow-through applies.
- State "cao" (correct answer only) where no ft is allowed.
- Format: "M1 for setting up the equation; A1 for correct answer."

LaTeX:
- Inline math: $...$ (e.g., $x^2 + 3x - 10 = 0$)
- Display math: $$...$$ on its own line
- Commands: \\frac{}{}, \\sqrt{}, \\times, \\div, \\sin, \\cos, \\tan, \\pi, \\leq, \\geq, \\neq
- Separate question parts with \\n in the JSON string — not markdown line breaks

STRICT PROHIBITIONS — never do any of these:
- NEVER include "Show your answer", "Show your working", "Answer:", blank answer lines, dotted lines, or any answer-box language in question_latex
- NEVER use markdown tables (| col | col | --- |). For tabular data use a LaTeX array: $$\\begin{array}{|c|c|}\\hline ... \\hline\\end{array}$$
- NEVER use markdown formatting (**bold**, *italic*, ## headings, - bullets) inside question_latex or explanation
- NEVER end question_latex with a colon or blank line expecting the student to fill in
- question_latex must contain ONLY the question text — no answer section whatsoever

explanation field:
- Write as plain prose steps separated by \\n in the JSON string
- Label marks inline: "M1 for ...; A1 for ..."
- No markdown tables or bullet lists

Always respond with valid JSON only — no markdown code fences, no preamble, no trailing text.`

  const multiPartHint = marks >= 4
    ? `Structure as a multi-part question with parts (a) and (b)${marks >= 6 ? ' and (c)' : ''}. End each part with its mark count in parentheses.`
    : `Single-part question.`

  const userPrompt = `Create a unique ${level} mathematics exam question with the following specifications:

CURRICULUM:
- Level: ${level}
- Sub-Topic: ${sub_topic}${context ? `\n- Additional context: ${context}` : ''}

REQUIREMENTS:
- Question Type: ${question_type}
- Total Marks: ${marks}
- Calculator: ${calculator_allowed ? 'Calculator allowed' : 'Non-calculator — use integers, simple fractions, or surds only'}
- Structure: ${multiPartHint}

TYPE-SPECIFIC GUIDANCE:
${question_type === 'Fluency'
  ? '- Test direct application of a standard procedure.\n- 1–2 clear steps.\n- Avoid narrative framing; use "Find" or "Work out" or "Simplify".'
  : ''}${question_type === 'Problem Solving'
  ? '- Require students to select and connect methods across ≥ 2 steps.\n- May include a real-world context (e.g. area of a shape, cost problem) — keep context brief.\n- The path to the answer should not be immediately obvious.'
  : ''}${question_type === 'Reasoning/Proof'
  ? '- Use "Show that", "Prove that", or "Explain why".\n- State the target result in the question text.\n- The explanation must give every algebraic step as a mark scheme.\n- Non-calculator preferred — use exact values (surds, fractions, π).'
  : ''}

MARK BREAKDOWN GUIDANCE:
${marks === 1 ? '1 mark: B1 for a single correct answer or statement.' : ''}${marks === 2 ? '2 marks: M1 for correct method + A1 for correct answer.' : ''}${marks === 3 ? '3 marks: M1 method + M1 or A1 substitution/simplification + A1 answer.' : ''}${marks === 4 ? '4 marks: split across two parts, or M1 + M1 + A1 + A1 for multi-step.' : ''}${marks === 5 ? '5 marks: two or three sub-parts, each with method and accuracy marks.' : ''}${marks >= 6 ? `${marks} marks: three or more sub-parts with clear mark allocation per part.` : ''}

OUTPUT FORMAT (JSON only):
{
  "question_latex": "Complete question text using LaTeX. Multi-part questions use (a), (b), (i), (ii) labels with mark counts in parentheses at the end of each part.",
  "answer": "Final answer, concise (e.g. \\"x = 3 or x = −5\\")",
  "explanation": "Full mark scheme using M1/A1/B1 labels. Show every step.",
  "marks": ${marks}
}

Return ONLY the JSON object.`

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
        model: 'deepseek/deepseek-v3.2',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 1500,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('OpenRouter API Error:', errorData)
      return NextResponse.json(
        { error: 'Failed to generate question', details: errorData },
        { status: response.status }
      )
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      return NextResponse.json({ error: 'No response from AI model' }, { status: 500 })
    }

    let parsedContent: TextGenResponse
    try {
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsedContent = JSON.parse(cleanedContent)
    } catch {
      console.error('Failed to parse AI response:', content)
      return NextResponse.json(
        { error: 'Invalid response format from AI', raw_content: content },
        { status: 500 }
      )
    }

    if (!parsedContent.question_latex || !parsedContent.answer) {
      return NextResponse.json(
        { error: 'Incomplete response from AI', content: parsedContent },
        { status: 500 }
      )
    }

    // Repair common LaTeX hallucinations before returning to client
    parsedContent.question_latex = repairLatex(parsedContent.question_latex)
    parsedContent.answer = repairLatex(parsedContent.answer)
    if (parsedContent.explanation) parsedContent.explanation = repairLatex(parsedContent.explanation)

    return NextResponse.json({
      success: true,
      data: parsedContent,
      image_url: null,
      content_type: 'generated_text',
      has_diagram: false,
      model: 'deepseek-v3.2',
      curriculum_aware: true,
    })
  } catch (error) {
    console.error('Text generation error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate question',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// =====================================================
// Mode A2: Diagram generation (Claude Haiku)
// =====================================================

interface DiagramGenParams {
  level: string
  sub_topic: string
  topic_name: string
  question_type: 'Fluency' | 'Problem Solving' | 'Reasoning/Proof'
  marks: number
  calculator_allowed: boolean
  context?: string
}

async function handleDiagramGeneration(params: DiagramGenParams): Promise<NextResponse> {
  const { level, sub_topic, topic_name, question_type, marks, calculator_allowed, context } = params

  const userPrompt = `Create a ${level} mathematics question WITH an SVG diagram for this specification:

**CURRICULUM:**
- Level: ${level}
- Topic: ${topic_name || sub_topic}
- Sub-Topic: ${sub_topic}

**QUESTION REQUIREMENTS:**
- Question Type: ${question_type}
- Marks: ${marks}
- Calculator: ${calculator_allowed ? 'Calculator allowed' : 'Non-calculator — use integer or simple fraction values'}${context ? `\n- Additional context: ${context}` : ''}

**DIAGRAM REQUIREMENTS:**
- The diagram must show exactly the geometric configuration the question refers to.
- Label all GIVEN values (lengths, angles) directly in the SVG.
- Mark any UNKNOWN value being asked for as a variable (e.g., $x$, θ) in BOTH the SVG and the question text.
- Use integer coordinates in the 50–350 range on both axes.
- All shapes must be clearly visible — not too small or too large.
${question_type === 'Fluency' ? '- Standard diagram showing the core geometric property.' : ''}${question_type === 'Problem Solving' ? '- Diagram should present a realistic, slightly complex configuration.' : ''}${question_type === 'Reasoning/Proof' ? '- Diagram should support a proof — include all relevant construction lines.' : ''}

STRICT PROHIBITIONS:
- NEVER include "Show your answer", "Show your working", "Answer:", blank answer lines, or answer-box language in question_latex
- NEVER use markdown tables (| col | col |). For tabular data use a LaTeX array environment
- NEVER use markdown formatting (**bold**, *italic*, ## headings) inside question_latex or explanation
- question_latex must contain ONLY the question text — no answer section whatsoever

OUTPUT FORMAT (JSON only, no markdown, no code fences):
{
  "question_latex": "Complete question text with $LaTeX$ math only — no markdown",
  "svg_markup": "<svg viewBox=\\"0 0 400 400\\" ...>...</svg>",
  "answer": "Final answer, e.g. x = 7.4 cm",
  "explanation": "Step-by-step mark scheme using M1/A1/B1 labels — plain prose, no markdown",
  "marks": ${marks},
  "diagram_description": "One sentence describing the diagram"
}

Return ONLY the JSON object.`

  let rawContent: string
  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'Nicolaou Maths - Diagram Question Generator',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-haiku-4-5',
        messages: [
          { role: 'system', content: buildDiagramSystemPrompt() },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('[Diagram Gen] OpenRouter error:', errorData)
      // Fall back to text-only on model failure
      return NextResponse.json(
        { error: 'Diagram generation model unavailable', details: errorData },
        { status: response.status }
      )
    }

    const data = await response.json()
    rawContent = data.choices[0]?.message?.content || ''
  } catch (fetchError) {
    console.error('[Diagram Gen] Network error:', fetchError)
    return NextResponse.json(
      { error: 'Failed to reach diagram generation model' },
      { status: 500 }
    )
  }

  if (!rawContent) {
    return NextResponse.json({ error: 'No response from diagram model' }, { status: 500 })
  }

  // Parse response
  let parsed: DiagramGenResponse
  try {
    const cleaned = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    parsed = JSON.parse(cleaned)
  } catch {
    console.error('[Diagram Gen] Failed to parse response:', rawContent.substring(0, 300))
    return NextResponse.json(
      { error: 'Invalid JSON from diagram model', raw_content: rawContent.substring(0, 300) },
      { status: 500 }
    )
  }

  if (!parsed.question_latex || !parsed.svg_markup || !parsed.answer) {
    return NextResponse.json(
      { error: 'Incomplete diagram generation response', content: parsed },
      { status: 500 }
    )
  }

  // Sanitize SVG
  const sanitized = sanitizeSvg(parsed.svg_markup)
  if (!sanitized.valid) {
    console.warn('[Diagram Gen] SVG failed sanitization:', sanitized.errors)
    // Degrade gracefully — return question without diagram
    return NextResponse.json({
      success: true,
      data: {
        question_latex: parsed.question_latex,
        answer: parsed.answer,
        explanation: parsed.explanation,
        marks: parsed.marks,
      },
      image_url: null,
      content_type: 'generated_text',
      has_diagram: false,
      model: 'claude-haiku-4-5',
      curriculum_aware: true,
      degraded: true,
      degraded_reason: sanitized.errors.join('; '),
    })
  }

  // Upload SVG to Supabase Storage using the service-role client so that RLS
  // does not block server-side uploads (SVG is already sanitized above).
  let imageUrl: string | null = null
  try {
    const sessionClient = await createClient()
    const { data: { user } } = await sessionClient.auth.getUser()
    const userId = user?.id || 'server'

    imageUrl = await uploadSvgToStorage(
      sanitized.svg,
      topic_name || sub_topic,
      userId,
      createAdminClient()
    )
  } catch (uploadError) {
    console.warn('[Diagram Gen] SVG upload failed — degrading to text-only:', uploadError)
  }

  return NextResponse.json({
    success: true,
    data: {
      question_latex: repairLatex(parsed.question_latex),
      answer: repairLatex(parsed.answer),
      explanation: repairLatex(parsed.explanation),
      marks: parsed.marks,
      diagram_description: parsed.diagram_description,
    },
    image_url: imageUrl,
    content_type: imageUrl ? 'synthetic_image' : 'generated_text',
    has_diagram: Boolean(imageUrl),
    model: 'claude-haiku-4-5',
    curriculum_aware: true,
  })
}

// =====================================================
// Legacy text generation (topic/tier, no curriculum)
// =====================================================

async function handleLegacyTextGeneration(request: TextGenRequest): Promise<NextResponse> {
  const { topic, tier } = request

  if (!topic || !tier) {
    return NextResponse.json(
      { error: 'Either (level, sub_topic) or (topic, tier) is required' },
      { status: 400 }
    )
  }

  const systemPrompt = `You are an expert Pearson Edexcel GCSE mathematics question writer. Always respond with valid JSON only — no markdown code fences, no preamble, no trailing text.

STRICT PROHIBITIONS — never do any of these:
- NEVER include "Show your answer", "Show your working", "Answer:", blank answer lines, or answer-box language in question_latex
- NEVER use markdown tables (| col | col | --- |). For tabular data use a LaTeX array: $$\\begin{array}{|c|c|}\\hline ... \\hline\\end{array}$$
- NEVER use markdown formatting (**bold**, *italic*, ## headings, - bullets) inside question_latex or explanation
- question_latex must contain ONLY the question text — no answer section whatsoever`

  const userPrompt = `Create a unique GCSE Maths question on ${topic} for ${tier} tier.

Requirements:
- Appropriate for ${tier} tier GCSE students
- Use Edexcel command words: Work out, Find, Calculate, Solve, Simplify, Show that, etc.
- Inline math: $...$ — display math: $$...$$
- Use \\frac{}{}, \\sqrt{}, \\times, \\div, \\pi as needed
- For tabular data use LaTeX array environments, never markdown tables
- question_latex is ONLY the question — no answer lines, no "Show your answer"
- explanation: plain prose mark scheme with M1/A1/B1 labels, no markdown

Output ONLY valid JSON:
{
  "question_latex": "Question text with $LaTeX$ math — no markdown, no answer section",
  "answer": "Concise final answer",
  "explanation": "Step-by-step mark scheme: M1 for ...; A1 for ..."
}

Return ONLY the JSON object.`

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
        model: 'deepseek/deepseek-v3.2',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 1500,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: 'Failed to generate question', details: errorData },
        { status: response.status }
      )
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      return NextResponse.json({ error: 'No response from AI model' }, { status: 500 })
    }

    let parsedContent: TextGenResponse
    try {
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsedContent = JSON.parse(cleanedContent)
    } catch {
      return NextResponse.json(
        { error: 'Invalid response format from AI', raw_content: content },
        { status: 500 }
      )
    }

    if (!parsedContent.question_latex || !parsedContent.answer) {
      return NextResponse.json(
        { error: 'Incomplete response from AI', content: parsedContent },
        { status: 500 }
      )
    }

    parsedContent.question_latex = repairLatex(parsedContent.question_latex)
    parsedContent.answer = repairLatex(parsedContent.answer)
    if (parsedContent.explanation) parsedContent.explanation = repairLatex(parsedContent.explanation)

    return NextResponse.json({
      success: true,
      data: parsedContent,
      image_url: null,
      content_type: 'generated_text',
      has_diagram: false,
      model: 'deepseek/deepseek-v3.2',
      curriculum_aware: false,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to generate question',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// =====================================================
// Mode B: Image OCR (Qwen 2.5 VL)
// =====================================================

async function handleImageOCR(request: ImageOCRRequest): Promise<NextResponse> {
  const { image_url } = request

  if (!image_url) {
    return NextResponse.json({ error: 'image_url is required for OCR' }, { status: 400 })
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
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: image_url } },
              { type: 'text', text: 'Extract the mathematical question from this image and convert it to LaTeX format. Return only JSON.' },
            ],
          },
        ],
        temperature: 0.2,
        max_tokens: 1500,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: 'Failed to process image', details: errorData },
        { status: response.status }
      )
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      return NextResponse.json({ error: 'No response from OCR model' }, { status: 500 })
    }

    let parsedContent: ImageOCRResponse
    try {
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsedContent = JSON.parse(cleanedContent)
    } catch {
      return NextResponse.json(
        { error: 'Invalid response format from OCR', raw_content: content },
        { status: 500 }
      )
    }

    if (!parsedContent.question_latex) {
      return NextResponse.json(
        { error: 'Incomplete response from OCR', content: parsedContent },
        { status: 500 }
      )
    }

    if (!parsedContent.suggested_topic) parsedContent.suggested_topic = 'General'
    if (!parsedContent.suggested_difficulty) parsedContent.suggested_difficulty = 'Foundation'

    return NextResponse.json({
      success: true,
      data: parsedContent,
      model: 'qwen-2-vl-7b',
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to process image',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
