"use client"

import { useState } from "react"
import Image from "next/image"
import { LatexPreview } from "@/components/latex-preview"
import type { 
  StudentFeedbackData, 
  SubTopicBreakdown, 
  RevisionQuestionData,
  RAGStatus 
} from "@/app/actions/feedback"

// =====================================================
// RAG UTILITY FUNCTIONS
// =====================================================

function getRAGLabel(status: RAGStatus): string {
  switch (status) {
    case "green": return "Secure"
    case "amber": return "Developing"
    case "red": return "Needs Focus"
  }
}

function getRAGRowBg(status: RAGStatus): string {
  switch (status) {
    case "green": return "bg-green-100 print:bg-green-100"
    case "amber": return "bg-amber-100 print:bg-amber-100"
    case "red": return "bg-red-100 print:bg-red-100"
  }
}

function getRAGTextColor(status: RAGStatus): string {
  switch (status) {
    case "green": return "text-green-700"
    case "amber": return "text-amber-700"
    case "red": return "text-red-700"
  }
}

function getRAGBadgeBg(status: RAGStatus): string {
  switch (status) {
    case "green": return "bg-green-500"
    case "amber": return "bg-amber-500"
    case "red": return "bg-red-500"
  }
}

// =====================================================
// PERFORMANCE TABLE COMPONENT
// =====================================================

interface PerformanceTableProps {
  breakdown: SubTopicBreakdown[]
}

function PerformanceTable({ breakdown }: PerformanceTableProps) {
  return (
    <div className="border-2 border-swiss-ink overflow-hidden">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-swiss-ink text-white">
            <th className="border-r border-swiss-ink/30 p-3 text-left text-xs font-black uppercase tracking-widest">
              Topic / Sub-Topic
            </th>
            <th className="border-r border-swiss-ink/30 p-3 text-center text-xs font-black uppercase tracking-widest w-28">
              Marks
            </th>
            <th className="border-r border-swiss-ink/30 p-3 text-center text-xs font-black uppercase tracking-widest w-24">
              Score
            </th>
            <th className="p-3 text-center text-xs font-black uppercase tracking-widest w-32">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {breakdown.map((row, index) => (
            <tr 
              key={`${row.topic}-${row.subTopic}-${index}`}
              className={`${getRAGRowBg(row.status)} break-inside-avoid`}
            >
              <td className="border-t border-r border-swiss-ink/20 p-3">
                <div className="font-bold text-swiss-ink text-sm">
                  {row.topic}
                </div>
                {row.subTopic !== row.topic && (
                  <div className="text-xs text-swiss-lead mt-0.5">
                    {row.subTopic}
                  </div>
                )}
              </td>
              <td className="border-t border-r border-swiss-ink/20 p-3 text-center">
                <span className="font-black text-swiss-ink">
                  {row.score}/{row.total}
                </span>
              </td>
              <td className={`border-t border-r border-swiss-ink/20 p-3 text-center font-black ${getRAGTextColor(row.status)}`}>
                {row.percentage}%
              </td>
              <td className="border-t border-swiss-ink/20 p-3 text-center">
                <span className={`inline-block px-2 py-1 text-xs font-black uppercase tracking-wider text-white ${getRAGBadgeBg(row.status)}`}>
                  {getRAGLabel(row.status)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// =====================================================
// REVISION QUESTION CARD COMPONENT
// =====================================================

interface RevisionQuestionCardProps {
  question: RevisionQuestionData
  index: number
  showAnswer: boolean
}

function RevisionQuestionCard({ question, index, showAnswer }: RevisionQuestionCardProps) {
  return (
    <div className="border-2 border-swiss-ink bg-swiss-paper break-inside-avoid mb-4">
      {/* Question Header */}
      <div className="bg-swiss-concrete border-b-2 border-swiss-ink p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-swiss-signal flex items-center justify-center">
            <span className="text-white font-black text-sm">{index + 1}</span>
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-swiss-lead">
              {question.topic}
            </span>
            {question.subTopic && question.subTopic !== question.topic && (
              <span className="text-xs text-swiss-lead"> / {question.subTopic}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-swiss-lead px-2 py-1 border border-swiss-ink/30">
            {question.difficulty}
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-swiss-signal px-2 py-1 border border-swiss-signal">
            {question.marks} {question.marks === 1 ? "mark" : "marks"}
          </span>
        </div>
      </div>

      {/* Question Content */}
      <div className="p-4">
        {question.contentType === "synthetic_image" ? (
          // For synthetic_image: text first, then diagram image
          <div className="space-y-4">
            {question.questionLatex && (
              <div className="text-swiss-ink">
                <LatexPreview latex={question.questionLatex} className="text-base" />
              </div>
            )}
            {question.imageUrl && (
              <div className="flex justify-center">
                <div className="relative w-full max-w-md">
                  <Image
                    src={question.imageUrl}
                    alt={`Diagram for question ${index + 1}`}
                    width={400}
                    height={320}
                    className="w-full h-auto border border-swiss-ink/20"
                    style={{ maxWidth: "100%", height: "auto" }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (question.contentType === "image_ocr" || question.contentType === "official_past_paper") && question.imageUrl ? (
          // For image_ocr and official_past_paper: image first, then optional text
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="relative w-full max-w-xl">
                <Image
                  src={question.imageUrl}
                  alt={`Revision question ${index + 1}`}
                  width={600}
                  height={450}
                  className="w-full h-auto border border-swiss-ink/20"
                  style={{ maxWidth: "100%", height: "auto" }}
                />
              </div>
            </div>
            {question.questionLatex && (
              <div className="text-swiss-ink">
                <LatexPreview latex={question.questionLatex} className="text-base" />
              </div>
            )}
          </div>
        ) : question.questionLatex ? (
          <div className="text-swiss-ink">
            <LatexPreview latex={question.questionLatex} className="text-base" />
          </div>
        ) : (
          <p className="text-swiss-lead italic">Question content not available</p>
        )}
      </div>

      {/* Answer Key (shown conditionally or inverted for print) */}
      {showAnswer && question.answerKey && (
        <div className="border-t-2 border-swiss-ink p-4 bg-green-50">
          <p className="text-xs font-black uppercase tracking-wider text-swiss-lead mb-2">
            Answer Key
          </p>
          {question.answerKey.answer && (
            <div className="mb-2">
              <LatexPreview latex={question.answerKey.answer} className="text-sm text-green-800" />
            </div>
          )}
          {question.answerKey.explanation && (
            <p className="text-xs text-green-700 mt-2">
              {question.answerKey.explanation}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// =====================================================
// REVISION SECTION COMPONENT
// =====================================================

interface RevisionSectionProps {
  questions: RevisionQuestionData[]
  showAnswers: boolean
  onToggleAnswers: () => void
}

function RevisionSection({ questions, showAnswers, onToggleAnswers }: RevisionSectionProps) {
  if (questions.length === 0) {
    return (
      <div className="border-2 border-green-500 bg-green-50 p-6 text-center">
        <div className="text-4xl mb-3">🎉</div>
        <h3 className="text-lg font-black uppercase tracking-wider text-green-700 mb-2">
          Great Work!
        </h3>
        <p className="text-sm text-green-600">
          You performed well across all topics. Keep up the excellent effort!
        </p>
      </div>
    )
  }

  return (
    <div className="break-before-page print:break-before-page">
      {/* Section Header */}
      <div className="border-2 border-swiss-signal bg-swiss-signal p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black uppercase tracking-widest text-white">
              Recommended Practice
            </h2>
            <p className="text-sm font-bold text-white/80 mt-1">
              {questions.length} {questions.length === 1 ? "question" : "questions"} to strengthen weak areas
            </p>
          </div>
          <button
            onClick={onToggleAnswers}
            className="print:hidden px-4 py-2 bg-white text-swiss-signal font-bold uppercase tracking-wider text-xs hover:bg-swiss-paper transition-colors"
          >
            {showAnswers ? "Hide Answers" : "Show Answers"}
          </button>
        </div>
      </div>

      {/* Group questions by targeted sub-topic */}
      {(() => {
        const grouped = questions.reduce((acc, q) => {
          const key = q.targetedSubTopic
          if (!acc[key]) acc[key] = []
          acc[key].push(q)
          return acc
        }, {} as Record<string, RevisionQuestionData[]>)

        return Object.entries(grouped).map(([subTopic, qs]) => (
          <div key={subTopic} className="mb-6">
            <div className="border-l-4 border-swiss-signal pl-3 mb-3">
              <p className="text-xs font-black uppercase tracking-wider text-swiss-lead">
                Focus Area
              </p>
              <p className="text-sm font-bold text-swiss-ink">
                {subTopic}
              </p>
            </div>
            {qs.map((question, idx) => (
              <RevisionQuestionCard 
                key={question.id} 
                question={question} 
                index={idx}
                showAnswer={showAnswers}
              />
            ))}
          </div>
        ))
      })()}

      {/* Answer Key Page (for print - inverted text) */}
      <div className="hidden print:block break-before-page">
        <div className="border-2 border-swiss-ink p-4 mb-4">
          <h3 className="text-lg font-black uppercase tracking-wider text-swiss-ink">
            Answer Key
          </h3>
          <p className="text-xs text-swiss-lead mt-1">
            (Rotate page to read)
          </p>
        </div>
        <div className="transform rotate-180">
          {questions.map((q, idx) => (
            <div key={q.id} className="mb-3 p-3 border border-swiss-ink/20">
              <p className="text-xs font-bold text-swiss-ink mb-1">
                Question {idx + 1}:
              </p>
              {q.answerKey?.answer && (
                <LatexPreview latex={q.answerKey.answer} className="text-sm" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// =====================================================
// MAIN STUDENT FEEDBACK SHEET COMPONENT
// =====================================================

interface StudentFeedbackSheetProps {
  feedback: StudentFeedbackData
  schoolLogo?: string
}

export function StudentFeedbackSheet({ feedback, schoolLogo }: StudentFeedbackSheetProps) {
  const [showAnswers, setShowAnswers] = useState(false)

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-swiss-concrete print:bg-white">
      {/* Print Control Bar */}
      <div className="print:hidden bg-swiss-ink text-white p-4 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold uppercase tracking-wider">
              Feedback Report
            </h1>
            <p className="text-xs text-white/70">
              {feedback.studentName} - {feedback.assignmentTitle}
            </p>
          </div>
          <button
            onClick={handlePrint}
            className="px-6 py-2 bg-swiss-signal text-white font-bold uppercase tracking-wider text-sm hover:bg-swiss-signal/80 transition-colors"
          >
            Print Report
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6 print:p-0 print:max-w-none">
        {/* Header Section */}
        <div className="bg-white border-2 border-swiss-ink mb-6 print:mb-4 print:border-4">
          {/* Title Bar */}
          <div className="bg-swiss-signal p-6 border-b-2 border-swiss-ink print:border-b-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-black uppercase tracking-widest text-white print:text-4xl">
                  Student Feedback Report
                </h1>
                <p className="text-base font-bold uppercase tracking-wider text-white/90 mt-1">
                  {feedback.assignmentTitle}
                </p>
              </div>
              {schoolLogo && (
                <div className="hidden print:block">
                  <Image
                    src={schoolLogo}
                    alt="School Logo"
                    width={64}
                    height={64}
                    className="h-16 w-auto"
                    style={{ height: "64px", width: "auto" }}
                    unoptimized
                  />
                </div>
              )}
            </div>
          </div>

          {/* Student Info & Score */}
          <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-swiss-lead mb-1">
                Student Name
              </p>
              <p className="text-lg font-bold text-swiss-ink">
                {feedback.studentName}
              </p>
            </div>
            
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-swiss-lead mb-1">
                Class
              </p>
              <p className="text-lg font-bold text-swiss-ink">
                {feedback.className}
              </p>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-widest text-swiss-lead mb-1">
                Total Score
              </p>
              <p className={`text-2xl font-black ${getRAGTextColor(feedback.overallStatus)}`}>
                {feedback.totalScore}/{feedback.maxMarks}
              </p>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-widest text-swiss-lead mb-1">
                Percentage
              </p>
              <div className="flex items-center gap-2">
                <p className={`text-2xl font-black ${getRAGTextColor(feedback.overallStatus)}`}>
                  {feedback.percentage}%
                </p>
                <span className={`px-2 py-1 text-xs font-black uppercase tracking-wider text-white ${getRAGBadgeBg(feedback.overallStatus)}`}>
                  {getRAGLabel(feedback.overallStatus)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Table */}
        <div className="bg-white border-2 border-swiss-ink mb-6 print:mb-4">
          <div className="bg-swiss-concrete border-b-2 border-swiss-ink p-4">
            <h2 className="text-lg font-black uppercase tracking-widest text-swiss-ink">
              Performance by Topic
            </h2>
            <p className="text-xs text-swiss-lead mt-1">
              Topics are sorted from weakest to strongest
            </p>
          </div>
          <div className="p-4">
            <PerformanceTable breakdown={feedback.topicBreakdown} />
          </div>
        </div>

        {/* RAG Key Legend */}
        <div className="bg-white border-2 border-swiss-ink mb-6 print:mb-4 p-4">
          <p className="text-xs font-black uppercase tracking-widest text-swiss-lead mb-3">
            Status Key
          </p>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-green-500"></span>
              <span className="text-xs font-bold text-swiss-ink">Secure (&gt;80%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-amber-500"></span>
              <span className="text-xs font-bold text-swiss-ink">Developing (50-80%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-red-500"></span>
              <span className="text-xs font-bold text-swiss-ink">Needs Focus (&lt;50%)</span>
            </div>
          </div>
        </div>

        {/* Revision Section */}
        <div className="bg-white border-2 border-swiss-ink print:border-0">
          <RevisionSection 
            questions={feedback.revisionPack}
            showAnswers={showAnswers}
            onToggleAnswers={() => setShowAnswers(!showAnswers)}
          />
        </div>

        {/* Footer */}
        <div className="mt-6 text-center print:mt-4">
          <p className="text-xs text-swiss-lead">
            Generated on {new Date(feedback.generatedAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            })}
          </p>
        </div>
      </div>
    </div>
  )
}
