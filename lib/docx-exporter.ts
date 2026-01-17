/**
 * Word Document Exporter for Exam Builder
 * 
 * Exports exam questions to a .docx file using the docx library.
 * Handles all content types:
 *   - image_ocr: Scanned past paper images with optional OCR text
 *   - generated_text: AI-generated text-only questions
 *   - synthetic_image: AI-generated questions with diagrams (text + image)
 *   - official_past_paper: Official exam board questions
 * Converts LaTeX to readable Unicode math notation for Word.
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  ImageRun,
  PageBreak,
} from "docx"
import { saveAs } from "file-saver"

// =====================================================
// Types
// =====================================================

export interface ExamQuestion {
  id: string
  content_type: "image_ocr" | "generated_text" | "synthetic_image" | "official_past_paper"
  question_latex: string | null
  image_url: string | null
  topic: string
  topic_name?: string | null
  sub_topic_name?: string | null
  difficulty: "Foundation" | "Higher"
  marks: number | null
  calculator_allowed: boolean | null
  answer_key?: {
    answer?: string
    explanation?: string
    mark_scheme?: string
  } | null
}

export interface ExportOptions {
  includeMarkScheme?: boolean
  includeAnswers?: boolean
  schoolName?: string
  examDate?: string
  timeAllowed?: string
  preserveLatex?: boolean  // If true, keeps raw LaTeX; if false, converts to Unicode
}

// =====================================================
// LaTeX to Unicode Conversion
// =====================================================

/**
 * Unicode superscript and subscript maps
 */
const superscriptMap: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
  'n': 'ⁿ', 'i': 'ⁱ', 'x': 'ˣ', 'y': 'ʸ',
}

const subscriptMap: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
  'a': 'ₐ', 'e': 'ₑ', 'o': 'ₒ', 'x': 'ₓ',
  'i': 'ᵢ', 'j': 'ⱼ', 'n': 'ₙ', 'm': 'ₘ',
}

/**
 * Convert a string to superscript Unicode
 */
function toSuperscript(str: string): string {
  return str.split('').map(c => superscriptMap[c] || c).join('')
}

/**
 * Convert a string to subscript Unicode
 */
function toSubscript(str: string): string {
  return str.split('').map(c => subscriptMap[c] || c).join('')
}

/**
 * Convert LaTeX to readable Unicode math notation
 * Preserves readability while using proper mathematical symbols
 */
function latexToUnicode(latex: string | null): string {
  if (!latex) return ""
  
  let text = latex
  
  // Remove display math delimiters first
  text = text.replace(/\$\$/g, "")
  text = text.replace(/\$/g, "")
  text = text.replace(/\\\[/g, "")
  text = text.replace(/\\\]/g, "")
  text = text.replace(/\\\(/g, "")
  text = text.replace(/\\\)/g, "")
  
  // Fractions: \frac{a}{b} → a/b or (a)/(b)
  text = text.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, (_, num, den) => {
    const cleanNum = num.trim()
    const cleanDen = den.trim()
    // Simple fractions don't need parentheses
    if (cleanNum.length <= 2 && cleanDen.length <= 2) {
      return `${cleanNum}/${cleanDen}`
    }
    return `(${cleanNum})/(${cleanDen})`
  })
  
  // Square roots: \sqrt{x} → √x or √(x)
  text = text.replace(/\\sqrt\{([^{}]+)\}/g, (_, content) => {
    const clean = content.trim()
    if (clean.length <= 2) {
      return `√${clean}`
    }
    return `√(${clean})`
  })
  
  // Nth roots: \sqrt[n]{x} → ⁿ√x
  text = text.replace(/\\sqrt\[(\d+)\]\{([^{}]+)\}/g, (_, n, content) => {
    return `${toSuperscript(n)}√(${content.trim()})`
  })
  
  // Superscripts: x^2 → x² or x^{ab} → x^(ab)
  text = text.replace(/\^(\d)/g, (_, digit) => toSuperscript(digit))
  text = text.replace(/\^\{([^{}]+)\}/g, (_, exp) => {
    const clean = exp.trim()
    // Try to convert to Unicode superscript
    const converted = toSuperscript(clean)
    if (converted !== clean) {
      return converted
    }
    return `^(${clean})`
  })
  
  // Subscripts: x_2 → x₂ or x_{ab} → x_(ab)
  text = text.replace(/_(\d)/g, (_, digit) => toSubscript(digit))
  text = text.replace(/_\{([^{}]+)\}/g, (_, sub) => {
    const clean = sub.trim()
    const converted = toSubscript(clean)
    if (converted !== clean) {
      return converted
    }
    return `_(${clean})`
  })
  
  // Greek letters
  text = text.replace(/\\alpha/g, "α")
  text = text.replace(/\\beta/g, "β")
  text = text.replace(/\\gamma/g, "γ")
  text = text.replace(/\\delta/g, "δ")
  text = text.replace(/\\epsilon/g, "ε")
  text = text.replace(/\\zeta/g, "ζ")
  text = text.replace(/\\eta/g, "η")
  text = text.replace(/\\theta/g, "θ")
  text = text.replace(/\\iota/g, "ι")
  text = text.replace(/\\kappa/g, "κ")
  text = text.replace(/\\lambda/g, "λ")
  text = text.replace(/\\mu/g, "μ")
  text = text.replace(/\\nu/g, "ν")
  text = text.replace(/\\xi/g, "ξ")
  text = text.replace(/\\pi/g, "π")
  text = text.replace(/\\rho/g, "ρ")
  text = text.replace(/\\sigma/g, "σ")
  text = text.replace(/\\tau/g, "τ")
  text = text.replace(/\\upsilon/g, "υ")
  text = text.replace(/\\phi/g, "φ")
  text = text.replace(/\\chi/g, "χ")
  text = text.replace(/\\psi/g, "ψ")
  text = text.replace(/\\omega/g, "ω")
  
  // Capital Greek
  text = text.replace(/\\Gamma/g, "Γ")
  text = text.replace(/\\Delta/g, "Δ")
  text = text.replace(/\\Theta/g, "Θ")
  text = text.replace(/\\Lambda/g, "Λ")
  text = text.replace(/\\Xi/g, "Ξ")
  text = text.replace(/\\Pi/g, "Π")
  text = text.replace(/\\Sigma/g, "Σ")
  text = text.replace(/\\Phi/g, "Φ")
  text = text.replace(/\\Psi/g, "Ψ")
  text = text.replace(/\\Omega/g, "Ω")
  
  // Mathematical operators
  text = text.replace(/\\times/g, "×")
  text = text.replace(/\\cdot/g, "·")
  text = text.replace(/\\div/g, "÷")
  text = text.replace(/\\pm/g, "±")
  text = text.replace(/\\mp/g, "∓")
  text = text.replace(/\\neq/g, "≠")
  text = text.replace(/\\leq/g, "≤")
  text = text.replace(/\\geq/g, "≥")
  text = text.replace(/\\le/g, "≤")
  text = text.replace(/\\ge/g, "≥")
  text = text.replace(/\\approx/g, "≈")
  text = text.replace(/\\equiv/g, "≡")
  text = text.replace(/\\sim/g, "∼")
  text = text.replace(/\\propto/g, "∝")
  
  // Set notation
  text = text.replace(/\\in/g, "∈")
  text = text.replace(/\\notin/g, "∉")
  text = text.replace(/\\subset/g, "⊂")
  text = text.replace(/\\supset/g, "⊃")
  text = text.replace(/\\subseteq/g, "⊆")
  text = text.replace(/\\supseteq/g, "⊇")
  text = text.replace(/\\cup/g, "∪")
  text = text.replace(/\\cap/g, "∩")
  text = text.replace(/\\emptyset/g, "∅")
  
  // Logic
  text = text.replace(/\\forall/g, "∀")
  text = text.replace(/\\exists/g, "∃")
  text = text.replace(/\\nexists/g, "∄")
  text = text.replace(/\\land/g, "∧")
  text = text.replace(/\\lor/g, "∨")
  text = text.replace(/\\neg/g, "¬")
  text = text.replace(/\\implies/g, "⇒")
  text = text.replace(/\\iff/g, "⇔")
  text = text.replace(/\\therefore/g, "∴")
  text = text.replace(/\\because/g, "∵")
  
  // Arrows
  text = text.replace(/\\rightarrow/g, "→")
  text = text.replace(/\\leftarrow/g, "←")
  text = text.replace(/\\leftrightarrow/g, "↔")
  text = text.replace(/\\Rightarrow/g, "⇒")
  text = text.replace(/\\Leftarrow/g, "⇐")
  text = text.replace(/\\Leftrightarrow/g, "⇔")
  text = text.replace(/\\to/g, "→")
  
  // Calculus
  text = text.replace(/\\infty/g, "∞")
  text = text.replace(/\\partial/g, "∂")
  text = text.replace(/\\nabla/g, "∇")
  text = text.replace(/\\int/g, "∫")
  text = text.replace(/\\iint/g, "∬")
  text = text.replace(/\\iiint/g, "∭")
  text = text.replace(/\\oint/g, "∮")
  text = text.replace(/\\sum/g, "Σ")
  text = text.replace(/\\prod/g, "Π")
  
  // Special symbols
  text = text.replace(/\\degree/g, "°")
  text = text.replace(/\\circ/g, "°")
  text = text.replace(/\\angle/g, "∠")
  text = text.replace(/\\perp/g, "⊥")
  text = text.replace(/\\parallel/g, "∥")
  text = text.replace(/\\triangle/g, "△")
  text = text.replace(/\\square/g, "□")
  text = text.replace(/\\diamond/g, "◇")
  
  // Number sets (blackboard bold)
  text = text.replace(/\\mathbb\{R\}/g, "ℝ")
  text = text.replace(/\\mathbb\{N\}/g, "ℕ")
  text = text.replace(/\\mathbb\{Z\}/g, "ℤ")
  text = text.replace(/\\mathbb\{Q\}/g, "ℚ")
  text = text.replace(/\\mathbb\{C\}/g, "ℂ")
  text = text.replace(/\\R/g, "ℝ")
  text = text.replace(/\\N/g, "ℕ")
  text = text.replace(/\\Z/g, "ℤ")
  
  // Text formatting
  text = text.replace(/\\textbf\{([^{}]+)\}/g, "$1")
  text = text.replace(/\\textit\{([^{}]+)\}/g, "$1")
  text = text.replace(/\\text\{([^{}]+)\}/g, "$1")
  text = text.replace(/\\mathrm\{([^{}]+)\}/g, "$1")
  
  // Trigonometric functions (keep as-is but remove backslash)
  text = text.replace(/\\sin/g, "sin")
  text = text.replace(/\\cos/g, "cos")
  text = text.replace(/\\tan/g, "tan")
  text = text.replace(/\\cot/g, "cot")
  text = text.replace(/\\sec/g, "sec")
  text = text.replace(/\\csc/g, "csc")
  text = text.replace(/\\arcsin/g, "arcsin")
  text = text.replace(/\\arccos/g, "arccos")
  text = text.replace(/\\arctan/g, "arctan")
  text = text.replace(/\\sinh/g, "sinh")
  text = text.replace(/\\cosh/g, "cosh")
  text = text.replace(/\\tanh/g, "tanh")
  text = text.replace(/\\log/g, "log")
  text = text.replace(/\\ln/g, "ln")
  text = text.replace(/\\exp/g, "exp")
  text = text.replace(/\\lim/g, "lim")
  text = text.replace(/\\max/g, "max")
  text = text.replace(/\\min/g, "min")
  
  // Brackets
  text = text.replace(/\\left\(/g, "(")
  text = text.replace(/\\right\)/g, ")")
  text = text.replace(/\\left\[/g, "[")
  text = text.replace(/\\right\]/g, "]")
  text = text.replace(/\\left\{/g, "{")
  text = text.replace(/\\right\}/g, "}")
  text = text.replace(/\\left\|/g, "|")
  text = text.replace(/\\right\|/g, "|")
  text = text.replace(/\\lfloor/g, "⌊")
  text = text.replace(/\\rfloor/g, "⌋")
  text = text.replace(/\\lceil/g, "⌈")
  text = text.replace(/\\rceil/g, "⌉")
  
  // Spacing commands
  text = text.replace(/\\quad/g, "  ")
  text = text.replace(/\\qquad/g, "    ")
  text = text.replace(/\\,/g, " ")
  text = text.replace(/\\;/g, " ")
  text = text.replace(/\\!/g, "")
  text = text.replace(/\\ /g, " ")
  text = text.replace(/\\newline/g, "\n")
  text = text.replace(/\\\\/g, "\n")
  
  // Remove any remaining backslash commands
  text = text.replace(/\\[a-zA-Z]+/g, "")
  
  // Clean up braces
  text = text.replace(/\{|\}/g, "")
  
  // Normalize whitespace
  text = text.replace(/\s+/g, " ").trim()
  
  return text
}

/**
 * Legacy function for backward compatibility
 */
function cleanLatexForText(latex: string | null): string {
  return latexToUnicode(latex)
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Fetch image from URL and convert to buffer
 */
async function fetchImageAsBuffer(url: string): Promise<ArrayBuffer | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.status}`)
      return null
    }
    return await response.arrayBuffer()
  } catch (error) {
    console.error("Error fetching image:", error)
    return null
  }
}

/**
 * Create a styled header paragraph
 */
function createHeader(text: string, level: typeof HeadingLevel[keyof typeof HeadingLevel] = HeadingLevel.HEADING_1) {
  return new Paragraph({
    text,
    heading: level,
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  })
}

/**
 * Create a question number paragraph
 */
function createQuestionNumber(num: number, marks: number | null) {
  const marksText = marks ? ` [${marks} mark${marks !== 1 ? "s" : ""}]` : ""
  return new Paragraph({
    children: [
      new TextRun({
        text: `Question ${num}`,
        bold: true,
        size: 24, // 12pt
      }),
      new TextRun({
        text: marksText,
        bold: true,
        size: 20, // 10pt
      }),
    ],
    spacing: { before: 400, after: 200 },
    border: {
      bottom: {
        color: "000000",
        space: 1,
        style: BorderStyle.SINGLE,
        size: 6,
      },
    },
  })
}

/**
 * Create paragraphs for question content (handles multi-line and math)
 */
function createQuestionContent(latex: string | null, preserveLatex: boolean = false): Paragraph[] {
  const text = preserveLatex ? (latex || "") : latexToUnicode(latex)
  
  // Split by newlines to create multiple paragraphs
  const lines = text.split('\n').filter(line => line.trim())
  
  return lines.map(line => new Paragraph({
    children: [
      new TextRun({
        text: line.trim(),
        size: 22, // 11pt
      }),
    ],
    spacing: { after: 120 },
  }))
}

/**
 * Create a single text paragraph
 */
function createQuestionText(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        size: 22, // 11pt
      }),
    ],
    spacing: { after: 200 },
  })
}

/**
 * Create metadata paragraph (topic, difficulty, calculator)
 */
function createMetadata(question: ExamQuestion) {
  const parts = []
  
  if (question.topic_name || question.topic) {
    parts.push(`Topic: ${question.topic_name || question.topic}`)
  }
  if (question.sub_topic_name) {
    parts.push(`Sub-topic: ${question.sub_topic_name}`)
  }
  parts.push(`Tier: ${question.difficulty}`)
  parts.push(`Calculator: ${question.calculator_allowed ? "Allowed" : "Not Allowed"}`)
  
  return new Paragraph({
    children: [
      new TextRun({
        text: parts.join(" • "),
        size: 18, // 9pt
        italics: true,
        color: "666666",
      }),
    ],
    spacing: { after: 300 },
  })
}

/**
 * Create answer/mark scheme section with proper Unicode math
 */
function createAnswerSection(question: ExamQuestion, preserveLatex: boolean = false): Paragraph[] {
  const paragraphs: Paragraph[] = []
  
  if (question.answer_key?.answer) {
    const answerText = preserveLatex 
      ? question.answer_key.answer 
      : latexToUnicode(question.answer_key.answer)
    
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Answer: ",
            bold: true,
            size: 20,
          }),
          new TextRun({
            text: answerText,
            size: 20,
          }),
        ],
        spacing: { before: 200 },
      })
    )
  }
  
  if (question.answer_key?.explanation) {
    const explanationText = preserveLatex 
      ? question.answer_key.explanation 
      : latexToUnicode(question.answer_key.explanation)
    
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Explanation: ",
            bold: true,
            size: 20,
          }),
          new TextRun({
            text: explanationText,
            size: 20,
          }),
        ],
        spacing: { before: 100 },
      })
    )
  }
  
  if (question.answer_key?.mark_scheme) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Mark Scheme: ",
            bold: true,
            size: 20,
          }),
          new TextRun({
            text: question.answer_key.mark_scheme,
            size: 20,
          }),
        ],
        spacing: { before: 100 },
      })
    )
  }
  
  return paragraphs
}

// =====================================================
// Main Export Function
// =====================================================

/**
 * Exports an array of questions to a Word document
 * 
 * @param questions - Array of exam questions to export
 * @param title - Title of the exam
 * @param options - Export options (mark scheme, answers, metadata)
 */
export async function exportExamToWord(
  questions: ExamQuestion[],
  title: string,
  options: ExportOptions = {}
): Promise<void> {
  const {
    includeMarkScheme = false,
    includeAnswers = false,
    schoolName = "",
    examDate = new Date().toLocaleDateString("en-GB"),
    timeAllowed = "",
    preserveLatex = false,
  } = options

  // Calculate total marks
  const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0)

  // Build document sections
  const docChildren: Paragraph[] = []

  // Title page / Header
  docChildren.push(createHeader(title, HeadingLevel.HEADING_1))
  
  if (schoolName) {
    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: schoolName, size: 24 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      })
    )
  }

  // Exam info table
  const infoItems: string[] = []
  infoItems.push(`Date: ${examDate}`)
  infoItems.push(`Total Questions: ${questions.length}`)
  infoItems.push(`Total Marks: ${totalMarks}`)
  if (timeAllowed) {
    infoItems.push(`Time Allowed: ${timeAllowed}`)
  }

  docChildren.push(
    new Paragraph({
      children: [
        new TextRun({
          text: infoItems.join("  |  "),
          size: 20,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      border: {
        top: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" },
        bottom: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" },
      },
    })
  )

  // Instructions
  docChildren.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Instructions: Answer ALL questions. Show your working where appropriate.",
          size: 20,
          italics: true,
        }),
      ],
      spacing: { before: 200, after: 400 },
    })
  )

  // Process each question
  for (let i = 0; i < questions.length; i++) {
    const question = questions[i]
    const questionNum = i + 1

    // Question number and marks
    docChildren.push(createQuestionNumber(questionNum, question.marks))

    // Question content based on type
    if (question.content_type === "synthetic_image") {
      // For synthetic_image: render text FIRST, then the diagram image below
      if (question.question_latex) {
        const contentParagraphs = createQuestionContent(question.question_latex, preserveLatex)
        docChildren.push(...contentParagraphs)
      }
      
      // Then render the diagram image
      if (question.image_url) {
        const imageBuffer = await fetchImageAsBuffer(question.image_url)
        if (imageBuffer) {
          try {
            docChildren.push(
              new Paragraph({
                children: [
                  new ImageRun({
                    data: imageBuffer,
                    transformation: {
                      width: 350,
                      height: 280,
                    },
                    type: "png",
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 200, after: 200 },
              })
            )
          } catch (imgError) {
            console.error("Error adding diagram to document:", imgError)
            docChildren.push(
              createQuestionText(`[Diagram: ${question.image_url}]`)
            )
          }
        } else {
          docChildren.push(
            createQuestionText(`[Diagram could not be loaded: ${question.image_url}]`)
          )
        }
      }
    } else if (question.content_type === "image_ocr" || question.content_type === "official_past_paper") {
      // For image_ocr and official_past_paper: show image first, then optional text
      if (question.image_url) {
        const imageBuffer = await fetchImageAsBuffer(question.image_url)
        
        if (imageBuffer) {
          try {
            docChildren.push(
              new Paragraph({
                children: [
                  new ImageRun({
                    data: imageBuffer,
                    transformation: {
                      width: 400,
                      height: 300,
                    },
                    type: "png",
                  }),
                ],
                spacing: { after: 200 },
              })
            )
          } catch (imgError) {
            console.error("Error adding image to document:", imgError)
            docChildren.push(
              createQuestionText(`[Image: ${question.image_url}]`)
            )
          }
        } else {
          docChildren.push(
            createQuestionText(`[Image could not be loaded: ${question.image_url}]`)
          )
        }
      }
      
      // Also include LaTeX text if available
      if (question.question_latex) {
        const contentParagraphs = createQuestionContent(question.question_latex, preserveLatex)
        docChildren.push(...contentParagraphs)
      }
    } else if (question.question_latex) {
      // generated_text: Render LaTeX content only
      const contentParagraphs = createQuestionContent(question.question_latex, preserveLatex)
      docChildren.push(...contentParagraphs)
    } else {
      docChildren.push(
        createQuestionText("[Question content not available]")
      )
    }

    // Metadata line
    docChildren.push(createMetadata(question))

    // Answer space (blank lines for student answers)
    if (!includeAnswers && !includeMarkScheme) {
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "Answer:",
              bold: true,
              size: 20,
            }),
          ],
          spacing: { before: 200 },
        })
      )
      // Add blank lines for answer space
      for (let j = 0; j < 4; j++) {
        docChildren.push(
          new Paragraph({
            text: "",
            spacing: { after: 200 },
            border: {
              bottom: { style: BorderStyle.DOTTED, size: 1, color: "CCCCCC" },
            },
          })
        )
      }
    }
  }

  // Mark Scheme Section (separate page)
  if (includeMarkScheme || includeAnswers) {
    docChildren.push(
      new Paragraph({
        children: [new PageBreak()],
      })
    )

    docChildren.push(
      createHeader("Mark Scheme / Answers", HeadingLevel.HEADING_1)
    )

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i]
      const questionNum = i + 1

      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Question ${questionNum}`,
              bold: true,
              size: 22,
            }),
            new TextRun({
              text: question.marks ? ` (${question.marks} marks)` : "",
              size: 20,
            }),
          ],
          spacing: { before: 300, after: 100 },
        })
      )

      const answerParagraphs = createAnswerSection(question, preserveLatex)
      docChildren.push(...answerParagraphs)

      if (answerParagraphs.length === 0) {
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "[No mark scheme available]",
                italics: true,
                color: "666666",
                size: 20,
              }),
            ],
          })
        )
      }
    }
  }

  // Create document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: docChildren,
      },
    ],
  })

  // Generate and download
  const blob = await Packer.toBlob(doc)
  const fileName = `${title.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.docx`
  saveAs(blob, fileName)
}

/**
 * Quick export for basic exam (no mark scheme)
 */
export async function exportExamQuick(
  questions: ExamQuestion[],
  title: string
): Promise<void> {
  return exportExamToWord(questions, title, {
    includeMarkScheme: false,
    includeAnswers: false,
  })
}

/**
 * Export with full mark scheme
 */
export async function exportExamWithMarkScheme(
  questions: ExamQuestion[],
  title: string
): Promise<void> {
  return exportExamToWord(questions, title, {
    includeMarkScheme: true,
    includeAnswers: true,
  })
}

/**
 * Export preserving raw LaTeX (for teachers who want to edit in Word)
 */
export async function exportExamWithRawLatex(
  questions: ExamQuestion[],
  title: string,
  includeMarkScheme: boolean = false
): Promise<void> {
  return exportExamToWord(questions, title, {
    includeMarkScheme,
    includeAnswers: includeMarkScheme,
    preserveLatex: true,
  })
}

// Export the conversion function for use elsewhere
export { latexToUnicode, cleanLatexForText }
