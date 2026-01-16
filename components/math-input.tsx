"use client"

import { useRef, useState, useCallback } from "react"
import { Textarea } from "@/components/ui/textarea"
import { LatexPreview } from "@/components/latex-preview"
import { ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"

// =====================================================
// Types
// =====================================================

interface MathInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  minHeight?: string
}

interface MathSymbol {
  label: string
  latex: string
  display: string
  cursorOffset?: number // How many characters to move cursor back after insertion
}

// =====================================================
// Math Symbols Configuration
// =====================================================

const MATH_SYMBOLS: MathSymbol[] = [
  { label: "Fraction", latex: "\\frac{}{}", display: "\\frac{a}{b}", cursorOffset: 3 },
  { label: "Power", latex: "^{}", display: "x^{n}", cursorOffset: 1 },
  { label: "Subscript", latex: "_{}", display: "x_{n}", cursorOffset: 1 },
  { label: "Square Root", latex: "\\sqrt{}", display: "\\sqrt{x}", cursorOffset: 1 },
  { label: "nth Root", latex: "\\sqrt[]{}", display: "\\sqrt[n]{x}", cursorOffset: 3 },
  { label: "Pi", latex: "\\pi", display: "\\pi", cursorOffset: 0 },
  { label: "Theta", latex: "\\theta", display: "\\theta", cursorOffset: 0 },
  { label: "Degrees", latex: "^{\\circ}", display: "^{\\circ}", cursorOffset: 0 },
  { label: "Multiply", latex: "\\times", display: "\\times", cursorOffset: 0 },
  { label: "Divide", latex: "\\div", display: "\\div", cursorOffset: 0 },
  { label: "Plus/Minus", latex: "\\pm", display: "\\pm", cursorOffset: 0 },
  { label: "Less/Equal", latex: "\\le", display: "\\le", cursorOffset: 0 },
  { label: "Greater/Equal", latex: "\\ge", display: "\\ge", cursorOffset: 0 },
  { label: "Not Equal", latex: "\\ne", display: "\\ne", cursorOffset: 0 },
  { label: "Infinity", latex: "\\infty", display: "\\infty", cursorOffset: 0 },
  { label: "Sum", latex: "\\sum_{i=1}^{n}", display: "\\sum", cursorOffset: 0 },
]

// Group symbols for better organization
const SYMBOL_GROUPS = {
  "Common": ["Fraction", "Power", "Square Root", "Pi", "Degrees"],
  "Operations": ["Multiply", "Divide", "Plus/Minus"],
  "Comparisons": ["Less/Equal", "Greater/Equal", "Not Equal"],
  "Advanced": ["Subscript", "nth Root", "Theta", "Infinity", "Sum"],
}

// =====================================================
// MathInput Component
// =====================================================

export function MathInput({
  value,
  onChange,
  placeholder = "Enter your answer here...",
  disabled = false,
  className,
  minHeight = "120px",
}: MathInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Insert symbol at cursor position
  const insertSymbol = useCallback((symbol: MathSymbol) => {
    const textarea = textareaRef.current
    if (!textarea || disabled) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = value

    // If there's selected text and the symbol has a placeholder, wrap it
    const selectedText = text.substring(start, end)
    let insertText = symbol.latex
    let newCursorPos = start + insertText.length - (symbol.cursorOffset || 0)

    // For fraction, if text is selected, put it in the numerator
    if (symbol.latex === "\\frac{}{}" && selectedText) {
      insertText = `\\frac{${selectedText}}{}`
      newCursorPos = start + insertText.length - 1
    }
    // For power/subscript, if text is selected, put it in the braces
    else if ((symbol.latex === "^{}" || symbol.latex === "_{}") && selectedText) {
      insertText = symbol.latex.replace("{}", `{${selectedText}}`)
      newCursorPos = start + insertText.length
    }
    // For sqrt, if text is selected, put it inside
    else if (symbol.latex === "\\sqrt{}" && selectedText) {
      insertText = `\\sqrt{${selectedText}}`
      newCursorPos = start + insertText.length
    }

    // Create new value
    const newValue = text.substring(0, start) + insertText + text.substring(end)
    onChange(newValue)

    // Set cursor position after React updates
    requestAnimationFrame(() => {
      if (textarea) {
        textarea.focus()
        textarea.setSelectionRange(newCursorPos, newCursorPos)
      }
    })
  }, [value, onChange, disabled])

  // Get symbols for display
  const commonSymbols = MATH_SYMBOLS.filter(s => SYMBOL_GROUPS["Common"].includes(s.label))
  const operationSymbols = MATH_SYMBOLS.filter(s => SYMBOL_GROUPS["Operations"].includes(s.label))
  const comparisonSymbols = MATH_SYMBOLS.filter(s => SYMBOL_GROUPS["Comparisons"].includes(s.label))
  const advancedSymbols = MATH_SYMBOLS.filter(s => SYMBOL_GROUPS["Advanced"].includes(s.label))

  // Check if content has any LaTeX
  const hasLatex = value.includes("\\") || value.includes("$")

  return (
    <div className={cn("space-y-2", className)}>
      {/* Symbol Toolbar */}
      <div className="border-2 border-swiss-ink bg-swiss-concrete p-2 space-y-2">
        {/* Quick Access Row */}
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-xs font-bold uppercase tracking-wider text-swiss-lead mr-2 hidden sm:inline">
            Math:
          </span>
          
          {/* Common Symbols */}
          {commonSymbols.map((symbol) => (
            <SymbolButton
              key={symbol.label}
              symbol={symbol}
              onClick={() => insertSymbol(symbol)}
              disabled={disabled}
            />
          ))}

          <div className="w-px h-6 bg-swiss-ink/20 mx-1 hidden sm:block" />

          {/* Operation Symbols */}
          {operationSymbols.map((symbol) => (
            <SymbolButton
              key={symbol.label}
              symbol={symbol}
              onClick={() => insertSymbol(symbol)}
              disabled={disabled}
            />
          ))}

          <div className="w-px h-6 bg-swiss-ink/20 mx-1 hidden sm:block" />

          {/* Comparison Symbols */}
          {comparisonSymbols.map((symbol) => (
            <SymbolButton
              key={symbol.label}
              symbol={symbol}
              onClick={() => insertSymbol(symbol)}
              disabled={disabled}
            />
          ))}

          {/* Toggle Advanced */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="ml-auto flex items-center gap-1 px-2 py-1 text-xs font-bold uppercase tracking-wider text-swiss-lead hover:text-swiss-ink transition-colors"
            disabled={disabled}
          >
            More
            {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Advanced Row (collapsible) */}
        {showAdvanced && (
          <div className="flex flex-wrap items-center gap-1 pt-2 border-t border-swiss-ink/20">
            <span className="text-xs font-bold uppercase tracking-wider text-swiss-lead mr-2 hidden sm:inline">
              Advanced:
            </span>
            {advancedSymbols.map((symbol) => (
              <SymbolButton
                key={symbol.label}
                symbol={symbol}
                onClick={() => insertSymbol(symbol)}
                disabled={disabled}
              />
            ))}
          </div>
        )}
      </div>

      {/* Text Input Area */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "border-2 border-swiss-ink font-mono text-base p-4 resize-y",
          "disabled:opacity-70 disabled:cursor-not-allowed",
          "focus:ring-2 focus:ring-swiss-signal focus:border-swiss-signal"
        )}
        style={{ minHeight }}
      />

      {/* Help Text & Preview Toggle */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-swiss-lead">
          Use toolbar buttons or type LaTeX directly (e.g., $\frac{"{1}{2}"}$ for fractions)
        </p>
        
        {hasLatex && (
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-1 px-2 py-1 text-xs font-bold uppercase tracking-wider text-swiss-signal hover:text-swiss-signal/80 transition-colors"
          >
            {showPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {showPreview ? "Hide Preview" : "Show Preview"}
          </button>
        )}
      </div>

      {/* Live Preview */}
      {showPreview && hasLatex && (
        <div className="border-2 border-swiss-ink bg-swiss-paper p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-swiss-lead mb-2">
            Preview
          </p>
          <div className="bg-white p-3 border border-swiss-ink/20 min-h-[60px]">
            <LatexPreview latex={`$${value}$`} />
          </div>
        </div>
      )}
    </div>
  )
}

// =====================================================
// Symbol Button Component
// =====================================================

interface SymbolButtonProps {
  symbol: MathSymbol
  onClick: () => void
  disabled?: boolean
}

function SymbolButton({ symbol, onClick, disabled }: SymbolButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "px-2 py-1 border border-swiss-ink/30 bg-swiss-paper",
        "text-sm font-medium transition-all duration-150",
        "hover:bg-swiss-signal/10 hover:border-swiss-signal",
        "active:bg-swiss-signal/20",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-swiss-paper disabled:hover:border-swiss-ink/30",
        "focus:outline-none focus:ring-1 focus:ring-swiss-signal"
      )}
      title={symbol.label}
    >
      <span className="inline-block min-w-[24px]">
        <LatexPreview latex={`$${symbol.display}$`} className="text-sm leading-none" />
      </span>
    </button>
  )
}

// =====================================================
// Compact Math Input (for inline use)
// =====================================================

interface CompactMathInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function CompactMathInput({
  value,
  onChange,
  placeholder = "Answer...",
  disabled = false,
  className,
}: CompactMathInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Quick symbols only
  const quickSymbols: MathSymbol[] = [
    { label: "Fraction", latex: "\\frac{}{}", display: "\\frac{a}{b}", cursorOffset: 3 },
    { label: "Power", latex: "^{}", display: "x^{n}", cursorOffset: 1 },
    { label: "Square Root", latex: "\\sqrt{}", display: "\\sqrt{x}", cursorOffset: 1 },
    { label: "Pi", latex: "\\pi", display: "\\pi", cursorOffset: 0 },
    { label: "Multiply", latex: "\\times", display: "\\times", cursorOffset: 0 },
  ]

  const insertSymbol = useCallback((symbol: MathSymbol) => {
    const textarea = textareaRef.current
    if (!textarea || disabled) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = value

    const newValue = text.substring(0, start) + symbol.latex + text.substring(end)
    const newCursorPos = start + symbol.latex.length - (symbol.cursorOffset || 0)
    
    onChange(newValue)

    requestAnimationFrame(() => {
      if (textarea) {
        textarea.focus()
        textarea.setSelectionRange(newCursorPos, newCursorPos)
      }
    })
  }, [value, onChange, disabled])

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center gap-1 flex-wrap">
        {quickSymbols.map((symbol) => (
          <button
            key={symbol.label}
            type="button"
            onClick={() => insertSymbol(symbol)}
            disabled={disabled}
            className={cn(
              "px-1.5 py-0.5 border border-swiss-ink/20 bg-swiss-concrete",
              "text-xs transition-colors",
              "hover:bg-swiss-signal/10 hover:border-swiss-signal",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            title={symbol.label}
          >
            <LatexPreview latex={`$${symbol.display}$`} className="text-xs leading-none" />
          </button>
        ))}
      </div>
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "border border-swiss-ink font-mono text-sm p-2 resize-none min-h-[60px]",
          "disabled:opacity-70 disabled:cursor-not-allowed"
        )}
        rows={2}
      />
    </div>
  )
}
