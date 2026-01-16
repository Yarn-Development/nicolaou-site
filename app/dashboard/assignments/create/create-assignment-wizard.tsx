"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Search,
  Plus,
  X,
  ChevronUp,
  ChevronDown,
  Loader2,
  Calculator,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Laptop,
  FileText,
  Calendar,
  Users,
  Download,
  Copy,
  Printer,
  ClipboardList,
  GripVertical,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { LatexPreview } from "@/components/latex-preview"
import {
  getQuestionBankQuestions,
  type Question,
  type QuestionBankFilters,
} from "@/app/actions/questions"
import { 
  createAssignmentWithQuestions, 
  type AssignmentMode,
  type Assignment 
} from "@/app/actions/assignments"
import { type Class } from "@/app/actions/classes"
import { 
  exportExamToWord, 
  exportExamWithMarkScheme,
  type ExamQuestion 
} from "@/lib/docx-exporter"
import { toast } from "sonner"

// =====================================================
// Types
// =====================================================

interface CreateAssignmentWizardProps {
  classes: Class[]
}

interface SelectedQuestion {
  id: string
  question_latex: string
  marks: number
  topic: string
  sub_topic: string | null
  difficulty: string
  calculator_allowed: boolean
  image_url?: string | null
  answer_key?: {
    answer?: string
    explanation?: string
  } | null
}

type WizardStep = "builder" | "configuration" | "success"

// =====================================================
// Main Component
// =====================================================

export function CreateAssignmentWizard({ classes }: CreateAssignmentWizardProps) {
  const router = useRouter()

  // Wizard State
  const [currentStep, setCurrentStep] = useState<WizardStep>("builder")

  // Step 1: Builder State
  const [questions, setQuestions] = useState<Question[]>([])
  const [topics, setTopics] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState<QuestionBankFilters>({
    topic: "All",
    difficulty: "All",
    calculatorAllowed: "All",
  })
  const [selectedQuestions, setSelectedQuestions] = useState<SelectedQuestion[]>([])

  // Step 2: Configuration State
  const [title, setTitle] = useState("")
  const [mode, setMode] = useState<AssignmentMode>("online")
  const [selectedClassId, setSelectedClassId] = useState("")
  const [dueDate, setDueDate] = useState("")

  // Step 3: Success State
  const [createdAssignment, setCreatedAssignment] = useState<Assignment | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  // =====================================================
  // Data Fetching
  // =====================================================

  const fetchQuestions = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getQuestionBankQuestions({
        ...filters,
        search: searchTerm,
        limit: 100,
      })

      if (result.success && result.data) {
        setQuestions(result.data.questions)
        if (result.data.topics.length > 0) {
          setTopics(result.data.topics)
        }
      }
    } catch (err) {
      console.error("Error fetching questions:", err)
    } finally {
      setLoading(false)
    }
  }, [filters, searchTerm])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchQuestions()
    }, searchTerm ? 300 : 0)
    return () => clearTimeout(timer)
  }, [fetchQuestions, searchTerm])

  // =====================================================
  // Handlers
  // =====================================================

  const addQuestion = (question: Question) => {
    if (selectedQuestions.some((q) => q.id === question.id)) return

    setSelectedQuestions((prev) => [
      ...prev,
      {
        id: question.id,
        question_latex: question.question_latex,
        marks: question.marks,
        topic: question.topic || question.topic_name || "Unknown",
        sub_topic: question.sub_topic_name || null,
        difficulty: question.difficulty,
        calculator_allowed: question.calculator_allowed,
        image_url: question.image_url,
        answer_key: question.answer_key as SelectedQuestion["answer_key"],
      },
    ])
  }

  const removeQuestion = (questionId: string) => {
    setSelectedQuestions((prev) => prev.filter((q) => q.id !== questionId))
  }

  const moveQuestion = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === selectedQuestions.length - 1)
    ) {
      return
    }

    const newIndex = direction === "up" ? index - 1 : index + 1
    const newQuestions = [...selectedQuestions]
    const [removed] = newQuestions.splice(index, 1)
    newQuestions.splice(newIndex, 0, removed)
    setSelectedQuestions(newQuestions)
  }

  const handleCreateAssignment = async () => {
    setError(null)

    // Validation
    if (!title.trim()) {
      setError("Please enter an assignment title")
      return
    }
    if (!selectedClassId) {
      setError("Please select a class")
      return
    }
    if (selectedQuestions.length === 0) {
      setError("Please add at least one question")
      return
    }

    setSubmitting(true)

    try {
      const questionIds = selectedQuestions.map((q) => q.id)
      const result = await createAssignmentWithQuestions(
        selectedClassId,
        title.trim(),
        questionIds,
        {
          dueDate: dueDate || undefined,
          status: "published", // Publish immediately
          mode: mode,
        }
      )

      if (result.success && result.data) {
        setCreatedAssignment(result.data)
        setCurrentStep("success")
        toast.success("Assignment created successfully!")
      } else {
        setError(result.error || "Failed to create assignment")
      }
    } catch (err) {
      console.error("Error creating assignment:", err)
      setError("An unexpected error occurred")
    } finally {
      setSubmitting(false)
    }
  }

  const handleExportExam = async (includeMarkScheme: boolean = false) => {
    if (selectedQuestions.length === 0) return

    setIsExporting(true)
    try {
      const exportQuestions: ExamQuestion[] = selectedQuestions.map((q) => ({
        id: q.id,
        content_type: "generated_text" as const,
        question_latex: q.question_latex,
        image_url: q.image_url || null,
        topic: q.topic,
        topic_name: q.topic,
        sub_topic_name: q.sub_topic,
        difficulty: q.difficulty as "Foundation" | "Higher",
        marks: q.marks,
        calculator_allowed: q.calculator_allowed,
        answer_key: q.answer_key ? {
          answer: q.answer_key.answer || "",
          explanation: q.answer_key.explanation || "",
        } : undefined,
      }))

      if (includeMarkScheme) {
        await exportExamWithMarkScheme(exportQuestions, title || "Exam")
      } else {
        await exportExamToWord(exportQuestions, title || "Exam", {
          includeMarkScheme: false,
          includeAnswers: false,
        })
      }
      toast.success("Exam paper exported!")
    } catch (err) {
      console.error("Export error:", err)
      toast.error("Failed to export document")
    } finally {
      setIsExporting(false)
    }
  }

  const handleCopyLink = async () => {
    if (!createdAssignment) return

    const url = `${window.location.origin}/student-dashboard/assignments/${createdAssignment.id}/take`
    await navigator.clipboard.writeText(url)
    setLinkCopied(true)
    toast.success("Link copied to clipboard!")
    setTimeout(() => setLinkCopied(false), 3000)
  }

  // =====================================================
  // Computed Values
  // =====================================================

  const totalMarks = useMemo(
    () => selectedQuestions.reduce((sum, q) => sum + q.marks, 0),
    [selectedQuestions]
  )

  const selectedIds = useMemo(
    () => new Set(selectedQuestions.map((q) => q.id)),
    [selectedQuestions]
  )

  const selectedClass = classes.find((c) => c.id === selectedClassId)

  // =====================================================
  // Render Steps
  // =====================================================

  // Step 1: Builder
  if (currentStep === "builder") {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {/* Header */}
        <div className="border-b-2 border-swiss-ink bg-swiss-concrete px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/assignments">
                <Button variant="outline" size="icon" className="border-2 border-swiss-ink">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-swiss-lead">
                  Step 1 of 3
                </p>
                <h1 className="text-2xl font-black uppercase tracking-tight">
                  Select Questions
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs font-black uppercase tracking-widest text-swiss-lead">
                  Selected
                </p>
                <p className="text-lg font-black">
                  {selectedQuestions.length} questions / {totalMarks} marks
                </p>
              </div>
              <Button
                onClick={() => setCurrentStep("configuration")}
                disabled={selectedQuestions.length === 0}
                className="bg-swiss-signal hover:bg-swiss-ink text-white font-bold uppercase tracking-wider"
              >
                Next: Details
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>

        {/* Split Screen Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Question Bank */}
          <div className="w-1/2 border-r-2 border-swiss-ink flex flex-col bg-swiss-paper">
            {/* Search & Filters */}
            <div className="p-4 border-b-2 border-swiss-ink/20 space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="font-black uppercase tracking-wider">Question Bank</h2>
                <Badge variant="outline" className="ml-auto border-2 border-swiss-ink font-bold">
                  {questions.length} available
                </Badge>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-swiss-lead" />
                <Input
                  placeholder="Search questions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-2 border-swiss-ink"
                />
              </div>

              {/* Filters */}
              <div className="flex gap-2 flex-wrap">
                <select
                  value={filters.topic || "All"}
                  onChange={(e) => setFilters((prev) => ({ ...prev, topic: e.target.value }))}
                  className="px-3 py-1.5 text-sm border-2 border-swiss-ink bg-swiss-paper font-bold"
                >
                  <option value="All">All Topics</option>
                  {topics.map((topic) => (
                    <option key={topic} value={topic}>{topic}</option>
                  ))}
                </select>

                <select
                  value={filters.difficulty || "All"}
                  onChange={(e) => setFilters((prev) => ({
                    ...prev,
                    difficulty: e.target.value as "All" | "Foundation" | "Higher",
                  }))}
                  className="px-3 py-1.5 text-sm border-2 border-swiss-ink bg-swiss-paper font-bold"
                >
                  <option value="All">All Tiers</option>
                  <option value="Foundation">Foundation</option>
                  <option value="Higher">Higher</option>
                </select>

                <select
                  value={
                    filters.calculatorAllowed === "All"
                      ? "All"
                      : filters.calculatorAllowed ? "yes" : "no"
                  }
                  onChange={(e) => {
                    const val = e.target.value
                    setFilters((prev) => ({
                      ...prev,
                      calculatorAllowed: val === "All" ? "All" : val === "yes",
                    }))
                  }}
                  className="px-3 py-1.5 text-sm border-2 border-swiss-ink bg-swiss-paper font-bold"
                >
                  <option value="All">Calculator: Any</option>
                  <option value="yes">Calculator: Yes</option>
                  <option value="no">Calculator: No</option>
                </select>
              </div>
            </div>

            {/* Question List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-swiss-signal" />
                </div>
              ) : questions.length === 0 ? (
                <div className="text-center py-12 text-swiss-lead">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-40" />
                  <p className="font-bold uppercase tracking-wider">No questions found</p>
                  <p className="text-sm mt-1">Try adjusting your filters</p>
                </div>
              ) : (
                questions.map((question) => {
                  const isSelected = selectedIds.has(question.id)
                  return (
                    <div
                      key={question.id}
                      className={`border-2 p-4 transition-all ${
                        isSelected
                          ? "border-swiss-signal bg-swiss-signal/5"
                          : "border-swiss-ink hover:border-swiss-lead"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {/* Meta badges */}
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Badge variant="outline" className="text-xs border-swiss-ink font-bold">
                              {question.topic_name || question.topic || "General"}
                            </Badge>
                            <Badge
                              className={`text-xs font-bold ${
                                question.difficulty === "Higher"
                                  ? "bg-swiss-signal text-white"
                                  : "bg-swiss-concrete text-swiss-ink"
                              }`}
                            >
                              {question.difficulty}
                            </Badge>
                            <Badge variant="outline" className="text-xs border-swiss-ink font-bold">
                              {question.marks} marks
                            </Badge>
                            {question.calculator_allowed && (
                              <Calculator className="w-3.5 h-3.5 text-swiss-lead" />
                            )}
                          </div>

                          {/* Question preview */}
                          <div className="text-sm line-clamp-3 overflow-hidden">
                            <LatexPreview
                              latex={question.question_latex || ""}
                              className="text-sm"
                            />
                          </div>
                        </div>

                        {/* Add button */}
                        <Button
                          size="sm"
                          onClick={() => addQuestion(question)}
                          disabled={isSelected}
                          className={`shrink-0 font-bold uppercase text-xs ${
                            isSelected
                              ? "bg-swiss-ink/20 text-swiss-ink border-2 border-swiss-ink/40"
                              : "bg-swiss-signal text-white hover:bg-swiss-ink"
                          }`}
                        >
                          {isSelected ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <>
                              <Plus className="w-4 h-4 mr-1" />
                              Add
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Right Panel - Selected Questions */}
          <div className="w-1/2 flex flex-col bg-swiss-concrete">
            {/* Header */}
            <div className="px-4 py-3 border-b-2 border-swiss-ink/20 flex items-center justify-between bg-swiss-paper">
              <div>
                <h3 className="font-black uppercase tracking-wider">Current Selection</h3>
                <p className="text-sm text-swiss-lead font-bold">
                  Drag to reorder questions
                </p>
              </div>
              {selectedQuestions.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedQuestions([])}
                  className="border-2 border-swiss-ink font-bold uppercase text-xs"
                >
                  Clear All
                </Button>
              )}
            </div>

            {/* Selected Questions List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {selectedQuestions.length === 0 ? (
                <div className="h-full flex items-center justify-center text-swiss-lead">
                  <div className="text-center">
                    <Plus className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p className="font-bold uppercase tracking-wider">No questions selected</p>
                    <p className="text-sm mt-1">Add questions from the bank on the left</p>
                  </div>
                </div>
              ) : (
                selectedQuestions.map((question, index) => (
                  <div
                    key={question.id}
                    className="border-2 border-swiss-ink bg-swiss-paper p-3 flex items-center gap-3"
                  >
                    {/* Drag handle */}
                    <div className="text-swiss-lead cursor-grab">
                      <GripVertical className="w-4 h-4" />
                    </div>

                    {/* Order number */}
                    <div className="w-8 h-8 flex items-center justify-center bg-swiss-ink text-white font-black text-sm shrink-0">
                      {index + 1}
                    </div>

                    {/* Question info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs border-swiss-ink font-bold">
                          {question.topic}
                        </Badge>
                        <Badge variant="outline" className="text-xs border-swiss-ink font-bold">
                          {question.marks} marks
                        </Badge>
                      </div>
                      <div className="text-sm line-clamp-2 overflow-hidden">
                        <LatexPreview latex={question.question_latex} className="text-sm" />
                      </div>
                    </div>

                    {/* Reorder buttons */}
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => moveQuestion(index, "up")}
                        disabled={index === 0}
                      >
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => moveQuestion(index, "down")}
                        disabled={index === selectedQuestions.length - 1}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Remove button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
                      onClick={() => removeQuestion(question.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            {/* Summary Footer */}
            {selectedQuestions.length > 0 && (
              <div className="p-4 border-t-2 border-swiss-ink bg-swiss-paper">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-swiss-lead">
                      Total
                    </p>
                    <p className="text-2xl font-black">
                      {selectedQuestions.length} Q / {totalMarks} Marks
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Step 2: Configuration
  if (currentStep === "configuration") {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {/* Header */}
        <div className="border-b-2 border-swiss-ink bg-swiss-concrete px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentStep("builder")}
                className="border-2 border-swiss-ink"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-swiss-lead">
                  Step 2 of 3
                </p>
                <h1 className="text-2xl font-black uppercase tracking-tight">
                  Assignment Details
                </h1>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-black uppercase tracking-widest text-swiss-lead">
                Selected
              </p>
              <p className="text-lg font-black">
                {selectedQuestions.length} questions / {totalMarks} marks
              </p>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto p-8 space-y-8">
            {/* Title */}
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-swiss-lead mb-2">
                Assignment Title *
              </label>
              <Input
                placeholder="e.g. Week 5 - Algebra Practice"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border-2 border-swiss-ink text-lg font-bold"
              />
            </div>

            {/* Mode Selection */}
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-swiss-lead mb-3">
                Assignment Mode *
              </label>
              <div className="grid grid-cols-2 gap-4">
                {/* Online Mode Card */}
                <button
                  onClick={() => setMode("online")}
                  className={`border-2 p-6 text-left transition-all ${
                    mode === "online"
                      ? "border-swiss-signal bg-swiss-signal/5"
                      : "border-swiss-ink hover:border-swiss-lead"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 ${mode === "online" ? "bg-swiss-signal text-white" : "bg-swiss-concrete"}`}>
                      <Laptop className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-black uppercase tracking-wider mb-1">Online</h3>
                      <p className="text-sm text-swiss-lead">
                        Students take this on their device. Auto-save and instant submission.
                      </p>
                    </div>
                  </div>
                  {mode === "online" && (
                    <div className="mt-4 flex items-center gap-2 text-swiss-signal">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Selected</span>
                    </div>
                  )}
                </button>

                {/* Paper Mode Card */}
                <button
                  onClick={() => setMode("paper")}
                  className={`border-2 p-6 text-left transition-all ${
                    mode === "paper"
                      ? "border-swiss-signal bg-swiss-signal/5"
                      : "border-swiss-ink hover:border-swiss-lead"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 ${mode === "paper" ? "bg-swiss-signal text-white" : "bg-swiss-concrete"}`}>
                      <Printer className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-black uppercase tracking-wider mb-1">Paper</h3>
                      <p className="text-sm text-swiss-lead">
                        Print a paper exam. Mark manually and enter scores digitally.
                      </p>
                    </div>
                  </div>
                  {mode === "paper" && (
                    <div className="mt-4 flex items-center gap-2 text-swiss-signal">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Selected</span>
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* Class Selection */}
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-swiss-lead mb-2">
                <Users className="w-4 h-4 inline mr-2" />
                Assign to Class *
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full px-4 py-3 text-base border-2 border-swiss-ink bg-swiss-paper font-bold"
              >
                <option value="">Select a class...</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.subject})
                  </option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-swiss-lead mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Due Date (Optional)
              </label>
              <Input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="border-2 border-swiss-ink"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border-2 border-red-500 text-red-700 font-bold">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-swiss-ink bg-swiss-paper px-6 py-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentStep("builder")}
              className="border-2 border-swiss-ink font-bold uppercase tracking-wider"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={handleCreateAssignment}
              disabled={submitting || !title.trim() || !selectedClassId}
              className="bg-swiss-signal hover:bg-swiss-ink text-white font-bold uppercase tracking-wider"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Create Assignment
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Step 3: Success
  if (currentStep === "success" && createdAssignment) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center bg-swiss-concrete">
        <div className="max-w-xl w-full mx-4">
          <Card className="border-2 border-swiss-ink">
            <CardContent className="p-8">
              {/* Success Icon */}
              <div className="w-20 h-20 mx-auto mb-6 bg-green-100 border-2 border-green-500 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>

              {/* Title */}
              <h1 className="text-2xl font-black uppercase tracking-wider text-center mb-2">
                {mode === "paper" ? "Paper Exam Created!" : "Assignment Published!"}
              </h1>
              <p className="text-center text-swiss-lead font-bold mb-8">
                {createdAssignment.title}
              </p>

              {/* Details */}
              <div className="border-2 border-swiss-ink bg-swiss-paper p-4 mb-6 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-bold text-swiss-lead uppercase">Class</span>
                  <span className="font-bold">{selectedClass?.name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-bold text-swiss-lead uppercase">Mode</span>
                  <Badge className={mode === "paper" ? "bg-blue-600" : "bg-green-600"}>
                    {mode === "paper" ? "Paper Exam" : "Online"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-bold text-swiss-lead uppercase">Questions</span>
                  <span className="font-bold">{selectedQuestions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-bold text-swiss-lead uppercase">Total Marks</span>
                  <span className="font-bold">{totalMarks}</span>
                </div>
                {dueDate && (
                  <div className="flex justify-between">
                    <span className="text-sm font-bold text-swiss-lead uppercase">Due Date</span>
                    <span className="font-bold">
                      {new Date(dueDate).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )}
              </div>

              {/* Mode-Specific Actions */}
              {mode === "paper" ? (
                <div className="space-y-3">
                  <Button
                    onClick={() => handleExportExam(false)}
                    disabled={isExporting}
                    className="w-full bg-swiss-signal hover:bg-swiss-ink text-white font-bold uppercase tracking-wider py-6 text-lg"
                  >
                    {isExporting ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-5 h-5 mr-2" />
                    )}
                    Download Exam Paper
                  </Button>
                  <Button
                    onClick={() => handleExportExam(true)}
                    disabled={isExporting}
                    variant="outline"
                    className="w-full border-2 border-swiss-ink font-bold uppercase tracking-wider"
                  >
                    <ClipboardList className="w-4 h-4 mr-2" />
                    Download with Mark Scheme
                  </Button>
                  <Link href={`/dashboard/assignments/${createdAssignment.id}/mark`} className="block">
                    <Button
                      variant="outline"
                      className="w-full border-2 border-swiss-ink font-bold uppercase tracking-wider"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Go to Marking Grid
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <Button
                    onClick={handleCopyLink}
                    className="w-full bg-swiss-signal hover:bg-swiss-ink text-white font-bold uppercase tracking-wider py-6 text-lg"
                  >
                    {linkCopied ? (
                      <>
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Link Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5 mr-2" />
                        Copy Student Link
                      </>
                    )}
                  </Button>
                  <p className="text-center text-sm text-swiss-lead font-bold">
                    Share this link with your students to start the assignment
                  </p>
                </div>
              )}

              {/* Back to Dashboard */}
              <div className="mt-8 pt-6 border-t-2 border-swiss-ink/20 text-center">
                <Link href="/dashboard/assignments">
                  <Button variant="ghost" className="font-bold uppercase tracking-wider">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Assignments
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return null
}
