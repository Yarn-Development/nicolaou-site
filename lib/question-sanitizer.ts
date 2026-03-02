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
 * Ensure proper LaTeX command formatting
 * Fixes common AI typos in LaTeX commands
 */
function fixLatexCommands(text: string): SanitizeResult {
  let cleaned = text
  const changes: string[] = []
  
  // Fix common LaTeX typos
  const fixes: [RegExp, string][] = [
    // Fix double-escaped commands: \\\\frac → \\frac
    [/\\\\\\\\(frac|sqrt|times|div|pm|textbf|text|mathrm)/g, '\\\\$1'],
    // Fix \fraction → \frac
    [/\\fraction/g, '\\frac'],
    // Fix spacing around = in math
    [/\s*=\s*/g, ' = '],
    // Fix \text{} with unnecessary braces around simple words
    [/\\text\{(\w)\}/g, '\\text{$1}'],
    // Ensure consistent spacing in inline math
    [/\$\s+/g, '$'],
    [/\s+\$/g, '$'],
  ]
  
  for (const [pattern, replacement] of fixes) {
    const result = cleaned.replace(pattern, replacement)
    if (result !== cleaned) {
      cleaned = result
      changes.push('Fixed LaTeX commands')
    }
  }
  
  return { cleaned, changes: [...new Set(changes)] }
}

/**
 * Clean up whitespace issues
 */
function cleanWhitespace(text: string): SanitizeResult {
  const cleaned = text
    // Remove leading/trailing whitespace per line
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    // Remove excessive blank lines (max 2 consecutive)
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
