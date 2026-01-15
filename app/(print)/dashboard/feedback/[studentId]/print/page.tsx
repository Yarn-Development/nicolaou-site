"use client"

import { useMemo } from "react"
import { 
  FeedbackTable, 
  RevisionList, 
  useObjectiveSummaries, 
  useOverallStats,
  getRAGTextColor,
  type GradedQuestion 
} from "@/components/feedback-sheet"

// Mock data - In production, this would be fetched based on studentId
const mockQuestions: GradedQuestion[] = [
  {
    id: "q1",
    questionNumber: 1,
    maxMarks: 5,
    studentMarks: 5,
    learningObjective: "Solve quadratic equations by factoring"
  },
  {
    id: "q2",
    questionNumber: 2,
    maxMarks: 4,
    studentMarks: 3,
    learningObjective: "Solve quadratic equations by factoring"
  },
  {
    id: "q3",
    questionNumber: 3,
    maxMarks: 6,
    studentMarks: 2,
    learningObjective: "Apply Pythagoras' theorem to find missing lengths"
  },
  {
    id: "q4",
    questionNumber: 4,
    maxMarks: 5,
    studentMarks: 1,
    learningObjective: "Apply Pythagoras' theorem to find missing lengths"
  },
  {
    id: "q5",
    questionNumber: 5,
    maxMarks: 8,
    studentMarks: 6,
    learningObjective: "Calculate mean, median, and mode from data sets"
  },
  {
    id: "q6",
    questionNumber: 6,
    maxMarks: 4,
    studentMarks: 4,
    learningObjective: "Simplify algebraic expressions using index laws"
  },
  {
    id: "q7",
    questionNumber: 7,
    maxMarks: 6,
    studentMarks: 5,
    learningObjective: "Simplify algebraic expressions using index laws"
  },
  {
    id: "q8",
    questionNumber: 8,
    maxMarks: 7,
    studentMarks: 3,
    learningObjective: "Expand and simplify expressions with brackets"
  },
  {
    id: "q9",
    questionNumber: 9,
    maxMarks: 5,
    studentMarks: 2,
    learningObjective: "Expand and simplify expressions with brackets"
  },
  {
    id: "q10",
    questionNumber: 10,
    maxMarks: 10,
    studentMarks: 8,
    learningObjective: "Solve simultaneous equations algebraically"
  }
]

interface PrintPageProps {
  params: Promise<{
    studentId: string
  }>
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function FeedbackPrintPage({ params }: PrintPageProps) {
  // TODO: In production, fetch student data based on studentId
  // const { studentId } = await params
  
  const questions = mockQuestions
  const studentName = "Alex Johnson"
  const assessmentTitle = "GCSE Mathematics - Module 5 Assessment"
  const assessmentDate = "13th January 2026"

  const objectiveSummaries = useObjectiveSummaries(questions)
  const overallStats = useOverallStats(questions)

  const revisionList = useMemo(() => {
    return objectiveSummaries.filter(
      summary => summary.ragStatus === "red" || summary.ragStatus === "amber"
    )
  }, [objectiveSummaries])

  const handlePrint = () => {
    window.print()
  }

  return (
    <>
      {/* Print Control Bar - Hidden when printing */}
      <div className="print-hidden bg-swiss-ink text-white p-4 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold uppercase tracking-wider">
              Print Preview
            </h1>
            <p className="text-xs text-white/70">
              {studentName} - {assessmentTitle}
            </p>
          </div>
          <button
            onClick={handlePrint}
            className="print-hidden px-6 py-2 bg-swiss-signal text-white font-bold uppercase tracking-wider text-sm hover:bg-swiss-signal/80 transition-colors"
          >
            🖨️ Print
          </button>
        </div>
      </div>

      {/* Printable Content */}
      <div className="bg-white p-8 print:p-0">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="border-4 border-swiss-ink bg-white mb-8 print:mb-6">
            <div className="bg-swiss-signal p-6 border-b-4 border-swiss-ink">
              <h1 className="text-4xl font-black uppercase tracking-widest text-white mb-2">
                STUDENT FEEDBACK SHEET
              </h1>
              <p className="text-lg font-bold uppercase tracking-wider text-white/90">
                {assessmentTitle}
              </p>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-swiss-lead mb-1">
                  STUDENT NAME
                </p>
                <p className="text-lg font-bold text-swiss-ink">
                  {studentName}
                </p>
              </div>
              
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-swiss-lead mb-1">
                  DATE
                </p>
                <p className="text-lg font-bold text-swiss-ink">
                  {assessmentDate}
                </p>
              </div>
              
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-swiss-lead mb-1">
                  OVERALL SCORE
                </p>
                <p className={`text-3xl font-black ${getRAGTextColor(overallStats.ragStatus)}`}>
                  {overallStats.studentMarks}/{overallStats.totalMarks} ({overallStats.percentage}%)
                </p>
              </div>
            </div>
          </div>

          {/* Feedback Table */}
          <div className="mb-8 print:mb-6">
            <FeedbackTable questions={questions} />
          </div>

          {/* Revision List - Starts on new page if table is long */}
          <div className="break-before-page">
            <RevisionList revisionList={revisionList} />
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          /* Force color printing */
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          /* Hide print buttons and control bar when printing */
          .print-hidden {
            display: none !important;
          }

          /* Page break before revision list */
          .break-before-page {
            break-before: page;
            page-break-before: always;
          }

          /* Ensure clean margins */
          @page {
            margin: 1cm;
          }

          /* Prevent orphan rows in tables */
          tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          /* Ensure backgrounds print */
          * {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }

        /* Screen styles for print-hidden elements */
        @media screen {
          .print-hidden {
            display: flex;
          }
        }
      `}</style>
    </>
  )
}
