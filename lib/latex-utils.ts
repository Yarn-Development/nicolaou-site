/**
 * Server-side LaTeX repair utilities.
 *
 * Applied to all AI-generated content before it is returned to the client
 * or stored in the database.
 *
 * Safe contract: these functions only add delimiters or closing braces and
 * normalise whitespace. They never remove mathematical content.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Math command trigger list
// Commands that unambiguously indicate we are in a mathematical expression.
// When any of these appear outside $...$ they must be wrapped.
// ─────────────────────────────────────────────────────────────────────────────

const MATH_TRIGGER_RE =
  /\\(?:frac|dfrac|tfrac|sqrt|cbrt|times|div|pm|mp|cdot|le[tq]?|ge[tq]?|neq|ne|approx|equiv|propto|sim|simeq|cong|parallel|perp|angle|triangle|sum|prod|int|oint|iint|lim|max|min|sup|inf|det|sin|cos|tan|sec|csc|cot|sinh|cosh|tanh|arcsin|arccos|arctan|log|ln|exp|pi|theta|vartheta|phi|varphi|psi|omega|Omega|Phi|Psi|Theta|Alpha|Beta|Gamma|Delta|Epsilon|Lambda|Mu|Nu|Xi|Sigma|Tau|Upsilon|Chi|alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|iota|kappa|lambda|mu|nu|xi|rho|varrho|sigma|varsigma|tau|upsilon|chi|infty|partial|nabla|forall|exists|nexists|in|notin|subset|supset|subseteq|supseteq|cup|cap|emptyset|varnothing|wedge|vee|neg|to|Rightarrow|Leftarrow|leftrightarrow|Leftrightarrow|rightarrow|leftarrow|mapsto|vec|hat|check|breve|acute|grave|tilde|bar|dot|ddot|overline|underline|overbrace|underbrace|widehat|widetilde|left|right|bigg?[lr]?|Big[lr]?|big[lr]?|binom|pmod|mod|gcd|lcm|mathrm|mathit|mathbf|mathbb|mathcal|mathsf|mathtt|operatorname|overset|underset|stackrel|over|under)\b/

// ─────────────────────────────────────────────────────────────────────────────
// Public entry point
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full repair pipeline for a mixed text+LaTeX string.
 * Call on `question_latex`, `answer`, and `explanation` after AI JSON parse.
 *
 * Pipeline (order matters):
 *  1. Fix alternate delimiters  \[..\] → $$  \(..\) → $
 *  2. Fix \begin{...}...\end{...} environments
 *  3. Wrap undelimited math commands in $...$
 *  4. Fix \text and \sqrt syntax anomalies
 *  5. Balance unclosed braces inside math spans
 */
export function repairLatex(input: string): string {
  if (!input || typeof input !== 'string') return input

  let text = input

  // 1. Alternate delimiters
  text = text.replace(/\\\[/g, '$$').replace(/\\\]/g, '$$')
  text = text.replace(/\\\(/g, '$').replace(/\\\)/g, '$')

  // 2. Handle \begin{...}...\end{...} environments
  text = fixLatexEnvironments(text)

  // 3. Wrap bare math commands that are outside any $...$
  text = wrapUndelimitedMath(text)

  // 4. \text and \sqrt spacing anomalies
  text = text.replace(/\\text\s+\{/g, '\\text{')
  text = text.replace(/\\text(?!\s*\{)\s+([A-Za-z][A-Za-z0-9]*)/g, '\\text{$1}')
  text = text.replace(/\\sqrt\s+([A-Za-z0-9])\b(?!\s*[\^_{])/g, '\\sqrt{$1}')

  // 5. Balance unclosed braces within math spans
  text = repairBracesInMathSpans(text)

  return text
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2: Fix \begin{...}...\end{...} environments
// ─────────────────────────────────────────────────────────────────────────────

/**
 * KaTeX-supported math environments. When found outside $...$ they get
 * wrapped in $$...$$. When already inside $...$ they are left alone.
 */
const MATH_ENVS = new Set([
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
 * Fix \begin{env}...\end{env} blocks that appear outside existing $...$ spans:
 *
 *  - Math environments (align, equation, matrix…) → wrap in $$...$$
 *  - enumerate / numerate (typo)                  → (a) (b) (c)… lettered list
 *  - itemize                                      → • bulleted list
 *  - Everything else (center, tabular, figure…)   → strip the wrapper tags,
 *                                                    keep the inner content
 */
export function fixLatexEnvironments(input: string): string {
  if (!input || !input.includes('\\begin{')) return input

  // Walk outside existing $...$ spans
  const parts: string[] = []
  let i = 0

  while (i < input.length) {
    if (input[i] === '$' && input[i + 1] === '$') {
      const end = input.indexOf('$$', i + 2)
      if (end === -1) { parts.push(input.slice(i)); break }
      parts.push(input.slice(i, end + 2)); i = end + 2; continue
    }
    if (input[i] === '$') {
      let end = i + 1
      while (end < input.length && !(input[end] === '$' && input[end - 1] !== '\\')) end++
      if (end < input.length) { parts.push(input.slice(i, end + 1)); i = end + 1 }
      else { parts.push(input.slice(i)); i = input.length }
      continue
    }

    // Plain segment — find its end
    let segEnd = i
    while (segEnd < input.length && input[segEnd] !== '$') segEnd++

    const seg = input.slice(i, segEnd)
    parts.push(seg.includes('\\begin{') ? convertEnvironments(seg) : seg)
    i = segEnd
  }

  return parts.join('')
}

/**
 * Convert \begin{env}...\end{env} blocks in a plain-text segment.
 * Uses plain string indexOf — O(n), no regex backtracking possible.
 */
function convertEnvironments(segment: string): string {
  let result = ''
  let pos = 0

  while (pos < segment.length) {
    const beginIdx = segment.indexOf('\\begin{', pos)
    if (beginIdx === -1) { result += segment.slice(pos); break }

    result += segment.slice(pos, beginIdx)

    const envNameStart = beginIdx + 7
    const envNameEnd = segment.indexOf('}', envNameStart)
    if (envNameEnd === -1) {
      // Malformed \begin{ — emit as-is and stop
      result += segment.slice(beginIdx)
      break
    }

    const env = segment.slice(envNameStart, envNameEnd).trim()
    const contentStart = envNameEnd + 1
    const endTag = `\\end{${env}}`
    const endIdx = segment.indexOf(endTag, contentStart)

    if (endIdx === -1) {
      // No matching \end{} — emit \begin{env} literally and keep scanning
      result += segment.slice(beginIdx, envNameEnd + 1)
      pos = envNameEnd + 1
      continue
    }

    const content = segment.slice(contentStart, endIdx)

    if (MATH_ENVS.has(env)) {
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

// ─────────────────────────────────────────────────────────────────────────────
// Step 2: Wrap undelimited math
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find every occurrence of a recognised math command that sits outside any
 * existing $...$ or $$...$$ span, determine the extent of the surrounding
 * mathematical expression, and wrap it in $...$.
 *
 * Example:
 *   "The area is \frac{1}{2}bh cm²"
 *   → "The area is $\frac{1}{2}bh$ cm²"
 *
 *   "x = \frac{3}{4}"
 *   → "$x = \frac{3}{4}$"
 */
export function wrapUndelimitedMath(text: string): string {
  if (!MATH_TRIGGER_RE.test(text)) return text

  const parts: string[] = []
  let i = 0

  while (i < text.length) {
    // Skip existing $$...$$ — don't touch them
    if (text[i] === '$' && text[i + 1] === '$') {
      const end = text.indexOf('$$', i + 2)
      if (end === -1) { parts.push(text.slice(i)); break }
      parts.push(text.slice(i, end + 2))
      i = end + 2
      continue
    }

    // Skip existing $...$
    if (text[i] === '$') {
      let end = i + 1
      while (end < text.length && !(text[end] === '$' && text[end - 1] !== '\\')) end++
      if (end < text.length) {
        parts.push(text.slice(i, end + 1))
        i = end + 1
      } else {
        parts.push(text.slice(i))
        i = text.length
      }
      continue
    }

    // Plain-text segment — find its end (next $ or end of string)
    let segEnd = i
    while (segEnd < text.length && text[segEnd] !== '$') segEnd++

    const segment = text.slice(i, segEnd)
    parts.push(MATH_TRIGGER_RE.test(segment) ? wrapMathRunsInSegment(segment) : segment)
    i = segEnd
  }

  return parts.join('')
}

/**
 * Given a plain-text segment (no existing $...$), find all runs of
 * mathematical content containing at least one math command, and wrap each
 * run in $...$.
 */
function wrapMathRunsInSegment(segment: string): string {
  const ranges: Array<{ start: number; end: number }> = []
  let i = 0

  while (i < segment.length) {
    // Is there a math command starting here?
    if (segment[i] === '\\' && MATH_TRIGGER_RE.test(segment.slice(i))) {
      // Expand backward to capture leading context (e.g. "x = " before \frac)
      const start = findMathRunStart(segment, i)
      // Consume the full math expression forward
      const end = consumeMathExpression(segment, i)

      if (end > start) {
        // Merge with previous range if they are adjacent or close
        if (ranges.length > 0) {
          const last = ranges[ranges.length - 1]
          if (start <= last.end) {
            last.end = Math.max(last.end, end)
            i = last.end
            continue
          }
          const gap = segment.slice(last.end, start)
          if (gap.length <= 4 && /^[\s+\-*/=<>().[\]]*$/.test(gap)) {
            last.end = end
            i = end
            continue
          }
        }
        ranges.push({ start, end })
        i = end
        continue
      }
    }
    i++
  }

  if (ranges.length === 0) return segment

  let result = ''
  let pos = 0
  for (const range of ranges) {
    result += segment.slice(pos, range.start)
    result += '$' + segment.slice(range.start, range.end).trim() + '$'
    pos = range.end
  }
  result += segment.slice(pos)
  return result
}

/**
 * Starting from a math command at `cmdPos`, walk BACKWARD through any
 * leading math characters that logically belong to the same expression.
 *
 * e.g. given  "x = \frac{3}{4}"  with cmdPos at `\frac`,
 *      return position of `x`.
 */
function findMathRunStart(text: string, cmdPos: number): number {
  let j = cmdPos - 1
  let start = cmdPos

  while (j >= 0) {
    const ch = text[j]

    // Digits and common math operators are always part of math
    if (/[0-9+\-*/=<>^.,_|!]/.test(ch)) {
      start = j; j--; continue
    }

    // Parentheses / brackets
    if (ch === '(' || ch === ')' || ch === '[' || ch === ']') {
      start = j; j--; continue
    }

    // Single-letter variable (not part of a longer English word)
    if (/[a-zA-Z]/.test(ch)) {
      const prevIsLetter = j > 0 && /[a-zA-Z]/.test(text[j - 1])
      if (!prevIsLetter) { start = j; j--; continue }
      break // part of a word — stop
    }

    // Space — continue only when there is math on both sides
    if (ch === ' ') {
      let k = j - 1
      while (k >= 0 && text[k] === ' ') k--
      if (k >= 0 && /[0-9a-zA-Z+\-*/=<>^.]/.test(text[k])) { j--; continue }
      break
    }

    break
  }

  // Trim any leading spaces we absorbed
  while (start < cmdPos && text[start] === ' ') start++
  return start
}

/**
 * Starting from `start` (a math command position), consume characters that
 * belong to the same mathematical expression and return the position after
 * the last such character.
 */
function consumeMathExpression(text: string, start: number): number {
  let i = start

  while (i < text.length) {
    const ch = text[i]

    // LaTeX command
    if (ch === '\\') {
      const next = text[i + 1] ?? ''
      if (/[a-zA-Z]/.test(next)) {
        i++ // skip backslash
        while (i < text.length && /[a-zA-Z]/.test(text[i])) i++
        continue
      }
      if (next === '\\') { i += 2; continue } // line break \\
      if (next === '{' || next === '}') { i += 2; continue } // \{ \}
      if (next === ' ' || next === ',' || next === ';' || next === '!' || next === ':') {
        i += 2; continue // spacing commands \, \; etc.
      }
      break
    }

    // Brace group {…}
    if (ch === '{') {
      let depth = 1; i++
      while (i < text.length && depth > 0) {
        if (text[i] === '{') depth++
        else if (text[i] === '}') depth--
        i++
      }
      continue
    }

    // Operators and digits
    if (/[0-9+\-*/=<>^.,_|!]/.test(ch)) { i++; continue }

    // Parentheses / brackets
    if (ch === '(' || ch === ')' || ch === '[' || ch === ']') { i++; continue }

    // Single-letter variable
    if (/[a-zA-Z]/.test(ch) && !/[a-zA-Z]/.test(text[i + 1] ?? '')) { i++; continue }

    // Space — only continue when followed by more math (command or operator/digit)
    if (ch === ' ') {
      const next = text[i + 1] ?? ''
      if (next === '\\' || /[0-9+\-*/=<>^]/.test(next)) { i++; continue }
      break
    }

    break
  }

  // Trim trailing spaces
  while (i > start && text[i - 1] === ' ') i--
  return i
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4: Brace balancing inside math spans
// ─────────────────────────────────────────────────────────────────────────────

function repairBracesInMathSpans(text: string): string {
  const result: string[] = []
  let i = 0

  while (i < text.length) {
    if (text[i] === '$' && text[i + 1] === '$') {
      const start = i + 2
      const end = text.indexOf('$$', start)
      if (end === -1) { result.push(text.slice(i)); break }
      result.push('$$', balanceBraces(text.slice(start, end)), '$$')
      i = end + 2
      continue
    }

    if (text[i] === '$') {
      const start = i + 1
      let end = start
      while (end < text.length) {
        if (text[end] === '$' && text[end - 1] !== '\\') break
        end++
      }
      if (end >= text.length) { result.push(text.slice(i)); break }
      result.push('$', balanceBraces(text.slice(start, end)), '$')
      i = end + 1
      continue
    }

    result.push(text[i])
    i++
  }

  return result.join('')
}

function balanceBraces(expr: string): string {
  let depth = 0
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i]
    if (ch === '\\' && (expr[i + 1] === '{' || expr[i + 1] === '}')) { i++; continue }
    if (ch === '{') depth++
    else if (ch === '}' && depth > 0) depth--
  }
  return depth > 0 ? expr + '}'.repeat(depth) : expr
}
