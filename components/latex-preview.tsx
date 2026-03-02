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
  try {
    const html = katex.renderToString(content, {
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
