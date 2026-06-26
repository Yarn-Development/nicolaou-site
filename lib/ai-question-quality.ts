import katex from "katex"
import { repairLatex } from "@/lib/latex-utils"
import { sanitize } from "@/lib/question-sanitizer"
import { validateQuestion } from "@/lib/question-validator"

export interface GeneratedQuestionDraft {
  questionLatex: string
  answer: string
  explanation: string
  marks?: number
  diagramDescription?: string
}

export interface QualityGateOptions {
  expectedMarks?: number
  allowEmptyAnswer?: boolean
  hasDiagram?: boolean
  requireExplanation?: boolean
  runMathValidation?: boolean
  apiKey?: string
}

export interface QualityGateResult {
  ok: boolean
  question: GeneratedQuestionDraft
  issues: string[]
}

/**
 * Parse LLM JSON while preserving common LaTeX backslash sequences.
 * Plain JSON.parse is brittle when a model emits "\frac" rather than "\\frac".
 */
export function safeParseJSON<T = unknown>(content: string): T | null {
  const cleaned = content
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim()

  const attempts = [
    cleaned,
    cleaned.replace(/(?<!\\)\\(?!\\|"|n|r|t|b|f|u[0-9a-fA-F]{4})/g, "\\\\"),
    cleaned
      .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, "")
      .replace(/\n/g, "\\n")
      .replace(/\t/g, "\\t"),
  ]

  for (const candidate of attempts) {
    try {
      return JSON.parse(candidate) as T
    } catch {
      // Try the next strategy.
    }
  }

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const extracted = jsonMatch[0].replace(
        /(?<!\\)\\(?!\\|"|n|r|t|b|f|u[0-9a-fA-F]{4})/g,
        "\\\\"
      )
      return JSON.parse(extracted) as T
    } catch {
      return null
    }
  }

  return null
}

export function normalizeGeneratedQuestion(raw: unknown): GeneratedQuestionDraft {
  const data = (raw ?? {}) as Record<string, unknown>
  const answerKey = (data.answerKey ?? data.answer_key ?? {}) as Record<string, unknown>

  return {
    questionLatex: stringValue(data.question_latex ?? data.questionLatex),
    answer: stringValue(data.answer ?? answerKey.answer),
    explanation: stringValue(
      data.explanation ??
        data.mark_scheme_latex ??
        data.markSchemeLatex ??
        data.mark_scheme ??
        answerKey.explanation ??
        answerKey.mark_scheme
    ),
    marks: numberValue(data.marks),
    diagramDescription: stringValue(data.diagram_description ?? data.diagramDescription) || undefined,
  }
}

export async function qualityGateQuestion(
  draft: GeneratedQuestionDraft,
  options: QualityGateOptions = {}
): Promise<QualityGateResult> {
  const question = normalizeQuestionFields(draft)
  const issues = lintQuestion(question, options)

  if (
    issues.length === 0 &&
    options.runMathValidation &&
    options.apiKey &&
    question.answer
  ) {
    const validation = await validateQuestion({
      questionLatex: question.questionLatex,
      markScheme: question.explanation,
      answer: question.answer,
      commandWord: inferCommandWord(question.questionLatex),
      verificationExpression: null,
      apiKey: options.apiKey,
      failClosed: true,
    })

    if (!validation.valid) {
      issues.push(validation.issue ?? "Answer or mark scheme failed mathematical validation")
    }
  }

  return {
    ok: issues.length === 0,
    question,
    issues,
  }
}

export function lintQuestion(
  question: GeneratedQuestionDraft,
  options: QualityGateOptions = {}
): string[] {
  const issues: string[] = []
  const text = question.questionLatex.trim()
  const answer = question.answer.trim()
  const explanation = question.explanation.trim()
  const expectedMarks = options.expectedMarks ?? question.marks

  if (!text) issues.push("Missing question text")
  if (!answer && !options.allowEmptyAnswer) issues.push("Missing answer")
  if ((options.requireExplanation ?? true) && !explanation) issues.push("Missing mark scheme or explanation")
  if (expectedMarks !== undefined && (!Number.isFinite(expectedMarks) || expectedMarks <= 0)) {
    issues.push("Marks must be a positive number")
  }

  if (/\n?\s*(answer|solution|mark\s*scheme)\s*:/i.test(text)) {
    issues.push("Question text contains answer, solution, or mark-scheme section")
  }
  if (/(^|\n)\s*\|.*\|/.test(text)) {
    issues.push("Question text contains a markdown table")
  }
  if (/(^|\n)\s*#{1,6}\s|\*\*[^*]+\*\*|__[^_]+__/.test(text)) {
    issues.push("Question text contains markdown formatting")
  }
  if (/\[(?:answer\s+here|write\s+answer|student\s+answer)[^\]]*\]/i.test(text) || /_{4,}/.test(text)) {
    issues.push("Question text contains answer placeholder content")
  }
  if (/\.\.\./.test(text)) {
    issues.push("Question text contains ellipsis placeholder")
  }
  if (/:\s*$/.test(text)) {
    issues.push("Question text ends with a dangling colon")
  }
  if (/\b(the\s+diagram|the\s+figure|diagram\s+shows|figure\s+shows)\b/i.test(text) && !options.hasDiagram) {
    issues.push("Question refers to a diagram or figure but no diagram is attached")
  }

  const mathIssues = validateLatexSpans(text)
  issues.push(...mathIssues)

  const partMarks = extractPartMarks(text)
  if (expectedMarks !== undefined && partMarks.length >= 2) {
    const sum = partMarks.reduce((total, mark) => total + mark, 0)
    if (sum !== expectedMarks) {
      issues.push(`Part marks sum to ${sum}, expected ${expectedMarks}`)
    }
  }

  const labelledMarks = explanation.match(/\b[MBAC]\d\b/g) ?? []
  if ((options.requireExplanation ?? true) && expectedMarks !== undefined && expectedMarks > 1 && labelledMarks.length === 0) {
    issues.push("Mark scheme does not use examiner mark labels such as M1, A1, or B1")
  }

  return [...new Set(issues)]
}

export function validateLatexSpans(text: string): string[] {
  const issues: string[] = []
  const singleDollarCount = countSingleDollars(text)
  if (singleDollarCount % 2 !== 0) {
    issues.push("Unbalanced inline LaTeX dollar delimiters")
  }

  const spans = collectMathSpans(text)
  for (const span of spans) {
    try {
      katex.renderToString(span.content, {
        displayMode: span.displayMode,
        throwOnError: true,
        strict: false,
        trust: false,
      })
    } catch (error) {
      const detail = error instanceof Error ? error.message : "unknown KaTeX error"
      issues.push(`Invalid LaTeX: ${detail}`)
      break
    }
  }

  return issues
}

export function lintSvgConsistency(_questionLatex: string, svgMarkup: string): string[] {
  const issues: string[] = []
  if (!svgMarkup.includes("<text")) {
    issues.push("SVG diagram contains no text labels")
  }

  return issues
}

function normalizeQuestionFields(draft: GeneratedQuestionDraft): GeneratedQuestionDraft {
  return {
    questionLatex: sanitize(repairLatex(draft.questionLatex ?? "")),
    answer: sanitize(repairLatex(draft.answer ?? "")),
    explanation: sanitize(repairLatex(draft.explanation ?? "")),
    marks: draft.marks,
    diagramDescription: draft.diagramDescription,
  }
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === "number") return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function countSingleDollars(text: string): number {
  let count = 0
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== "$" || text[i - 1] === "\\") continue
    if (text[i + 1] === "$") {
      i++
      continue
    }
    count++
  }
  return count
}

function collectMathSpans(text: string): Array<{ content: string; displayMode: boolean }> {
  const spans: Array<{ content: string; displayMode: boolean }> = []
  let i = 0

  while (i < text.length) {
    if (text[i] === "$" && text[i + 1] === "$") {
      const end = text.indexOf("$$", i + 2)
      if (end === -1) break
      spans.push({ content: text.slice(i + 2, end), displayMode: true })
      i = end + 2
      continue
    }

    if (text[i] === "$" && text[i - 1] !== "\\") {
      let end = i + 1
      while (end < text.length && !(text[end] === "$" && text[end - 1] !== "\\")) end++
      if (end >= text.length) break
      spans.push({ content: text.slice(i + 1, end), displayMode: false })
      i = end + 1
      continue
    }

    i++
  }

  return spans
}

function extractPartMarks(text: string): number[] {
  const hasPartLabels = /\([a-z]\)|\([ivx]+\)/i.test(text)
  if (!hasPartLabels) return []
  const matches = text.matchAll(/\((\d{1,2})\s*(?:marks?|m)?\)/gi)
  return [...matches].map((match) => Number(match[1])).filter((n) => Number.isFinite(n))
}

function inferCommandWord(questionLatex: string): string {
  const match = questionLatex.match(/\b(Work out|Find|Calculate|Solve|Factorise|Expand|Simplify|Show that|Prove that|Explain why|Write down|Express|Give|Determine|Sketch|Hence)\b/i)
  return match?.[1]?.toLowerCase() ?? "find"
}
