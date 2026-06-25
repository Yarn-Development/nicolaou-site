import { NextRequest, NextResponse } from 'next/server'
import { sanitize } from '@/lib/question-sanitizer'
import { needsDiagram } from '@/lib/diagram-utils'
import { renderDiagram, getTemplateForSubtopic, DIAGRAM_TEMPLATE_SPEC } from '@/lib/diagram-templates'
import { validateQuestion } from '@/lib/question-validator'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
// PRD §7.1: claude-sonnet-4-6 is the specified model for question generation
const GENERATION_MODEL   = 'anthropic/claude-sonnet-4-6'
const MAX_ATTEMPTS       = 3

if (!OPENROUTER_API_KEY) {
  console.error('⚠️  OPENROUTER_API_KEY is not set in environment variables')
}

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface TextGenRequest {
  type: 'text_gen'
  // Legacy fields (still supported)
  topic?: string
  tier?: 'Foundation' | 'Higher'
  // Curriculum-aware fields
  level?: string
  topic_name?: string  // Broader topic area (e.g. "Algebra") for better prompt context
  sub_topic?: string
  question_type?: 'Fluency' | 'Problem Solving' | 'Reasoning/Proof'
  marks?: number
  calculator_allowed?: boolean
  context?: string
  // PRD §6: Multi-board support
  exam_board?: 'Edexcel' | 'AQA' | 'OCR' | 'MEI' | 'WJEC' | 'CIE' | 'IB'
}

interface ImageOCRRequest {
  type: 'image_ocr'
  image_url: string
}

type AIRequest = TextGenRequest | ImageOCRRequest

/** Shape of the JSON the generation model must return */
interface GeneratedQuestion {
  question_latex: string
  mark_scheme_latex: string
  answer: string
  command_word: string
  verification_expression: string | null
  marks?: number
  // Present only when diagram is required
  diagram?: {
    type: string
    params: Record<string, unknown>
  }
}

// ─────────────────────────────────────────────
// Pre-parse LaTeX backslash repair
// ─────────────────────────────────────────────

const LATEX_COMMANDS = [
  'frac', 'sqrt', 'times', 'div', 'theta', 'alpha', 'beta', 'gamma',
  'delta', 'epsilon', 'zeta', 'eta', 'iota', 'kappa', 'lambda', 'mu',
  'nu', 'xi', 'pi', 'rho', 'sigma', 'tau', 'upsilon', 'phi', 'chi',
  'psi', 'omega', 'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi',
  'Sigma', 'Upsilon', 'Phi', 'Psi', 'Omega',
  'textbf', 'text', 'mathrm', 'mathit', 'mathbf', 'mathbb',
  'left', 'right', 'cdot', 'ldots', 'cdots', 'pm', 'mp',
  'leq', 'geq', 'neq', 'approx', 'equiv', 'sim',
  'infty', 'partial', 'nabla', 'forall', 'exists',
  'sum', 'prod', 'int', 'oint',
  'hat', 'vec', 'bar', 'tilde', 'dot', 'ddot',
  'overline', 'underline', 'overbrace', 'underbrace',
  'begin', 'end', 'quad', 'qquad', 'hspace', 'vspace',
  'sin', 'cos', 'tan', 'ln', 'log', 'lim', 'max', 'min',
]

function repairLatexBackslashes(raw: string): string {
  const pattern = new RegExp(
    `(?<!\\\\)\\\\(${LATEX_COMMANDS.join('|')})(?=[^a-zA-Z]|$)`,
    'g'
  )
  return raw.replace(pattern, '\\\\$1')
}

// ─────────────────────────────────────────────
// LaTeX structural validation
// ─────────────────────────────────────────────

function detectLatexIssues(text: string): string[] {
  const issues: string[] = []

  const withoutDisplay = text.replace(/\$\$[\s\S]*?\$\$/g, '')
  const singleCount = (withoutDisplay.match(/(?<!\\)\$/g) || []).length
  if (singleCount % 2 !== 0) {
    issues.push(`Unbalanced $ signs (${singleCount} found)`)
  }

  const displayCount = (text.match(/\$\$/g) || []).length
  if (displayCount % 2 !== 0) {
    issues.push(`Unbalanced $$ delimiters (${displayCount} found)`)
  }

  const mathRegions = [
    ...(text.match(/\$\$[\s\S]*?\$\$/g) || []),
    ...(text.match(/\$[^$]+?\$/g) || []),
  ]
  for (const region of mathRegions) {
    let depth = 0
    for (const ch of region) {
      if (ch === '{') depth++
      if (ch === '}') depth--
      if (depth < 0) break
    }
    if (depth !== 0) {
      issues.push('Unbalanced braces in math region')
      break
    }
  }

  if (/\\\[|\\\]/.test(text)) issues.push('Unsanitized \\[ \\] block math delimiters')
  if (/\\\(|\\\)/.test(text)) issues.push('Unsanitized \\( \\) inline math delimiters')

  return issues
}

// ─────────────────────────────────────────────
// OpenRouter API call
// ─────────────────────────────────────────────

async function callOpenRouter(opts: {
  model: string
  messages: Array<{ role: string; content: string }>
  temperature: number
  max_tokens: number
}): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      'X-Title': 'Nicolaou Maths - Question Generator',
    },
    body: JSON.stringify(opts),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`OpenRouter API error ${response.status}: ${JSON.stringify(errorData)}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('No content in OpenRouter response')
  return content as string
}

// ─────────────────────────────────────────────
// Prompt builders
// ─────────────────────────────────────────────

const BOARD_STYLE_NOTES: Record<string, string> = {
  Edexcel: 'Pearson Edexcel house style: command words (Show that, Hence, Find, Prove, Calculate, Work out, Write down), M/A/B mark notation, British English.',
  AQA: 'AQA house style: command words (Show, Calculate, Find, Determine, Explain, Prove, Sketch). Mark notation similar to Edexcel. Avoid "Hence" as a primary command word.',
  OCR: 'OCR house style: may use "Hence or otherwise", "State", "Justify". Notation is clean and unambiguous. Mark scheme often specifies method explicitly.',
  MEI: 'MEI house style: proof-heavy, clear mathematical argument expected. Often includes "show that" and "hence deduce".',
  WJEC: 'WJEC house style: plain English instructions, may include Welsh context. Command words similar to Edexcel.',
  CIE: 'Cambridge (CIE) IGCSE/A Level house style: "Find", "Show", "Prove", "Hence". International context — avoid UK-specific slang.',
  IB: 'IB Maths house style: very precise mathematical language, "Show that", "Hence find", "Prove". Both exact and decimal answers often required.',
}

function buildSystemPrompt(hasDiagram: boolean, examBoard?: string): string {
  const boardNote = examBoard ? (BOARD_STYLE_NOTES[examBoard] ?? '') : BOARD_STYLE_NOTES['Edexcel']
  const boardName = examBoard ?? 'Edexcel'

  const base = `You are an expert UK mathematics exam question writer. You write questions indistinguishable from authentic ${boardName} past papers.

PERSONA: ${boardName} question author with 20+ years of experience. ${boardNote}

STRICT OUTPUT RULES — ALL MUST BE FOLLOWED:
- Return ONLY a raw JSON object — no markdown, no code fences, no preamble, no explanation
- question_latex: use $...$ for inline math, $$...$$ for display equations only
- NEVER use \\[ \\] or \\( \\) — ONLY use $ and $$
- NEVER use **bold** Markdown — use \\textbf{} if bold is needed
- NEVER escape backslashes in LaTeX commands — write \\frac not \\\\frac
- All \\frac must have two brace arguments: \\frac{numerator}{denominator}
- All \\sqrt must have a brace argument: \\sqrt{expression}
- The question text must read exactly as it would appear printed on a ${boardName} exam paper
- No "Question:", no preamble, no trailing "[3 marks]" suffix in question_latex
- mark_scheme_latex: each mark on its own line, e.g. "M1: state the formula\\nA1: correct substitution\\nA1: 12 (answer)"
- command_word: single lowercase word/phrase: find | show | calculate | prove | hence | work out | write down | sketch | state | determine | explain | justify
- verification_expression: for numeric answers write a verifiable expression (e.g. "sqrt(3^2 + 4^2) = 5"); for proofs/explanations use null

QUALITY STANDARDS:
- Mathematical content must be 100% correct
- Mark scheme must lead precisely to the stated answer with no gaps or errors
- The question must be self-contained — a student can solve it without additional context
- Difficulty and phrasing must match the target level authentically`

  if (!hasDiagram) return base

  return `${base}

${DIAGRAM_TEMPLATE_SPEC}

When the question requires a diagram, include the "diagram" field with the appropriate template and params.
If no standard template fits, omit the "diagram" field and the question will fall back to free-form SVG generation.`
}

function buildUserPrompt(opts: {
  request: TextGenRequest
  hasDiagram: boolean
  templateType: string | null
  previousFailureReason: string | null
  attempt: number
}): string {
  const { request, hasDiagram, templateType, previousFailureReason, attempt } = opts
  const {
    level,
    topic_name,
    sub_topic,
    question_type = 'Fluency',
    marks = 3,
    calculator_allowed = true,
    context,
    exam_board = 'Edexcel',
  } = request

  const retryNote = previousFailureReason && attempt > 1
    ? `\n⚠️ PREVIOUS ATTEMPT FAILED — fix this issue: ${previousFailureReason}\n`
    : ''

  const diagramNote = hasDiagram
    ? `\nDIAGRAM REQUIRED: This sub-topic needs a diagram. Use the "${templateType ?? 'most appropriate'}" template.`
    : ''

  const typeGuidance = {
    'Fluency': '- Test direct application of a standard procedure\n- 1–2 clear steps, no extended reasoning',
    'Problem Solving': '- Require multi-step reasoning in an unfamiliar or applied context\n- Student must select appropriate methods',
    'Reasoning/Proof': '- Use "show that", "prove", or "explain why"\n- Test understanding of mathematical structure, not just calculation',
  }[question_type] ?? ''

  const markGuidance = marks === 1
    ? '- Single step or recall fact'
    : marks === 2
    ? '- Method mark + accuracy mark, or two independent facts'
    : marks <= 4
    ? '- Multi-step: method, substitution, and accuracy marks'
    : '- Extended response: multiple methods, communication marks or proof'

  const calcGuidance = calculator_allowed
    ? '- Decimal/complex calculations acceptable'
    : '- Non-calculator: use integers or simple fractions — no awkward surds or complex decimals'

  const outputSchema = hasDiagram
    ? `{
  "question_latex": "...",
  "mark_scheme_latex": "M1: ...\\nA1: ...\\nA1: ...",
  "answer": "...",
  "command_word": "...",
  "verification_expression": "..." or null,
  "marks": ${marks},
  "diagram": {
    "type": "${templateType ?? '<template_name>'}",
    "params": { ... }
  }
}`
    : `{
  "question_latex": "...",
  "mark_scheme_latex": "M1: ...\\nA1: ...\\nA1: ...",
  "answer": "...",
  "command_word": "...",
  "verification_expression": "..." or null,
  "marks": ${marks}
}`

  return `${retryNote}Create a ${level} mathematics exam question for ${exam_board}:

SPECIFICATION:
- Exam Board: ${exam_board}
- Level: ${level}${topic_name ? `\n- Topic area: ${topic_name}` : ''}
- Sub-topic: ${sub_topic}
- Question type: ${question_type}
- Marks: ${marks}
- Calculator: ${calculator_allowed ? 'Allowed' : 'NOT allowed (non-calculator)'}${context ? `\n- Additional context: ${context}` : ''}${diagramNote}

QUESTION TYPE GUIDANCE:
${typeGuidance}

MARK ALLOCATION GUIDANCE:
${markGuidance}

CALCULATOR GUIDANCE:
${calcGuidance}

LANGUAGE & STYLE:
- Write exactly as it would appear on a printed ${exam_board} exam paper
- Start with the scenario/context (if any), then the mathematical instruction
- British English (metres, favour, recognise, practise)
- State required precision (e.g. "Give your answer correct to 2 decimal places") where appropriate
- Do NOT include "(${marks} marks)" or any mark annotation in the question text

OUTPUT — return ONLY this JSON object, no other text:
${outputSchema}`
}

function buildLegacyPrompt(request: TextGenRequest): { system: string; user: string } {
  const { topic, tier } = request
  return {
    system: `You are a GCSE mathematics exam question writer producing questions in Pearson Edexcel style.
Return ONLY a raw JSON object — no markdown, no code fences, no preamble.
Use $...$ for inline math and $$...$$ for display math. Never use \\[ \\] or \\( \\).
Never use **bold** Markdown — use \\textbf{} if bold is needed.
All \\frac must have two brace arguments. All \\sqrt must have a brace argument.`,
    user: `Create a unique GCSE Maths question on the topic of ${topic} for ${tier} tier.

Requirements:
- Appropriate difficulty for ${tier} tier GCSE
- Written exactly as it would appear on a printed Pearson Edexcel exam paper
- Begin with the scenario/context, then the instruction
- Do NOT include question numbers, mark allocations, or metadata in question_latex

Return ONLY this JSON object:
{
  "question_latex": "...",
  "mark_scheme_latex": "M1: ...\\nA1: ...",
  "answer": "...",
  "command_word": "find",
  "verification_expression": null,
  "marks": 3
}`,
  }
}

// ─────────────────────────────────────────────
// Parse and sanitize model output
// ─────────────────────────────────────────────

function parseGeneratedQuestion(raw: string): GeneratedQuestion {
  const cleaned = repairLatexBackslashes(
    raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  )

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error(`JSON parse failed. Raw content started: ${raw.slice(0, 120)}`)
  }

  if (!parsed.question_latex || typeof parsed.question_latex !== 'string') {
    throw new Error('Missing or invalid "question_latex" field')
  }
  if (!parsed.answer || typeof parsed.answer !== 'string') {
    throw new Error('Missing or invalid "answer" field')
  }
  if (!parsed.mark_scheme_latex || typeof parsed.mark_scheme_latex !== 'string') {
    throw new Error('Missing "mark_scheme_latex" — the model must include a mark scheme')
  }

  return {
    question_latex:          sanitize(parsed.question_latex as string),
    mark_scheme_latex:       sanitize(parsed.mark_scheme_latex as string),
    answer:                  sanitize(parsed.answer as string),
    command_word:            (parsed.command_word as string | undefined) ?? 'find',
    verification_expression: (parsed.verification_expression as string | null | undefined) ?? null,
    marks:                   typeof parsed.marks === 'number' ? parsed.marks : undefined,
    diagram:                 parsed.diagram as GeneratedQuestion['diagram'],
  }
}

// ─────────────────────────────────────────────
// Main route
// ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 500 })
    }

    const body = await request.json() as AIRequest

    if (body.type === 'text_gen') {
      return await handleTextGeneration(body)
    } else if (body.type === 'image_ocr') {
      return await handleImageOCR(body)
    } else {
      return NextResponse.json({ error: 'Invalid request type. Must be "text_gen" or "image_ocr"' }, { status: 400 })
    }
  } catch (error) {
    console.error('AI API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// ─────────────────────────────────────────────
// Text generation handler
// ─────────────────────────────────────────────

async function handleTextGeneration(request: TextGenRequest): Promise<NextResponse> {
  const isCurriculumAware = Boolean(request.level && request.sub_topic)

  // Legacy path — fast, no retries or validation (backward compat)
  if (!isCurriculumAware) {
    if (!request.topic || !request.tier) {
      return NextResponse.json(
        { error: 'Either (level, sub_topic) or (topic, tier) is required' },
        { status: 400 }
      )
    }
    return handleLegacyGeneration(request)
  }

  // Determine diagram requirements
  const subTopic  = request.sub_topic!
  const level     = request.level!
  const examBoard = request.exam_board
  const hasDiagram    = needsDiagram(level, subTopic)
  const templateType  = hasDiagram ? getTemplateForSubtopic(subTopic) : null
  const systemPrompt  = buildSystemPrompt(hasDiagram, examBoard)

  let lastFailureReason: string | null = null

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const userPrompt = buildUserPrompt({
        request,
        hasDiagram,
        templateType,
        previousFailureReason: lastFailureReason,
        attempt,
      })

      // ── Step 1: Generate ──────────────────────────────────────
      const rawContent = await callOpenRouter({
        model: GENERATION_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 2000,
      })

      // ── Step 2: Parse + sanitize ──────────────────────────────
      let parsed: GeneratedQuestion
      try {
        parsed = parseGeneratedQuestion(rawContent)
      } catch (err) {
        lastFailureReason = err instanceof Error ? err.message : 'JSON parse or schema error'
        console.warn(`[generate] Attempt ${attempt}/${MAX_ATTEMPTS} — parse failed: ${lastFailureReason}`)
        continue
      }

      // ── Step 3: LaTeX integrity ───────────────────────────────
      const latexIssues = detectLatexIssues(parsed.question_latex)
      if (latexIssues.length > 0) {
        lastFailureReason = `LaTeX error: ${latexIssues.join('; ')}`
        console.warn(`[generate] Attempt ${attempt}/${MAX_ATTEMPTS} — LaTeX invalid: ${lastFailureReason}`)
        continue
      }

      // ── Step 4: Diagram template rendering ───────────────────
      let svgMarkup: string | undefined
      if (hasDiagram && parsed.diagram?.type) {
        try {
          svgMarkup = renderDiagram(parsed.diagram.type, parsed.diagram.params ?? {})
        } catch (err) {
          lastFailureReason = `Diagram error: ${err instanceof Error ? err.message : 'invalid template params'}. Available types: right_triangle, general_triangle, quadratic_curve, straight_line, circle, sector, histogram, box_plot, cumulative_frequency, venn_2, tree_diagram, number_line, vector_parallelogram, scatter_plot, bar_chart`
          console.warn(`[generate] Attempt ${attempt}/${MAX_ATTEMPTS} — diagram failed: ${lastFailureReason}`)
          continue
        }
      }

      // ── Step 5: LLM answer validation ────────────────────────
      const validation = await validateQuestion({
        questionLatex:          parsed.question_latex,
        markScheme:             parsed.mark_scheme_latex,
        answer:                 parsed.answer,
        commandWord:            parsed.command_word,
        verificationExpression: parsed.verification_expression,
        apiKey:                 OPENROUTER_API_KEY!,
      })

      if (!validation.valid) {
        lastFailureReason = `Answer validation failed: ${validation.issue}`
        console.warn(`[generate] Attempt ${attempt}/${MAX_ATTEMPTS} — validation failed: ${validation.issue}`)
        continue
      }

      // ── All checks passed ─────────────────────────────────────
      return NextResponse.json({
        success: true,
        data: {
          question_latex:          parsed.question_latex,
          mark_scheme_latex:       parsed.mark_scheme_latex,
          answer:                  parsed.answer,
          command_word:            parsed.command_word,
          verification_expression: parsed.verification_expression,
          marks:                   parsed.marks ?? request.marks,
          ...(svgMarkup ? { svg_markup: svgMarkup } : {}),
        },
        model:            GENERATION_MODEL,
        curriculum_aware: true,
        attempts:         attempt,
      })

    } catch (err) {
      // Network or unexpected error — retry with the error message
      lastFailureReason = err instanceof Error ? err.message : 'Unknown error'
      console.warn(`[generate] Attempt ${attempt}/${MAX_ATTEMPTS} — unexpected error: ${lastFailureReason}`)
    }
  }

  // All attempts exhausted
  return NextResponse.json(
    {
      error:      'Failed to generate a valid question after 3 attempts',
      last_issue: lastFailureReason,
    },
    { status: 422 }
  )
}

// ─────────────────────────────────────────────
// Legacy path (topic + tier, backward compat)
// ─────────────────────────────────────────────

async function handleLegacyGeneration(request: TextGenRequest): Promise<NextResponse> {
  const { system, user } = buildLegacyPrompt(request)

  try {
    const rawContent = await callOpenRouter({
      model: GENERATION_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user',   content: user },
      ],
      temperature: 0.8,
      max_tokens: 1500,
    })

    let parsed: GeneratedQuestion
    try {
      parsed = parseGeneratedQuestion(rawContent)
    } catch {
      return NextResponse.json({ error: 'Invalid response format from AI', raw_content: rawContent }, { status: 500 })
    }

    const latexIssues = detectLatexIssues(parsed.question_latex)
    if (latexIssues.length > 0) {
      return NextResponse.json({ error: 'Generated question contains malformed LaTeX', issues: latexIssues }, { status: 422 })
    }

    return NextResponse.json({
      success: true,
      data: {
        question_latex:    parsed.question_latex,
        mark_scheme_latex: parsed.mark_scheme_latex,
        answer:            parsed.answer,
        command_word:      parsed.command_word,
        marks:             parsed.marks,
      },
      model:            GENERATION_MODEL,
      curriculum_aware: false,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate question', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// ─────────────────────────────────────────────
// Image OCR handler (unchanged)
// ─────────────────────────────────────────────

interface ImageOCRResponse {
  question_latex: string
  suggested_topic: string
  suggested_difficulty: 'Foundation' | 'Higher'
}

async function handleImageOCR(request: ImageOCRRequest): Promise<NextResponse> {
  const { image_url } = request

  if (!image_url) {
    return NextResponse.json({ error: 'image_url is required for OCR' }, { status: 400 })
  }

  const systemPrompt = `You are a specialized OCR engine for mathematics. Extract ALL text and mathematical notation from the image, convert to LaTeX, and suggest the topic and difficulty.

Use $...$ for inline math and $$...$$ for display math. Return ONLY valid JSON:
{
  "question_latex": "...",
  "suggested_topic": "...",
  "suggested_difficulty": "Foundation" or "Higher"
}`

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'Nicolaou Maths - Question OCR',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4-6',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: image_url } },
              { type: 'text', text: 'Extract the mathematical question from this image and convert it to LaTeX. Return only JSON.' },
            ],
          },
        ],
        temperature: 0.2,
        max_tokens: 1500,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json({ error: 'Failed to process image', details: errorData }, { status: response.status })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) return NextResponse.json({ error: 'No response from OCR model' }, { status: 500 })

    const cleanedContent = repairLatexBackslashes(
      content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    )

    let parsedContent: ImageOCRResponse
    try {
      parsedContent = JSON.parse(cleanedContent)
    } catch {
      return NextResponse.json({ error: 'Invalid response format from OCR', raw_content: content }, { status: 500 })
    }

    if (!parsedContent.question_latex) {
      return NextResponse.json({ error: 'Incomplete response from OCR', content: parsedContent }, { status: 500 })
    }

    parsedContent.suggested_topic      = parsedContent.suggested_topic ?? 'General'
    parsedContent.suggested_difficulty = parsedContent.suggested_difficulty ?? 'Foundation'
    parsedContent.question_latex       = sanitize(parsedContent.question_latex)

    return NextResponse.json({ success: true, data: parsedContent, model: 'qwen-2-vl-7b' })

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process image', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
