"use client"

import { useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LatexPreview } from "@/components/latex-preview"
import type { RevisionListQuestionResult } from "@/lib/types/database"

// =====================================================
// Types
// =====================================================

interface RevisionListInfo {
  id: string
  title: string
  description: string | null
  assignment_id: string
  assignment_title: string
  class_name: string
  subject: string
  created_at: string
}

interface RevisionListPrintClientProps {
  revisionList: RevisionListInfo
  questions: RevisionListQuestionResult[]
}

// =====================================================
// Component
// =====================================================

export function RevisionListPrintClient({
  revisionList,
  questions,
}: RevisionListPrintClientProps) {
  const router = useRouter()
  const printRef = useRef<HTMLDivElement>(null)

  const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0)

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Control Bar - hidden when printing */}
      <div className="print:hidden sticky top-0 z-50 bg-white border-b-2 border-black shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="font-bold uppercase text-xs tracking-wider"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">
              Revision List Print Preview
            </span>
          </div>
          <Button
            onClick={handlePrint}
            className="bg-black hover:bg-gray-800 text-white font-bold uppercase text-xs tracking-wider"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print / Save PDF
          </Button>
        </div>
      </div>

      {/* Print Content */}
      <div className="max-w-4xl mx-auto py-8 print:py-0 print:max-w-none">
        <div
          ref={printRef}
          className="bg-white shadow-lg print:shadow-none mx-4 print:mx-0"
        >
          {/* Cover / Header Section */}
          <div className="px-12 pt-10 pb-6 border-b-2 border-black print:break-after-avoid">
            {/* Top bar */}
            <div className="flex items-center justify-between mb-6">
              <div className="text-xs font-bold uppercase tracking-widest text-gray-500">
                Revision Practice
              </div>
              <div className="text-xs font-bold uppercase tracking-widest text-gray-500">
                {revisionList.subject}
              </div>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-black tracking-tight uppercase mb-2">
              {revisionList.title}
            </h1>

            {revisionList.description && (
              <p className="text-gray-600 font-medium mb-4">
                {revisionList.description}
              </p>
            )}

            {/* Meta info bar */}
            <div className="flex items-center gap-6 text-sm text-gray-600 font-medium border-t border-gray-200 pt-4">
              <div>
                <span className="text-gray-400 text-xs uppercase tracking-wider mr-2">
                  Based on:
                </span>
                {revisionList.assignment_title}
              </div>
              <div className="text-gray-300">|</div>
              <div>
                <span className="text-gray-400 text-xs uppercase tracking-wider mr-2">
                  Class:
                </span>
                {revisionList.class_name}
              </div>
              <div className="text-gray-300">|</div>
              <div>
                <span className="text-gray-400 text-xs uppercase tracking-wider mr-2">
                  Questions:
                </span>
                {questions.length}
              </div>
              <div className="text-gray-300">|</div>
              <div>
                <span className="text-gray-400 text-xs uppercase tracking-wider mr-2">
                  Total Marks:
                </span>
                {totalMarks}
              </div>
            </div>

            {/* Student name line */}
            <div className="mt-6 flex items-center gap-4">
              <span className="text-sm font-bold uppercase tracking-wider text-gray-500">
                Name:
              </span>
              <div className="flex-1 border-b-2 border-dotted border-gray-400 h-6" />
              <span className="text-sm font-bold uppercase tracking-wider text-gray-500 ml-4">
                Date:
              </span>
              <div className="w-40 border-b-2 border-dotted border-gray-400 h-6" />
            </div>
          </div>

          {/* Questions */}
          <div className="px-12 py-6">
            {questions.map((question, index) => (
              <PrintableQuestion
                key={question.question_id}
                question={question}
                number={index + 1}
                isLast={index === questions.length - 1}
              />
            ))}
          </div>

          {/* Footer */}
          <div className="px-12 pb-8 text-center">
            <div className="border-t-2 border-black pt-4">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                End of Revision List &mdash; {questions.length} Questions &mdash;{" "}
                {totalMarks} Marks Total
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// Printable Question Component
// =====================================================

function PrintableQuestion({
  question,
  number,
  isLast,
}: {
  question: RevisionListQuestionResult
  number: number
  isLast: boolean
}) {
  const marks = question.marks || 1
  // Working lines: roughly 2 lines per mark, min 3, max 12
  const workingLineCount = Math.max(3, Math.min(12, marks * 2))

  return (
    <div
      className={`pb-6 mb-6 ${!isLast ? "border-b border-gray-200" : ""}`}
      style={{ breakInside: "avoid" }}
    >
      {/* Question header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-start gap-3">
          {/* Question number */}
          <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center border-2 border-black bg-white font-black text-sm">
            {number}
          </div>

          {/* Topic tags - print-friendly */}
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 border border-gray-300 px-2 py-0.5">
              {question.topic}
            </span>
            {question.sub_topic && (
              <span className="text-xs font-medium text-gray-400 border border-gray-200 px-2 py-0.5">
                {question.sub_topic}
              </span>
            )}
          </div>
        </div>

        {/* Marks */}
        <div className="flex-shrink-0 text-right">
          <span className="text-sm font-black">
            ({marks} {marks === 1 ? "mark" : "marks"})
          </span>
        </div>
      </div>

      {/* Question content */}
      <div className="ml-11 mb-4">
        {question.question_latex ? (
          <LatexPreview latex={question.question_latex} className="text-sm" />
        ) : (
          <p className="text-sm text-gray-500 italic">No question text available</p>
        )}
      </div>

      {/* Source reference (if applicable) */}
      {question.source_question_number && (
        <div className="ml-11 mb-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Similar to Q{question.source_question_number}
          </span>
        </div>
      )}

      {/* Working space - dotted lines */}
      <div className="ml-11 mt-4">
        {Array.from({ length: workingLineCount }).map((_, i) => (
          <div
            key={i}
            className="border-b border-dotted border-gray-300 h-7"
          />
        ))}
      </div>

      {/* Answer line */}
      <div className="ml-11 mt-4 flex items-end gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-500 pb-1">
          Answer:
        </span>
        <div className="flex-1 border-b-2 border-black h-8" />
      </div>
    </div>
  )
}
