/**
 * Word Document Exporter for Exam Builder
 *
 * Exports exam questions to a .docx file using the docx library.
 * Matches the Pearson Edexcel GCSE Maths paper design system used in the
 * on-screen / print preview (exam-paper-client.tsx).
 *
 * Layout decisions that mirror the print design:
 *  - A4 page, 20 mm inner margins (left/right), 15 mm top, 15 mm bottom
 *  - Each question is a 3-column table: [number col | content col | mark-box col]
 *  - Mark box: 40×40 pt bordered cell, mark count in 9 pt gray, top of cell
 *  - Working lines: N dotted-bottom paragraphs, count driven by mark value
 *  - Answer line: heavier dotted border, right-aligned, 280 pt wide
 *  - "(Total for Question N is X marks)" right-aligned after each answer line
 *  - Thin gray separator between questions
 *  - End-of-paper "TOTAL FOR PAPER IS X MARKS" banner
 *  - Running footer: paper ref | page number | "Turn over ▶"
 *  - Mark scheme on a separate section
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  Footer,
  PageNumber,
  VerticalAlign,
  TableBorders,
  convertMillimetersToTwip,
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
  preserveLatex?: boolean
}

// =====================================================
// Constants — mirror the print design token values
// =====================================================

/** Arial font applied to every TextRun */
const FONT = "Arial"
/** Content column question text: 11 pt = 22 half-points */
const SIZE_QUESTION = 22
/** Question number: 12 pt = 24 half-points */
const SIZE_Q_NUMBER = 24
/** Mark total line: 10 pt = 20 half-points */
const SIZE_MARK_TOTAL = 20
/** Mark box digit: 9 pt = 18 half-points */
const SIZE_MARK_BOX = 18
/** General small text: 9 pt */
const SIZE_SMALL = 18
/** Working line height in twips: 24 px ≈ 18 pt = 360 twips */
const WORKING_LINE_HEIGHT = 360
/** Mark-box column width in twips: 40 pt × 20 = 800 twips */
const MARK_BOX_COL = 800
/** Question number column width in twips: 40 pt × 20 = 800 twips */
const Q_NUM_COL = 800
/** A4 width in twips: 11906 */
const A4_WIDTH_TWIPS = 11906
/** Inner margin (left + right): 20 mm each */
const MARGIN_INNER = convertMillimetersToTwip(20)
/** Top/bottom margin: 15 mm */
const MARGIN_TOP = convertMillimetersToTwip(15)
/** Footer height reserved */
const MARGIN_FOOTER = convertMillimetersToTwip(15)
/** Usable content width in twips */
const CONTENT_WIDTH = A4_WIDTH_TWIPS - MARGIN_INNER * 2
/** Content middle-column width */
const CONTENT_COL = CONTENT_WIDTH - Q_NUM_COL - MARK_BOX_COL

// =====================================================
// LaTeX → Unicode conversion (unchanged from original)
// =====================================================

const superscriptMap: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
  "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
  "+": "⁺", "-": "⁻", "=": "⁼", "(": "⁽", ")": "⁾",
  n: "ⁿ", i: "ⁱ", x: "ˣ", y: "ʸ",
}

const subscriptMap: Record<string, string> = {
  "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄",
  "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
  "+": "₊", "-": "₋", "=": "₌", "(": "₍", ")": "₎",
  a: "ₐ", e: "ₑ", o: "ₒ", x: "ₓ",
  i: "ᵢ", j: "ⱼ", n: "ₙ", m: "ₘ",
}

function toSuperscript(str: string): string {
  return str.split("").map((c) => superscriptMap[c] || c).join("")
}

function toSubscript(str: string): string {
  return str.split("").map((c) => subscriptMap[c] || c).join("")
}

export function latexToUnicode(latex: string | null): string {
  if (!latex) return ""

  let text = latex

  // Remove display math delimiters
  text = text.replace(/\$\$/g, "").replace(/\$/g, "")
  text = text.replace(/\\\[/g, "").replace(/\\\]/g, "")
  text = text.replace(/\\\(/g, "").replace(/\\\)/g, "")

  // Fractions
  text = text.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, (_, num, den) => {
    const n = num.trim(), d = den.trim()
    return n.length <= 2 && d.length <= 2 ? `${n}/${d}` : `(${n})/(${d})`
  })

  // Square roots
  text = text.replace(/\\sqrt\{([^{}]+)\}/g, (_, c) =>
    c.trim().length <= 2 ? `√${c.trim()}` : `√(${c.trim()})`
  )
  text = text.replace(/\\sqrt\[(\d+)\]\{([^{}]+)\}/g, (_, n, c) =>
    `${toSuperscript(n)}√(${c.trim()})`
  )

  // Superscripts / subscripts
  text = text.replace(/\^(\d)/g, (_, d) => toSuperscript(d))
  text = text.replace(/\^\{([^{}]+)\}/g, (_, e) => {
    const cv = toSuperscript(e.trim())
    return cv !== e.trim() ? cv : `^(${e.trim()})`
  })
  text = text.replace(/_(\d)/g, (_, d) => toSubscript(d))
  text = text.replace(/_\{([^{}]+)\}/g, (_, s) => {
    const cv = toSubscript(s.trim())
    return cv !== s.trim() ? cv : `_(${s.trim()})`
  })

  // Greek
  const greek: Record<string, string> = {
    alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε",
    zeta: "ζ", eta: "η", theta: "θ", iota: "ι", kappa: "κ",
    lambda: "λ", mu: "μ", nu: "ν", xi: "ξ", pi: "π", rho: "ρ",
    sigma: "σ", tau: "τ", upsilon: "υ", phi: "φ", chi: "χ",
    psi: "ψ", omega: "ω", Gamma: "Γ", Delta: "Δ", Theta: "Θ",
    Lambda: "Λ", Xi: "Ξ", Pi: "Π", Sigma: "Σ", Phi: "Φ",
    Psi: "Ψ", Omega: "Ω",
  }
  for (const [cmd, sym] of Object.entries(greek)) {
    text = text.replace(new RegExp(`\\\\${cmd}(?![a-zA-Z])`, "g"), sym)
  }

  // Operators and symbols
  const symbols: Record<string, string> = {
    times: "×", cdot: "·", div: "÷", pm: "±", mp: "∓",
    neq: "≠", leq: "≤", geq: "≥", le: "≤", ge: "≥",
    approx: "≈", equiv: "≡", sim: "∼", propto: "∝",
    in: "∈", notin: "∉", subset: "⊂", supset: "⊃",
    subseteq: "⊆", supseteq: "⊇", cup: "∪", cap: "∩", emptyset: "∅",
    forall: "∀", exists: "∃", nexists: "∄", land: "∧", lor: "∨",
    neg: "¬", implies: "⇒", iff: "⇔", therefore: "∴", because: "∵",
    rightarrow: "→", leftarrow: "←", leftrightarrow: "↔",
    Rightarrow: "⇒", Leftarrow: "⇐", Leftrightarrow: "⇔", to: "→",
    infty: "∞", partial: "∂", nabla: "∇",
    int: "∫", iint: "∬", iiint: "∭", oint: "∮",
    sum: "Σ", prod: "Π",
    degree: "°", circ: "°", angle: "∠", perp: "⊥",
    parallel: "∥", triangle: "△", square: "□", diamond: "◇",
  }
  for (const [cmd, sym] of Object.entries(symbols)) {
    text = text.replace(new RegExp(`\\\\${cmd}(?![a-zA-Z])`, "g"), sym)
  }

  // Blackboard bold
  text = text.replace(/\\mathbb\{R\}/g, "ℝ").replace(/\\mathbb\{N\}/g, "ℕ")
    .replace(/\\mathbb\{Z\}/g, "ℤ").replace(/\\mathbb\{Q\}/g, "ℚ")
    .replace(/\\mathbb\{C\}/g, "ℂ")

  // Text formatting wrappers
  text = text.replace(/\\textbf\{([^{}]+)\}/g, "$1")
    .replace(/\\textit\{([^{}]+)\}/g, "$1")
    .replace(/\\text\{([^{}]+)\}/g, "$1")
    .replace(/\\mathrm\{([^{}]+)\}/g, "$1")

  // Trig / log functions
  for (const fn of ["sin","cos","tan","cot","sec","csc","arcsin","arccos",
    "arctan","sinh","cosh","tanh","log","ln","exp","lim","max","min"]) {
    text = text.replace(new RegExp(`\\\\${fn}(?![a-zA-Z])`, "g"), fn)
  }

  // Brackets
  text = text.replace(/\\left\(/g, "(").replace(/\\right\)/g, ")")
    .replace(/\\left\[/g, "[").replace(/\\right\]/g, "]")
    .replace(/\\left\{/g, "{").replace(/\\right\}/g, "}")
    .replace(/\\left\|/g, "|").replace(/\\right\|/g, "|")
    .replace(/\\lfloor/g, "⌊").replace(/\\rfloor/g, "⌋")
    .replace(/\\lceil/g, "⌈").replace(/\\rceil/g, "⌉")

  // Spacing
  text = text.replace(/\\quad/g, "  ").replace(/\\qquad/g, "    ")
    .replace(/\\,/g, " ").replace(/\\;/g, " ").replace(/\\!/g, "")
    .replace(/\\ /g, " ").replace(/\\newline/g, "\n").replace(/\\\\/g, "\n")

  // Remove remaining backslash commands and braces
  text = text.replace(/\\[a-zA-Z]+/g, "").replace(/[{}]/g, "")

  return text.replace(/\s+/g, " ").trim()
}

/** @deprecated Use latexToUnicode */
export function cleanLatexForText(latex: string | null): string {
  return latexToUnicode(latex)
}

// =====================================================
// Helpers
// =====================================================

async function fetchImageAsBuffer(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url, { cache: "no-store" })
    if (!res.ok) { console.error(`Failed to fetch image: ${res.status} ${url}`); return null }
    return await res.arrayBuffer()
  } catch (e) {
    console.error("Error fetching image:", e)
    return null
  }
}

/** Returns true if the URL points to an SVG file. */
function isSvgUrl(url: string): boolean {
  return url.toLowerCase().split("?")[0].endsWith(".svg")
}

/** Returns the raster ImageRun type based on URL extension. */
function rasterImageType(url: string): "png" | "jpg" | "gif" {
  const lower = url.toLowerCase().split("?")[0]
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "jpg"
  if (lower.endsWith(".gif")) return "gif"
  return "png"
}

/**
 * Embeds an image from URL into the paragraph list.
 * SVG images are skipped with a note — docx SVG embedding requires a pre-rendered
 * PNG fallback which is not available server-side without a canvas library.
 */
async function embedImage(
  url: string,
  width: number,
  height: number,
  paragraphs: Paragraph[],
  fallbackText: string,
): Promise<void> {
  // SVG cannot be directly embedded without a raster fallback in docx format
  if (isSvgUrl(url)) {
    paragraphs.push(new Paragraph({
      children: [new TextRun({ text: "[Diagram — see on-screen version for full display]", italics: true, color: "888888", font: { name: FONT }, size: SIZE_SMALL })],
    }))
    return
  }

  const buf = await fetchImageAsBuffer(url)
  if (!buf) {
    paragraphs.push(new Paragraph({
      children: [new TextRun({ text: fallbackText, italics: true, color: "888888", font: { name: FONT }, size: SIZE_SMALL })],
    }))
    return
  }
  try {
    paragraphs.push(new Paragraph({
      spacing: { before: 120, after: 120 },
      children: [new ImageRun({ data: buf, transformation: { width, height }, type: rasterImageType(url) })],
    }))
  } catch {
    paragraphs.push(new Paragraph({
      children: [new TextRun({ text: fallbackText, italics: true, color: "888888", font: { name: FONT }, size: SIZE_SMALL })],
    }))
  }
}

/** Working-line count driven by mark value — matches print design */
function workingLineCount(marks: number | null): number {
  const m = marks ?? 2
  if (m <= 1) return 3
  if (m <= 2) return 5
  if (m <= 3) return 7
  if (m <= 4) return 9
  if (m <= 6) return 12
  return 15
}

/** Single dotted-border working line paragraph */
function workingLine(): Paragraph {
  return new Paragraph({
    text: "",
    spacing: { before: 0, after: 0, line: WORKING_LINE_HEIGHT, lineRule: "exact" },
    border: {
      bottom: { style: BorderStyle.DOTTED, size: 2, color: "CCCCCC", space: 0 },
    },
  })
}

/** Heavier final answer line — right-aligned, 280 pt wide */
function answerLine(): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.RIGHT,
    spacing: { before: 120, after: 120 },
    children: [
      new TextRun({
        text: "\u00A0".repeat(45), // ~280pt wide with Arial 11pt
        font: { name: FONT },
        size: SIZE_QUESTION,
        underline: { type: "dotted", color: "000000" },
      }),
    ],
  })
}

/** "(Total for Question N is X marks)" right-aligned line */
function markTotalLine(questionNum: number, marks: number | null): Paragraph {
  const m = marks ?? 0
  const label = `(Total for Question ${questionNum} is ${m} ${m === 1 ? "mark" : "marks"})`
  return new Paragraph({
    alignment: AlignmentType.RIGHT,
    spacing: { before: 60, after: 120 },
    children: [
      new TextRun({
        text: label,
        bold: true,
        font: { name: FONT },
        size: SIZE_MARK_TOTAL,
      }),
    ],
  })
}

/** Thin gray separator between questions */
function questionSeparator(): Paragraph {
  return new Paragraph({
    text: "",
    spacing: { before: 120, after: 240 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB", space: 0 },
    },
  })
}

/**
 * Build the content-column paragraphs for one question
 * (question text + optional diagram + working lines + answer line + mark total)
 */
async function buildContentColumn(
  question: ExamQuestion,
  questionNum: number,
  preserveLatex: boolean,
): Promise<Paragraph[]> {
  const paragraphs: Paragraph[] = []

  // — Question text —
  const raw = preserveLatex ? (question.question_latex ?? "") : latexToUnicode(question.question_latex)
  const lines = raw.split("\n").filter((l) => l.trim())

  for (const line of lines) {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({ text: line.trim(), font: { name: FONT }, size: SIZE_QUESTION }),
        ],
      })
    )
  }

  // — Diagram image (all content types that have an image_url) —
  if (question.image_url) {
    if (
      question.content_type === "synthetic_image" ||
      question.content_type === "generated_text"
    ) {
      // Generated diagram (SVG or PNG) — shown at 220×220 to match print preview
      await embedImage(question.image_url, 220, 220, paragraphs, "[Diagram could not be embedded]")
    } else if (
      question.content_type === "image_ocr" ||
      question.content_type === "official_past_paper"
    ) {
      // Full question image from a scanned/uploaded paper — wider display
      await embedImage(question.image_url, 380, 280, paragraphs, "[Image could not be embedded]")
    }
  }

  // — Working lines —
  const lineCount = workingLineCount(question.marks)
  for (let i = 0; i < lineCount; i++) {
    paragraphs.push(workingLine())
  }

  // — Answer line —
  paragraphs.push(answerLine())

  // — Mark total —
  paragraphs.push(markTotalLine(questionNum, question.marks))

  return paragraphs
}

/** Mark box cell: 40×40 pt bordered box with mark count in 9 pt gray */
function markBoxCell(marks: number | null): TableCell {
  return new TableCell({
    width: { size: MARK_BOX_COL, type: WidthType.DXA },
    verticalAlign: VerticalAlign.TOP,
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
    },
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 0, after: 0 },
        children: [
          new TextRun({
            text: `${marks ?? ""}`,
            font: { name: FONT },
            size: SIZE_MARK_BOX,
            color: "9CA3AF", // gray-400
          }),
        ],
        border: {
          top: { style: BorderStyle.SINGLE, size: 8, color: "000000", space: 0 },
          bottom: { style: BorderStyle.SINGLE, size: 8, color: "000000", space: 0 },
          left: { style: BorderStyle.SINGLE, size: 8, color: "000000", space: 0 },
          right: { style: BorderStyle.SINGLE, size: 8, color: "000000", space: 0 },
        },
      }),
    ],
  })
}

/**
 * Build one question as a 3-column table row:
 * [question number | question content | mark box]
 */
async function buildQuestionTable(
  question: ExamQuestion,
  questionNum: number,
  preserveLatex: boolean,
): Promise<Table> {
  const contentParagraphs = await buildContentColumn(question, questionNum, preserveLatex)

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    borders: TableBorders.NONE,
    rows: [
      new TableRow({
        children: [
          // Col 1: Question number
          new TableCell({
            width: { size: Q_NUM_COL, type: WidthType.DXA },
            verticalAlign: VerticalAlign.TOP,
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
            },
            children: [
              new Paragraph({
                spacing: { before: 0, after: 0 },
                children: [
                  new TextRun({
                    text: String(questionNum),
                    bold: true,
                    font: { name: FONT },
                    size: SIZE_Q_NUMBER,
                  }),
                ],
              }),
            ],
          }),

          // Col 2: Question content
          new TableCell({
            width: { size: CONTENT_COL, type: WidthType.DXA },
            verticalAlign: VerticalAlign.TOP,
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
            },
            children: contentParagraphs,
          }),

          // Col 3: Mark box
          markBoxCell(question.marks),
        ],
      }),
    ],
  })
}

// =====================================================
// Document-level structural blocks
// =====================================================

function examHeader(title: string, totalMarks: number, examDate: string, paperRef: string): Paragraph[] {
  return [
    // Subject title
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 120 },
      children: [
        new TextRun({ text: "Mathematics", bold: true, font: { name: FONT }, size: 72 }), // 36pt
      ],
    }),
    // Exam title
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 120 },
      children: [
        new TextRun({ text: title, bold: true, font: { name: FONT }, size: 32 }), // 16pt
      ],
    }),
    // Date + paper ref on the same line (split by tab)
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 0, after: 200 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 6, color: "D1D5DB", space: 0 },
      },
      children: [
        new TextRun({ text: examDate, font: { name: FONT }, size: SIZE_QUESTION, color: "374151" }),
        new TextRun({ text: "     Paper Reference: ", font: { name: FONT }, size: SIZE_QUESTION, color: "374151" }),
        new TextRun({ text: paperRef, bold: true, font: { name: FONT }, size: SIZE_QUESTION }),
        new TextRun({ text: `     Total Marks: ${totalMarks}`, bold: true, font: { name: FONT }, size: SIZE_QUESTION }),
      ],
    }),
    // Instructions line
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 120, after: 240 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 6, color: "D1D5DB", space: 0 },
      },
      children: [
        new TextRun({ text: "Answer ALL questions.  ", bold: true, font: { name: FONT }, size: SIZE_QUESTION }),
        new TextRun({ text: "Write your answers in the spaces provided.  ", font: { name: FONT }, size: SIZE_QUESTION }),
        new TextRun({ text: "You must write down all the stages in your working.", bold: true, font: { name: FONT }, size: SIZE_QUESTION }),
      ],
    }),
  ]
}

function endOfPaperBanner(totalMarks: number): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 400, after: 200 },
    border: {
      top: { style: BorderStyle.THICK, size: 12, color: "000000", space: 0 },
    },
    children: [
      new TextRun({
        text: `TOTAL FOR PAPER IS ${totalMarks} MARKS`,
        bold: true,
        font: { name: FONT },
        size: SIZE_Q_NUMBER,
      }),
    ],
  })
}

function markSchemeHeader(): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 300 },
    children: [
      new TextRun({ text: "Mark Scheme / Answers", bold: true, font: { name: FONT }, size: 32 }),
    ],
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000", space: 0 },
    },
  })
}

function markSchemeEntry(question: ExamQuestion, questionNum: number, preserveLatex: boolean): Paragraph[] {
  const paragraphs: Paragraph[] = []

  // Question heading
  const m = question.marks ?? 0
  paragraphs.push(
    new Paragraph({
      spacing: { before: 300, after: 100 },
      children: [
        new TextRun({ text: `Question ${questionNum}`, bold: true, font: { name: FONT }, size: SIZE_QUESTION }),
        new TextRun({ text: `  (${m} ${m === 1 ? "mark" : "marks"})`, font: { name: FONT }, size: SIZE_MARK_TOTAL, color: "6B7280" }),
      ],
    })
  )

  const ak = question.answer_key
  if (!ak?.answer && !ak?.explanation && !ak?.mark_scheme) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: "[No mark scheme available]", italics: true, color: "9CA3AF", font: { name: FONT }, size: SIZE_MARK_TOTAL }),
        ],
      })
    )
    return paragraphs
  }

  const convert = (s: string) => preserveLatex ? s : latexToUnicode(s)

  if (ak?.answer) {
    paragraphs.push(
      new Paragraph({
        spacing: { before: 80, after: 60 },
        children: [
          new TextRun({ text: "Answer:  ", bold: true, font: { name: FONT }, size: SIZE_MARK_TOTAL }),
          new TextRun({ text: convert(ak.answer), font: { name: FONT }, size: SIZE_MARK_TOTAL }),
        ],
      })
    )
  }
  if (ak?.explanation) {
    paragraphs.push(
      new Paragraph({
        spacing: { before: 60, after: 60 },
        children: [
          new TextRun({ text: "Explanation:  ", bold: true, font: { name: FONT }, size: SIZE_MARK_TOTAL }),
          new TextRun({ text: convert(ak.explanation), font: { name: FONT }, size: SIZE_MARK_TOTAL }),
        ],
      })
    )
  }
  if (ak?.mark_scheme) {
    paragraphs.push(
      new Paragraph({
        spacing: { before: 60, after: 60 },
        children: [
          new TextRun({ text: "Mark Scheme:  ", bold: true, font: { name: FONT }, size: SIZE_MARK_TOTAL }),
          new TextRun({ text: convert(ak.mark_scheme), font: { name: FONT }, size: SIZE_MARK_TOTAL }),
        ],
      })
    )
  }

  return paragraphs
}

/** Generate a short paper reference from the title */
function generatePaperRef(title: string): string {
  const hash = title.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase()
  return `P${hash}A`
}

// =====================================================
// Main export function
// =====================================================

export async function exportExamToWord(
  questions: ExamQuestion[],
  title: string,
  options: ExportOptions = {},
): Promise<void> {
  const {
    includeMarkScheme = false,
    includeAnswers = false,
    examDate = new Date().toLocaleDateString("en-GB"),
    preserveLatex = false,
  } = options

  const totalMarks = questions.reduce((sum, q) => sum + (q.marks ?? 0), 0)
  const paperRef = generatePaperRef(title)

  // ---- Build exam paper section children ----
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const examChildren: any[] = []

  // Header block
  examChildren.push(...examHeader(title, totalMarks, examDate, paperRef))

  // Questions
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    const num = i + 1

    // 3-column question table
    const qTable = await buildQuestionTable(q, num, preserveLatex)
    examChildren.push(qTable)

    // Separator between questions (not after the last one)
    if (i < questions.length - 1) {
      examChildren.push(questionSeparator())
    }
  }

  // End-of-paper banner
  examChildren.push(endOfPaperBanner(totalMarks))

  // ---- Build mark scheme section children (if requested) ----
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markSchemeChildren: any[] = []

  if (includeMarkScheme || includeAnswers) {
    markSchemeChildren.push(markSchemeHeader())
    for (let i = 0; i < questions.length; i++) {
      markSchemeChildren.push(...markSchemeEntry(questions[i], i + 1, preserveLatex))
    }
  }

  // ---- Running footer: paper ref | page number | "Turn over ▶" ----
  const examFooter = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        border: {
          top: { style: BorderStyle.SINGLE, size: 4, color: "E5E7EB", space: 0 },
        },
        children: [
          new TextRun({ text: `${paperRef} © ${new Date().getFullYear()}     `, font: { name: FONT }, size: SIZE_SMALL, color: "9CA3AF" }),
          new TextRun({ children: [PageNumber.CURRENT], font: { name: FONT }, size: SIZE_SMALL, color: "9CA3AF" }),
          new TextRun({ text: "     Turn over ▶", font: { name: FONT }, size: SIZE_SMALL, color: "9CA3AF", italics: true }),
        ],
      }),
    ],
  })

  // ---- Assemble document ----
  const sections = [
    {
      properties: {
        page: {
          size: { width: A4_WIDTH_TWIPS, height: 16838 }, // A4 in twips
          margin: {
            top: MARGIN_TOP,
            bottom: MARGIN_FOOTER,
            left: MARGIN_INNER,
            right: MARGIN_INNER,
          },
        },
      },
      footers: { default: examFooter },
      children: examChildren,
    },
  ]

  if (markSchemeChildren.length > 0) {
    sections.push({
      properties: {
        page: {
          size: { width: A4_WIDTH_TWIPS, height: 16838 },
          margin: {
            top: MARGIN_TOP,
            bottom: MARGIN_FOOTER,
            left: MARGIN_INNER,
            right: MARGIN_INNER,
          },
        },
      },
      footers: { default: examFooter },
      children: markSchemeChildren,
    })
  }

  const doc = new Document({ sections })
  const blob = await Packer.toBlob(doc)
  const fileName = `${title.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.docx`
  saveAs(blob, fileName)
}

// =====================================================
// Convenience wrappers (public API unchanged)
// =====================================================

export async function exportExamQuick(questions: ExamQuestion[], title: string): Promise<void> {
  return exportExamToWord(questions, title, { includeMarkScheme: false, includeAnswers: false })
}

export async function exportExamWithMarkScheme(questions: ExamQuestion[], title: string): Promise<void> {
  return exportExamToWord(questions, title, { includeMarkScheme: true, includeAnswers: true })
}

export async function exportExamWithRawLatex(
  questions: ExamQuestion[],
  title: string,
  includeMarkScheme: boolean = false,
): Promise<void> {
  return exportExamToWord(questions, title, {
    includeMarkScheme,
    includeAnswers: includeMarkScheme,
    preserveLatex: true,
  })
}
