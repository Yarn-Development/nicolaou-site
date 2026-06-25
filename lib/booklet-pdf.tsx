import React from "react"
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer"
import type { UnusedQuestion } from "@/app/actions/booklet"

// =====================================================
// LaTeX → readable Unicode text
// Handles fractions, Greek letters, symbols, super/subscripts
// =====================================================
function latexToText(input: string | null | undefined): string {
  if (!input) return ""
  let s = input

  // Unwrap display/inline math environments
  s = s.replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => " " + m.trim() + " ")
  s = s.replace(/\$\$([\s\S]*?)\$\$/g, (_, m) => " " + m.trim() + " ")
  s = s.replace(/\\\(([\s\S]*?)\\\)/g, (_, m) => m.trim())
  s = s.replace(/\$([^$\n]+)\$/g, (_, m) => m.trim())

  // Align / equation environments
  s = s.replace(/\\begin\{align\*?\}([\s\S]*?)\\end\{align\*?\}/g, (_, b) =>
    b.replace(/&/g, "").replace(/\\\\/g, "\n").trim()
  )
  s = s.replace(/\\begin\{equation\*?\}([\s\S]*?)\\end\{equation\*?\}/g, (_, b) => b.trim())
  s = s.replace(/\\begin\{[^}]*\}([\s\S]*?)\\end\{[^}]*\}/g, (_, b) => b.trim())

  // Fractions
  s = s.replace(/\\[dt]?frac\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g,
    (_, n, d) => `(${latexToText(n)})/(${latexToText(d)})`)

  // Roots
  s = s.replace(/\\sqrt\[([^\]]*)\]\{([^{}]*)\}/g, (_, n, b) => `${latexToText(n)}√(${latexToText(b)})`)
  s = s.replace(/\\sqrt\{([^{}]*)\}/g, (_, b) => `√(${latexToText(b)})`)

  // Superscripts → Unicode
  const supMap: Record<string, string> = { "0":"⁰","1":"¹","2":"²","3":"³","4":"⁴","5":"⁵","6":"⁶","7":"⁷","8":"⁸","9":"⁹","n":"ⁿ","-":"⁻","+":"⁺" }
  s = s.replace(/\^\{([^{}]*)\}/g, (_, e) => {
    const clean = latexToText(e)
    return clean.split("").map(c => supMap[c] ?? c).join("")
  })
  s = s.replace(/\^([a-zA-Z0-9])/g, (_, c) => supMap[c] ?? `^${c}`)

  // Subscripts → Unicode
  const subMap: Record<string, string> = { "0":"₀","1":"₁","2":"₂","3":"₃","4":"₄","5":"₅","6":"₆","7":"₇","8":"₈","9":"₉","n":"ₙ","i":"ᵢ","x":"ₓ","a":"ₐ","e":"ₑ","o":"ₒ" }
  s = s.replace(/_\{([^{}]*)\}/g, (_, e) => {
    const clean = latexToText(e)
    return clean.split("").map(c => subMap[c] ?? c).join("")
  })
  s = s.replace(/_([a-zA-Z0-9])/g, (_, c) => subMap[c] ?? `_${c}`)

  // Greek letters
  const greek: [RegExp, string][] = [
    [/\\alpha\b/g,"α"],[/\\beta\b/g,"β"],[/\\gamma\b/g,"γ"],[/\\delta\b/g,"δ"],
    [/\\epsilon\b/g,"ε"],[/\\varepsilon\b/g,"ε"],[/\\zeta\b/g,"ζ"],[/\\eta\b/g,"η"],
    [/\\theta\b/g,"θ"],[/\\vartheta\b/g,"ϑ"],[/\\iota\b/g,"ι"],[/\\kappa\b/g,"κ"],
    [/\\lambda\b/g,"λ"],[/\\mu\b/g,"μ"],[/\\nu\b/g,"ν"],[/\\xi\b/g,"ξ"],
    [/\\pi\b/g,"π"],[/\\varpi\b/g,"ϖ"],[/\\rho\b/g,"ρ"],[/\\sigma\b/g,"σ"],
    [/\\tau\b/g,"τ"],[/\\upsilon\b/g,"υ"],[/\\phi\b/g,"φ"],[/\\varphi\b/g,"φ"],
    [/\\chi\b/g,"χ"],[/\\psi\b/g,"ψ"],[/\\omega\b/g,"ω"],
    [/\\Gamma\b/g,"Γ"],[/\\Delta\b/g,"Δ"],[/\\Theta\b/g,"Θ"],[/\\Lambda\b/g,"Λ"],
    [/\\Pi\b/g,"Π"],[/\\Sigma\b/g,"Σ"],[/\\Upsilon\b/g,"Υ"],[/\\Phi\b/g,"Φ"],
    [/\\Psi\b/g,"Ψ"],[/\\Omega\b/g,"Ω"],
  ]
  for (const [re, ch] of greek) s = s.replace(re, ch)

  // Operators and symbols
  const symbols: [RegExp, string][] = [
    [/\\times\b/g,"×"],[/\\div\b/g,"÷"],[/\\pm\b/g,"±"],[/\\mp\b/g,"∓"],
    [/\\leq\b/g,"≤"],[/\\geq\b/g,"≥"],[/\\neq\b/g,"≠"],[/\\approx\b/g,"≈"],
    [/\\equiv\b/g,"≡"],[/\\sim\b/g,"∼"],[/\\propto\b/g,"∝"],
    [/\\infty\b/g,"∞"],[/\\partial\b/g,"∂"],[/\\nabla\b/g,"∇"],
    [/\\cdot\b/g,"·"],[/\\bullet\b/g,"•"],[/\\circ\b/g,"∘"],
    [/\\degree\b/g,"°"],[/\\angle\b/g,"∠"],
    [/\\ldots\b/g,"..."],[/\\cdots\b/g,"···"],
    [/\\to\b/g,"→"],[/\\rightarrow\b/g,"→"],[/\\leftarrow\b/g,"←"],
    [/\\Rightarrow\b/g,"⇒"],[/\\Leftrightarrow\b/g,"⟺"],
    [/\\in\b/g,"∈"],[/\\notin\b/g,"∉"],
    [/\\subset\b/g,"⊂"],[/\\subseteq\b/g,"⊆"],
    [/\\cup\b/g,"∪"],[/\\cap\b/g,"∩"],[/\\emptyset\b/g,"∅"],
    [/\\forall\b/g,"∀"],[/\\exists\b/g,"∃"],
    [/\\sum\b/g,"Σ"],[/\\prod\b/g,"Π"],[/\\int\b/g,"∫"],
    [/\\therefore\b/g,"∴"],[/\\because\b/g,"∵"],
    [/\\perp\b/g,"⊥"],[/\\parallel\b/g,"∥"],
  ]
  for (const [re, ch] of symbols) s = s.replace(re, ch)

  // Named functions
  const funcs = ["sin","cos","tan","sec","csc","cot","arcsin","arccos","arctan",
    "sinh","cosh","tanh","log","ln","exp","lim","max","min","det","gcd"]
  for (const f of funcs) s = s.replace(new RegExp(`\\\\${f}\\b`, "g"), f)

  // Text formatting — keep content
  s = s.replace(/\\(?:text|textbf|textit|textrm|mathbf|mathrm|mathit|mathcal|mathbb|boldsymbol|bm)\{([^{}]*)\}/g, "$1")
  s = s.replace(/\\(?:displaystyle|textstyle|scriptstyle)\b/g, "")
  s = s.replace(/\\(?:big|Big|bigg|Bigg)[lr]?\s*/g, "")

  // Brackets
  s = s.replace(/\\left\s*[\(\[]/g, "(").replace(/\\right\s*[\)\]]/g, ")")
  s = s.replace(/\\left\s*\{/g, "{").replace(/\\right\s*\}/g, "}")
  s = s.replace(/\\left\s*\|/g, "|").replace(/\\right\s*\|/g, "|")
  s = s.replace(/\\left\s*\./g, "").replace(/\\right\s*\./g, "")

  // Spacing
  s = s.replace(/\\(?:quad|qquad)\b/g, "  ")
  s = s.replace(/\\[,;:!]\s*/g, " ")
  s = s.replace(/\\ /g, " ")
  s = s.replace(/\\\\/g, "\n")
  s = s.replace(/&/g, "  ")

  // Remaining commands with args
  s = s.replace(/\\[a-zA-Z]+\s*\{([^{}]*)\}/g, "$1")
  // Remaining bare commands
  s = s.replace(/\\[a-zA-Z]+\b/g, "")
  // Stray braces
  s = s.replace(/[{}]/g, "")
  // Tidy whitespace
  s = s.replace(/[ \t]+/g, " ")
  s = s.replace(/\n{3,}/g, "\n\n")
  return s.trim()
}

export interface BookletData {
  className: string
  scopeLabel: string
  dateGenerated: string
  questions: UnusedQuestion[]
  includeTopicTags: boolean
  includeLegacyBadge: boolean
}

export async function generateBookletBuffer(data: BookletData): Promise<Buffer> {
  const element = React.createElement(BookletPDF, { data }) as Parameters<typeof renderToBuffer>[0]
  const ab = await renderToBuffer(element)
  return Buffer.from(ab)
}

// =====================================================
// Styles — Edexcel-inspired layout
// =====================================================

const EDEXCEL_BLUE = "#003087"
const EDEXCEL_ACCENT = "#009FE3"
const PAGE_PAD_H = 50
const PAGE_PAD_V = 40

const s = StyleSheet.create({
  // Question pages
  page: {
    fontFamily: "Times-Roman",
    fontSize: 11,
    color: "#000000",
    backgroundColor: "#ffffff",
    paddingHorizontal: PAGE_PAD_H,
    paddingVertical: PAGE_PAD_V,
  },

  // Cover page
  coverPage: {
    fontFamily: "Helvetica",
    backgroundColor: EDEXCEL_BLUE,
    padding: 0,
    justifyContent: "flex-start",
  },
  coverTopBar: {
    backgroundColor: EDEXCEL_ACCENT,
    paddingHorizontal: PAGE_PAD_H,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  coverTopBarText: { color: "#ffffff", fontSize: 9, fontFamily: "Helvetica-Bold", letterSpacing: 1.5 },
  coverBody: { padding: PAGE_PAD_H, flex: 1, justifyContent: "center" },
  coverExamBoard: { color: "#9fc8e8", fontSize: 10, fontFamily: "Helvetica-Bold", letterSpacing: 2, marginBottom: 10 },
  coverTitle: { color: "#ffffff", fontSize: 26, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  coverSubtitle: { color: EDEXCEL_ACCENT, fontSize: 15, fontFamily: "Helvetica-Bold", marginBottom: 28 },
  coverInfoBox: { backgroundColor: "rgba(255,255,255,0.08)", padding: 18, marginBottom: 20 },
  coverInfoRow: { flexDirection: "row", marginBottom: 6 },
  coverInfoLabel: { color: "#9fc8e8", fontSize: 9, fontFamily: "Helvetica-Bold", width: 120 },
  coverInfoValue: { color: "#ffffff", fontSize: 9 },
  coverInstruction: { color: "#d1e8f5", fontSize: 9, lineHeight: 1.6, marginBottom: 4 },
  coverFooter: { paddingHorizontal: PAGE_PAD_H, paddingBottom: 24 },
  coverFooterText: { color: "rgba(255,255,255,0.35)", fontSize: 8 },

  // Page header (Edexcel style)
  pageHeader: {
    borderBottomWidth: 2,
    borderBottomColor: EDEXCEL_BLUE,
    paddingBottom: 7,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  pageHeaderLeft: { flex: 1 },
  pageHeaderTitle: { fontSize: 7, color: EDEXCEL_BLUE, fontFamily: "Helvetica-Bold", letterSpacing: 1 },
  pageHeaderSub: { fontSize: 8, color: "#444444", fontFamily: "Helvetica" },
  pageHeaderRight: { alignItems: "flex-end" },
  pageHeaderDate: { fontSize: 7, color: "#777777" },

  // Question layout
  questionRow: { flexDirection: "row", marginBottom: 16 },
  questionNumCol: { width: 28 },
  questionNum: { fontSize: 14, fontFamily: "Times-Bold", color: "#000000" },
  questionBody: { flex: 1 },
  questionText: { fontSize: 11, fontFamily: "Times-Roman", color: "#000000", lineHeight: 1.7 },
  questionImage: { width: "100%", marginTop: 8, marginBottom: 10, objectFit: "contain" },
  questionMarksRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 6 },
  questionMarksText: { fontSize: 10, fontFamily: "Times-Italic", color: "#333333" },

  // Source and badges
  sourceLabel: { fontSize: 7, color: "#999999", fontFamily: "Helvetica", marginTop: 4 },
  badgeRow: { flexDirection: "row", gap: 4, marginTop: 4, flexWrap: "wrap" },
  badgeLegacy: { backgroundColor: "#fef3c7", paddingHorizontal: 5, paddingVertical: 2 },
  badgeLegacyText: { color: "#92400e", fontSize: 7, fontFamily: "Helvetica-Bold" },
  badgeNoCalc: { backgroundColor: "#fee2e2", paddingHorizontal: 5, paddingVertical: 2 },
  badgeNoCalcText: { color: "#991b1b", fontSize: 7, fontFamily: "Helvetica-Bold" },
  topicTag: { fontSize: 7, color: "#888888", fontFamily: "Helvetica", fontStyle: "italic", marginTop: 4 },

  // Answer lines
  answerSpace: { marginTop: 10, marginBottom: 6 },
  answerLine: { borderBottomWidth: 0.5, borderBottomColor: "#cccccc", marginBottom: 13 },

  // Page footer
  pageFooter: {
    position: "absolute",
    bottom: 18,
    left: PAGE_PAD_H,
    right: PAGE_PAD_H,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: "#dddddd",
    paddingTop: 5,
  },
  footerText: { fontSize: 7, color: "#aaaaaa", fontFamily: "Helvetica" },
  footerTurnOver: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#555555" },

  // Mark scheme divider
  dividerPage: {
    fontFamily: "Helvetica",
    backgroundColor: EDEXCEL_BLUE,
    justifyContent: "center",
    alignItems: "center",
    padding: 60,
  },
  dividerTitle: { fontSize: 34, fontFamily: "Helvetica-Bold", color: "#ffffff", marginBottom: 10 },
  dividerSub: { fontSize: 13, color: "#9fc8e8" },

  // Mark scheme page
  msPage: {
    fontFamily: "Times-Roman",
    fontSize: 10,
    color: "#000000",
    backgroundColor: "#ffffff",
    paddingHorizontal: PAGE_PAD_H,
    paddingVertical: PAGE_PAD_V,
  },
  msPageHeader: {
    borderBottomWidth: 1.5,
    borderBottomColor: "#666666",
    paddingBottom: 7,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  msPageHeaderText: { fontSize: 7, color: "#666666", fontFamily: "Helvetica-Bold", letterSpacing: 1 },
  msRow: { flexDirection: "row", marginBottom: 16 },
  msNumCol: { width: 28 },
  msNum: { fontSize: 13, fontFamily: "Times-Bold", color: "#000000" },
  msBody: { flex: 1 },
  msImage: { width: "100%", marginTop: 6, marginBottom: 8, objectFit: "contain" },
  msAnswer: { fontSize: 10, fontFamily: "Times-Roman", color: "#000000", lineHeight: 1.6 },
  msExplanation: { fontSize: 9, fontFamily: "Times-Italic", color: "#555555", marginTop: 4, lineHeight: 1.5 },
  msAwardRow: { flexDirection: "row", marginTop: 6 },
  msAwardLabel: { fontSize: 8, color: "#888888", fontFamily: "Helvetica", marginRight: 5 },
  msAwardValue: { fontSize: 8, fontFamily: "Helvetica", color: "#555555" },
})

// =====================================================
// Helper: answer lines
// =====================================================
function AnswerLines({ count }: { count: number }) {
  return (
    <View style={s.answerSpace}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={s.answerLine} />
      ))}
    </View>
  )
}

// =====================================================
// Cover Page
// =====================================================
function CoverPage({ data }: { data: BookletData }) {
  const totalMarks = data.questions.reduce((sum, q) => sum + (q.marks || 0), 0)
  const levelCounts: Record<string, number> = {}
  for (const q of data.questions) {
    const lv = q.level || "A Level"
    levelCounts[lv] = (levelCounts[lv] || 0) + 1
  }

  return (
    <Page size="A4" style={s.coverPage}>
      <View style={s.coverTopBar}>
        <Text style={s.coverTopBarText}>PEARSON EDEXCEL  |  NICOLAOU{"'"}S MATHS</Text>
        <Text style={s.coverTopBarText}>{data.dateGenerated}</Text>
      </View>

      <View style={s.coverBody}>
        <Text style={s.coverExamBoard}>PEARSON EDEXCEL  ·  MATHEMATICS</Text>
        <Text style={s.coverTitle}>{data.className}</Text>
        <Text style={s.coverSubtitle}>{data.scopeLabel}</Text>

        <View style={s.coverInfoBox}>
          <View style={s.coverInfoRow}>
            <Text style={s.coverInfoLabel}>Questions:</Text>
            <Text style={s.coverInfoValue}>{data.questions.length}</Text>
          </View>
          <View style={s.coverInfoRow}>
            <Text style={s.coverInfoLabel}>Total Marks:</Text>
            <Text style={s.coverInfoValue}>{totalMarks}</Text>
          </View>
          {Object.entries(levelCounts).map(([lv, count]) => (
            <View key={lv} style={s.coverInfoRow}>
              <Text style={s.coverInfoLabel}>{lv}:</Text>
              <Text style={s.coverInfoValue}>{count} question{count !== 1 ? "s" : ""}</Text>
            </View>
          ))}
        </View>

        <Text style={s.coverInstruction}>Answer ALL questions.</Text>
        <Text style={s.coverInstruction}>Write your answers in the spaces provided.</Text>
        <Text style={s.coverInstruction}>Show all your working out.</Text>
        <Text style={s.coverInstruction}>The number of marks for each question is shown in brackets.</Text>
      </View>

      <View style={s.coverFooter}>
        <Text style={s.coverFooterText}>
          {`Nicolaou's Maths — Unused Question Booklet  ·  Questions + Mark Schemes  ·  ${data.questions.length} Questions`}
        </Text>
      </View>
    </Page>
  )
}

// =====================================================
// Question Page
// =====================================================
function QuestionPage({
  question,
  index,
  data,
  isLast,
}: {
  question: UnusedQuestion
  index: number
  data: BookletData
  isLast: boolean
}) {
  const qNum = index + 1
  const isLegacy = question.source_spec === "legacy-modular" || question.source_spec === "legacy-gcse"
  const sourceLabel = [
    question.exam_board,
    question.level,
    question.paper_reference,
    question.question_number_ref,
  ]
    .filter(Boolean)
    .join(" · ")

  const marks = question.marks ?? 0
  const answerLineCount = Math.max(4, Math.min(marks * 2, 14))
  const levelLabel = question.level || "A Level"

  return (
    <Page size="A4" style={s.page} wrap={false}>
      {/* Edexcel-style page header */}
      <View style={s.pageHeader}>
        <View style={s.pageHeaderLeft}>
          <Text style={s.pageHeaderTitle}>PEARSON EDEXCEL MATHEMATICS  ·  UNUSED QUESTION BOOKLET</Text>
          <Text style={s.pageHeaderSub}>{`${data.className}  ·  ${levelLabel}`}</Text>
        </View>
        <View style={s.pageHeaderRight}>
          <Text style={s.pageHeaderDate}>{`Q${qNum} of ${data.questions.length}`}</Text>
        </View>
      </View>

      {/* Question number + body */}
      <View style={s.questionRow}>
        <View style={s.questionNumCol}>
          <Text style={s.questionNum}>{qNum}</Text>
        </View>
        <View style={s.questionBody}>
          {question.image_url ? (
            <Image src={question.image_url} style={s.questionImage} />
          ) : question.question_latex ? (
            <Text style={s.questionText}>{latexToText(question.question_latex)}</Text>
          ) : (
            <Text style={{ ...s.questionText, color: "#aaaaaa" }}>Question content not available.</Text>
          )}

          {/* Marks in brackets (Edexcel style) */}
          <View style={s.questionMarksRow}>
            <Text style={s.questionMarksText}>
              ({marks} mark{marks !== 1 ? "s" : ""})
            </Text>
          </View>

          {/* Badges */}
          <View style={s.badgeRow}>
            {data.includeLegacyBadge && isLegacy && (
              <View style={s.badgeLegacy}>
                <Text style={s.badgeLegacyText}>⚠ LEGACY SPEC</Text>
              </View>
            )}
            {question.calculator_allowed === false && (
              <View style={s.badgeNoCalc}>
                <Text style={s.badgeNoCalcText}>NON-CALCULATOR</Text>
              </View>
            )}
          </View>

          {/* Source label */}
          <Text style={s.sourceLabel}>{sourceLabel}</Text>
          {data.includeTopicTags && (question.topic || question.sub_topic) && (
            <Text style={s.topicTag}>
              {[question.topic, question.sub_topic].filter(Boolean).join(" › ")}
            </Text>
          )}
        </View>
      </View>

      {/* Answer lines */}
      <AnswerLines count={answerLineCount} />

      {/* Footer */}
      <View style={s.pageFooter}>
        <Text style={s.footerText}>{`Nicolaou's Maths  ·  ${data.scopeLabel}`}</Text>
        <Text style={s.footerTurnOver}>{isLast ? "END OF QUESTIONS" : "Turn over ▶"}</Text>
      </View>
    </Page>
  )
}

// =====================================================
// Mark Scheme Divider
// =====================================================
function DividerPage() {
  return (
    <Page size="A4" style={s.dividerPage}>
      <Text style={s.dividerTitle}>Mark Schemes</Text>
      <Text style={s.dividerSub}>Questions 1 to end  ·  Refer to question numbers</Text>
    </Page>
  )
}

// =====================================================
// Mark Scheme Page
// =====================================================
function MarkSchemePage({
  question,
  index,
  data,
}: {
  question: UnusedQuestion
  index: number
  data: BookletData
}) {
  const qNum = index + 1
  const marks = question.marks ?? 0
  const ak = question.answer_key as Record<string, string> | null
  const markSchemeImageUrl = ak?.mark_scheme ?? null
  const answerText = latexToText(ak?.answer ?? ak?.explanation ?? null)
  const explanationText = latexToText(ak?.explanation ?? null)

  return (
    <Page size="A4" style={s.msPage} wrap={false}>
      <View style={s.msPageHeader}>
        <Text style={s.msPageHeaderText}>
          {`MARK SCHEME  ·  ${data.className.toUpperCase()}  ·  UNUSED QUESTION BOOKLET`}
        </Text>
        <Text style={s.msPageHeaderText}>{`Q${qNum}  ·  ${marks} MARK${marks !== 1 ? "S" : ""}`}</Text>
      </View>

      <View style={s.msRow}>
        <View style={s.msNumCol}>
          <Text style={s.msNum}>{qNum}</Text>
        </View>
        <View style={s.msBody}>
          {markSchemeImageUrl ? (
            <Image src={markSchemeImageUrl} style={s.msImage} />
          ) : answerText ? (
            <Text style={s.msAnswer}>{answerText}</Text>
          ) : (
            <Text style={{ ...s.msAnswer, color: "#aaaaaa", fontStyle: "italic" }}>
              Mark scheme not available.
            </Text>
          )}

          {explanationText && explanationText !== answerText && (
            <Text style={s.msExplanation}>{explanationText}</Text>
          )}

          <View style={s.msAwardRow}>
            <Text style={s.msAwardLabel}>Award:</Text>
            <Text style={s.msAwardValue}>{`${marks} mark${marks !== 1 ? "s" : ""}`}</Text>
          </View>
        </View>
      </View>

      <View style={s.pageFooter}>
        <Text style={s.footerText}>{`Nicolaou's Maths  ·  Mark Schemes`}</Text>
        <Text style={s.footerText}>{`Q${qNum}`}</Text>
      </View>
    </Page>
  )
}

// =====================================================
// Document
// =====================================================
function BookletPDF({ data }: { data: BookletData }) {
  return (
    <Document
      title={`${data.className} — Unused Questions Booklet`}
      author="Nicolaou's Maths"
      subject={data.scopeLabel}
    >
      <CoverPage data={data} />
      {data.questions.map((q, i) => (
        <QuestionPage
          key={q.id}
          question={q}
          index={i}
          data={data}
          isLast={i === data.questions.length - 1}
        />
      ))}
      <DividerPage />
      {data.questions.map((q, i) => (
        <MarkSchemePage key={`ms-${q.id}`} question={q} index={i} data={data} />
      ))}
    </Document>
  )
}
