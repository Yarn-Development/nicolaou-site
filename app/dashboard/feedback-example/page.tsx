"use client"

import { FeedbackSheet, type GradedQuestion } from "@/components/feedback-sheet"
import { useState } from "react"

// Mock assessment data
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

export default function FeedbackSheetExample() {
  const [printMode, setPrintMode] = useState(false)

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-swiss-concrete dark:bg-swiss-ink/5">
      {/* Control Panel */}
      <div className="bg-swiss-paper border-b-2 border-swiss-ink p-4 print:hidden sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-widest text-swiss-ink">
              FEEDBACK SHEET PREVIEW
            </h1>
            <p className="text-xs text-swiss-lead uppercase tracking-wider font-bold mt-1">
              Example assessment feedback for demonstration
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={printMode}
                onChange={(e) => setPrintMode(e.target.checked)}
                className="w-4 h-4 border-2 border-swiss-ink"
              />
              <span className="text-xs font-bold uppercase tracking-wider text-swiss-ink">
                PRINT MODE
              </span>
            </label>
            
            <button
              onClick={handlePrint}
              className="px-6 py-3 bg-swiss-signal text-white border-2 border-swiss-ink font-bold uppercase tracking-wider text-sm hover:bg-swiss-ink transition-colors duration-200"
            >
              🖨️ PRINT
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Sheet Component */}
      <div className="max-w-7xl mx-auto p-6 print:p-0">
        <FeedbackSheet
          questions={mockQuestions}
          studentName="Alex Johnson"
          assessmentTitle="GCSE Mathematics - Module 5 Assessment"
          assessmentDate="13th January 2026"
          printMode={printMode}
        />
      </div>

      {/* Usage Instructions */}
      <div className="max-w-7xl mx-auto p-6 print:hidden">
        <div className="border-2 border-swiss-ink bg-swiss-paper p-8">
          <h2 className="text-xl font-black uppercase tracking-widest text-swiss-ink mb-6 border-b-2 border-swiss-ink/10 pb-4">
            📚 COMPONENT USAGE
          </h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-swiss-signal mb-3">
                IMPORT
              </h3>
              <pre className="bg-swiss-ink text-white p-4 overflow-x-auto text-xs">
{`import { FeedbackSheet, type GradedQuestion } from "@/components/feedback-sheet"`}
              </pre>
            </div>

            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-swiss-signal mb-3">
                GRADED QUESTION TYPE
              </h3>
              <pre className="bg-swiss-ink text-white p-4 overflow-x-auto text-xs">
{`interface GradedQuestion {
  id: string
  maxMarks: number
  studentMarks: number
  learningObjective: string
  questionNumber?: number  // Optional, will auto-number if not provided
}`}
              </pre>
            </div>

            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-swiss-signal mb-3">
                BASIC USAGE
              </h3>
              <pre className="bg-swiss-ink text-white p-4 overflow-x-auto text-xs">
{`const questions: GradedQuestion[] = [
  {
    id: "q1",
    maxMarks: 5,
    studentMarks: 4,
    learningObjective: "Solve quadratic equations by factoring"
  },
  // ... more questions
]

<FeedbackSheet 
  questions={questions}
  studentName="Alex Johnson"
  assessmentTitle="GCSE Mathematics - Module 5"
  assessmentDate="13th January 2026"
/>`}
              </pre>
            </div>

            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-swiss-signal mb-3">
                RAG STATUS LOGIC
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 bg-swiss-concrete dark:bg-swiss-ink/5">
                  <div className="w-6 h-6 bg-red-500 border-2 border-swiss-ink"></div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-wider text-swiss-ink">
                      RED (NEEDS WORK)
                    </p>
                    <p className="text-xs text-swiss-lead font-medium">
                      &lt; 40% - Requires significant revision and support
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-swiss-concrete dark:bg-swiss-ink/5">
                  <div className="w-6 h-6 bg-amber-500 border-2 border-swiss-ink"></div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-wider text-swiss-ink">
                      AMBER (DEVELOPING)
                    </p>
                    <p className="text-xs text-swiss-lead font-medium">
                      40% - 70% - Good progress, needs some additional practice
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-swiss-concrete dark:bg-swiss-ink/5">
                  <div className="w-6 h-6 bg-green-500 border-2 border-swiss-ink"></div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-wider text-swiss-ink">
                      GREEN (STRONG)
                    </p>
                    <p className="text-xs text-swiss-lead font-medium">
                      &gt; 70% - Strong understanding, performing well
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-swiss-signal mb-3">
                FEATURES
              </h3>
              <ul className="space-y-2">
                {[
                  "Automatic grouping by learning objective",
                  "RAG (Red-Amber-Green) status calculation",
                  "Individual question breakdown with scores",
                  "Learning objectives summary with percentages",
                  "Revision list for red/amber objectives only",
                  "Print-friendly layout with page breaks",
                  "Swiss Focus design system styling",
                  "Dark mode compatible",
                  "Fully responsive"
                ].map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-swiss-signal mt-1.5"></div>
                    <span className="text-sm text-swiss-ink font-medium">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-l-4 border-swiss-signal bg-swiss-concrete dark:bg-swiss-ink/5 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-swiss-ink mb-2">
                💡 TIP
              </p>
              <p className="text-xs text-swiss-lead font-medium">
                The component automatically calculates percentages, groups questions by learning objective, 
                and generates a focused revision list. Just pass in your graded questions array and it 
                handles the rest!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
