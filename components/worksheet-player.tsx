"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronLeft,
  ChevronRight,
  Calculator,
  Clock,
  AlertCircle,
  Send,
  Loader2,
  CheckCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { LatexPreview } from "@/components/latex-preview"
import { MathInput } from "@/components/math-input"
import { 
  submitAssignment,
  type WorksheetQuestion 
} from "@/app/actions/student-work"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import Image from "next/image"

// =====================================================
// Types
// =====================================================

interface WorksheetPlayerProps {
  assignmentId: string
  title: string
  className: string
  dueDate: string | null
  totalMarks: number
  questions: WorksheetQuestion[]
  initialAnswers?: Record<string, string>
  mode: "answer" | "readonly"
  onSubmitSuccess?: () => void
}

// =====================================================
// Worksheet Player Component
// =====================================================

export function WorksheetPlayer({
  assignmentId,
  title,
  className,
  dueDate,
  totalMarks,
  questions,
  initialAnswers = {},
  mode,
  onSubmitSuccess,
}: WorksheetPlayerProps) {
  // State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Current question
  const currentQuestion = questions[currentQuestionIndex]
  const questionCount = questions.length

  // Calculate completion percentage
  const answeredCount = Object.values(answers).filter((a) => a.trim() !== "").length
  const completionPercentage = questionCount > 0 ? Math.round((answeredCount / questionCount) * 100) : 0



  // Handlers
  const handleAnswerChange = (value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: value,
    }))
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1)
    }
  }

  const handleNext = () => {
    if (currentQuestionIndex < questionCount - 1) {
      setCurrentQuestionIndex((prev) => prev + 1)
    }
  }

  const handleQuestionSelect = (index: number) => {
    setCurrentQuestionIndex(index)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setSubmitError(null)

    const result = await submitAssignment(assignmentId, answers)
    
    setIsSubmitting(false)

    if (result.success) {
      setShowSubmitDialog(false)
      onSubmitSuccess?.()
    } else {
      setSubmitError(result.error || "Failed to submit assignment")
    }
  }

  // Check if question is answered
  const isQuestionAnswered = (questionId: string) => {
    return answers[questionId]?.trim() !== ""
  }

  // Format due date
  const formatDueDate = (dateStr: string | null) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    const now = new Date()
    const diff = date.getTime() - now.getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    
    if (days < 0) return { text: `${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""} overdue`, isOverdue: true }
    if (days === 0) return { text: "Due today", isOverdue: false }
    if (days === 1) return { text: "Due tomorrow", isOverdue: false }
    return { text: `Due in ${days} days`, isOverdue: false }
  }

  const dueDateInfo = formatDueDate(dueDate)

  return (
    <div className="min-h-screen bg-swiss-paper flex flex-col">
      {/* Header */}
      <header className="border-b-2 border-swiss-ink bg-swiss-paper sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-black uppercase tracking-wider text-swiss-ink truncate">
                {title}
              </h1>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="text-xs text-swiss-lead uppercase tracking-wider font-bold">
                  {className}
                </span>
                <span className="text-xs text-swiss-lead">•</span>
                <span className="text-xs text-swiss-lead uppercase tracking-wider font-bold">
                  {totalMarks} marks
                </span>
                {dueDateInfo && (
                  <>
                    <span className="text-xs text-swiss-lead">•</span>
                    <span className={`text-xs uppercase tracking-wider font-bold flex items-center gap-1 ${
                      dueDateInfo.isOverdue ? "text-red-600" : "text-swiss-signal"
                    }`}>
                      <Clock className="w-3 h-3" />
                      {dueDateInfo.text}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-4">

              <div className="text-right">
                <p className="text-xs text-swiss-lead uppercase tracking-wider font-bold">
                  {completionPercentage}% Complete
                </p>
                <p className="text-xs text-swiss-lead">
                  {answeredCount}/{questionCount} answered
                </p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <Progress value={completionPercentage} className="h-2" />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Sidebar - Question Navigator */}
        <aside className="w-20 md:w-24 border-r-2 border-swiss-ink bg-swiss-concrete p-2 md:p-3 overflow-y-auto">
          <p className="text-xs font-black uppercase tracking-wider text-swiss-lead mb-3 hidden md:block">
            Questions
          </p>
          <div className="grid grid-cols-2 gap-2">
            {questions.map((q, index) => {
              const isAnswered = isQuestionAnswered(q.id)
              const isCurrent = index === currentQuestionIndex

              return (
                <button
                  key={q.id}
                  onClick={() => handleQuestionSelect(index)}
                  className={`
                    aspect-square flex items-center justify-center text-sm font-black
                    border-2 transition-all duration-200
                    ${isCurrent
                      ? "border-swiss-signal bg-swiss-signal text-white"
                      : isAnswered
                        ? "border-blue-500 bg-blue-500 text-white"
                        : "border-swiss-ink bg-swiss-paper text-swiss-ink hover:bg-swiss-ink hover:text-swiss-paper"
                    }
                  `}
                  title={`Question ${index + 1}${isAnswered ? " (Answered)" : ""}`}
                >
                  {index + 1}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 pt-4 border-t border-swiss-ink/20 hidden md:block">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 border-2 border-swiss-ink bg-swiss-paper" />
              <span className="text-xs text-swiss-lead">Unanswered</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 bg-blue-500" />
              <span className="text-xs text-swiss-lead">Answered</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-swiss-signal" />
              <span className="text-xs text-swiss-lead">Current</span>
            </div>
          </div>
        </aside>

        {/* Main Question Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col overflow-auto"
            >
              {/* Question Content */}
              <div className="flex-1 p-6 md:p-8 overflow-auto">
                {/* Question Header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-wider text-swiss-ink">
                      Question {currentQuestionIndex + 1}
                    </h2>
                    <p className="text-sm text-swiss-lead uppercase tracking-wider font-bold mt-1">
                      of {questionCount}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center gap-2 border-2 border-swiss-ink px-3 py-1">
                      <span className="text-lg font-black text-swiss-signal">
                        {currentQuestion.marks}
                      </span>
                      <span className="text-xs text-swiss-lead uppercase tracking-wider font-bold">
                        {currentQuestion.marks === 1 ? "mark" : "marks"}
                      </span>
                    </div>
                    {currentQuestion.calculator_allowed && (
                      <div className="flex items-center justify-end gap-1 mt-2 text-xs text-green-600 font-bold uppercase">
                        <Calculator className="w-4 h-4" />
                        Calculator OK
                      </div>
                    )}
                  </div>
                </div>

                {/* Topic Badge */}
                {currentQuestion.topic && (
                  <div className="mb-6">
                    <span className="inline-block text-xs px-2 py-1 border-2 border-swiss-ink text-swiss-ink font-bold uppercase tracking-wider">
                      {currentQuestion.topic}
                      {currentQuestion.sub_topic && ` • ${currentQuestion.sub_topic}`}
                    </span>
                  </div>
                )}

                {/* Question Content */}
                <div className="border-2 border-swiss-ink bg-swiss-paper p-6 mb-6">
                  {currentQuestion.content_type === "image_ocr" && currentQuestion.image_url ? (
                    <div className="flex justify-center">
                      <div className="relative w-full max-w-2xl">
                        <Image
                          src={currentQuestion.image_url}
                          alt={`Question ${currentQuestionIndex + 1}`}
                          width={800}
                          height={600}
                          className="w-full h-auto border border-swiss-ink/20"
                          style={{ maxWidth: "100%", height: "auto" }}
                        />
                      </div>
                    </div>
                  ) : currentQuestion.question_latex ? (
                    <LatexPreview 
                      latex={currentQuestion.question_latex} 
                      className="text-lg"
                    />
                  ) : (
                    <p className="text-swiss-lead italic">No question content available</p>
                  )}
                </div>

                {/* Answer Input Area */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-black uppercase tracking-wider text-swiss-ink">
                      Your Answer
                    </label>
                    {isQuestionAnswered(currentQuestion.id) && (
                      <span className="flex items-center gap-1 text-xs text-green-600 font-bold uppercase">
                        <CheckCircle className="w-4 h-4" />
                        Answered
                      </span>
                    )}
                  </div>
                  
                  <MathInput
                    value={answers[currentQuestion.id] || ""}
                    onChange={(value) => handleAnswerChange(value)}
                    disabled={mode === "readonly"}
                    placeholder={mode === "readonly" 
                      ? "Your submitted answer will appear here" 
                      : "Enter your answer here. Use the toolbar for math symbols..."
                    }
                    minHeight="150px"
                  />
                  
                  {mode === "answer" && (
                    <p className="text-xs text-swiss-lead">
                      Show your working and write your final answer clearly. Use the math toolbar for symbols.
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Footer Navigation */}
          <footer className="border-t-2 border-swiss-ink bg-swiss-paper p-4">
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
              <Button
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                variant="outline"
                className="border-2 border-swiss-ink font-bold uppercase tracking-wider disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              <div className="flex items-center gap-3">
                {mode === "answer" && (
                  <Button
                    onClick={() => setShowSubmitDialog(true)}
                    className="bg-swiss-signal hover:bg-swiss-signal/90 text-white font-bold uppercase tracking-wider"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Submit
                  </Button>
                )}
              </div>

              <Button
                onClick={handleNext}
                disabled={currentQuestionIndex === questionCount - 1}
                variant="outline"
                className="border-2 border-swiss-ink font-bold uppercase tracking-wider disabled:opacity-40"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </footer>
        </main>
      </div>

      {/* Submit Confirmation Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent className="border-2 border-swiss-ink">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-wider">
              Submit Assignment?
            </DialogTitle>
            <DialogDescription className="text-swiss-lead">
              You are about to submit your assignment. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* Completion Summary */}
            <div className="border-2 border-swiss-ink p-4 bg-swiss-concrete">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold uppercase tracking-wider text-swiss-lead">
                  Completion
                </span>
                <span className="text-lg font-black text-swiss-ink">
                  {completionPercentage}%
                </span>
              </div>
              <Progress value={completionPercentage} className="h-2 mb-3" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-swiss-lead">Questions answered:</span>
                <span className="font-bold">
                  {answeredCount} / {questionCount}
                </span>
              </div>
            </div>

            {/* Warning if incomplete */}
            {completionPercentage < 100 && (
              <div className="flex items-start gap-3 p-4 border-2 border-amber-500 bg-amber-50">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-800 text-sm">
                    You have unanswered questions
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    Questions {questions
                      .map((q, i) => !isQuestionAnswered(q.id) ? i + 1 : null)
                      .filter(Boolean)
                      .join(", ")} are not answered.
                  </p>
                </div>
              </div>
            )}

            {/* Unanswered question list */}
            {completionPercentage < 100 && (
              <div className="max-h-32 overflow-y-auto">
                <p className="text-xs font-bold uppercase tracking-wider text-swiss-lead mb-2">
                  Unanswered Questions:
                </p>
                <div className="flex flex-wrap gap-2">
                  {questions.map((q, index) => {
                    if (!isQuestionAnswered(q.id)) {
                      return (
                        <button
                          key={q.id}
                          onClick={() => {
                            setCurrentQuestionIndex(index)
                            setShowSubmitDialog(false)
                          }}
                          className="w-8 h-8 border-2 border-swiss-ink text-sm font-bold hover:bg-swiss-ink hover:text-swiss-paper transition-colors"
                        >
                          {index + 1}
                        </button>
                      )
                    }
                    return null
                  })}
                </div>
              </div>
            )}

            {/* Error message */}
            {submitError && (
              <div className="flex items-start gap-3 p-4 border-2 border-red-500 bg-red-50">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{submitError}</p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowSubmitDialog(false)}
              className="border-2 border-swiss-ink font-bold uppercase tracking-wider"
            >
              Continue Working
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-swiss-signal hover:bg-swiss-signal/90 text-white font-bold uppercase tracking-wider"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              {isSubmitting ? "Submitting..." : "Submit Assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// =====================================================
// Submitted View Component
// =====================================================

interface SubmittedViewProps {
  title: string
  className: string
  submittedAt: string | null
  answeredCount: number
  totalQuestions: number
  status: "submitted" | "graded"
  score?: number | null
  totalMarks?: number
  isPaperMode?: boolean
}

export function SubmittedView({
  title,
  className,
  submittedAt,
  answeredCount,
  totalQuestions,
  status,
  score,
  totalMarks,
  isPaperMode = false,
}: SubmittedViewProps) {
  return (
    <div className="min-h-screen bg-swiss-paper flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="border-2 border-swiss-ink bg-swiss-paper p-8 text-center">
          {/* Icon */}
          <div className="w-20 h-20 mx-auto mb-6 bg-green-100 border-2 border-green-500 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-black uppercase tracking-wider text-swiss-ink mb-2">
            {isPaperMode 
              ? (status === "graded" ? "Paper Exam Graded" : "Paper Exam Completed")
              : (status === "graded" ? "Assignment Graded" : "Assignment Submitted")
            }
          </h1>
          <p className="text-sm text-swiss-lead uppercase tracking-wider font-bold mb-6">
            {title}
          </p>

          {/* Details */}
          <div className="space-y-3 text-left border-t-2 border-swiss-ink pt-6">
            <div className="flex justify-between">
              <span className="text-sm text-swiss-lead uppercase tracking-wider font-bold">
                Class
              </span>
              <span className="text-sm font-bold">{className}</span>
            </div>
            {!isPaperMode && (
              <div className="flex justify-between">
                <span className="text-sm text-swiss-lead uppercase tracking-wider font-bold">
                  Questions Answered
                </span>
                <span className="text-sm font-bold">
                  {answeredCount} / {totalQuestions}
                </span>
              </div>
            )}
            {isPaperMode && (
              <div className="flex justify-between">
                <span className="text-sm text-swiss-lead uppercase tracking-wider font-bold">
                  Total Questions
                </span>
                <span className="text-sm font-bold">
                  {totalQuestions}
                </span>
              </div>
            )}
            {submittedAt && !isPaperMode && (
              <div className="flex justify-between">
                <span className="text-sm text-swiss-lead uppercase tracking-wider font-bold">
                  Submitted
                </span>
                <span className="text-sm font-bold">
                  {new Date(submittedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}
            {status === "graded" && score !== null && score !== undefined && totalMarks && (
              <div className="flex justify-between items-center pt-3 border-t border-swiss-ink/20">
                <span className="text-sm text-swiss-lead uppercase tracking-wider font-bold">
                  Score
                </span>
                <span className="text-xl font-black text-swiss-signal">
                  {score} / {totalMarks}
                </span>
              </div>
            )}
          </div>

          {/* Status Badge */}
          <div className="mt-6 pt-6 border-t-2 border-swiss-ink">
            {status === "graded" ? (
              <span className="inline-block px-4 py-2 bg-green-100 border-2 border-green-500 text-green-700 font-bold uppercase tracking-wider text-sm">
                {isPaperMode ? "Graded - View Feedback & Revision Pack" : "Graded - Check Feedback"}
              </span>
            ) : (
              <span className="inline-block px-4 py-2 bg-amber-100 border-2 border-amber-500 text-amber-700 font-bold uppercase tracking-wider text-sm">
                {isPaperMode ? "Paper Submitted - Awaiting Marking" : "Awaiting Grade"}
              </span>
            )}
          </div>
        </div>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <a
            href="/student-dashboard"
            className="text-swiss-signal font-bold uppercase tracking-wider text-sm hover:underline"
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
