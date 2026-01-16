"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Printer, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StudentFeedbackSheet } from "@/components/student-feedback-sheet"
import type { StudentFeedbackData } from "@/app/actions/feedback"

interface PrintBatchClientProps {
  assignmentId: string
  assignmentTitle: string
  className: string
  studentFeedback: StudentFeedbackData[]
}

export function PrintBatchClient({
  assignmentId,
  assignmentTitle,
  className,
  studentFeedback,
}: PrintBatchClientProps) {
  const [isPrinting, setIsPrinting] = useState(false)

  const handlePrint = () => {
    setIsPrinting(true)
    // Small delay to ensure the UI updates before print dialog
    setTimeout(() => {
      window.print()
      setIsPrinting(false)
    }, 100)
  }

  return (
    <div className="min-h-screen bg-swiss-concrete print:bg-white">
      {/* Print Control Bar - Hidden when printing */}
      <div className="print:hidden bg-swiss-ink text-white p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/dashboard/assignments/${assignmentId}/mark`}>
              <Button variant="outline" size="icon" className="border-2 border-white/30 text-white hover:bg-white/10">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-bold uppercase tracking-wider">
                Bulk Print Feedback Packs
              </h1>
              <p className="text-xs text-white/70">
                {assignmentTitle} • {className} • {studentFeedback.length} students
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-white/70 uppercase tracking-wider">Ready to Print</p>
              <p className="text-lg font-bold">{studentFeedback.length} Feedback Sheets</p>
            </div>
            <Button
              onClick={handlePrint}
              disabled={isPrinting}
              className="bg-swiss-signal hover:bg-swiss-signal/90 text-white font-bold uppercase tracking-wider px-6"
            >
              {isPrinting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Printer className="h-4 w-4 mr-2" />
              )}
              Print All ({studentFeedback.length})
            </Button>
          </div>
        </div>
      </div>

      {/* Instructions - Hidden when printing */}
      <div className="print:hidden max-w-7xl mx-auto p-6">
        <div className="bg-blue-50 border-2 border-blue-600 p-4 mb-6">
          <h2 className="text-sm font-black uppercase tracking-wider text-blue-900 mb-2">
            Print Instructions
          </h2>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Click &ldquo;Print All&rdquo; to open the print dialog</li>
            <li>• Each student&apos;s feedback will print on a new page</li>
            <li>• Recommended: Print in color for RAG status visibility</li>
            <li>• Total pages: {studentFeedback.length * 2} (2 pages per student)</li>
          </ul>
        </div>

        {/* Preview Info */}
        <div className="bg-swiss-paper border-2 border-swiss-ink p-4 mb-6">
          <h2 className="text-sm font-black uppercase tracking-wider text-swiss-ink mb-3">
            Students in Print Queue
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {studentFeedback.map((feedback, index) => (
              <div 
                key={feedback.submissionId}
                className="flex items-center gap-2 p-2 bg-swiss-concrete border border-swiss-ink/20"
              >
                <span className="text-xs font-bold text-swiss-lead">{index + 1}.</span>
                <span className="text-xs font-bold text-swiss-ink truncate">
                  {feedback.studentName}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Printable Content - Each student on a new page */}
      <div className="print:block">
        {studentFeedback.map((feedback, index) => (
          <div key={feedback.submissionId}>
            {/* Student Feedback Sheet */}
            <StudentFeedbackSheet feedback={feedback} />
            
            {/* Page Break - except for last student */}
            {index < studentFeedback.length - 1 && (
              <div className="break-after-page" />
            )}
          </div>
        ))}
      </div>

      {/* Screen Preview - Collapsed cards (hidden when printing) */}
      <div className="print:hidden max-w-7xl mx-auto p-6 pt-0">
        <h2 className="text-lg font-black uppercase tracking-wider text-swiss-ink mb-4">
          Preview (Scroll to see all)
        </h2>
        <div className="space-y-4">
          {studentFeedback.map((feedback) => (
            <div 
              key={feedback.submissionId}
              className="bg-white border-2 border-swiss-ink p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-swiss-ink">{feedback.studentName}</p>
                  <p className="text-xs text-swiss-lead">{feedback.studentEmail}</p>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-black ${
                    feedback.percentage >= 80 ? "text-green-600" :
                    feedback.percentage >= 50 ? "text-amber-600" : "text-red-600"
                  }`}>
                    {feedback.percentage}%
                  </p>
                  <p className="text-xs text-swiss-lead">
                    {feedback.totalScore}/{feedback.maxMarks}
                  </p>
                </div>
              </div>
              
              {/* Topic breakdown mini preview */}
              <div className="mt-3 flex flex-wrap gap-1">
                {feedback.topicBreakdown.slice(0, 5).map((topic, idx) => (
                  <span 
                    key={idx}
                    className={`text-xs px-2 py-0.5 font-bold uppercase tracking-wider ${
                      topic.status === "green" ? "bg-green-100 text-green-700" :
                      topic.status === "amber" ? "bg-amber-100 text-amber-700" :
                      "bg-red-100 text-red-700"
                    }`}
                  >
                    {topic.subTopic}
                  </span>
                ))}
                {feedback.topicBreakdown.length > 5 && (
                  <span className="text-xs px-2 py-0.5 bg-swiss-concrete text-swiss-lead font-bold">
                    +{feedback.topicBreakdown.length - 5} more
                  </span>
                )}
              </div>

              {/* Revision questions count */}
              {feedback.revisionPack.length > 0 && (
                <p className="mt-2 text-xs text-swiss-signal font-bold">
                  {feedback.revisionPack.length} revision questions assigned
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
