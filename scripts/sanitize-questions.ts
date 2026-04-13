#!/usr/bin/env tsx

/**
 * Database Sanitizer — Question Content Cleanup
 *
 * Fetches all questions from the `questions` table and applies regex-based
 * sanitization rules to strip AI-generated artifacts from:
 *   - question_latex (column)
 *   - answer_key.answer (JSONB field)
 *   - answer_key.explanation (JSONB field)
 *
 * Usage:
 *   npx tsx scripts/sanitize-questions.ts [--dry-run] [--limit=N] [--batch-size=N]
 *
 * Options:
 *   --dry-run       Preview changes without writing to the database
 *   --limit=N       Maximum number of questions to process (default: all)
 *   --batch-size=N  Number of questions per fetch batch (default: 100)
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

// =====================================================
// CONFIGURATION
// =====================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase environment variables!')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// =====================================================
// TYPES
// =====================================================

interface ParsedArgs {
  dryRun: boolean
  limit: number | null
  batchSize: number
}

interface AnswerKey {
  answer?: string
  explanation?: string
  [key: string]: unknown
}

interface QuestionRow {
  id: string
  question_latex: string | null
  answer_key: AnswerKey | null
}

interface SanitizeResult {
  cleaned: string
  changes: string[]
}

// =====================================================
// SANITIZATION RULES
// =====================================================

/**
 * Rule 1: Strip Markdown code-block wrappers
 * Removes ```latex, ```math, ``` tags that AI models wrap content in.
 */
function stripMarkdownWrappers(text: string): SanitizeResult {
  const cleaned = text
    .replace(/```(?:latex|math|)\s*\n?/g, '')
    .replace(/```\s*$/gm, '')
  return {
    cleaned,
    changes: cleaned !== text ? ['Removed Markdown wrappers'] : [],
  }
}

/**
 * Rule 2: Fix block math delimiters
 * Replaces \[ and \] with $$ for proper LaTeX block math.
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
 * Rule 3: Fix inline math delimiters
 * Replaces \( and \) with $ for proper LaTeX inline math.
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
 * Rule 4: Remove conversational filler at the start of content
 * Strips AI preamble like "Here is the answer:", "Solution:", etc.
 */
function removeConversationalFiller(text: string): SanitizeResult {
  const pattern = /^(?:Here\s+is\s+(?:the\s+|a\s+)?(?:answer|question|solution|explanation|problem|result)\s*[:.\-]\s*\n?)/i
  const cleaned = text.replace(pattern, '').trimStart()
  return {
    cleaned,
    changes: cleaned !== text ? ['Removed conversational filler'] : [],
  }
}

/**
 * Rule 5: Standardize bold from Markdown to LaTeX
 * Converts **text** to \textbf{text}.
 */
function standardizeBold(text: string): SanitizeResult {
  const cleaned = text.replace(/\*\*([^*]+)\*\*/g, '\\textbf{$1}')
  return {
    cleaned,
    changes: cleaned !== text ? ['Standardized bold to LaTeX'] : [],
  }
}

/**
 * Rule 6: Fix escaped newlines
 * Replaces literal two-character \n sequences with real newline characters.
 * Careful not to touch \\n (an actual backslash followed by n in LaTeX).
 */
function fixNewlines(text: string): SanitizeResult {
  // Match \n but NOT \\n (which is a LaTeX double-backslash + n)
  const cleaned = text.replace(/(?<!\\)\\n/g, '\n')
  return {
    cleaned,
    changes: cleaned !== text ? ['Fixed escaped newlines'] : [],
  }
}

// =====================================================
// LATEX REPAIR RULES (mirrors lib/latex-utils.ts)
// =====================================================

/**
 * Rule 6b: Fix \begin{env}...\end{env} blocks
 *
 * - Math environments (align, equation, matrix…) → $$...$$ wrapper
 * - enumerate / numerate (AI typo)               → (a) (b) (c)… list
 * - itemize                                      → • bullet list
 * - Everything else (center, tabular, figure…)   → strip tags, keep content
 *
 * Uses plain string indexOf — no regex backtracking — so it is O(n) even
 * when a \begin{env} has no matching \end{env}.
 */
function fixLatexEnvironments(text: string): SanitizeResult {
  if (!text.includes('\\begin{')) return { cleaned: text, changes: [] }

  const MATH_ENV_SET = new Set([
    'align', 'align*', 'aligned', 'alignat', 'alignedat',
    'equation', 'equation*',
    'gather', 'gather*', 'gathered',
    'multline', 'multline*',
    'split',
    'matrix', 'pmatrix', 'bmatrix', 'Bmatrix', 'vmatrix', 'Vmatrix',
    'cases', 'dcases', 'rcases',
    'array', 'subarray',
  ])

  /**
   * Convert all \begin{env}...\end{env} blocks in a plain-text segment
   * (one that contains no $...$ spans).  Pure string walking — O(n).
   */
  function convertSegment(segment: string): string {
    let result = ''
    let pos = 0

    while (pos < segment.length) {
      const beginIdx = segment.indexOf('\\begin{', pos)
      if (beginIdx === -1) { result += segment.slice(pos); break }

      // Append text before this \begin{
      result += segment.slice(pos, beginIdx)

      // Extract the environment name
      const envNameStart = beginIdx + 7 // len('\\begin{') === 7
      const envNameEnd = segment.indexOf('}', envNameStart)
      if (envNameEnd === -1) {
        // Malformed \begin{ with no closing } — emit as-is and stop
        result += segment.slice(beginIdx)
        break
      }

      const env = segment.slice(envNameStart, envNameEnd).trim()
      const contentStart = envNameEnd + 1

      // Find the matching \end{env} using plain indexOf (no regex)
      const endTag = `\\end{${env}}`
      const endIdx = segment.indexOf(endTag, contentStart)

      if (endIdx === -1) {
        // No matching \end{} — emit \begin{env} literally and keep scanning
        result += segment.slice(beginIdx, envNameEnd + 1)
        pos = envNameEnd + 1
        continue
      }

      const content = segment.slice(contentStart, endIdx)

      if (MATH_ENV_SET.has(env)) {
        result += `$$\\begin{${env}}${content}\\end{${env}}$$`
      } else if (env === 'enumerate' || env === 'numerate') {
        const labels = ['(a)', '(b)', '(c)', '(d)', '(e)', '(f)', '(g)', '(h)', '(i)', '(j)']
        let counter = 0
        result += content.replace(/\\item\b\s*/g, () => `\n${labels[counter++] ?? `(${counter})`} `).trim()
      } else if (env === 'itemize') {
        result += content.replace(/\\item\b\s*/g, '\n• ').trim()
      } else {
        result += content.trim()
      }

      pos = endIdx + endTag.length
    }

    return result
  }

  // Walk outside existing $...$ spans and apply conversion to plain segments only
  const parts: string[] = []
  let i = 0
  while (i < text.length) {
    if (text[i] === '$' && text[i + 1] === '$') {
      const end = text.indexOf('$$', i + 2)
      if (end === -1) { parts.push(text.slice(i)); break }
      parts.push(text.slice(i, end + 2)); i = end + 2; continue
    }
    if (text[i] === '$') {
      let end = i + 1
      while (end < text.length && !(text[end] === '$' && text[end - 1] !== '\\')) end++
      if (end < text.length) { parts.push(text.slice(i, end + 1)); i = end + 1 }
      else { parts.push(text.slice(i)); i = text.length }
      continue
    }
    let segEnd = i
    while (segEnd < text.length && text[segEnd] !== '$') segEnd++
    const seg = text.slice(i, segEnd)
    parts.push(seg.includes('\\begin{') ? convertSegment(seg) : seg)
    i = segEnd
  }

  const cleaned = parts.join('')
  return { cleaned, changes: cleaned !== text ? ['Fixed \\begin{env} environments'] : [] }
}

// Math commands that must always be inside $...$
const MATH_TRIGGER_RE =
  /\\(?:frac|dfrac|tfrac|sqrt|cbrt|times|div|pm|mp|cdot|le[tq]?|ge[tq]?|neq|ne|approx|equiv|propto|sim|simeq|cong|parallel|perp|angle|triangle|sum|prod|int|oint|iint|lim|max|min|sup|inf|det|sin|cos|tan|sec|csc|cot|sinh|cosh|tanh|arcsin|arccos|arctan|log|ln|exp|pi|theta|vartheta|phi|varphi|psi|omega|Omega|Phi|Psi|Theta|alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|iota|kappa|lambda|mu|nu|xi|rho|sigma|tau|upsilon|chi|infty|partial|nabla|forall|exists|in|notin|subset|supset|subseteq|supseteq|cup|cap|emptyset|varnothing|wedge|vee|neg|to|Rightarrow|Leftarrow|leftrightarrow|rightarrow|leftarrow|mapsto|vec|hat|tilde|bar|dot|ddot|overline|underline|overbrace|underbrace|widehat|widetilde|left|right|bigg?[lr]?|Big[lr]?|big[lr]?|binom|pmod|mod|gcd|lcm|mathrm|mathit|mathbf|mathbb|mathcal|mathsf|mathtt|operatorname|overset|underset|stackrel|over|under)\b/

/**
 * Rule 7: Wrap undelimited LaTeX math commands in $...$
 *
 * Finds recognised math commands (\frac, \sqrt, \times, etc.) that appear
 * outside any existing $...$ or $$...$$ span and wraps the full mathematical
 * expression containing them in $...$.
 *
 * e.g. "The answer is \frac{3}{4} cm" → "The answer is $\frac{3}{4}$ cm"
 *      "x = \sqrt{5}"                 → "$x = \sqrt{5}$"
 */
function wrapUndelimitedMath(text: string): SanitizeResult {
  if (!MATH_TRIGGER_RE.test(text)) return { cleaned: text, changes: [] }

  const parts: string[] = []
  let i = 0

  while (i < text.length) {
    if (text[i] === '$' && text[i + 1] === '$') {
      const end = text.indexOf('$$', i + 2)
      if (end === -1) { parts.push(text.slice(i)); break }
      parts.push(text.slice(i, end + 2)); i = end + 2; continue
    }
    if (text[i] === '$') {
      let end = i + 1
      while (end < text.length && !(text[end] === '$' && text[end - 1] !== '\\')) end++
      if (end < text.length) { parts.push(text.slice(i, end + 1)); i = end + 1 }
      else { parts.push(text.slice(i)); i = text.length }
      continue
    }
    let segEnd = i
    while (segEnd < text.length && text[segEnd] !== '$') segEnd++
    const seg = text.slice(i, segEnd)
    parts.push(MATH_TRIGGER_RE.test(seg) ? _wrapSegment(seg) : seg)
    i = segEnd
  }

  const cleaned = parts.join('')
  return { cleaned, changes: cleaned !== text ? ['Wrapped undelimited LaTeX commands in $...$'] : [] }
}

function _wrapSegment(segment: string): string {
  const ranges: Array<{ start: number; end: number }> = []
  let i = 0
  while (i < segment.length) {
    if (segment[i] === '\\' && MATH_TRIGGER_RE.test(segment.slice(i))) {
      const start = _mathRunStart(segment, i)
      const end = _consumeMathExpr(segment, i)
      if (end > start) {
        if (ranges.length > 0) {
          const last = ranges[ranges.length - 1]
          if (start <= last.end) { last.end = Math.max(last.end, end); i = last.end; continue }
          const gap = segment.slice(last.end, start)
          if (gap.length <= 4 && /^[\s+\-*/=<>().[\]]*$/.test(gap)) { last.end = end; i = end; continue }
        }
        ranges.push({ start, end }); i = end; continue
      }
    }
    i++
  }
  if (ranges.length === 0) return segment
  let result = ''; let pos = 0
  for (const r of ranges) {
    result += segment.slice(pos, r.start)
    result += '$' + segment.slice(r.start, r.end).trim() + '$'
    pos = r.end
  }
  return result + segment.slice(pos)
}

function _mathRunStart(text: string, cmdPos: number): number {
  let j = cmdPos - 1; let start = cmdPos
  while (j >= 0) {
    const ch = text[j]
    if (/[0-9+\-*/=<>^.,_|!]/.test(ch)) { start = j; j--; continue }
    if (ch === '(' || ch === ')' || ch === '[' || ch === ']') { start = j; j--; continue }
    if (/[a-zA-Z]/.test(ch)) {
      if (j === 0 || !/[a-zA-Z]/.test(text[j - 1])) { start = j; j--; continue }
      break
    }
    if (ch === ' ') {
      let k = j - 1; while (k >= 0 && text[k] === ' ') k--
      if (k >= 0 && /[0-9a-zA-Z+\-*/=<>^.]/.test(text[k])) { j--; continue }
      break
    }
    break
  }
  while (start < cmdPos && text[start] === ' ') start++
  return start
}

function _consumeMathExpr(text: string, start: number): number {
  let i = start
  while (i < text.length) {
    const ch = text[i]
    if (ch === '\\') {
      const next = text[i + 1] ?? ''
      if (/[a-zA-Z]/.test(next)) { i++; while (i < text.length && /[a-zA-Z]/.test(text[i])) i++; continue }
      if (next === '\\') { i += 2; continue }
      if ('{}'.includes(next) || ' ,;!:'.includes(next)) { i += 2; continue }
      break
    }
    if (ch === '{') {
      let depth = 1; i++
      while (i < text.length && depth > 0) { if (text[i] === '{') depth++; else if (text[i] === '}') depth--; i++ }
      continue
    }
    if (/[0-9+\-*/=<>^.,_|!]/.test(ch)) { i++; continue }
    if (ch === '(' || ch === ')' || ch === '[' || ch === ']') { i++; continue }
    if (/[a-zA-Z]/.test(ch) && !/[a-zA-Z]/.test(text[i + 1] ?? '')) { i++; continue }
    if (ch === ' ') {
      const next = text[i + 1] ?? ''
      if (next === '\\' || /[0-9+\-*/=<>^]/.test(next)) { i++; continue }
      break
    }
    break
  }
  while (i > start && text[i - 1] === ' ') i--
  return i
}

/**
 * Rule 8: Normalise \text spacing
 * - \text { ... }  → \text{...}  (stray space before brace)
 * - \text word     → \text{word} (bare word, no brace at all)
 */
function repairTextCommand(text: string): SanitizeResult {
  let cleaned = text
  cleaned = cleaned.replace(/\\text\s+\{/g, '\\text{')
  cleaned = cleaned.replace(/\\text(?!\s*\{)\s+([A-Za-z][A-Za-z0-9]*)/g, '\\text{$1}')
  return {
    cleaned,
    changes: cleaned !== text ? ['Repaired \\text command syntax'] : [],
  }
}

/**
 * Rule 8: Normalise \sqrt for single bare-token arguments
 * \sqrt x → \sqrt{x}
 */
function repairSqrtCommand(text: string): SanitizeResult {
  const cleaned = text.replace(/\\sqrt\s+([A-Za-z0-9])\b(?!\s*[\^_{])/g, '\\sqrt{$1}')
  return {
    cleaned,
    changes: cleaned !== text ? ['Repaired \\sqrt command syntax'] : [],
  }
}

/**
 * Rule 9: Balance unclosed braces inside math spans.
 *
 * This is the primary fix for \frac{a}{b  (missing closing brace) and any
 * other command where the AI forgot to close a group.
 *
 * For each $...$ and $$...$$ span: count open `{` vs `}` and append the
 * exact number of missing `}` at the end of the span.
 *
 * Only adds characters — never removes content.
 */
function balanceMathBraces(text: string): SanitizeResult {
  const result: string[] = []
  let i = 0
  let repaired = false

  while (i < text.length) {
    // Display math $$...$$
    if (text[i] === '$' && text[i + 1] === '$') {
      const start = i + 2
      const end = text.indexOf('$$', start)
      if (end === -1) { result.push(text.slice(i)); break }
      const inner = text.slice(start, end)
      const fixed = closeBraces(inner)
      if (fixed !== inner) repaired = true
      result.push('$$', fixed, '$$')
      i = end + 2
      continue
    }
    // Inline math $...$
    if (text[i] === '$') {
      const start = i + 1
      let end = start
      while (end < text.length && !(text[end] === '$' && text[end - 1] !== '\\')) end++
      if (end >= text.length) { result.push(text.slice(i)); break }
      const inner = text.slice(start, end)
      const fixed = closeBraces(inner)
      if (fixed !== inner) repaired = true
      result.push('$', fixed, '$')
      i = end + 1
      continue
    }
    result.push(text[i])
    i++
  }

  const cleaned = result.join('')
  return {
    cleaned,
    changes: repaired ? ['Balanced unclosed braces in math spans'] : [],
  }
}

function closeBraces(expr: string): string {
  let depth = 0
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i]
    if (ch === '\\' && (expr[i + 1] === '{' || expr[i + 1] === '}')) { i++; continue }
    if (ch === '{') depth++
    else if (ch === '}' && depth > 0) depth--
  }
  return depth > 0 ? expr + '}'.repeat(depth) : expr
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
  // LaTeX structural repair (mirrors lib/latex-utils.ts)
  fixLatexEnvironments,  // must run BEFORE wrapUndelimitedMath
  wrapUndelimitedMath,   // must run BEFORE text/sqrt/brace repair
  repairTextCommand,
  repairSqrtCommand,
  balanceMathBraces,
]

/**
 * Applies all sanitization rules in order to a string.
 * Returns the cleaned text and a list of rule names that fired.
 */
function sanitize(text: string): SanitizeResult {
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

// =====================================================
// CLI ARGUMENT PARSING
// =====================================================

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2)
  const result: ParsedArgs = {
    dryRun: false,
    limit: null,
    batchSize: 100,
  }

  for (const arg of args) {
    if (arg === '--dry-run') {
      result.dryRun = true
    } else if (arg.startsWith('--limit=')) {
      result.limit = parseInt(arg.split('=')[1], 10) || null
    } else if (arg.startsWith('--batch-size=')) {
      result.batchSize = parseInt(arg.split('=')[1], 10) || 100
    }
  }

  return result
}

// =====================================================
// MAIN EXECUTION
// =====================================================

async function main(): Promise<void> {
  const args = parseArgs()

  console.log('═══════════════════════════════════════════════════════════')
  console.log('    DATABASE SANITIZER - Question Content Cleanup')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(`   Mode: ${args.dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`   Batch Size: ${args.batchSize}`)
  console.log(`   Limit: ${args.limit ?? 'All questions'}`)

  // Print total row count so it's obvious when the script has processed everything
  const { count: totalCount } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
  console.log(`   Total questions in DB: ${totalCount ?? 'unknown'}`)
  console.log('═══════════════════════════════════════════════════════════\n')

  let totalFetched = 0
  let totalModified = 0
  let totalSkipped = 0
  let totalErrors = 0
  let batchNumber = 0
  // Cursor-based pagination on `id` (stable UUID primary key — no offset drift)
  let lastId: string | null = null

  while (true) {
    batchNumber++
    console.log(`   Processing batch ${batchNumber} (cursor: ${lastId ?? 'start'})...`)

    // Fetch a batch using cursor (gt lastId) ordered by id
    let query = supabase
      .from('questions')
      .select('id, question_latex, answer_key')
      .order('id', { ascending: true })
      .limit(args.batchSize)

    if (lastId !== null) {
      query = query.gt('id', lastId)
    }

    const { data: questions, error: fetchError } = await query

    if (fetchError) {
      console.error(`   Failed to fetch batch: ${fetchError.message}`)
      totalErrors++
      break
    }

    if (!questions || questions.length === 0) {
      console.log('   No more questions to process.')
      break
    }

    totalFetched += questions.length
    // Advance cursor to last id in this batch
    lastId = questions[questions.length - 1].id

    // Process each question in the batch
    for (const row of questions as QuestionRow[]) {
      // Check limit
      if (args.limit !== null && (totalModified + totalSkipped) >= args.limit) {
        break
      }

      const allChanges: string[] = []
      let questionLatexCleaned = row.question_latex
      let answerKeyCleaned: AnswerKey | null = row.answer_key
        ? { ...row.answer_key }
        : null

      // Sanitize question_latex
      if (row.question_latex) {
        const result = sanitize(row.question_latex)
        if (result.changes.length > 0) {
          questionLatexCleaned = result.cleaned
          allChanges.push(...result.changes)
        }
      }

      // Sanitize answer_key.answer
      if (answerKeyCleaned?.answer && typeof answerKeyCleaned.answer === 'string') {
        const result = sanitize(answerKeyCleaned.answer)
        if (result.changes.length > 0) {
          answerKeyCleaned.answer = result.cleaned
          allChanges.push(...result.changes.map(c => `answer_key.answer: ${c}`))
        }
      }

      // Sanitize answer_key.explanation
      if (answerKeyCleaned?.explanation && typeof answerKeyCleaned.explanation === 'string') {
        const result = sanitize(answerKeyCleaned.explanation)
        if (result.changes.length > 0) {
          answerKeyCleaned.explanation = result.cleaned
          allChanges.push(...result.changes.map(c => `answer_key.explanation: ${c}`))
        }
      }

      // Skip if nothing changed
      if (allChanges.length === 0) {
        totalSkipped++
        continue
      }

      // Build update payload
      const updatePayload: Record<string, unknown> = {}
      if (questionLatexCleaned !== row.question_latex) {
        updatePayload.question_latex = questionLatexCleaned
      }
      if (answerKeyCleaned && JSON.stringify(answerKeyCleaned) !== JSON.stringify(row.answer_key)) {
        updatePayload.answer_key = answerKeyCleaned
      }

      // Deduplicate change labels for logging
      const uniqueChanges = [...new Set(allChanges)]

      if (args.dryRun) {
        console.log(`   [DRY RUN] Would fix Question ID ${row.id}: ${uniqueChanges.join(', ')}`)
        totalModified++
        continue
      }

      // Write update
      const { error: updateError } = await supabase
        .from('questions')
        .update(updatePayload)
        .eq('id', row.id)

      if (updateError) {
        console.error(`   Failed to update Question ID ${row.id}: ${updateError.message}`)
        totalErrors++
      } else {
        console.log(`   Fixed Question ID ${row.id}: ${uniqueChanges.join(', ')}`)
        totalModified++
      }
    }

    // If this batch was smaller than requested, we've reached the end
    if (questions.length < args.batchSize) {
      console.log(`   Last batch — all questions processed (${questions.length} row${questions.length !== 1 ? 's' : ''} in final batch).`)
      break
    }

    // Also stop if the limit was reached mid-batch
    if (args.limit !== null && (totalModified + totalSkipped) >= args.limit) {
      console.log(`   Limit of ${args.limit} reached.`)
      break
    }
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('    SANITIZATION COMPLETE')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(`   Total Fetched: ${totalFetched}`)
  console.log(`   Modified: ${totalModified}`)
  console.log(`   Skipped: ${totalSkipped}`)
  console.log(`   Errors: ${totalErrors}`)
  console.log('═══════════════════════════════════════════════════════════\n')
}

// Run
main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
