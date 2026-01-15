"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { LatexPreview } from "@/components/latex-preview"
import {
  getQuestionBankQuestions,
  type Question,
  type QuestionBankFilters,
} from "@/app/actions/questions"
import { createAssignmentWithQuestions } from "@/app/actions/assignments"
import { type Class } from "@/app/actions/classes"
import Link from "next/link"

// =====================================================
// Types
// =====================================================

interface SelectedQuestion {
  id: string
  question_latex: string
  marks: number
  topic: string
  sub_topic: string | null
  difficulty: string
  calculator_allowed: boolean
}

interface QuestionSelectorProps {
  classes: Class[]
}

// =====================================================
// Main Component
// =====================================================

export function QuestionSelector({ classes }: QuestionSelectorProps) {
  const router = useRouter()

  // Question Bank State
  const [questions, setQuestions] = useState<Question[]>([])
  const [topics, setTopics] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState<QuestionBankFilters>({
    topic: "All",
    difficulty: "All",
    calculatorAllowed: "All",
  })

  // Selected Questions State
  const [selectedQuestions, setSelectedQuestions] = useState<SelectedQuestion[]>([])

  // Form State
  const [title, setTitle] = useState("")
  const [selectedClassId, setSelectedClassId] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

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
    fetchQuestions()
  }, [fetchQuestions])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchQuestions()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm, fetchQuestions])

  // =====================================================
  // Handlers
  // =====================================================

  const addQuestion = (question: Question) => {
    if (selectedQuestions.some((q) => q.id === question.id)) {
      return // Already added
    }

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

  const handleSubmit = async () => {
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
          status: "draft",
        }
      )

      if (result.success) {
        setSuccess(true)
        setTimeout(() => {
          router.push("/dashboard")
        }, 1500)
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

  // =====================================================
  // Render
  // =====================================================

  if (success) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center swiss-animate-in">
          <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="swiss-heading-md mb-2">Assignment Created!</h2>
          <p className="text-muted-foreground">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex">
      {/* Left Panel - Question Bank */}
      <div className="w-1/2 border-r border-border flex flex-col h-full">
        <div className="p-4 border-b border-border space-y-4">
          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            </Link>
            <h2 className="font-bold text-lg">Question Bank</h2>
            <Badge variant="outline" className="ml-auto">
              {questions.length} questions
            </Badge>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search questions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            {/* Level Filter */}
            <select
              value={filters.topic || "All"}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, topic: e.target.value }))
              }
              className="px-3 py-1.5 text-sm border border-border bg-background"
            >
              <option value="All">All Topics</option>
              {topics.map((topic) => (
                <option key={topic} value={topic}>
                  {topic}
                </option>
              ))}
            </select>

            {/* Difficulty Filter */}
            <select
              value={filters.difficulty || "All"}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  difficulty: e.target.value as "All" | "Foundation" | "Higher",
                }))
              }
              className="px-3 py-1.5 text-sm border border-border bg-background"
            >
              <option value="All">All Tiers</option>
              <option value="Foundation">Foundation</option>
              <option value="Higher">Higher</option>
            </select>

            {/* Calculator Filter */}
            <select
              value={
                filters.calculatorAllowed === "All"
                  ? "All"
                  : filters.calculatorAllowed
                  ? "yes"
                  : "no"
              }
              onChange={(e) => {
                const val = e.target.value
                setFilters((prev) => ({
                  ...prev,
                  calculatorAllowed:
                    val === "All" ? "All" : val === "yes" ? true : false,
                }))
              }}
              className="px-3 py-1.5 text-sm border border-border bg-background"
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
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No questions found</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            questions.map((question) => {
              const isSelected = selectedIds.has(question.id)
              return (
                <div
                  key={question.id}
                  className={`swiss-card p-4 transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "hover:border-muted-foreground"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Meta badges */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {question.topic_name || question.topic || "General"}
                        </Badge>
                        <Badge
                          variant={
                            question.difficulty === "Higher"
                              ? "default"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {question.difficulty}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {question.marks} marks
                        </Badge>
                        {question.calculator_allowed && (
                          <Calculator className="w-3.5 h-3.5 text-muted-foreground" />
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
                      variant={isSelected ? "secondary" : "default"}
                      onClick={() => addQuestion(question)}
                      disabled={isSelected}
                      className="shrink-0"
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

      {/* Right Panel - Selected Questions & Form */}
      <div className="w-1/2 flex flex-col h-full bg-card">
        {/* Assignment Form */}
        <div className="p-4 border-b border-border space-y-4">
          <h2 className="font-bold text-lg">Assignment Details</h2>

          {/* Title */}
          <div>
            <label className="swiss-label text-xs block mb-1">
              Assignment Title *
            </label>
            <Input
              placeholder="e.g. Week 5 - Algebra Practice"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Class & Due Date Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="swiss-label text-xs block mb-1">Class *</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border bg-background"
              >
                <option value="">Select a class...</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="swiss-label text-xs block mb-1">
                Due Date (optional)
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive text-destructive text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Selected Questions Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Selected Questions</h3>
            <p className="text-sm text-muted-foreground">
              {selectedQuestions.length} question
              {selectedQuestions.length !== 1 ? "s" : ""} selected
            </p>
          </div>
          <div className="text-right">
            <span className="swiss-label text-xs block">Total Marks</span>
            <span className="text-2xl font-bold">{totalMarks}</span>
          </div>
        </div>

        {/* Selected Questions List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {selectedQuestions.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Plus className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No questions selected</p>
                <p className="text-sm mt-1">
                  Add questions from the bank on the left
                </p>
              </div>
            </div>
          ) : (
            selectedQuestions.map((question, index) => (
              <div
                key={question.id}
                className="swiss-card p-3 flex items-center gap-3"
              >
                {/* Order number */}
                <div className="w-8 h-8 flex items-center justify-center bg-muted font-bold text-sm shrink-0">
                  {index + 1}
                </div>

                {/* Question info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {question.topic}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {question.marks} marks
                    </Badge>
                  </div>
                  <div className="text-sm line-clamp-2 overflow-hidden">
                    <LatexPreview
                      latex={question.question_latex}
                      className="text-sm"
                    />
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
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive shrink-0"
                  onClick={() => removeQuestion(question.id)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Submit Button */}
        <div className="p-4 border-t border-border">
          <Button
            className="w-full swiss-btn-primary"
            onClick={handleSubmit}
            disabled={submitting || selectedQuestions.length === 0}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Assignment...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Create Assignment ({selectedQuestions.length} questions,{" "}
                {totalMarks} marks)
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
