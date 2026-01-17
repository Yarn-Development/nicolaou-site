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

/**
 * LatexPreview - Professional math renderer for teacher-facing UI
 * 
 * Features:
 * - Never shows raw LaTeX syntax to users
 * - Smooth loading transition (no content jump)
 * - Graceful error handling with clean fallback
 * - Uses application font for seamless integration
 */
export function LatexPreview({ latex, className = '', showSkeleton = true }: LatexPreviewProps) {
  const [isRendered, setIsRendered] = useState(false)
  const [hasError, setHasError] = useState(false)

  // Reset state when latex changes
  useEffect(() => {
    setIsRendered(false)
    setHasError(false)
    // Small delay to ensure smooth transition
    const timer = setTimeout(() => setIsRendered(true), 50)
    return () => clearTimeout(timer)
  }, [latex])

  // 1. Clean the input: LLMs sometimes output \[ \] or \( \) instead of $
  const cleanLatex = useMemo(() => {
    if (!latex) return ''
    return latex
      .replace(/\\\[/g, '$$$$') // Replace \[ with $$
      .replace(/\\\]/g, '$$$$') // Replace \] with $$
      .replace(/\\\(/g, '$')    // Replace \( with $
      .replace(/\\\)/g, '$')    // Replace \) with $
  }, [latex])

  // 2. Parse and render content
  const renderedContent = useMemo(() => {
    if (!cleanLatex) return null

    try {
      // Split by Display Math ($$...$$)
      const displayParts = cleanLatex.split(/(\$\$[\s\S]*?\$\$)/g)

      const elements = displayParts.map((part, i) => {
        // If this part matches $$...$$, render as block
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const content = part.slice(2, -2)
          const rendered = renderKatex(content, true)
          if (rendered.isError) {
            setHasError(true)
          }
          return (
            <div 
              key={i} 
              className="my-4 overflow-x-auto py-2 text-center"
              dangerouslySetInnerHTML={{ __html: rendered.html }}
            />
          )
        }

        // Check for Inline Math ($...$) inside this text chunk
        const inlineParts = part.split(/(\$[^\$]+?\$)/g)

        return (
          <span key={i}>
            {inlineParts.map((subPart, j) => {
              if (subPart.startsWith('$') && subPart.endsWith('$')) {
                const content = subPart.slice(1, -1)
                const rendered = renderKatex(content, false)
                if (rendered.isError) {
                  setHasError(true)
                }
                return (
                  <span 
                    key={j}
                    className="px-0.5"
                    dangerouslySetInnerHTML={{ __html: rendered.html }}
                  />
                )
              }
              // Regular text - render as string
              return <span key={j}>{subPart}</span>
            })}
          </span>
        )
      })

      return elements
    } catch {
      setHasError(true)
      return <span className="text-swiss-ink">{stripLatexSymbols(cleanLatex)}</span>
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
          <div className="h-4 bg-swiss-concrete rounded w-3/4"></div>
          <div className="h-4 bg-swiss-concrete rounded w-1/2"></div>
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
        font-sans
        transition-opacity duration-200
        ${isRendered ? 'opacity-100' : 'opacity-0'}
        ${className}
      `}
    >
      {renderedContent}
      {hasError && (
        <span className="ml-2 inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 border border-amber-300 rounded">
          Formatting Note
        </span>
      )}
    </div>
  )
}

/**
 * Strip LaTeX symbols for clean fallback display
 */
function stripLatexSymbols(text: string): string {
  return text
    // Remove $ symbols
    .replace(/\$/g, '')
    // Remove common LaTeX commands but keep the content
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1)/($2)')
    .replace(/\\sqrt\{([^}]*)\}/g, 'sqrt($1)')
    .replace(/\\[a-zA-Z]+/g, ' ')
    // Clean up braces
    .replace(/[{}]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Render KaTeX safely with graceful error handling
 */
function renderKatex(content: string, displayMode: boolean): { html: string; isError: boolean } {
  try {
    const html = katex.renderToString(content, {
      displayMode,
      throwOnError: false,
      trust: false,
      strict: false,
      output: 'html',
      macros: {
        "\\R": "\\mathbb{R}",
        "\\N": "\\mathbb{N}",
        "\\Z": "\\mathbb{Z}",
        "\\Q": "\\mathbb{Q}",
        "\\C": "\\mathbb{C}"
      }
    })
    return { html, isError: false }
  } catch {
    // Graceful fallback - strip LaTeX and show clean text
    const cleanText = stripLatexSymbols(content)
    return { 
      html: `<span class="text-swiss-ink">${cleanText}</span>`,
      isError: true 
    }
  }
}

/**
 * Compact variant for table cells and small spaces
 */
export function LatexPreviewCompact({ latex, className = '' }: Omit<LatexPreviewProps, 'showSkeleton'>) {
  return (
    <LatexPreview 
      latex={latex} 
      className={`text-sm leading-5 ${className}`}
      showSkeleton={false}
    />
  )
}
