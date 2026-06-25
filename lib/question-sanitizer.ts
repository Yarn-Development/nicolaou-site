/**
 * Question Sanitizer — Exam-Ready Content Cleanup
 *
 * Shared utility for cleaning AI-generated question content to be
 * indistinguishable from genuine Pearson Edexcel exam paper questions.
 *
 * Used by:
 * - Shadow paper generation (runtime, server-side)
 * - Database sanitizer script (CLI)
 * - LaTeX preview component (client-side pre-processing)
 */

// =====================================================
// TYPES
// =====================================================

export interface SanitizeResult {
  cleaned: string
  changes: string[]
}

// =====================================================
// INDIVIDUAL SANITIZATION RULES
// =====================================================

/**
 * Strip Markdown code-block wrappers (```latex ... ```)
 */
function stripMarkdownWrappers(text: string): SanitizeResult {
  const cleaned = text
    .replace(/```(?:latex|math|json|)\s*\n?/g, '')
    .replace(/```\s*$/gm, '')
  return {
    cleaned,
    changes: cleaned !== text ? ['Removed Markdown wrappers'] : [],
  }
}

/**
 * Fix block math delimiters: \[ \] → $$
 */
function fixBlockMath(text: string): SanitizeResult {
  const cleaned = text
    .replace(/\\\[/g, '$$')
    .replace(/\\\]/g, '$$')
  return {
    cleaned,
    changes: cleaned !== text ? ['Fixed block math delimiters'] : [],
  }
}

/**
 * Fix inline math delimiters: \( \) → $
 */
function fixInlineMath(text: string): SanitizeResult {
  const cleaned = text
    .replace(/\\\(/g, '$')
    .replace(/\\\)/g, '$')
  return {
    cleaned,
    changes: cleaned !== text ? ['Fixed inline math delimiters'] : [],
  }
}

/**
 * Remove conversational AI filler at the start of content
 * ("Here is the answer:", "Sure! Let me...", "The question is:", etc.)
 */
function removeConversationalFiller(text: string): SanitizeResult {
  const patterns = [
    /^(?:Here\s+is\s+(?:the\s+|a\s+)?(?:answer|question|solution|explanation|problem|result|new\s+question)\s*[:.\-]\s*\n?)/i,
    /^(?:Sure!?\s*(?:Here\s+is|Let\s+me|I'll)\s+.*?[:.\-]\s*\n?)/i,
    /^(?:The\s+(?:new\s+)?(?:question|problem)\s+is\s*[:.\-]\s*\n?)/i,
    /^(?:Question\s*[:.\-]\s*\n?)/i,
    /^(?:Shadow\s+Question\s*[:.\-]\s*\n?)/i,
    /^(?:\*\*(?:Question|Shadow Question|New Question)\*\*\s*[:.\-]?\s*\n?)/i,
  ]

  let cleaned = text
  const changes: string[] = []

  for (const pattern of patterns) {
    const result = cleaned.replace(pattern, '')
    if (result !== cleaned) {
      cleaned = result.trimStart()
      changes.push('Removed conversational filler')
      break
    }
  }

  return { cleaned, changes }
}

/**
 * Standardize bold: **text** → \textbf{text}
 */
function standardizeBold(text: string): SanitizeResult {
  const cleaned = text.replace(/\*\*([^*]+)\*\*/g, '\\textbf{$1}')
  return {
    cleaned,
    changes: cleaned !== text ? ['Standardized bold to LaTeX'] : [],
  }
}

/**
 * Fix escaped newlines: literal two-char \n → real newline
 */
function fixNewlines(text: string): SanitizeResult {
  const cleaned = text.replace(/(?<!\\)\\n/g, '\n')
  return {
    cleaned,
    changes: cleaned !== text ? ['Fixed escaped newlines'] : [],
  }
}

/**
 * Remove AI artifacts like "marks: X", "difficulty: Foundation" etc.
 * that sometimes leak into question text
 */
function removeAIMetadataLeaks(text: string): SanitizeResult {
  const patterns = [
    /\n?\s*\[?\d+\s*marks?\]?\s*$/i,
    /\n?\s*Marks?:\s*\d+\s*$/i,
    /\n?\s*Difficulty:\s*(?:Foundation|Higher)\s*$/i,
    /\n?\s*Topic:\s*[\w\s]+\s*$/i,
    /\n?\s*Calculator:\s*(?:Allowed|Not Allowed|Yes|No)\s*$/i,
    /\n?\s*\(This question is worth \d+ marks?\.\)\s*$/i,
  ]

  let cleaned = text
  const changes: string[] = []

  for (const pattern of patterns) {
    const result = cleaned.replace(pattern, '')
    if (result !== cleaned) {
      cleaned = result.trim()
      changes.push('Removed AI metadata leak')
    }
  }

  return { cleaned, changes }
}

/**
 * Recover LaTeX commands corrupted by JSON.parse consuming single-backslash
 * escape sequences already in the database.
 *
 * When AI outputs "\frac" (not "\\frac") in a JSON string, JS's JSON.parse
 * interprets \f as a form-feed (ASCII 12) and discards it, leaving "rac{...}"
 * in the stored text. This rule detects those broken fragments and restores them
 * so existing DB records can be fixed by running the sanitizer script.
 *
 * JSON single-char escape sequences that can corrupt LaTeX commands:
 *   \b (backspace), \f (form-feed), \n (newline), \r (return), \t (tab)
 *   → \begin→"egin", \frac→"rac{", \theta→"(tab)heta", \times→"(tab)imes"
 */
function recoverCorruptedCommands(text: string): SanitizeResult {
  let cleaned = text
  const changes: string[] = []

  const recoveries: [RegExp, string][] = [
    // \frac: \f (form-feed) is consumed → leaves "rac{"
    [/\brac\{/g, '\\frac{'],
    // \sqrt: safety net for missing backslash entirely
    [/(?<!\\)\bsqrt\{/g, '\\sqrt{'],
    // \theta: \t (tab) is consumed → leaves tab+"heta"
    [/\x09heta\b/g, '\\theta'],
    // Isolated "heta" not preceded by a word char (catches tab that got collapsed)
    [/(?<!\w)heta\b/g, '\\theta'],
    // \times: \t (tab) is consumed → leaves tab+"imes"
    [/\x09imes\b/g, '\\times'],
    // \tau: \t (tab) is consumed → leaves tab+"au"
    [/\x09au\b/g, '\\tau'],
    // \begin: \b (backspace) is consumed → leaves "egin{"
    [/(?<!\w)egin\{/g, '\\begin{'],
    // \div: no standard JSON escape, but match bare " div " in math context
    [/ div /g, ' \\div '],
    // \pm: no standard JSON escape, but match isolated "pm"
    [/(?<!\w)pm\b(?!\s*\{)/g, '\\pm'],
    // \cdot: no standard JSON escape, but match isolated "cdot"
    [/(?<!\w)cdot\b/g, '\\cdot'],
  ]

  for (const [pattern, replacement] of recoveries) {
    const result = cleaned.replace(pattern, replacement)
    if (result !== cleaned) {
      cleaned = result
      changes.push('Recovered corrupted LaTeX command')
    }
  }

  return { cleaned, changes: changes.length > 0 ? [...new Set(changes)] : [] }
}

/**
 * Ensure proper LaTeX command formatting.
 * Fixes common AI typos in LaTeX commands.
 *
 * SAFETY: The = spacing rule is scoped to math regions only to avoid
 * corrupting surrounding prose (e.g. "Calculator: Allowed").
 * The dollar-trimming rules only remove spaces immediately adjacent to $.
 */
function fixLatexCommands(text: string): SanitizeResult {
  let cleaned = text
  const changes: string[] = []

  // Fix four-backslash sequences: \\\\frac → \\frac (AI over-escaping)
  const quadBackslash = cleaned.replace(
    /\\\\\\\\(frac|sqrt|times|div|pm|textbf|text|mathrm)/g,
    '\\\\$1'
  )
  if (quadBackslash !== cleaned) {
    cleaned = quadBackslash
    changes.push('Fixed LaTeX commands')
  }

  // Fix \fraction → \frac
  const fracFix = cleaned.replace(/\\fraction/g, '\\frac')
  if (fracFix !== cleaned) {
    cleaned = fracFix
    changes.push('Fixed LaTeX commands')
  }

  // Fix spacing around = INSIDE math regions only (not globally).
  // Applying /\s*=\s*/g to the whole string corrupts surrounding text.
  const equalsFix = cleaned.replace(/(\$\$[\s\S]*?\$\$|\$[^$]+?\$)/g, (mathRegion) => {
    return mathRegion.replace(/\s*=\s*/g, ' = ')
  })
  if (equalsFix !== cleaned) {
    cleaned = equalsFix
    changes.push('Fixed LaTeX commands')
  }

  // Trim spaces immediately inside $ delimiters: "$ x $" → "$x$"
  const trimmedDollars = cleaned
    .replace(/\$\s+/g, '$')
    .replace(/\s+\$/g, '$')
  if (trimmedDollars !== cleaned) {
    cleaned = trimmedDollars
    changes.push('Fixed LaTeX commands')
  }

  return { cleaned, changes: [...new Set(changes)] }
}

/**
 * Clean up whitespace issues
 */
function cleanWhitespace(text: string): SanitizeResult {
  const cleaned = text
    // Remove trailing whitespace per line
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    // Collapse excessive blank lines (max 2 consecutive)
    .replace(/\n{3,}/g, '\n\n')
    // Trim overall
    .trim()

  return {
    cleaned,
    changes: cleaned !== text ? ['Cleaned whitespace'] : [],
  }
}

/**
 * Remove trailing "Show that..." solution hints that AI sometimes adds
 */
function removeTrailingSolutionHints(text: string): SanitizeResult {
  const patterns = [
    /\n?\s*\*?\*?(?:Hint|Solution|Working|Answer)[:.\s].*$/is,
    /\n?\s*\*?\*?Note:\s*.*$/i,
  ]

  let cleaned = text
  const changes: string[] = []

  for (const pattern of patterns) {
    // Only remove if it appears at the very end and looks like a hint (not part of the question)
    const match = cleaned.match(pattern)
    if (match && match.index && match.index > cleaned.length * 0.7) {
      cleaned = cleaned.substring(0, match.index).trim()
      changes.push('Removed trailing solution hint')
      break
    }
  }

  return { cleaned, changes }
}

// =====================================================
// MASTER SANITIZER
// =====================================================

const RULES = [
  stripMarkdownWrappers,
  fixBlockMath,
  fixInlineMath,
  removeConversationalFiller,
  standardizeBold,
  fixNewlines,
  removeAIMetadataLeaks,
  recoverCorruptedCommands,
  fixLatexCommands,
  removeTrailingSolutionHints,
  cleanWhitespace,
]

/**
 * Apply all sanitization rules to make question text exam-ready.
 * Returns cleaned text and a list of changes applied.
 */
export function sanitizeQuestion(text: string): SanitizeResult {
  let current = text
  const allChanges: string[] = []

  for (const rule of RULES) {
    const result = rule(current)
    if (result.changes.length > 0) {
      current = result.cleaned
      allChanges.push(...result.changes)
    }
  }

  return { cleaned: current, changes: allChanges }
}

/**
 * Quick sanitize - just returns the cleaned string (no change tracking)
 */
export function sanitize(text: string): string {
  return sanitizeQuestion(text).cleaned
}

/**
 * Sanitize a full question object (question_latex + answer_key fields)
 */
export function sanitizeQuestionFields(fields: {
  question_latex: string | null
  answer_key: { answer?: string; explanation?: string; [key: string]: unknown } | null
}): {
  question_latex: string | null
  answer_key: typeof fields.answer_key
  wasModified: boolean
} {
  let wasModified = false
  let questionLatex = fields.question_latex
  let answerKey = fields.answer_key ? { ...fields.answer_key } : null

  if (questionLatex) {
    const result = sanitizeQuestion(questionLatex)
    if (result.changes.length > 0) {
      questionLatex = result.cleaned
      wasModified = true
    }
  }

  if (answerKey?.answer && typeof answerKey.answer === 'string') {
    const result = sanitizeQuestion(answerKey.answer)
    if (result.changes.length > 0) {
      answerKey = { ...answerKey, answer: result.cleaned }
      wasModified = true
    }
  }

  if (answerKey?.explanation && typeof answerKey.explanation === 'string') {
    const result = sanitizeQuestion(answerKey.explanation)
    if (result.changes.length > 0) {
      answerKey = { ...answerKey, explanation: result.cleaned }
      wasModified = true
    }
  }

  return { question_latex: questionLatex, answer_key: answerKey, wasModified }
}
