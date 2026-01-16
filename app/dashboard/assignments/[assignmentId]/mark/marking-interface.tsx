"use client"

import { useState, useCallback, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { 
  ArrowLeft, 
  Check, 
  AlertCircle, 
  Eye, 
  Loader2,
  Bell,
  BellOff,
  Users,
  FileText,
  Save,
  Printer,
  BookOpen,
  Send,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { 
  type AssignmentMarkingData,
  type GradingData,
  saveMarks,
  toggleFeedbackRelease,
} from "@/app/actions/marking"
import { releaseFeedbackAndGeneratePacks } from "@/app/actions/feedback"
import { toast } from "sonner"

interface MarkingInterfaceProps {
  data: AssignmentMarkingData
}

interface StudentRowState {
  gradingData: GradingData
  totalScore: number
  isSaving: boolean
  isSaved: boolean
  hasChanges: boolean
  validationErrors: Record<string, boolean> // Track which inputs have invalid values
}

export function MarkingInterface({ data }: MarkingInterfaceProps) {
  // Render different interfaces based on assignment mode
  if (data.assignment.mode === "paper") {
    return <PaperMarkingGrid data={data} />
  }

  // Default to online marking mode
  return <OnlineMarkingInterface data={data} />
}

// =====================================================
// Paper Marking Grid (High-Density Spreadsheet Style)
// =====================================================

function PaperMarkingGrid({ data }: MarkingInterfaceProps) {
  const router = useRouter()
  const { assignment, questions, students, maxTotalMarks } = data

  // Track feedback release state
  const [feedbackReleased, setFeedbackReleased] = useState(
    students.some(s => s.feedback_released)
  )
  const [isTogglingFeedback, setIsTogglingFeedback] = useState(false)
  const [isReleasingPacks, setIsReleasingPacks] = useState(false)

  // Initialize student states
  const [studentStates, setStudentStates] = useState<Record<string, StudentRowState>>(() => {
    const initial: Record<string, StudentRowState> = {}
    students.forEach(student => {
      const gradingData: GradingData = {}
      questions.forEach(q => {
        gradingData[q.id] = { 
          score: student.grading_data?.[q.id]?.score ?? 0 
        }
      })
      const totalScore = Object.values(gradingData).reduce(
        (sum, d) => sum + d.score, 
        0
      )
      initial[student.id] = {
        gradingData,
        totalScore,
        isSaving: false,
        isSaved: student.status === "graded",
        hasChanges: false,
        validationErrors: {},
      }
    })
    return initial
  })

  // Handle score change for a student's question
  const handleScoreChange = useCallback((
    studentId: string, 
    questionId: string, 
    value: string,
    maxMarks: number
  ) => {
    const numValue = value === "" ? 0 : parseInt(value, 10)
    
    // Check if value is invalid (not a number, negative, or exceeds max)
    const isInvalid = isNaN(numValue) || numValue < 0 || numValue > maxMarks
    
    // Always update the UI to show the entered value
    setStudentStates(prev => {
      const studentState = prev[studentId]
      
      // If invalid, track the error but still show the value in the input
      if (isInvalid) {
        return {
          ...prev,
          [studentId]: {
            ...studentState,
            validationErrors: {
              ...studentState.validationErrors,
              [questionId]: true,
            },
          }
        }
      }
      
      // Valid input - update grading data and clear any validation error
      const newGradingData = {
        ...studentState.gradingData,
        [questionId]: { score: numValue }
      }
      const newTotalScore = Object.values(newGradingData).reduce(
        (sum, d) => sum + d.score, 
        0
      )
      const newValidationErrors = { ...studentState.validationErrors }
      delete newValidationErrors[questionId]
      
      return {
        ...prev,
        [studentId]: {
          ...studentState,
          gradingData: newGradingData,
          totalScore: newTotalScore,
          isSaved: false,
          hasChanges: true,
          validationErrors: newValidationErrors,
        }
      }
    })
  }, [])

  // Save marks for a single student
  const handleSaveStudent = useCallback(async (studentId: string) => {
    const state = studentStates[studentId]
    if (!state || state.isSaving) return

    setStudentStates(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], isSaving: true }
    }))

    const result = await saveMarks(
      assignment.id,
      studentId,
      state.gradingData
    )

    if (result.success) {
      setStudentStates(prev => ({
        ...prev,
        [studentId]: { 
          ...prev[studentId], 
          isSaving: false, 
          isSaved: true,
          hasChanges: false,
        }
      }))
      toast.success("Marks saved")
    } else {
      setStudentStates(prev => ({
        ...prev,
        [studentId]: { ...prev[studentId], isSaving: false }
      }))
      toast.error(result.error || "Failed to save marks")
    }
  }, [studentStates, assignment.id])

  // Save all students with changes
  const handleSaveAll = useCallback(async () => {
    const studentsWithChanges = Object.entries(studentStates)
      .filter(([, state]) => state.hasChanges)
      .map(([id]) => id)

    if (studentsWithChanges.length === 0) {
      toast.info("No changes to save")
      return
    }

    // Save all in parallel
    await Promise.all(studentsWithChanges.map(id => handleSaveStudent(id)))
    toast.success(`Saved marks for ${studentsWithChanges.length} student(s)`)
  }, [studentStates, handleSaveStudent])

  // Toggle feedback release
  const handleToggleFeedback = useCallback(async () => {
    setIsTogglingFeedback(true)
    const newValue = !feedbackReleased
    
    const result = await toggleFeedbackRelease(assignment.id, newValue)
    
    if (result.success) {
      setFeedbackReleased(newValue)
      toast.success(newValue ? "Feedback released to students" : "Feedback hidden from students")
    } else {
      toast.error(result.error || "Failed to update feedback status")
    }
    
    setIsTogglingFeedback(false)
  }, [feedbackReleased, assignment.id])

  // Count statistics
  const gradedCount = Object.values(studentStates).filter(s => s.isSaved).length
  const totalStudents = students.length
  const hasUnsavedChanges = Object.values(studentStates).some(s => s.hasChanges)

  // Warn on navigation with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [hasUnsavedChanges])

  // Release feedback and generate packs for all students (Paper Mode)
  const handleReleaseFeedbackPacks = useCallback(async () => {
    if (hasUnsavedChanges) {
      toast.error("Please save all changes before releasing feedback")
      return
    }

    if (gradedCount === 0) {
      toast.error("Please grade at least one student before releasing feedback")
      return
    }

    setIsReleasingPacks(true)
    
    const result = await releaseFeedbackAndGeneratePacks(assignment.id)
    
    if (result.success && result.data) {
      setFeedbackReleased(true)
      toast.success(
        `Feedback released for ${result.data.successCount} student(s). ` +
        `${result.data.failedCount > 0 ? `${result.data.failedCount} failed.` : ""}`
      )
      // Navigate to the bulk print page
      router.push(`/dashboard/assignments/${assignment.id}/feedback/print-batch`)
    } else {
      toast.error(result.error || "Failed to release feedback")
    }
    
    setIsReleasingPacks(false)
  }, [assignment.id, hasUnsavedChanges, gradedCount, router])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b-2 border-swiss-ink pb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Link href="/dashboard/assignments">
              <Button variant="outline" size="icon" className="border-2 border-swiss-ink">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tight">
                {assignment.title}
              </h1>
              <p className="text-sm text-swiss-lead font-bold uppercase tracking-wider mt-1">
                {assignment.class_name} • {assignment.subject}
              </p>
              <Badge className="mt-2 bg-blue-600 text-white font-bold uppercase">
                Paper Mode - Rapid Entry
              </Badge>
            </div>
          </div>

          {/* Release Feedback Toggle */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 border-2 border-swiss-ink p-3 bg-swiss-paper">
              <div className="flex items-center gap-2">
                {feedbackReleased ? (
                  <Bell className="h-4 w-4 text-green-600" />
                ) : (
                  <BellOff className="h-4 w-4 text-swiss-lead" />
                )}
                <span className="text-sm font-bold uppercase tracking-wider">
                  Release Feedback
                </span>
              </div>
              <Switch
                checked={feedbackReleased}
                onCheckedChange={handleToggleFeedback}
                disabled={isTogglingFeedback}
              />
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-swiss-lead" />
            <span className="text-sm font-bold">
              {gradedCount}/{totalStudents} Graded
            </span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-swiss-lead" />
            <span className="text-sm font-bold">
              {questions.length} Questions
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">
              Max: {maxTotalMarks} marks
            </span>
          </div>
          
          {hasUnsavedChanges && (
            <Badge variant="outline" className="border-amber-500 text-amber-600 font-bold">
              <AlertCircle className="h-3 w-3 mr-1" />
              Unsaved Changes
            </Badge>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <Button
              onClick={handleSaveAll}
              disabled={!hasUnsavedChanges}
              className="bg-swiss-signal hover:bg-swiss-signal/90 text-white font-bold uppercase tracking-wider"
            >
              <Save className="h-4 w-4 mr-2" />
              Save All
            </Button>
            
            {/* Release Feedback & Generate Packs */}
            {gradedCount > 0 && (
              <Button
                onClick={handleReleaseFeedbackPacks}
                disabled={isReleasingPacks || hasUnsavedChanges}
                className="bg-green-600 hover:bg-green-700 text-white font-bold uppercase tracking-wider"
              >
                {isReleasingPacks ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {feedbackReleased ? "Print Feedback Packs" : "Release & Print Packs"}
              </Button>
            )}
            
            {/* View Class Feedback Overview */}
            {gradedCount > 0 && feedbackReleased && (
              <Link href={`/dashboard/assignments/${assignment.id}/feedback`}>
                <Button
                  variant="outline"
                  className="border-2 border-swiss-ink font-bold uppercase tracking-wider"
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Class Feedback
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Paper Mode Instructions */}
        <div className="mt-4 p-3 bg-blue-50 border-2 border-blue-600">
          <p className="text-sm font-bold text-blue-900">
            <strong>Rapid Entry Mode:</strong> Press <kbd className="px-2 py-1 bg-white border border-blue-600 rounded text-xs">Enter</kbd> to move to next student (vertical) 
            or <kbd className="px-2 py-1 bg-white border border-blue-600 rounded text-xs">Tab</kbd> to move to next question (horizontal).
          </p>
        </div>
      </div>

      {/* No Questions Warning */}
      {questions.length === 0 && (
        <Card className="border-2 border-amber-500 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-bold text-amber-800">No Questions Found</p>
                <p className="text-sm text-amber-700">
                  This assignment has no questions attached. Add questions to enable marking.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Paper Marking Grid (High-Density) */}
      {questions.length > 0 && (
        <Card className="border-2 border-swiss-ink overflow-hidden">
          <CardHeader className="border-b-2 border-swiss-ink bg-swiss-concrete">
            <CardTitle className="font-black uppercase tracking-tight">Paper Marking Grid</CardTitle>
            <CardDescription className="font-bold text-xs uppercase tracking-wider text-swiss-lead">
              No student answers shown - marks entered from physical papers.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-swiss-ink bg-swiss-paper">
                    <th className="sticky left-0 z-10 bg-swiss-paper border-r-2 border-swiss-ink px-3 py-2 text-left">
                      <span className="text-xs font-black uppercase tracking-widest">Student</span>
                    </th>
                    {questions.map((q, index) => (
                      <th key={q.id} className="px-2 py-2 text-center min-w-[60px] border-r border-swiss-ink/20">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-xs font-black uppercase tracking-widest">
                            Q{index + 1}
                          </span>
                          <span className="text-xs text-swiss-lead font-bold">
                            /{q.marks}
                          </span>
                        </div>
                      </th>
                    ))}
                    <th className="px-3 py-2 text-center border-l-2 border-swiss-ink min-w-[70px]">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-xs font-black uppercase tracking-widest">Total</span>
                        <span className="text-xs text-swiss-lead font-bold">
                          /{maxTotalMarks}
                        </span>
                      </div>
                    </th>
                    <th className="px-3 py-2 text-center min-w-[80px]">
                      <span className="text-xs font-black uppercase tracking-widest">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, studentIndex) => (
                    <PaperStudentRow
                      key={student.id}
                      student={student}
                      studentIndex={studentIndex}
                      questions={questions}
                      state={studentStates[student.id]}
                      onScoreChange={handleScoreChange}
                      onSave={() => handleSaveStudent(student.id)}
                      maxTotalMarks={maxTotalMarks}
                      assignmentId={assignment.id}
                      totalStudents={students.length}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {students.length === 0 && (
              <div className="text-center py-12 text-swiss-lead">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-bold uppercase tracking-wider">No Students Enrolled</p>
                <p className="text-sm mt-1">Students need to join this class to appear here.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// =====================================================
// Paper Student Row Component (Optimized for Rapid Entry)
// =====================================================

interface PaperStudentRowProps {
  student: AssignmentMarkingData["students"][0]
  studentIndex: number
  questions: AssignmentMarkingData["questions"]
  state: StudentRowState
  onScoreChange: (studentId: string, questionId: string, value: string, maxMarks: number) => void
  onSave: () => void
  maxTotalMarks: number
  assignmentId: string
  totalStudents: number
}

function PaperStudentRow({
  student,
  studentIndex,
  questions,
  state,
  onScoreChange,
  onSave,
  maxTotalMarks,
  assignmentId,
  totalStudents,
}: PaperStudentRowProps) {
  const displayName = student.full_name || student.email.split("@")[0]
  const percentage = maxTotalMarks > 0 
    ? Math.round((state.totalScore / maxTotalMarks) * 100) 
    : 0

  // Check if row has any validation errors
  const hasValidationErrors = Object.keys(state.validationErrors).length > 0

  // Determine row styling based on state
  const getRowBg = () => {
    if (hasValidationErrors) return "bg-red-50/50"
    if (state.isSaved && !state.hasChanges) return "bg-green-50/30"
    if (state.hasChanges) return "bg-amber-50/30"
    return "hover:bg-swiss-concrete/30"
  }

  // Track input values separately for showing invalid entries
  const [inputValues, setInputValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    questions.forEach(q => {
      initial[q.id] = String(state.gradingData[q.id]?.score ?? 0)
    })
    return initial
  })

  // Update input values when grading data changes from external source
  useEffect(() => {
    const newValues: Record<string, string> = {}
    questions.forEach(q => {
      // Only update if there's no validation error (user hasn't typed invalid value)
      if (!state.validationErrors[q.id]) {
        newValues[q.id] = String(state.gradingData[q.id]?.score ?? 0)
      } else {
        newValues[q.id] = inputValues[q.id] // Keep the invalid value shown
      }
    })
    setInputValues(newValues)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.gradingData, questions])

  const handleInputChange = (questionId: string, value: string, maxMarks: number) => {
    setInputValues(prev => ({ ...prev, [questionId]: value }))
    onScoreChange(student.id, questionId, value, maxMarks)
  }

  // Handle keyboard navigation
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    questionIndex: number
  ) => {
    if (e.key === "Enter") {
      e.preventDefault()
      
      // Move to next student (same question) - VERTICAL marking
      const nextStudentIndex = studentIndex + 1
      if (nextStudentIndex < totalStudents) {
        const nextInput = document.querySelector(
          `input[data-student-index="${nextStudentIndex}"][data-question-index="${questionIndex}"]`
        ) as HTMLInputElement
        nextInput?.focus()
        nextInput?.select()
      } else {
        // Reached last student, save if no errors
        if (!hasValidationErrors) {
          onSave()
        }
      }
    }
    // Tab naturally moves to next question (horizontal marking) - browser default
  }

  return (
    <tr className={`border-b border-swiss-ink/20 ${getRowBg()} transition-colors`}>
      {/* Student Name - Sticky & Compact */}
      <td className="sticky left-0 z-10 border-r-2 border-swiss-ink px-3 py-1.5 bg-inherit">
        <div className="flex items-center gap-1.5">
          <div>
            <p className="font-bold text-xs">{displayName}</p>
          </div>
          {state.isSaved && !state.hasChanges && !hasValidationErrors && (
            <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
          )}
          {hasValidationErrors && (
            <AlertCircle className="h-3 w-3 text-red-600 flex-shrink-0" />
          )}
        </div>
      </td>

      {/* Question Score Inputs - Compact */}
      {questions.map((question, questionIndex) => {
        const hasError = state.validationErrors[question.id]
        const score = state.gradingData[question.id]?.score ?? 0
        
        return (
          <td key={question.id} className="px-1 py-1.5 text-center border-r border-swiss-ink/20">
            <input
              type="number"
              min={0}
              max={question.marks}
              value={inputValues[question.id] ?? score}
              onChange={(e) => handleInputChange(question.id, e.target.value, question.marks)}
              onKeyDown={(e) => handleKeyDown(e, questionIndex)}
              data-student-index={studentIndex}
              data-question-index={questionIndex}
              className={`
                w-12 h-7 text-center text-sm font-bold border-2 
                focus:outline-none focus:ring-2 transition-colors
                ${hasError 
                  ? "border-red-500 bg-red-100 text-red-800 focus:ring-red-500 focus:border-red-500" 
                  : score === question.marks 
                    ? "border-green-600 bg-green-100 text-green-800 focus:ring-green-500 focus:border-green-600"
                    : score === 0
                      ? "border-swiss-ink/30 bg-white text-swiss-lead focus:ring-blue-500 focus:border-blue-600"
                      : "border-swiss-ink bg-white focus:ring-blue-500 focus:border-blue-600"
                }
              `}
            />
          </td>
        )
      })}

      {/* Total - Compact */}
      <td className="px-2 py-1.5 text-center border-l-2 border-swiss-ink">
        <div className="flex flex-col items-center">
          <span className={`
            font-black text-base
            ${hasValidationErrors 
              ? "text-red-600"
              : percentage >= 70 
                ? "text-green-600" 
                : percentage >= 50 
                  ? "text-amber-600" 
                  : "text-swiss-ink"
            }
          `}>
            {state.totalScore}
          </span>
          <span className="text-xs text-swiss-lead font-bold">
            {percentage}%
          </span>
        </div>
      </td>

      {/* Actions - Compact */}
      <td className="px-2 py-1.5 text-center">
        <div className="flex items-center justify-center gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={onSave}
            disabled={state.isSaving || (!state.hasChanges && state.isSaved) || hasValidationErrors}
            className={`h-7 px-2 border-2 font-bold uppercase text-xs ${
              hasValidationErrors 
                ? "border-red-300 text-red-400 cursor-not-allowed" 
                : "border-swiss-ink"
            }`}
            title={hasValidationErrors ? "Fix validation errors before saving" : "Save marks"}
          >
            {state.isSaving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : state.isSaved && !state.hasChanges ? (
              <Check className="h-3 w-3 text-green-600" />
            ) : (
              <Save className="h-3 w-3" />
            )}
          </Button>
          
          {state.isSaved && (
            <>
              {student.submission_id && (
                <Link href={`/dashboard/feedback/submission/${student.submission_id}`}>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 border-2 border-swiss-ink font-bold uppercase text-xs"
                    title="View feedback sheet"
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                </Link>
              )}
              <Link href={`/revision/${student.id}/${assignmentId}`} target="_blank">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 border-2 border-swiss-ink font-bold uppercase text-xs"
                  title="Print revision worksheet"
                >
                  <Printer className="h-3 w-3" />
                </Button>
              </Link>
            </>
          )}
        </div>
      </td>
    </tr>
  )
}

// =====================================================
// Online Marking Interface (Existing Implementation)
// =====================================================

function OnlineMarkingInterface({ data }: MarkingInterfaceProps) {
  const { assignment, questions, students, maxTotalMarks } = data

  // Track feedback release state
  const [feedbackReleased, setFeedbackReleased] = useState(
    students.some(s => s.feedback_released)
  )
  const [isTogglingFeedback, setIsTogglingFeedback] = useState(false)

  // Initialize student states
  const [studentStates, setStudentStates] = useState<Record<string, StudentRowState>>(() => {
    const initial: Record<string, StudentRowState> = {}
    students.forEach(student => {
      const gradingData: GradingData = {}
      questions.forEach(q => {
        gradingData[q.id] = { 
          score: student.grading_data?.[q.id]?.score ?? 0 
        }
      })
      const totalScore = Object.values(gradingData).reduce(
        (sum, d) => sum + d.score, 
        0
      )
      initial[student.id] = {
        gradingData,
        totalScore,
        isSaving: false,
        isSaved: student.status === "graded",
        hasChanges: false,
        validationErrors: {},
      }
    })
    return initial
  })

  // Handle score change for a student's question
  const handleScoreChange = useCallback((
    studentId: string, 
    questionId: string, 
    value: string,
    maxMarks: number
  ) => {
    const numValue = value === "" ? 0 : parseInt(value, 10)
    
    // Check if value is invalid (not a number, negative, or exceeds max)
    const isInvalid = isNaN(numValue) || numValue < 0 || numValue > maxMarks
    
    // Always update the UI to show the entered value
    setStudentStates(prev => {
      const studentState = prev[studentId]
      
      // If invalid, track the error but still show the value in the input
      if (isInvalid) {
        return {
          ...prev,
          [studentId]: {
            ...studentState,
            validationErrors: {
              ...studentState.validationErrors,
              [questionId]: true,
            },
          }
        }
      }
      
      // Valid input - update grading data and clear any validation error
      const newGradingData = {
        ...studentState.gradingData,
        [questionId]: { score: numValue }
      }
      const newTotalScore = Object.values(newGradingData).reduce(
        (sum, d) => sum + d.score, 
        0
      )
      const newValidationErrors = { ...studentState.validationErrors }
      delete newValidationErrors[questionId]
      
      return {
        ...prev,
        [studentId]: {
          ...studentState,
          gradingData: newGradingData,
          totalScore: newTotalScore,
          isSaved: false,
          hasChanges: true,
          validationErrors: newValidationErrors,
        }
      }
    })
  }, [])

  // Save marks for a single student
  const handleSaveStudent = useCallback(async (studentId: string) => {
    const state = studentStates[studentId]
    if (!state || state.isSaving) return

    setStudentStates(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], isSaving: true }
    }))

    const result = await saveMarks(
      assignment.id,
      studentId,
      state.gradingData
    )

    if (result.success) {
      setStudentStates(prev => ({
        ...prev,
        [studentId]: { 
          ...prev[studentId], 
          isSaving: false, 
          isSaved: true,
          hasChanges: false,
        }
      }))
      toast.success("Marks saved")
    } else {
      setStudentStates(prev => ({
        ...prev,
        [studentId]: { ...prev[studentId], isSaving: false }
      }))
      toast.error(result.error || "Failed to save marks")
    }
  }, [studentStates, assignment.id])

  // Save all students with changes
  const handleSaveAll = useCallback(async () => {
    const studentsWithChanges = Object.entries(studentStates)
      .filter(([, state]) => state.hasChanges)
      .map(([id]) => id)

    if (studentsWithChanges.length === 0) {
      toast.info("No changes to save")
      return
    }

    // Save all in parallel
    await Promise.all(studentsWithChanges.map(id => handleSaveStudent(id)))
    toast.success(`Saved marks for ${studentsWithChanges.length} student(s)`)
  }, [studentStates, handleSaveStudent])

  // Toggle feedback release
  const handleToggleFeedback = useCallback(async () => {
    setIsTogglingFeedback(true)
    const newValue = !feedbackReleased
    
    const result = await toggleFeedbackRelease(assignment.id, newValue)
    
    if (result.success) {
      setFeedbackReleased(newValue)
      toast.success(newValue ? "Feedback released to students" : "Feedback hidden from students")
    } else {
      toast.error(result.error || "Failed to update feedback status")
    }
    
    setIsTogglingFeedback(false)
  }, [feedbackReleased, assignment.id])

  // Count statistics
  const gradedCount = Object.values(studentStates).filter(s => s.isSaved).length
  const totalStudents = students.length
  const hasUnsavedChanges = Object.values(studentStates).some(s => s.hasChanges)

  // Warn on navigation with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [hasUnsavedChanges])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b-2 border-swiss-ink pb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Link href="/dashboard/assignments">
              <Button variant="outline" size="icon" className="border-2 border-swiss-ink">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tight">
                {assignment.title}
              </h1>
              <p className="text-sm text-swiss-lead font-bold uppercase tracking-wider mt-1">
                {assignment.class_name} • {assignment.subject}
              </p>
            </div>
          </div>

          {/* Release Feedback Toggle */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 border-2 border-swiss-ink p-3 bg-swiss-paper">
              <div className="flex items-center gap-2">
                {feedbackReleased ? (
                  <Bell className="h-4 w-4 text-green-600" />
                ) : (
                  <BellOff className="h-4 w-4 text-swiss-lead" />
                )}
                <span className="text-sm font-bold uppercase tracking-wider">
                  Release Feedback
                </span>
              </div>
              <Switch
                checked={feedbackReleased}
                onCheckedChange={handleToggleFeedback}
                disabled={isTogglingFeedback}
              />
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-swiss-lead" />
            <span className="text-sm font-bold">
              {gradedCount}/{totalStudents} Graded
            </span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-swiss-lead" />
            <span className="text-sm font-bold">
              {questions.length} Questions
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">
              Max: {maxTotalMarks} marks
            </span>
          </div>
          
          {hasUnsavedChanges && (
            <Badge variant="outline" className="border-amber-500 text-amber-600 font-bold">
              <AlertCircle className="h-3 w-3 mr-1" />
              Unsaved Changes
            </Badge>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <Button
              onClick={handleSaveAll}
              disabled={!hasUnsavedChanges}
              className="bg-swiss-signal hover:bg-swiss-signal/90 text-white font-bold uppercase tracking-wider"
            >
              <Save className="h-4 w-4 mr-2" />
              Save All
            </Button>
            
            {/* Print All Revision Sheets */}
            {gradedCount > 0 && (
              <Link href={`/dashboard/assignments/${assignment.id}/feedback`}>
                <Button
                  variant="outline"
                  className="border-2 border-swiss-ink font-bold uppercase tracking-wider"
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Class Feedback
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* No Questions Warning */}
      {questions.length === 0 && (
        <Card className="border-2 border-amber-500 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-bold text-amber-800">No Questions Found</p>
                <p className="text-sm text-amber-700">
                  This assignment has no questions attached. Add questions to enable marking.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Marking Grid */}
      {questions.length > 0 && (
        <Card className="border-2 border-swiss-ink overflow-hidden">
          <CardHeader className="border-b-2 border-swiss-ink bg-swiss-concrete">
            <CardTitle className="font-black uppercase tracking-tight">Marking Grid</CardTitle>
            <CardDescription className="font-bold text-xs uppercase tracking-wider text-swiss-lead">
              Enter scores for each student. Press Tab to move between fields.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-swiss-ink bg-swiss-paper">
                    <th className="sticky left-0 z-10 bg-swiss-paper border-r-2 border-swiss-ink px-4 py-3 text-left">
                      <span className="text-xs font-black uppercase tracking-widest">Student</span>
                    </th>
                    {questions.map((q, index) => (
                      <th key={q.id} className="px-3 py-3 text-center min-w-[80px]">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs font-black uppercase tracking-widest">
                            Q{index + 1}
                          </span>
                          <span className="text-xs text-swiss-lead font-bold">
                            /{q.marks}
                          </span>
                        </div>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center border-l-2 border-swiss-ink min-w-[80px]">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs font-black uppercase tracking-widest">Total</span>
                        <span className="text-xs text-swiss-lead font-bold">
                          /{maxTotalMarks}
                        </span>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center min-w-[100px]">
                      <span className="text-xs font-black uppercase tracking-widest">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const state = studentStates[student.id]
                    return (
                      <StudentRow
                        key={student.id}
                        student={student}
                        questions={questions}
                        state={state}
                        onScoreChange={handleScoreChange}
                        onSave={() => handleSaveStudent(student.id)}
                        maxTotalMarks={maxTotalMarks}
                        assignmentId={assignment.id}
                      />
                    )
                  })}
                </tbody>
              </table>
            </div>

            {students.length === 0 && (
              <div className="text-center py-12 text-swiss-lead">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-bold uppercase tracking-wider">No Students Enrolled</p>
                <p className="text-sm mt-1">Students need to join this class to appear here.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// =====================================================
// Student Row Component (Online Mode)
// =====================================================

interface StudentRowProps {
  student: AssignmentMarkingData["students"][0]
  questions: AssignmentMarkingData["questions"]
  state: StudentRowState
  onScoreChange: (studentId: string, questionId: string, value: string, maxMarks: number) => void
  onSave: () => void
  maxTotalMarks: number
  assignmentId: string
}

function StudentRow({
  student,
  questions,
  state,
  onScoreChange,
  onSave,
  maxTotalMarks,
  assignmentId,
}: StudentRowProps) {
  const displayName = student.full_name || student.email.split("@")[0]
  const percentage = maxTotalMarks > 0 
    ? Math.round((state.totalScore / maxTotalMarks) * 100) 
    : 0

  // Check if row has any validation errors
  const hasValidationErrors = Object.keys(state.validationErrors).length > 0

  // Determine row styling based on state
  const getRowBg = () => {
    if (hasValidationErrors) return "bg-red-50/50"
    if (state.isSaved && !state.hasChanges) return "bg-green-50/50"
    if (state.hasChanges) return "bg-amber-50/50"
    return "bg-swiss-paper"
  }

  // Track input values separately for showing invalid entries
  const [inputValues, setInputValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    questions.forEach(q => {
      initial[q.id] = String(state.gradingData[q.id]?.score ?? 0)
    })
    return initial
  })

  // Update input values when grading data changes from external source
  useEffect(() => {
    const newValues: Record<string, string> = {}
    questions.forEach(q => {
      // Only update if there's no validation error (user hasn't typed invalid value)
      if (!state.validationErrors[q.id]) {
        newValues[q.id] = String(state.gradingData[q.id]?.score ?? 0)
      } else {
        newValues[q.id] = inputValues[q.id] // Keep the invalid value shown
      }
    })
    setInputValues(newValues)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.gradingData, questions])

  const handleInputChange = (questionId: string, value: string, maxMarks: number) => {
    setInputValues(prev => ({ ...prev, [questionId]: value }))
    onScoreChange(student.id, questionId, value, maxMarks)
  }

  return (
    <tr className={`border-b border-swiss-ink/20 ${getRowBg()} transition-colors`}>
      {/* Student Name - Sticky */}
      <td className="sticky left-0 z-10 border-r-2 border-swiss-ink px-4 py-3 bg-inherit">
        <div className="flex items-center gap-2">
          <div>
            <p className="font-bold text-sm">{displayName}</p>
            <p className="text-xs text-swiss-lead">{student.email}</p>
          </div>
          {state.isSaved && !state.hasChanges && !hasValidationErrors && (
            <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
          )}
          {hasValidationErrors && (
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
          )}
        </div>
      </td>

      {/* Question Score Inputs */}
      {questions.map((question) => {
        const hasError = state.validationErrors[question.id]
        const score = state.gradingData[question.id]?.score ?? 0
        
        return (
          <td key={question.id} className="px-2 py-2 text-center">
            <div className="flex flex-col items-center gap-1">
              <input
                type="number"
                min={0}
                max={question.marks}
                value={inputValues[question.id] ?? score}
                onChange={(e) => handleInputChange(question.id, e.target.value, question.marks)}
                className={`
                  w-14 h-9 text-center font-bold border-2 
                  focus:outline-none focus:ring-2 transition-colors
                  ${hasError 
                    ? "border-red-500 bg-red-100 text-red-800 focus:ring-red-500 focus:border-red-500" 
                    : score === question.marks 
                      ? "border-swiss-ink bg-green-100 text-green-800 focus:ring-swiss-signal focus:border-swiss-signal"
                      : score === 0
                        ? "border-swiss-ink bg-swiss-concrete text-swiss-lead focus:ring-swiss-signal focus:border-swiss-signal"
                        : "border-swiss-ink bg-swiss-paper focus:ring-swiss-signal focus:border-swiss-signal"
                  }
                `}
                onKeyDown={(e) => {
                  // Enter key saves the row
                  if (e.key === "Enter") {
                    e.preventDefault()
                    if (!hasValidationErrors) {
                      onSave()
                    }
                  }
                }}
              />
              {hasError && (
                <span className="text-xs text-red-600 font-bold">
                  Max: {question.marks}
                </span>
              )}
            </div>
          </td>
        )
      })}

      {/* Total */}
      <td className="px-4 py-3 text-center border-l-2 border-swiss-ink">
        <div className="flex flex-col items-center">
          <div className="flex items-baseline gap-1">
            <span className={`
              font-black text-lg
              ${hasValidationErrors 
                ? "text-red-600"
                : percentage >= 70 
                  ? "text-green-600" 
                  : percentage >= 50 
                    ? "text-amber-600" 
                    : "text-swiss-ink"
              }
            `}>
              {state.totalScore}
            </span>
            <span className="text-sm text-swiss-lead font-bold">
              / {maxTotalMarks}
            </span>
          </div>
          <span className="text-xs text-swiss-lead font-bold">
            {percentage}%
          </span>
        </div>
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onSave}
            disabled={state.isSaving || (!state.hasChanges && state.isSaved) || hasValidationErrors}
            className={`border-2 font-bold uppercase text-xs ${
              hasValidationErrors 
                ? "border-red-300 text-red-400 cursor-not-allowed" 
                : "border-swiss-ink"
            }`}
            title={hasValidationErrors ? "Fix validation errors before saving" : "Save marks"}
          >
            {state.isSaving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : state.isSaved && !state.hasChanges ? (
              <Check className="h-3 w-3 text-green-600" />
            ) : (
              <Save className="h-3 w-3" />
            )}
          </Button>
          
          {state.isSaved && (
            <>
              {student.submission_id && (
                <Link href={`/dashboard/feedback/submission/${student.submission_id}`}>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-2 border-swiss-ink font-bold uppercase text-xs"
                    title="View feedback sheet"
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                </Link>
              )}
              <Link href={`/revision/${student.id}/${assignmentId}`} target="_blank">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-2 border-swiss-ink font-bold uppercase text-xs"
                  title="Print revision worksheet"
                >
                  <Printer className="h-3 w-3" />
                </Button>
              </Link>
            </>
          )}
        </div>
      </td>
    </tr>
  )
}
