"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Printer, FileText, ClipboardList, Download, FileDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LatexPreview } from "@/components/latex-preview"
import { exportExamToWord } from "@/lib/docx-exporter"
import type { ExamQuestion } from "@/lib/docx-exporter"
import type { AssignmentDetails } from "@/app/actions/assignments"
import "katex/dist/katex.min.css"

// =====================================================
// Types
// =====================================================

type ViewMode = "paper" | "marksheet" | "feedback"

interface ExamPaperClientProps {
  assignment: AssignmentDetails
  initialView: ViewMode
}

// =====================================================
// Utility: generate a paper reference code
// =====================================================

function generatePaperRef(id: string): string {
  const hash = id.replace(/-/g, "").slice(0, 6).toUpperCase()
  return `P${hash}A`
}

// =====================================================
// Answer line (dotted)
// =====================================================

function AnswerLine({ label }: { label?: string }) {
  return (
    <div className="exam-answer-line flex items-end justify-end mt-4 gap-2">
      {label && (
        <span className="text-[11pt] italic text-gray-600 mr-1">{label}</span>
      )}
      <span className="inline-block w-[280px] border-b-2 border-dotted border-black" />
    </div>
  )
}

// =====================================================
// Mark Box (right margin)
// =====================================================

function MarkBox({ marks }: { marks: number }) {
  return (
    <div className="exam-mark-box flex flex-col items-center justify-start pt-1">
      <div className="w-[40px] h-[40px] border border-black flex items-center justify-center">
        <span className="text-[9pt] text-gray-400 font-arial">{marks}</span>
      </div>
    </div>
  )
}

// =====================================================
// Main Component
// =====================================================

export function ExamPaperClient({ assignment, initialView }: ExamPaperClientProps) {
  const router = useRouter()
  const [view, setView] = useState<ViewMode>(initialView)

  const paperRef = generatePaperRef(assignment.id)

  const [isExporting, setIsExporting] = useState(false)

  const handlePrint = () => {
    window.print()
  }

  const handleExportWord = async (includeMarkScheme: boolean = false) => {
    setIsExporting(true)
    try {
      // Convert assignment questions to ExamQuestion format
      const examQuestions: ExamQuestion[] = assignment.questions.map(q => ({
        id: q.question_id,
        content_type: 'generated_text' as const,
        question_latex: q.question_latex,
        image_url: null,
        topic: q.topic,
        topic_name: q.topic,
        sub_topic_name: q.sub_topic || null,
        difficulty: (q.difficulty === 'Foundation' || q.difficulty === 'Higher' ? q.difficulty : 'Foundation') as 'Foundation' | 'Higher',
        marks: q.marks,
        calculator_allowed: q.calculator_allowed ?? null,
        answer_key: q.answer_key || null,
      }))

      await exportExamToWord(examQuestions, assignment.title, {
        includeMarkScheme,
        includeAnswers: includeMarkScheme,
      })
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="exam-print-root min-h-screen bg-gray-100 print:bg-white">
      {/* ============================================= */}
      {/* Print Control Bar (hidden on print)           */}
      {/* ============================================= */}
      <div className="print-hidden bg-white border-b-2 border-black px-6 py-4 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.back()}
              className="border-2 border-black"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="font-black uppercase tracking-wider text-sm">
                Print Preview
              </h1>
              <p className="text-xs text-gray-500 font-bold">
                {assignment.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex border-2 border-black rounded overflow-hidden">
              <button
                onClick={() => setView("paper")}
                className={`px-3 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
                  view === "paper"
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-gray-100"
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                Paper
              </button>
              <button
                onClick={() => setView("marksheet")}
                className={`px-3 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors border-l-2 border-black ${
                  view === "marksheet"
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-gray-100"
                }`}
              >
                <ClipboardList className="h-3.5 w-3.5" />
                Marksheet
              </button>
              <button
                onClick={() => setView("feedback")}
                className={`px-3 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors border-l-2 border-black ${
                  view === "feedback"
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-gray-100"
                }`}
              >
                <ClipboardList className="h-3.5 w-3.5" />
                Feedback Sheet
              </button>
            </div>

            {/* Export Options */}
            <div className="flex items-center gap-2">
              <Button
                onClick={handlePrint}
                className="bg-black hover:bg-gray-800 text-white font-bold uppercase tracking-wider text-xs"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print / PDF
              </Button>
              <Button
                onClick={() => handleExportWord(false)}
                disabled={isExporting}
                variant="outline"
                className="border-2 border-black font-bold uppercase tracking-wider text-xs"
              >
                <FileDown className="h-4 w-4 mr-2" />
                {isExporting ? "Exporting..." : "Word (.docx)"}
              </Button>
              <Button
                onClick={() => handleExportWord(true)}
                disabled={isExporting}
                variant="outline"
                className="border-2 border-black font-bold uppercase tracking-wider text-xs"
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? "Exporting..." : "Word + Answers"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================= */}
      {/* Content                                       */}
      {/* ============================================= */}
      {view === "paper" && (
        <ExamPaper assignment={assignment} paperRef={paperRef} />
      )}
      {view === "marksheet" && (
        <StudentMarksheet assignment={assignment} />
      )}
      {view === "feedback" && (
        <BlankFeedbackSheet assignment={assignment} />
      )}

      {/* ============================================= */}
      {/* Print-only styles                             */}
      {/* ============================================= */}
      <style jsx global>{`
        /* ---- Font override for exam paper ---- */
        .exam-print-root {
          font-family: Arial, Helvetica, sans-serif;
        }

        /* ---- KaTeX font override for print ---- */
        .exam-print-root .katex {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 1em;
        }

        /* ---- Print page setup ---- */
        @media print {
          @page {
            size: A4;
            margin: 0;
          }

          body {
            margin: 0;
            padding: 0;
          }

          .exam-print-root {
            background: white !important;
          }

          /* ---- Exam page frame ---- */
          .exam-page {
            width: 210mm;
            min-height: 297mm;
            padding: 0;
            margin: 0;
            box-shadow: none !important;
            page-break-after: always;
            break-after: page;
            position: relative;
            overflow: hidden;
          }

          .exam-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }

          /* ---- DO NOT WRITE zones ---- */
          .exam-dnw-zone {
            position: fixed;
            top: 0;
            bottom: 0;
            width: 12mm;
            display: flex !important;
            align-items: center;
            justify-content: center;
            z-index: 100;
          }

          .exam-dnw-left {
            left: 0;
            border-right: 1px solid #ccc;
          }

          .exam-dnw-right {
            right: 0;
            border-left: 1px solid #ccc;
          }

          .exam-dnw-text {
            writing-mode: vertical-rl;
            text-orientation: mixed;
            font-size: 6pt;
            letter-spacing: 0.4em;
            text-transform: uppercase;
            color: #bbb;
            white-space: nowrap;
            font-family: Arial, Helvetica, sans-serif;
          }

          .exam-dnw-left .exam-dnw-text {
            transform: rotate(180deg);
          }

          /* ---- Page footer ---- */
          .exam-page-footer {
            position: fixed;
            bottom: 0;
            left: 12mm;
            right: 12mm;
            height: 12mm;
            display: flex !important;
            align-items: center;
            justify-content: space-between;
            font-size: 7pt;
            color: #999;
            border-top: 1px solid #ddd;
            padding: 0 8mm;
            background: white;
            z-index: 100;
          }

          /* ---- Content area ---- */
          .exam-content-area {
            padding: 15mm 20mm 20mm 20mm;
            margin-left: 12mm;
            margin-right: 12mm;
          }

          /* ---- Question breaks ---- */
          .exam-question-block {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          /* ---- Marksheet styles ---- */
          .marksheet-page {
            width: 210mm;
            min-height: 297mm;
            padding: 20mm;
            margin: 0;
            box-shadow: none !important;
          }
        }

        /* ---- Screen preview styles ---- */
        @media screen {
          .exam-page {
            width: 210mm;
            min-height: 297mm;
            margin: 20px auto;
            background: white;
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
            position: relative;
            overflow: hidden;
          }

          .marksheet-page {
            width: 210mm;
            min-height: 297mm;
            margin: 20px auto;
            background: white;
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
            padding: 20mm;
          }

          .exam-dnw-zone {
            position: absolute;
            top: 0;
            bottom: 0;
            width: 12mm;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .exam-dnw-left {
            left: 0;
            border-right: 1px solid #e5e5e5;
            background: repeating-linear-gradient(
              0deg,
              transparent,
              transparent 4mm,
              #fafafa 4mm,
              #fafafa 8mm
            );
          }

          .exam-dnw-right {
            right: 0;
            border-left: 1px solid #e5e5e5;
            background: repeating-linear-gradient(
              0deg,
              transparent,
              transparent 4mm,
              #fafafa 4mm,
              #fafafa 8mm
            );
          }

          .exam-dnw-text {
            writing-mode: vertical-rl;
            text-orientation: mixed;
            font-size: 6pt;
            letter-spacing: 0.4em;
            text-transform: uppercase;
            color: #ccc;
            white-space: nowrap;
            font-family: Arial, Helvetica, sans-serif;
          }

          .exam-dnw-left .exam-dnw-text {
            transform: rotate(180deg);
          }

          .exam-content-area {
            padding: 15mm 20mm 20mm 20mm;
            margin-left: 12mm;
            margin-right: 12mm;
          }

          .exam-page-footer {
            position: absolute;
            bottom: 0;
            left: 12mm;
            right: 12mm;
            height: 12mm;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 7pt;
            color: #999;
            border-top: 1px solid #eee;
            padding: 0 8mm;
            background: white;
          }
        }
      `}</style>
    </div>
  )
}

// =====================================================
// Exam Paper View
// =====================================================

function ExamPaper({
  assignment,
  paperRef,
}: {
  assignment: AssignmentDetails
  paperRef: string
}) {
  return (
    <div className="exam-paper-container print:m-0 print:p-0">
      {/* DO NOT WRITE zones - repeated on every page via position:fixed in print */}
      <div className="exam-dnw-zone exam-dnw-left">
        <span className="exam-dnw-text">
          Do not write in this area
        </span>
      </div>
      <div className="exam-dnw-zone exam-dnw-right">
        <span className="exam-dnw-text">
          Do not write in this area
        </span>
      </div>

      {/* Page Footer - repeated on every page via position:fixed in print */}
      <div className="exam-page-footer">
        <span>{paperRef} &copy; {new Date().getFullYear()}</span>
        <span className="exam-page-number" />
        <span className="italic">Turn over &#x25B6;</span>
      </div>

      {/* ---- Cover Page (Edexcel Style) ---- */}
      <div className="exam-page">
        <div className="exam-content-area flex flex-col justify-between" style={{ minHeight: "calc(297mm - 12mm)" }}>
          {/* Top section: Candidate info + Header */}
          <div>
            {/* Candidate name and number boxes */}
            <div className="border border-gray-400 p-4 mb-6">
              <p className="text-[9pt] text-gray-600 mb-2">Write your name here</p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-[8pt] text-gray-500 mb-1">Surname</p>
                  <div className="border border-black h-[28px]" />
                </div>
                <div>
                  <p className="text-[8pt] text-gray-500 mb-1">Other names</p>
                  <div className="border border-black h-[28px]" />
                </div>
              </div>
              <div className="flex items-start gap-8">
                <div>
                  <p className="text-[8pt] text-gray-500 mb-1">Centre Number</p>
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="w-[24px] h-[28px] border border-black" />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[8pt] text-gray-500 mb-1">Candidate Number</p>
                  <div className="flex gap-1">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="w-[24px] h-[28px] border border-black" />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Title block - Edexcel style */}
            <div className="mb-4">
              <h1 className="text-[36pt] font-bold leading-tight mb-1">
                Mathematics
              </h1>
              <h2 className="text-[16pt] font-bold leading-tight mb-4">
                {assignment.title}
              </h2>
            </div>

            {/* Date and Paper Reference row */}
            <div className="flex items-end justify-between mb-6">
              <div>
                {assignment.due_date && (
                  <p className="text-[11pt] text-gray-700">
                    {new Date(assignment.due_date).toLocaleDateString("en-GB", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-[8pt] text-gray-500 mb-1">Paper Reference</p>
                <p className="text-[16pt] font-bold tracking-wider">{paperRef}</p>
              </div>
            </div>

            {/* You must have box */}
            <div className="border-2 border-black p-4 mb-6 flex items-start justify-between">
              <div>
                <p className="text-[10pt]">
                  <strong>You must have:</strong> Ruler graduated in centimetres and millimetres,
                  protractor, pair of compasses, pen, HB pencil, eraser.
                </p>
              </div>
              <div className="border border-black px-3 py-2 text-center ml-4 flex-shrink-0">
                <p className="text-[8pt] text-gray-500">Total Marks</p>
                <p className="text-[18pt] font-bold">{assignment.total_marks}</p>
              </div>
            </div>

            {/* Instructions */}
            <div className="mb-5">
              <p className="text-[12pt] font-bold mb-3">Instructions</p>
              <ul className="text-[10pt] space-y-1.5 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-black mt-0.5">&#x25CF;</span>
                  <span>Use <strong>black</strong> ink or ball-point pen.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-black mt-0.5">&#x25CF;</span>
                  <span><strong>Fill in the boxes</strong> at the top of this page with your name, centre number and candidate number.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-black mt-0.5">&#x25CF;</span>
                  <span>Answer <strong>all</strong> questions.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-black mt-0.5">&#x25CF;</span>
                  <span>Answer the questions in the spaces provided &ndash; <em>there may be more space than you need.</em></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-black mt-0.5">&#x25CF;</span>
                  <span>You must <strong>show all your working</strong>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-black mt-0.5">&#x25CF;</span>
                  <span>Diagrams are <strong>NOT</strong> accurately drawn, unless otherwise indicated.</span>
                </li>
              </ul>
            </div>

            {/* Information */}
            <div className="mb-5">
              <p className="text-[12pt] font-bold mb-3">Information</p>
              <ul className="text-[10pt] space-y-1.5 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-black mt-0.5">&#x25CF;</span>
                  <span>The total mark for this paper is <strong>{assignment.total_marks}</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-black mt-0.5">&#x25CF;</span>
                  <span>The marks for <strong>each</strong> question are shown in brackets &ndash; <em>use this as a guide as to how much time to spend on each question.</em></span>
                </li>
              </ul>
            </div>

            {/* Advice */}
            <div>
              <p className="text-[12pt] font-bold mb-3">Advice</p>
              <ul className="text-[10pt] space-y-1.5 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-black mt-0.5">&#x25CF;</span>
                  <span>Read each question carefully before you start to answer it.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-black mt-0.5">&#x25CF;</span>
                  <span>Keep an eye on the time.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-black mt-0.5">&#x25CF;</span>
                  <span>Try to answer every question.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-black mt-0.5">&#x25CF;</span>
                  <span>Check your answers if you have time at the end.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom section: Turn over */}
          <div className="flex justify-end mt-6">
            <p className="text-[10pt] font-bold italic">
              Turn over &#x25B6;
            </p>
          </div>
        </div>
      </div>

      {/* ---- Question Pages ---- */}
      <div className="exam-page">
        <div className="exam-content-area">
          {/* Edexcel-style instruction header */}
          <div className="text-center mb-8 border-b border-gray-300 pb-4">
            <p className="text-[11pt] font-bold mb-2">
              Answer ALL questions.
            </p>
            <p className="text-[11pt] mb-1">
              Write your answers in the spaces provided.
            </p>
            <p className="text-[11pt] font-bold">
              You must write down all the stages in your working.
            </p>
          </div>

          {assignment.questions.map((q, index) => (
            <QuestionBlock
              key={q.question_id}
              question={q}
              number={index + 1}
              isLast={index === assignment.questions.length - 1}
            />
          ))}

          {/* End of paper */}
          <div className="mt-12 pt-6 border-t-2 border-black text-center">
            <p className="text-[12pt] font-bold uppercase tracking-[0.2em]">
              TOTAL FOR PAPER IS {assignment.total_marks} MARKS
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// Question Block
// =====================================================

function QuestionBlock({
  question,
  number,
  isLast,
}: {
  question: AssignmentDetails["questions"][0]
  number: number
  isLast: boolean
}) {
  // Determine answer space height based on marks
  const answerSpaceHeight = getAnswerSpaceHeight(question.marks)
  // Check if question has sub-parts (indicated by marks array or structured content)
  const hasSubParts = question.question_latex?.includes('(a)') || question.question_latex?.includes('(i)')

  return (
    <div className={`exam-question-block ${!isLast ? "mb-8" : ""}`}>
      {/* Question grid: number | content | marks */}
      <div className="grid" style={{ gridTemplateColumns: "40px 1fr 50px" }}>
        {/* Left: Question Number */}
        <div className="text-[12pt] font-bold pr-2 pt-[2px]">
          {number}
        </div>

        {/* Center: Question Text */}
        <div className="text-[11pt] leading-relaxed">
          <LatexPreview
            latex={question.question_latex}
            className="exam-question-text"
            showSkeleton={false}
          />

          {/* Answer working space - lined like real exam paper */}
          <div className="mt-6" style={{ minHeight: answerSpaceHeight }}>
            {/* Dotted working lines */}
            {Array.from({ length: getWorkingLineCount(question.marks) }).map((_, i) => (
              <div key={i} className="h-[24px] border-b border-dotted border-gray-200" />
            ))}
          </div>

          {/* Dotted answer line */}
          <AnswerLine />

          {/* Sub-part marks shown in parentheses, total marks at the bottom */}
          {!hasSubParts && (
            <div className="text-[10pt] text-right mt-3 mb-2 font-bold">
              (Total for Question {number} is {question.marks} {question.marks === 1 ? "mark" : "marks"})
            </div>
          )}
          {hasSubParts && (
            <div className="text-[10pt] text-right mt-3 mb-2 font-bold">
              (Total for Question {number} is {question.marks} {question.marks === 1 ? "mark" : "marks"})
            </div>
          )}
        </div>

        {/* Right: Mark Box */}
        <div className="flex justify-end">
          <MarkBox marks={question.marks} />
        </div>
      </div>

      {/* Separator between questions */}
      {!isLast && (
        <div className="border-b border-gray-300 mt-4" />
      )}
    </div>
  )
}

// =====================================================
// Working line count calculator (for exam-style lined space)
// =====================================================

function getWorkingLineCount(marks: number): number {
  if (marks <= 1) return 3
  if (marks <= 2) return 5
  if (marks <= 3) return 7
  if (marks <= 4) return 9
  if (marks <= 6) return 12
  return 15 // 6+ marks
}

// =====================================================
// Answer space height calculator
// =====================================================

function getAnswerSpaceHeight(marks: number): string {
  if (marks <= 1) return "40mm"
  if (marks <= 2) return "60mm"
  if (marks <= 3) return "80mm"
  if (marks <= 4) return "100mm"
  if (marks <= 6) return "120mm"
  return "150mm" // 6+ marks
}

// =====================================================
// Student Marksheet View
// =====================================================

function StudentMarksheet({ assignment }: { assignment: AssignmentDetails }) {
  return (
    <div className="marksheet-page font-arial">
      {/* Header */}
      <div className="border-b-2 border-black pb-4 mb-6">
        <h1 className="text-[16pt] font-bold uppercase tracking-wider mb-1">
          Student Marksheet
        </h1>
        <p className="text-[11pt] text-gray-600">{assignment.title}</p>
        <p className="text-[10pt] text-gray-500">
          {assignment.class_name} &mdash; {assignment.subject}
        </p>
      </div>

      {/* Student info fields */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <p className="text-[9pt] text-gray-500 uppercase tracking-[0.3em] mb-2">
            Student Name
          </p>
          <div className="border-b border-black h-[20px]" />
        </div>
        <div>
          <p className="text-[9pt] text-gray-500 uppercase tracking-[0.3em] mb-2">
            Date
          </p>
          <div className="border-b border-black h-[20px]" />
        </div>
      </div>

      {/* Marks Table */}
      <table className="w-full border-collapse text-[11pt]">
        <thead>
          <tr className="border-2 border-black">
            <th className="border-2 border-black px-3 py-2 text-left font-bold uppercase tracking-wider text-[9pt] w-[60px]">
              Q
            </th>
            <th className="border-2 border-black px-3 py-2 text-center font-bold uppercase tracking-wider text-[9pt] w-[80px]">
              Max Marks
            </th>
            <th className="border-2 border-black px-3 py-2 text-center font-bold uppercase tracking-wider text-[9pt] w-[80px]">
              My Score
            </th>
            <th className="border-2 border-black px-3 py-2 text-left font-bold uppercase tracking-wider text-[9pt]">
              Topic
            </th>
            <th className="border-2 border-black px-3 py-2 text-center font-bold uppercase tracking-wider text-[9pt] w-[140px]">
              RAG
            </th>
          </tr>
        </thead>
        <tbody>
          {assignment.questions.map((q, index) => (
            <tr key={q.question_id} className="border-2 border-black">
              {/* Question Number */}
              <td className="border-2 border-black px-3 py-3 font-bold text-center">
                {index + 1}
              </td>

              {/* Max Marks */}
              <td className="border-2 border-black px-3 py-3 text-center font-bold">
                {q.marks}
              </td>

              {/* My Score (empty box) */}
              <td className="border-2 border-black px-3 py-3">
                <div className="w-[40px] h-[28px] border border-black mx-auto" />
              </td>

              {/* Topic */}
              <td className="border-2 border-black px-3 py-3">
                <p className="text-[10pt] font-medium">{q.sub_topic || q.topic}</p>
                {q.sub_topic && (
                  <p className="text-[8pt] text-gray-400">{q.topic}</p>
                )}
              </td>

              {/* RAG Checkboxes */}
              <td className="border-2 border-black px-2 py-3">
                <div className="flex items-center justify-center gap-2">
                  {/* Red */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-[18px] h-[18px] border-2 border-red-500 rounded-sm" />
                    <span className="text-[6pt] text-red-500 font-bold uppercase">R</span>
                  </div>
                  {/* Amber */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-[18px] h-[18px] border-2 border-amber-500 rounded-sm" />
                    <span className="text-[6pt] text-amber-500 font-bold uppercase">A</span>
                  </div>
                  {/* Green */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-[18px] h-[18px] border-2 border-green-500 rounded-sm" />
                    <span className="text-[6pt] text-green-500 font-bold uppercase">G</span>
                  </div>
                </div>
              </td>
            </tr>
          ))}

          {/* Totals row */}
          <tr className="border-2 border-black bg-gray-50">
            <td className="border-2 border-black px-3 py-3 font-bold text-right uppercase text-[9pt] tracking-wider">
              Total
            </td>
            <td className="border-2 border-black px-3 py-3 text-center font-bold text-[14pt]">
              {assignment.total_marks}
            </td>
            <td className="border-2 border-black px-3 py-3">
              <div className="w-[40px] h-[28px] border border-black mx-auto" />
            </td>
            <td className="border-2 border-black px-3 py-3" />
            <td className="border-2 border-black px-3 py-3" />
          </tr>
        </tbody>
      </table>

      {/* Percentage / Grade box */}
      <div className="mt-8 flex justify-end gap-6">
        <div className="border-2 border-black p-4 w-[140px]">
          <p className="text-[8pt] text-gray-500 uppercase tracking-[0.2em] mb-2">
            Percentage
          </p>
          <div className="border-b border-black h-[24px]" />
        </div>
        <div className="border-2 border-black p-4 w-[140px]">
          <p className="text-[8pt] text-gray-500 uppercase tracking-[0.2em] mb-2">
            Grade
          </p>
          <div className="border-b border-black h-[24px]" />
        </div>
      </div>

      {/* Reflection section */}
      <div className="mt-8 border-2 border-black p-6">
        <p className="text-[10pt] font-bold uppercase tracking-wider mb-4">
          Reflection
        </p>
        <div className="space-y-4">
          <div>
            <p className="text-[9pt] text-gray-500 mb-1">
              Topics I need to revise:
            </p>
            <div className="border-b border-gray-400 h-[20px]" />
            <div className="border-b border-gray-400 h-[20px] mt-2" />
          </div>
          <div>
            <p className="text-[9pt] text-gray-500 mb-1">
              My target for the next assessment:
            </p>
            <div className="border-b border-gray-400 h-[20px]" />
          </div>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// Blank Feedback Sheet (for in-person marking)
// =====================================================

function BlankFeedbackSheet({ assignment }: { assignment: AssignmentDetails }) {
  return (
    <div className="marksheet-page font-arial">
      {/* Header */}
      <div className="border-b-2 border-black pb-4 mb-6">
        <h1 className="text-[16pt] font-bold uppercase tracking-wider mb-1">
          Feedback Sheet
        </h1>
        <p className="text-[11pt] text-gray-600">{assignment.title}</p>
      </div>

      {/* Student info fields */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <div>
          <p className="text-[9pt] text-gray-500 uppercase tracking-[0.3em] mb-2">
            Student Name
          </p>
          <div className="border-b border-black h-[20px]" />
        </div>
        <div>
          <p className="text-[9pt] text-gray-500 uppercase tracking-[0.3em] mb-2">
            Class
          </p>
          <div className="border-b border-black h-[20px]" />
        </div>
        <div>
          <p className="text-[9pt] text-gray-500 uppercase tracking-[0.3em] mb-2">
            Date
          </p>
          <div className="border-b border-black h-[20px]" />
        </div>
      </div>

      {/* Marking Grid */}
      <table className="w-full border-collapse text-[10pt] mb-6">
        <thead>
          <tr className="border-2 border-black bg-gray-50">
            <th className="border-2 border-black px-2 py-2 text-center font-bold uppercase tracking-wider text-[8pt] w-[40px]">
              Q
            </th>
            <th className="border-2 border-black px-2 py-2 text-center font-bold uppercase tracking-wider text-[8pt] w-[60px]">
              Marks Available
            </th>
            <th className="border-2 border-black px-2 py-2 text-center font-bold uppercase tracking-wider text-[8pt] w-[60px]">
              Marks Awarded
            </th>
            <th className="border-2 border-black px-2 py-2 text-left font-bold uppercase tracking-wider text-[8pt]">
              Teacher Comments / Areas for Improvement
            </th>
            <th className="border-2 border-black px-2 py-2 text-center font-bold uppercase tracking-wider text-[8pt] w-[100px]">
              Confidence (RAG)
            </th>
          </tr>
        </thead>
        <tbody>
          {assignment.questions.map((q, index) => (
            <tr key={q.question_id} className="border-2 border-black">
              <td className="border-2 border-black px-2 py-3 font-bold text-center">
                {index + 1}
              </td>
              <td className="border-2 border-black px-2 py-3 text-center font-bold">
                {q.marks}
              </td>
              <td className="border-2 border-black px-2 py-3">
                <div className="w-[36px] h-[24px] border border-black mx-auto" />
              </td>
              <td className="border-2 border-black px-3 py-3" style={{ minHeight: "40px" }}>
                {/* Blank space for teacher comments */}
                <div className="h-[36px]" />
              </td>
              <td className="border-2 border-black px-2 py-3">
                <div className="flex items-center justify-center gap-1.5">
                  <div className="w-[16px] h-[16px] border-2 border-red-400 rounded-sm" />
                  <div className="w-[16px] h-[16px] border-2 border-amber-400 rounded-sm" />
                  <div className="w-[16px] h-[16px] border-2 border-green-400 rounded-sm" />
                </div>
              </td>
            </tr>
          ))}

          {/* Totals row */}
          <tr className="border-2 border-black bg-gray-50">
            <td className="border-2 border-black px-2 py-3 font-bold text-right uppercase text-[8pt] tracking-wider">
              Total
            </td>
            <td className="border-2 border-black px-2 py-3 text-center font-bold text-[12pt]">
              {assignment.total_marks}
            </td>
            <td className="border-2 border-black px-2 py-3">
              <div className="w-[36px] h-[24px] border border-black mx-auto" />
            </td>
            <td className="border-2 border-black px-2 py-3" />
            <td className="border-2 border-black px-2 py-3" />
          </tr>
        </tbody>
      </table>

      {/* Score Summary */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex gap-4">
          <div className="border-2 border-black p-3 w-[120px]">
            <p className="text-[7pt] text-gray-500 uppercase tracking-[0.2em] mb-2">
              Percentage
            </p>
            <div className="border-b border-black h-[20px]" />
          </div>
          <div className="border-2 border-black p-3 w-[120px]">
            <p className="text-[7pt] text-gray-500 uppercase tracking-[0.2em] mb-2">
              Grade
            </p>
            <div className="border-b border-black h-[20px]" />
          </div>
        </div>
        
        {/* RAG Key */}
        <div className="border border-gray-300 p-2 text-[7pt]">
          <p className="font-bold uppercase tracking-wider mb-1">RAG Key</p>
          <div className="flex gap-3">
            <span className="flex items-center gap-1">
              <span className="w-[10px] h-[10px] bg-red-400 inline-block" /> Need to revise
            </span>
            <span className="flex items-center gap-1">
              <span className="w-[10px] h-[10px] bg-amber-400 inline-block" /> Nearly there
            </span>
            <span className="flex items-center gap-1">
              <span className="w-[10px] h-[10px] bg-green-400 inline-block" /> Confident
            </span>
          </div>
        </div>
      </div>

      {/* Overall Feedback Section */}
      <div className="border-2 border-black p-5 mb-6">
        <p className="text-[10pt] font-bold uppercase tracking-wider mb-3">
          Overall Teacher Feedback
        </p>
        <div className="space-y-3">
          <div className="border-b border-gray-300 h-[20px]" />
          <div className="border-b border-gray-300 h-[20px]" />
          <div className="border-b border-gray-300 h-[20px]" />
          <div className="border-b border-gray-300 h-[20px]" />
        </div>
      </div>

      {/* Student Action Plan */}
      <div className="border-2 border-black p-5">
        <p className="text-[10pt] font-bold uppercase tracking-wider mb-3">
          Student Action Plan
        </p>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-[8pt] text-gray-500 mb-2">
              What went well:
            </p>
            <div className="border-b border-gray-300 h-[20px]" />
            <div className="border-b border-gray-300 h-[20px] mt-2" />
          </div>
          <div>
            <p className="text-[8pt] text-gray-500 mb-2">
              What I need to work on:
            </p>
            <div className="border-b border-gray-300 h-[20px]" />
            <div className="border-b border-gray-300 h-[20px] mt-2" />
          </div>
        </div>
        <div className="mt-4">
          <p className="text-[8pt] text-gray-500 mb-2">
            My targets for next time:
          </p>
          <div className="border-b border-gray-300 h-[20px]" />
          <div className="border-b border-gray-300 h-[20px] mt-2" />
        </div>
      </div>
    </div>
  )
}
