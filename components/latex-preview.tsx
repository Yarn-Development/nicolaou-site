'use client'

import { useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

interface LatexPreviewProps {
  latex: string
  className?: string
}

export function LatexPreview({ latex, className = '' }: LatexPreviewProps) {
  // 1. Clean the input: LLMs sometimes output \[ \] or \( \) instead of $
  // This normalizes everything to $ and $$
  const cleanLatex = useMemo(() => {
    if (!latex) return ''
    return latex
      .replace(/\\\[/g, '$$$$') // Replace \[ with $$
      .replace(/\\\]/g, '$$$$') // Replace \] with $$
      .replace(/\\\(/g, '$')    // Replace \( with $
      .replace(/\\\)/g, '$')    // Replace \) with $
  }, [latex])

  // 2. Render logic using a split strategy
  const renderContent = () => {
    if (!cleanLatex) return <span className="text-muted-foreground italic">No content</span>

    // Step A: Split by Display Math ($$...$$)
    // The regex includes capturing parentheses so the delimiters/content are kept in the array
    const displayParts = cleanLatex.split(/(\$\$[\s\S]*?\$\$)/g)

    return displayParts.map((part, i) => {
      // If this part matches $$...$$, render as block
      if (part.startsWith('$$') && part.endsWith('$$')) {
        // Strip the $$ delimiters
        const content = part.slice(2, -2)
        return (
          <div key={i} className="my-4 overflow-x-auto py-2 text-center"
               dangerouslySetInnerHTML={{
                 __html: renderKatex(content, true)
               }} 
          />
        )
      }

      // Step B: If not display math, check for Inline Math ($...$) inside this text chunk
      // We split this chunk by $...$
      const inlineParts = part.split(/(\$[^\$]+?\$)/g)

      return (
        <span key={i}>
          {inlineParts.map((subPart, j) => {
            if (subPart.startsWith('$') && subPart.endsWith('$')) {
              // Strip the $ delimiters
              const content = subPart.slice(1, -1)
              return (
                <span key={j} 
                      className="px-0.5"
                      dangerouslySetInnerHTML={{
                        __html: renderKatex(content, false)
                      }} 
                />
              )
            }
            // Just regular text - render as string to prevent XSS in text parts
            return <span key={j}>{subPart}</span>
          })}
        </span>
      )
    })
  }

  return (
    <div className={`latex-preview text-foreground leading-7 ${className}`}>
      {renderContent()}
    </div>
  )
}

// Helper to render KaTeX string safely
function renderKatex(content: string, displayMode: boolean): string {
  try {
    return katex.renderToString(content, {
      displayMode,
      throwOnError: false, // Don't crash on bad LaTeX, just show error text
      trust: false,
      strict: false,
      macros: {
        "\\R": "\\mathbb{R}",
        "\\N": "\\mathbb{N}",
        "\\Z": "\\mathbb{Z}"
      }
    })
  } catch (e) {
    console.error(e)
    return `<span class="text-red-500 font-mono text-xs">${content}</span>`
  }
}