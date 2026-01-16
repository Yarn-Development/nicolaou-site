"use client"

import { Button } from "@/components/ui/button"
import { Printer, ArrowLeft, CheckCircle } from "lucide-react"
import Link from "next/link"
import { 
  extractTopicsFromAssignment, 
  groupByTopic, 
  calculateTotalMarks,
  type TopicSummary,
  type QuestionForTopicExtraction 
} from "@/lib/topic-extraction"

// =====================================================
// Types
// =====================================================

interface RevisionChecklistProps {
  examTitle: string
  examDate?: string | null
  questions: QuestionForTopicExtraction[]
  backUrl?: string
  className?: string
}

// =====================================================
// Main Component
// =====================================================

export function RevisionChecklist({
  examTitle,
  examDate,
  questions,
  backUrl = "/dashboard/assignments",
  className = "",
}: RevisionChecklistProps) {
  // Extract and group topics
  const topicSummaries = extractTopicsFromAssignment(questions)
  const groupedTopics = groupByTopic(topicSummaries)
  const totalMarks = calculateTotalMarks(topicSummaries)

  // Format the exam date
  const formattedDate = examDate
    ? new Date(examDate).toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Date TBC"

  // Handle print
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className={`min-h-screen bg-white ${className}`}>
      {/* Print Control Bar - Hidden when printing */}
      <div className="print-hidden bg-swiss-concrete border-b-2 border-swiss-ink px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={backUrl}>
              <Button variant="outline" size="icon" className="border-2 border-swiss-ink">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="font-black uppercase tracking-wider">Revision Checklist</h1>
              <p className="text-sm text-swiss-lead font-bold">{examTitle}</p>
            </div>
          </div>
          <Button
            onClick={handlePrint}
            className="bg-swiss-signal hover:bg-swiss-ink text-white font-bold uppercase tracking-wider"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print Checklist
          </Button>
        </div>
      </div>

      {/* Printable Content */}
      <div className="max-w-4xl mx-auto p-8 print:p-0 print:max-w-none">
        {/* Header Section */}
        <header className="mb-8 print:mb-6">
          <div className="border-b-4 border-swiss-ink pb-6 print:pb-4">
            <h1 className="text-3xl font-black uppercase tracking-widest text-swiss-ink mb-2 print:text-2xl">
              {examTitle}
            </h1>
            <p className="text-lg font-bold text-swiss-lead uppercase tracking-wider print:text-base">
              {formattedDate}
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <h2 className="text-xl font-black uppercase tracking-widest text-swiss-signal print:text-lg">
              Personal Learning Checklist (PLC)
            </h2>
            <p className="text-sm font-bold text-swiss-lead uppercase tracking-wider">
              Total: {totalMarks} marks
            </p>
          </div>
        </header>

        {/* Instructions */}
        <div className="mb-6 p-4 bg-swiss-concrete border-2 border-swiss-ink print:bg-gray-100 print:mb-4">
          <p className="text-sm font-bold text-swiss-ink">
            <strong>Instructions:</strong> Rate your confidence for each topic using the RAG system:
          </p>
          <div className="flex items-center gap-6 mt-2 text-sm font-bold">
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 bg-red-500 border border-swiss-ink"></span>
              <span>R = Red (I need help)</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 bg-amber-400 border border-swiss-ink"></span>
              <span>A = Amber (I need practice)</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 bg-green-500 border border-swiss-ink"></span>
              <span>G = Green (I'm confident)</span>
            </span>
          </div>
        </div>

        {/* Topics Table */}
        <table className="w-full border-collapse border-2 border-swiss-ink">
          <thead>
            <tr className="bg-swiss-ink text-white print:bg-black">
              <th className="text-left p-3 font-black uppercase tracking-wider text-sm border-r border-swiss-ink/50 w-1/4">
                Topic Area
              </th>
              <th className="text-left p-3 font-black uppercase tracking-wider text-sm border-r border-swiss-ink/50 w-2/5">
                Skill / Sub-topic
              </th>
              <th className="text-center p-3 font-black uppercase tracking-wider text-sm border-r border-swiss-ink/50 w-1/6">
                Weighting
              </th>
              <th className="text-center p-3 font-black uppercase tracking-wider text-sm w-1/6">
                Self-Assessment
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from(groupedTopics.entries()).map(([topic, summaries], topicIndex) => (
              summaries.map((summary, subIndex) => (
                <tr 
                  key={`${topic}-${summary.subTopic}`} 
                  className={`border-b border-swiss-ink/30 ${
                    topicIndex % 2 === 0 ? "bg-white" : "bg-swiss-paper"
                  } print:break-inside-avoid`}
                >
                  {/* Topic Area - only show for first sub-topic */}
                  {subIndex === 0 ? (
                    <td 
                      className="p-3 font-bold text-sm border-r border-swiss-ink/30 align-top"
                      rowSpan={summaries.length}
                    >
                      {topic}
                    </td>
                  ) : null}
                  
                  {/* Skill / Sub-topic */}
                  <td className="p-3 text-sm border-r border-swiss-ink/30">
                    {summary.subTopic !== topic ? summary.subTopic : "General"}
                  </td>
                  
                  {/* Weighting */}
                  <td className="p-3 text-center text-sm font-bold border-r border-swiss-ink/30">
                    ~{summary.totalMarks} mark{summary.totalMarks !== 1 ? "s" : ""}
                  </td>
                  
                  {/* Self-Assessment Checkboxes */}
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-3">
                      <RAGCheckbox label="R" color="red" />
                      <RAGCheckbox label="A" color="amber" />
                      <RAGCheckbox label="G" color="green" />
                    </div>
                  </td>
                </tr>
              ))
            ))}
          </tbody>
        </table>

        {/* Summary Section */}
        <div className="mt-8 border-2 border-swiss-ink p-4 print:mt-6">
          <h3 className="font-black uppercase tracking-wider text-sm mb-3">
            My Revision Plan
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-bold text-swiss-lead uppercase tracking-wider mb-1">
                Topics I need to focus on (Red topics):
              </p>
              <div className="border-b-2 border-dotted border-swiss-ink/50 h-6"></div>
              <div className="border-b-2 border-dotted border-swiss-ink/50 h-6 mt-1"></div>
            </div>
            <div>
              <p className="text-xs font-bold text-swiss-lead uppercase tracking-wider mb-1">
                Topics I need to practice (Amber topics):
              </p>
              <div className="border-b-2 border-dotted border-swiss-ink/50 h-6"></div>
              <div className="border-b-2 border-dotted border-swiss-ink/50 h-6 mt-1"></div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 pt-4 border-t-2 border-swiss-ink/30 print:mt-6">
          <div className="flex items-center justify-between text-xs text-swiss-lead font-bold uppercase tracking-wider">
            <span>Nicolaou Learning Platform</span>
            <span>Good luck with your revision!</span>
          </div>
        </footer>

        {/* Student Name Field for Print */}
        <div className="hidden print:block mt-8 pt-4 border-t-2 border-swiss-ink">
          <div className="flex items-center gap-4">
            <span className="font-bold text-sm uppercase tracking-wider">Name:</span>
            <div className="flex-1 border-b-2 border-swiss-ink"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// RAG Checkbox Component
// =====================================================

interface RAGCheckboxProps {
  label: "R" | "A" | "G"
  color: "red" | "amber" | "green"
}

function RAGCheckbox({ label, color }: RAGCheckboxProps) {
  const colorClasses = {
    red: "border-red-500 hover:bg-red-50",
    amber: "border-amber-500 hover:bg-amber-50",
    green: "border-green-500 hover:bg-green-50",
  }

  const labelColors = {
    red: "text-red-600",
    amber: "text-amber-600",
    green: "text-green-600",
  }

  return (
    <label className="flex flex-col items-center gap-1 cursor-pointer print:cursor-default">
      <div
        className={`w-5 h-5 border-2 ${colorClasses[color]} print:hover:bg-transparent`}
      >
        {/* Empty checkbox for print - students will tick manually */}
      </div>
      <span className={`text-xs font-black ${labelColors[color]}`}>{label}</span>
    </label>
  )
}

// =====================================================
// Standalone Printable Version (for direct URL access)
// =====================================================

interface RevisionChecklistPageProps {
  examTitle: string
  examDate?: string | null
  topics: TopicSummary[]
  totalMarks: number
  backUrl?: string
}

export function RevisionChecklistPage({
  examTitle,
  examDate,
  topics,
  totalMarks,
  backUrl,
}: RevisionChecklistPageProps) {
  const groupedTopics = groupByTopic(topics)
  
  // Format the exam date
  const formattedDate = examDate
    ? new Date(examDate).toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Date TBC"

  // Handle print
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Print Control Bar - Hidden when printing */}
      <div className="print-hidden bg-swiss-concrete border-b-2 border-swiss-ink px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {backUrl && (
              <Link href={backUrl}>
                <Button variant="outline" size="icon" className="border-2 border-swiss-ink">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
            )}
            <div>
              <h1 className="font-black uppercase tracking-wider">Revision Checklist</h1>
              <p className="text-sm text-swiss-lead font-bold">{examTitle}</p>
            </div>
          </div>
          <Button
            onClick={handlePrint}
            className="bg-swiss-signal hover:bg-swiss-ink text-white font-bold uppercase tracking-wider"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print Checklist
          </Button>
        </div>
      </div>

      {/* Printable Content */}
      <div className="max-w-4xl mx-auto p-8 print:p-0 print:max-w-none">
        {/* Header Section */}
        <header className="mb-8 print:mb-6">
          <div className="border-b-4 border-swiss-ink pb-6 print:pb-4">
            <h1 className="text-3xl font-black uppercase tracking-widest text-swiss-ink mb-2 print:text-2xl">
              {examTitle}
            </h1>
            <p className="text-lg font-bold text-swiss-lead uppercase tracking-wider print:text-base">
              {formattedDate}
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <h2 className="text-xl font-black uppercase tracking-widest text-swiss-signal print:text-lg">
              Personal Learning Checklist (PLC)
            </h2>
            <p className="text-sm font-bold text-swiss-lead uppercase tracking-wider">
              Total: {totalMarks} marks
            </p>
          </div>
        </header>

        {/* Instructions */}
        <div className="mb-6 p-4 bg-swiss-concrete border-2 border-swiss-ink print:bg-gray-100 print:mb-4">
          <p className="text-sm font-bold text-swiss-ink">
            <strong>Instructions:</strong> Rate your confidence for each topic using the RAG system:
          </p>
          <div className="flex items-center gap-6 mt-2 text-sm font-bold">
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 bg-red-500 border border-swiss-ink"></span>
              <span>R = Red (I need help)</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 bg-amber-400 border border-swiss-ink"></span>
              <span>A = Amber (I need practice)</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 bg-green-500 border border-swiss-ink"></span>
              <span>G = Green (I'm confident)</span>
            </span>
          </div>
        </div>

        {/* Topics Table */}
        <table className="w-full border-collapse border-2 border-swiss-ink">
          <thead>
            <tr className="bg-swiss-ink text-white print:bg-black">
              <th className="text-left p-3 font-black uppercase tracking-wider text-sm border-r border-swiss-ink/50 w-1/4">
                Topic Area
              </th>
              <th className="text-left p-3 font-black uppercase tracking-wider text-sm border-r border-swiss-ink/50 w-2/5">
                Skill / Sub-topic
              </th>
              <th className="text-center p-3 font-black uppercase tracking-wider text-sm border-r border-swiss-ink/50 w-1/6">
                Weighting
              </th>
              <th className="text-center p-3 font-black uppercase tracking-wider text-sm w-1/6">
                Self-Assessment
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from(groupedTopics.entries()).map(([topic, summaries], topicIndex) => (
              summaries.map((summary, subIndex) => (
                <tr 
                  key={`${topic}-${summary.subTopic}`} 
                  className={`border-b border-swiss-ink/30 ${
                    topicIndex % 2 === 0 ? "bg-white" : "bg-swiss-paper"
                  } print:break-inside-avoid`}
                >
                  {subIndex === 0 ? (
                    <td 
                      className="p-3 font-bold text-sm border-r border-swiss-ink/30 align-top"
                      rowSpan={summaries.length}
                    >
                      {topic}
                    </td>
                  ) : null}
                  <td className="p-3 text-sm border-r border-swiss-ink/30">
                    {summary.subTopic !== topic ? summary.subTopic : "General"}
                  </td>
                  <td className="p-3 text-center text-sm font-bold border-r border-swiss-ink/30">
                    ~{summary.totalMarks} mark{summary.totalMarks !== 1 ? "s" : ""}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-3">
                      <RAGCheckbox label="R" color="red" />
                      <RAGCheckbox label="A" color="amber" />
                      <RAGCheckbox label="G" color="green" />
                    </div>
                  </td>
                </tr>
              ))
            ))}
          </tbody>
        </table>

        {/* Summary Section */}
        <div className="mt-8 border-2 border-swiss-ink p-4 print:mt-6">
          <h3 className="font-black uppercase tracking-wider text-sm mb-3">
            My Revision Plan
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-bold text-swiss-lead uppercase tracking-wider mb-1">
                Topics I need to focus on (Red topics):
              </p>
              <div className="border-b-2 border-dotted border-swiss-ink/50 h-6"></div>
              <div className="border-b-2 border-dotted border-swiss-ink/50 h-6 mt-1"></div>
            </div>
            <div>
              <p className="text-xs font-bold text-swiss-lead uppercase tracking-wider mb-1">
                Topics I need to practice (Amber topics):
              </p>
              <div className="border-b-2 border-dotted border-swiss-ink/50 h-6"></div>
              <div className="border-b-2 border-dotted border-swiss-ink/50 h-6 mt-1"></div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 pt-4 border-t-2 border-swiss-ink/30 print:mt-6">
          <div className="flex items-center justify-between text-xs text-swiss-lead font-bold uppercase tracking-wider">
            <span>Nicolaou Learning Platform</span>
            <span>Good luck with your revision!</span>
          </div>
        </footer>

        {/* Student Name Field for Print */}
        <div className="hidden print:block mt-8 pt-4 border-t-2 border-swiss-ink">
          <div className="flex items-center gap-4">
            <span className="font-bold text-sm uppercase tracking-wider">Name:</span>
            <div className="flex-1 border-b-2 border-swiss-ink"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
