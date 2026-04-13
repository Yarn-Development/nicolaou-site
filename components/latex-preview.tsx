'use client'

import { useMemo, useState, useEffect } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

interface LatexPreviewProps {
  latex: string
  className?: string
  /** Show skeleton while rendering */
  showSkeleton?: boolean
}

// =====================================================
// PRE-PROCESSING PIPELINE
// =====================================================

/**
 * Lightweight client-side cleanup that mirrors the backend sanitizer.
 * Runs before any KaTeX parsing to catch AI-generated artifacts.
 */
function preProcess(raw: string): string {
  let text = raw

  // 1. Strip Markdown code-block wrappers (```latex ... ```)
  text = text
    .replace(/```(?:latex|math|)\s*\n?/g, '')
    .replace(/```\s*$/gm, '')

  // 2. Fix block math delimiters: \[ \] → $$
  text = text
    .replace(/\\\[/g, '$$')
    .replace(/\\\]/g, '$$')

  // 3. Fix inline math delimiters: \( \) → $
  text = text
    .replace(/\\\(/g, '$')
    .replace(/\\\)/g, '$')

  // 3a. Fix \begin{env}...\end{env} environments before math wrapping
  text = clientFixLatexEnvironments(text)

  // 3b. Wrap undelimited math commands in $...$ (defence-in-depth for stored content)
  text = clientWrapUndelimitedMath(text)

  // 4. Remove conversational filler at the start
  text = text
    .replace(
      /^(?:Here\s+is\s+(?:the\s+|a\s+)?(?:answer|question|solution|explanation|problem|result)\s*[:.\-]\s*\n?)/i,
      ''
    )
    .trimStart()

  // 5. Standardize bold: **text** → \textbf{text}
  text = text.replace(/\*\*([^*]+)\*\*/g, '\\textbf{$1}')

  // 6. Fix escaped newlines: literal two-char \n → real newline
  text = text.replace(/(?<!\\)\\n/g, '\n')

  // 7. Balance unclosed $ delimiters — prevents KaTeX from consuming
  //    the entire remaining string as one broken math expression.
  text = balanceDollarSigns(text)

  return text
}

/**
 * Ensures every opening $ has a matching closing $.
 * If the count of non-escaped single $ (outside of $$ pairs) is odd,
 * the trailing unmatched $ is stripped so the rest of the text renders cleanly.
 */
function balanceDollarSigns(text: string): string {
  // First, temporarily mask $$ (display math) so we only count single $
  const maskedDD = text.replace(/\$\$/g, '\x00DD\x00')

  const dollars: number[] = []
  for (let i = 0; i < maskedDD.length; i++) {
    if (maskedDD[i] === '$' && (i === 0 || maskedDD[i - 1] !== '\\')) {
      dollars.push(i)
    }
  }

  if (dollars.length % 2 !== 0 && dollars.length > 0) {
    // Remove the last unmatched $ from the original text
    // Map index back from masked → original (masks are same-length replacement)
    const lastIdx = dollars[dollars.length - 1]
    // Rebuild: the mask didn't change single-$ positions, so index is valid
    // on the original string after restoring $$
    const chars = text.split('')
    // Walk original text to find the Nth single-$ position
    let singleCount = 0
    for (let i = 0; i < chars.length; i++) {
      // Skip $$ pairs
      if (chars[i] === '$' && i + 1 < chars.length && chars[i + 1] === '$') {
        i++ // skip both
        continue
      }
      if (chars[i] === '$' && (i === 0 || chars[i - 1] !== '\\')) {
        singleCount++
        if (singleCount === dollars.length) {
          // This is the unmatched one — strip it
          chars[i] = ''
          break
        }
      }
    }
    // Only apply if we actually found and removed something at a valid position
    if (singleCount === dollars.length) {
      return chars.join('')
    }
    // Fallback: strip the last $ we found via masked index
    return text.substring(0, lastIdx) + text.substring(lastIdx + 1)
  }

  return text
}

// =====================================================
// CLIENT-SIDE ENVIRONMENT HANDLER
// =====================================================

const CLIENT_MATH_ENVS = new Set([
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
 * Client-side mirror of fixLatexEnvironments from lib/latex-utils.ts.
 * Converts \begin{env}...\end{env} blocks outside $...$ spans:
 *   - Math envs  → $$\begin{env}...\end{env}$$
 *   - enumerate / numerate → (a) (b) (c)… list
 *   - itemize    → bullet list
 *   - Everything else → strip tags, keep inner content
 */
function clientFixLatexEnvironments(text: string): string {
  if (!/\\begin\{/.test(text)) return text

  // Convert \begin{env}...\end{env} blocks using plain indexOf — O(n), no backtracking
  function convertSeg(segment: string): string {
    let result = ''
    let pos = 0
    while (pos < segment.length) {
      const beginIdx = segment.indexOf('\\begin{', pos)
      if (beginIdx === -1) { result += segment.slice(pos); break }
      result += segment.slice(pos, beginIdx)
      const envNameStart = beginIdx + 7
      const envNameEnd = segment.indexOf('}', envNameStart)
      if (envNameEnd === -1) { result += segment.slice(beginIdx); break }
      const env = segment.slice(envNameStart, envNameEnd).trim()
      const contentStart = envNameEnd + 1
      const endTag = `\\end{${env}}`
      const endIdx = segment.indexOf(endTag, contentStart)
      if (endIdx === -1) {
        result += segment.slice(beginIdx, envNameEnd + 1)
        pos = envNameEnd + 1
        continue
      }
      const content = segment.slice(contentStart, endIdx)
      if (CLIENT_MATH_ENVS.has(env)) {
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
    parts.push(seg.includes('\\begin{') ? convertSeg(seg) : seg)
    i = segEnd
  }
  return parts.join('')
}

// =====================================================
// CLIENT-SIDE UNDELIMITED MATH WRAPPER
// =====================================================

const CLIENT_MATH_TRIGGER =
  /\\(?:frac|dfrac|tfrac|sqrt|cbrt|times|div|pm|mp|cdot|le[tq]?|ge[tq]?|neq|ne|approx|equiv|propto|sum|prod|int|lim|max|min|sin|cos|tan|sec|cot|sinh|cosh|tanh|log|ln|exp|pi|theta|phi|psi|omega|alpha|beta|gamma|delta|epsilon|lambda|mu|nu|sigma|infty|partial|nabla|vec|hat|bar|dot|overline|underline|left|right|binom|pmod|mathrm|mathit|mathbf|mathbb|mathcal|operatorname)\b/

/**
 * Client-side mirror of lib/latex-utils.ts wrapUndelimitedMath.
 * Wraps \cmd patterns outside existing $...$ spans in $...$.
 */
function clientWrapUndelimitedMath(text: string): string {
  if (!CLIENT_MATH_TRIGGER.test(text)) return text

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
    parts.push(CLIENT_MATH_TRIGGER.test(seg) ? clientWrapSegment(seg) : seg)
    i = segEnd
  }
  return parts.join('')
}

function clientWrapSegment(segment: string): string {
  const ranges: Array<{ start: number; end: number }> = []
  let i = 0
  while (i < segment.length) {
    if (segment[i] === '\\' && CLIENT_MATH_TRIGGER.test(segment.slice(i))) {
      const start = clientFindStart(segment, i)
      const end = clientConsumeExpr(segment, i)
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

function clientFindStart(text: string, cmdPos: number): number {
  let j = cmdPos - 1; let start = cmdPos
  while (j >= 0) {
    const ch = text[j]
    if (/[0-9+\-*/=<>^.,_|!]/.test(ch)) { start = j; j--; continue }
    if ('()[]'.includes(ch)) { start = j; j--; continue }
    if (/[a-zA-Z]/.test(ch) && (j === 0 || !/[a-zA-Z]/.test(text[j - 1]))) { start = j; j--; continue }
    if (ch === ' ') {
      let k = j - 1; while (k >= 0 && text[k] === ' ') k--
      if (k >= 0 && /[0-9a-zA-Z+\-*/=<>^.]/.test(text[k])) { j--; continue }
    }
    break
  }
  while (start < cmdPos && text[start] === ' ') start++
  return start
}

function clientConsumeExpr(text: string, start: number): number {
  let i = start
  while (i < text.length) {
    const ch = text[i]
    if (ch === '\\') {
      const n = text[i + 1] ?? ''
      if (/[a-zA-Z]/.test(n)) { i++; while (i < text.length && /[a-zA-Z]/.test(text[i])) i++; continue }
      if (n === '\\' || '{}'.includes(n) || ' ,;!:'.includes(n)) { i += 2; continue }
      break
    }
    if (ch === '{') {
      let d = 1; i++
      while (i < text.length && d > 0) { if (text[i] === '{') d++; else if (text[i] === '}') d--; i++ }
      continue
    }
    if (/[0-9+\-*/=<>^.,_|!]/.test(ch)) { i++; continue }
    if ('()[]'.includes(ch)) { i++; continue }
    if (/[a-zA-Z]/.test(ch) && !/[a-zA-Z]/.test(text[i + 1] ?? '')) { i++; continue }
    if (ch === ' ' && (text[i + 1] === '\\' || /[0-9+\-*/=<>^]/.test(text[i + 1] ?? ''))) { i++; continue }
    break
  }
  while (i > start && text[i - 1] === ' ') i--
  return i
}

// =====================================================
// FALLBACK TEXT EXTRACTION
// =====================================================

/**
 * Strip LaTeX symbols for clean fallback display.
 * Produces human-readable plain text when KaTeX fails.
 */
function stripLatexSymbols(text: string): string {
  return text
    .replace(/\$\$/g, '')
    .replace(/\$/g, '')
    .replace(/\\textbf\{([^}]*)\}/g, '$1')
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1)/($2)')
    .replace(/\\sqrt\{([^}]*)\}/g, 'sqrt($1)')
    .replace(/\\(?:text|mathrm|mathit)\{([^}]*)\}/g, '$1')
    .replace(/\\(?:left|right|bigg?[lr]?)/g, '')
    .replace(/\\times/g, 'x')
    .replace(/\\div/g, '/')
    .replace(/\\pm/g, '+/-')
    .replace(/\\leq?/g, '<=')
    .replace(/\\geq?/g, '>=')
    .replace(/\\neq/g, '!=')
    .replace(/\\approx/g, '~')
    .replace(/\\cdot/g, '.')
    .replace(/\\[a-zA-Z]+/g, ' ')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// =====================================================
// CLIENT-SIDE LATEX REPAIR (defence-in-depth)
// =====================================================

/**
 * Lightweight repair applied per math span before KaTeX parses it.
 * Mirrors the server-side repairLatex() in lib/latex-utils.ts so that
 * content already stored in the DB is also fixed at render time.
 */
function repairMathSpan(expr: string): string {
  let text = expr

  // Fix \text { → \text{
  text = text.replace(/\\text\s+\{/g, '\\text{')

  // Fix \text word (no braces) → \text{word}
  text = text.replace(/\\text(?!\s*\{)\s+([A-Za-z][A-Za-z0-9]*)/g, '\\text{$1}')

  // Fix \sqrt X (single token, no brace) → \sqrt{X}
  text = text.replace(/\\sqrt\s+([A-Za-z0-9])\b(?!\s*[\^_{])/g, '\\sqrt{$1}')

  // Balance unclosed braces — the primary fix for \frac{a}{b and \text{cm
  let depth = 0
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '\\' && (text[i + 1] === '{' || text[i + 1] === '}')) {
      i++
      continue
    }
    if (ch === '{') depth++
    else if (ch === '}' && depth > 0) depth--
  }
  if (depth > 0) text = text + '}'.repeat(depth)

  return text
}

// =====================================================
// KATEX RENDERER
// =====================================================

/**
 * Render KaTeX safely. Returns HTML string and error flag.
 * On error: returns clean fallback text, never the red KaTeX error box.
 */
function renderKatex(
  content: string,
  displayMode: boolean
): { html: string; isError: boolean } {
  // Repair common AI hallucination patterns before KaTeX attempts to parse
  const repairedContent = repairMathSpan(content)
  try {
    const html = katex.renderToString(repairedContent, {
      displayMode,
      throwOnError: true, // We catch it ourselves for clean fallback
      trust: false,
      strict: false,
      output: 'html',
      macros: {
        '\\R': '\\mathbb{R}',
        '\\N': '\\mathbb{N}',
        '\\Z': '\\mathbb{Z}',
        '\\Q': '\\mathbb{Q}',
        '\\C': '\\mathbb{C}',
      },
    })
    return { html, isError: false }
  } catch {
    const cleanText = stripLatexSymbols(content)
    return {
      html: `<span class="latex-fallback-text">${cleanText}</span>`,
      isError: true,
    }
  }
}

// =====================================================
// MAIN COMPONENT
// =====================================================

/**
 * LatexPreview — Bulletproof math renderer
 *
 * Guarantees:
 * - Never shows raw LaTeX / $ signs to end users
 * - Never renders the red KaTeX error box
 * - Never crashes the page (full try/catch around render)
 * - Pre-processes AI artifacts before parsing
 * - Edexcel exam-paper typography (serif font stack)
 */
export function LatexPreview({
  latex,
  className = '',
  showSkeleton = true,
}: LatexPreviewProps) {
  const [isRendered, setIsRendered] = useState(false)
  const [hasError, setHasError] = useState(false)

  // Reset state when latex changes
  useEffect(() => {
    setIsRendered(false)
    setHasError(false)
    const timer = setTimeout(() => setIsRendered(true), 50)
    return () => clearTimeout(timer)
  }, [latex])

  // 1. Pre-process the raw string
  const cleanLatex = useMemo(() => {
    if (!latex) return ''
    return preProcess(latex)
  }, [latex])

  // 2. Parse and render content — wrapped in a top-level try/catch
  //    so nothing can ever throw past this component.
  const renderedContent = useMemo(() => {
    if (!cleanLatex) return null

    try {
      let errorDetected = false

      // Split by display math ($$...$$)
      const displayParts = cleanLatex.split(/(\$\$[\s\S]*?\$\$)/g)

      const elements = displayParts.map((part, i) => {
        // Display math block
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const content = part.slice(2, -2)
          const rendered = renderKatex(content, true)
          if (rendered.isError) errorDetected = true
          return (
            <div
              key={i}
              className="my-4 overflow-x-auto py-2 text-center"
              dangerouslySetInnerHTML={{ __html: rendered.html }}
            />
          )
        }

        // Text chunk — check for inline math ($...$)
        const inlineParts = part.split(/(\$[^$]+?\$)/g)

        return (
          <span key={i}>
            {inlineParts.map((subPart, j) => {
              if (subPart.startsWith('$') && subPart.endsWith('$') && subPart.length > 1) {
                const content = subPart.slice(1, -1)
                const rendered = renderKatex(content, false)
                if (rendered.isError) errorDetected = true
                return (
                  <span
                    key={j}
                    className="px-0.5"
                    dangerouslySetInnerHTML={{ __html: rendered.html }}
                  />
                )
              }
              // Regular text — render newlines as <br/>
              return (
                <span key={j}>
                  {subPart.split('\n').map((line, k, arr) => (
                    <span key={k}>
                      {line}
                      {k < arr.length - 1 && <br />}
                    </span>
                  ))}
                </span>
              )
            })}
          </span>
        )
      })

      // Defer state update out of render via microtask
      if (errorDetected) {
        Promise.resolve().then(() => setHasError(true))
      }

      return elements
    } catch {
      // Absolute last resort — render as plain text
      Promise.resolve().then(() => setHasError(true))
      return <p className="latex-fallback-text">{stripLatexSymbols(cleanLatex)}</p>
    }
  }, [cleanLatex])

  // Empty state
  if (!latex || !cleanLatex) {
    return (
      <div className={`latex-preview text-swiss-lead italic ${className}`}>
        No content available
      </div>
    )
  }

  // Skeleton loading state
  if (showSkeleton && !isRendered) {
    return (
      <div className={`latex-preview ${className}`}>
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-swiss-concrete rounded w-3/4" />
          <div className="h-4 bg-swiss-concrete rounded w-1/2" />
        </div>
      </div>
    )
  }

  return (
    <div
      className={`
        latex-preview
        text-swiss-ink
        leading-7
        transition-opacity duration-200
        ${isRendered ? 'opacity-100' : 'opacity-0'}
        ${className}
      `}
      style={{
        fontFamily: "'Times New Roman', 'Cambria Math', serif",
        fontSize: '1.1rem',
        letterSpacing: '0.01em',
      }}
    >
      {renderedContent}

      {/* Hidden admin flag — only visible via DevTools or admin stylesheet */}
      {hasError && (
        <span
          data-latex-error="true"
          aria-hidden="true"
          className="sr-only"
        >
          [LaTeX rendering error — fallback text shown]
        </span>
      )}
    </div>
  )
}

// =====================================================
// COMPACT VARIANT
// =====================================================

/**
 * Compact variant for table cells and small spaces.
 * Inherits all bulletproof guarantees from LatexPreview.
 */
export function LatexPreviewCompact({
  latex,
  className = '',
}: Omit<LatexPreviewProps, 'showSkeleton'>) {
  return (
    <LatexPreview
      latex={latex}
      className={`text-sm leading-5 ${className}`}
      showSkeleton={false}
    />
  )
}
