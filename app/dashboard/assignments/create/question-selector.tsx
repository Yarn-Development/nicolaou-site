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
  CheckCircle2,
  Circle,
  Filter,
  Eye,
  ImageIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { LatexPreview } from "@/components/latex-preview"
import { QuestionDisplayCompact, QuestionDisplay, SourceBadge } from "@/components/question-display"
import type { Question as DatabaseQuestion } from "@/lib/types/database"
import {
  getQuestionBankQuestions,
  type Question,
  type QuestionBankFilters,
  type QuestionContentType,
} from "@/app/actions/questions"
import { createAssignmentWithQuestions, type AssignmentMode } from "@/app/actions/assignments"
import { type Class } from "@/app/actions/classes"

// Helper to convert action Question to database Question for display components
function toDisplayQuestion(q: Question): DatabaseQuestion {
  return {
    ...q,
    question_latex: q.question_latex ?? null,
    image_url: q.image_url ?? null,
    topic: q.topic ?? q.topic_name ?? "Unknown",
    meta_tags: q.meta_tags ?? [],
    answer_key: q.answer_key ?? null,
    curriculum_level: q.curriculum_level ?? null,
    topic_name: q.topic_name ?? null,
    sub_topic_name: q.sub_topic_name ?? null,
    question_type: q.question_type ?? null,
    marks: q.marks ?? null,
    calculator_allowed: q.calculator_allowed ?? null,
    times_used: q.times_used ?? 0,
    avg_score: q.avg_score ?? null,
    verification_notes: q.verification_notes ?? null,
  } as DatabaseQuestion
}

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
  image_url?: string | null
  content_type?: string
}

interface QuestionSelectorProps {
  classes: Class[]
  mode: AssignmentMode
}

// =====================================================
// Topics List
// =====================================================

const TOPICS = [
  'All Topics',
  'Algebra',
  'Geometry',
  'Statistics',
  'Number',
  'Ratio & Proportion',
  'Probability',
  'Trigonometry',
  'Mensuration',
  'Graphs',
  'Transformations'
]

// =====================================================
// Main Component
// =====================================================

export function QuestionSelector({ classes, mode }: QuestionSelectorProps) {
  const router = useRouter()

  // Question Bank State
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState<QuestionBankFilters>({
    topic: "All",
    difficulty: "All",
    calculatorAllowed: "All",
    isVerified: "All",
    source: "All",
    hasDiagram: false,
  })

  // Selected Questions State
  const [selectedQuestions, setSelectedQuestions] = useState<SelectedQuestion[]>([])

  // Preview Modal State
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null)

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
        image_url: question.image_url,
        content_type: question.content_type,
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
          mode: mode,
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
          <CheckCircle className="w-16 h-16 text-swiss-signal mx-auto mb-4" />
          <h2 className="text-2xl font-black uppercase tracking-wider mb-2">Assignment Created!</h2>
          <p className="text-swiss-lead">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex">
      {/* Left Panel - Question Bank */}
      <div className="w-3/5 border-r-2 border-swiss-ink flex flex-col h-full bg-swiss-paper">
        {/* Filters Header */}
        <div className="p-4 border-b-2 border-swiss-ink bg-swiss-concrete">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5" />
            <h2 className="font-black uppercase tracking-wider">Question Bank</h2>
            <Badge variant="outline" className="ml-auto border-2 border-swiss-ink font-bold">
              {questions.length} questions
            </Badge>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-swiss-lead" />
            <Input
              placeholder="Search questions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-2 border-swiss-ink"
            />
          </div>

          {/* Filters Row 1 */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            {/* Topic Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-swiss-lead">
                Topic
              </label>
              <Select
                value={filters.topic || "All"}
                onValueChange={(v) => setFilters((prev) => ({ ...prev, topic: v }))}
              >
                <SelectTrigger className="border-2 border-swiss-ink h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TOPICS.map((topic) => (
                    <SelectItem key={topic} value={topic === "All Topics" ? "All" : topic}>
                      {topic}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Difficulty Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-swiss-lead">
                Tier
              </label>
              <Select
                value={filters.difficulty as string}
                onValueChange={(v) =>
                  setFilters((prev) => ({
                    ...prev,
                    difficulty: v as "All" | "Foundation" | "Higher",
                  }))
                }
              >
                <SelectTrigger className="border-2 border-swiss-ink h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Tiers</SelectItem>
                  <SelectItem value="Foundation">Foundation</SelectItem>
                  <SelectItem value="Higher">Higher</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Source Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-swiss-lead">
                Source
              </label>
              <Select
                value={filters.source as string}
                onValueChange={(v) =>
                  setFilters((prev) => ({
                    ...prev,
                    source: v as "All" | QuestionContentType,
                  }))
                }
              >
                <SelectTrigger className="border-2 border-swiss-ink h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Sources</SelectItem>
                  <SelectItem value="official_past_paper">Past Papers</SelectItem>
                  <SelectItem value="generated_text">AI (Text)</SelectItem>
                  <SelectItem value="synthetic_image">AI (Diagrams)</SelectItem>
                  <SelectItem value="image_ocr">Image OCR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filters Row 2 */}
          <div className="grid grid-cols-3 gap-3">
            {/* Calculator Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-swiss-lead">
                Calculator
              </label>
              <Select
                value={
                  filters.calculatorAllowed === "All"
                    ? "All"
                    : filters.calculatorAllowed
                    ? "yes"
                    : "no"
                }
                onValueChange={(v) => {
                  setFilters((prev) => ({
                    ...prev,
                    calculatorAllowed:
                      v === "All" ? "All" : v === "yes" ? true : false,
                  }))
                }}
              >
                <SelectTrigger className="border-2 border-swiss-ink h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">Any</SelectItem>
                  <SelectItem value="yes">Allowed</SelectItem>
                  <SelectItem value="no">Not Allowed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Verified Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-swiss-lead">
                Status
              </label>
              <Select
                value={
                  filters.isVerified === "All"
                    ? "All"
                    : filters.isVerified
                    ? "verified"
                    : "unverified"
                }
                onValueChange={(v) => {
                  setFilters((prev) => ({
                    ...prev,
                    isVerified:
                      v === "All" ? "All" : v === "verified" ? true : false,
                  }))
                }}
              >
                <SelectTrigger className="border-2 border-swiss-ink h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Questions</SelectItem>
                  <SelectItem value="verified">Verified Only</SelectItem>
                  <SelectItem value="unverified">Unverified Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Has Diagram Toggle */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-swiss-lead">
                Diagrams
              </label>
              <label className="flex items-center gap-2 h-9 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={filters.hasDiagram || false}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, hasDiagram: e.target.checked }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-swiss-concrete border-2 border-swiss-ink rounded-full peer-checked:bg-swiss-signal transition-colors"></div>
                  <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white border border-swiss-ink rounded-full transition-transform peer-checked:translate-x-4"></div>
                </div>
                <div className="flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-swiss-lead" />
                  <span className="text-xs font-bold uppercase tracking-wider text-swiss-lead">
                    Has Diagram
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Questions Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-swiss-signal" />
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-swiss-lead font-bold uppercase tracking-wider">
                No questions found
              </p>
              <p className="text-sm text-swiss-lead mt-1">
                Try adjusting your filters
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b-2 border-swiss-ink bg-swiss-concrete/50">
                  <TableHead className="font-black uppercase text-swiss-ink text-xs">Question</TableHead>
                  <TableHead className="font-black uppercase text-swiss-ink text-xs">Topic</TableHead>
                  <TableHead className="font-black uppercase text-swiss-ink text-xs">Tier</TableHead>
                  <TableHead className="font-black uppercase text-swiss-ink text-xs">Source</TableHead>
                  <TableHead className="font-black uppercase text-swiss-ink text-xs">Status</TableHead>
                  <TableHead className="font-black uppercase text-swiss-ink text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions.map((question) => {
                  const isSelected = selectedIds.has(question.id)
                  return (
                    <TableRow
                      key={question.id}
                      className={`border-b border-swiss-concrete hover:bg-swiss-paper/50 ${
                        isSelected ? "bg-swiss-signal/10" : ""
                      }`}
                    >
                      <TableCell className="max-w-xs">
                        <QuestionDisplayCompact question={toDisplayQuestion(question)} />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-2 border-swiss-ink text-xs">
                          {question.topic_name || question.topic}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            question.difficulty === "Higher"
                              ? "border-2 border-swiss-signal text-swiss-signal"
                              : "border-2 border-swiss-ink"
                          }`}
                        >
                          {question.difficulty}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <SourceBadge contentType={question.content_type} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider">
                          {question.is_verified ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-swiss-signal" />
                              <span className="text-swiss-signal">Verified</span>
                            </>
                          ) : (
                            <>
                              <Circle className="w-3.5 h-3.5 text-swiss-lead" />
                              <span className="text-swiss-lead">Unverified</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPreviewQuestion(question)}
                            className="border-2 border-swiss-ink h-8 w-8 p-0"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant={isSelected ? "secondary" : "default"}
                            onClick={() => addQuestion(question)}
                            disabled={isSelected}
                            className={`h-8 ${
                              isSelected
                                ? "bg-swiss-signal/20 text-swiss-signal"
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
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Right Panel - Selected Questions & Form */}
      <div className="w-2/5 flex flex-col h-full bg-white">
        {/* Assignment Form */}
        <div className="p-4 border-b-2 border-swiss-ink bg-swiss-concrete">
          <h2 className="font-black uppercase tracking-wider mb-4">Assignment Details</h2>

          {/* Title */}
          <div className="mb-4">
            <label className="text-[10px] font-bold uppercase tracking-widest text-swiss-lead block mb-1">
              Assignment Title *
            </label>
            <Input
              placeholder="e.g. Week 5 - Algebra Practice"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border-2 border-swiss-ink"
            />
          </div>

          {/* Class & Due Date Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-swiss-lead block mb-1">
                Class *
              </label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger className="border-2 border-swiss-ink">
                  <SelectValue placeholder="Select a class..." />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-swiss-lead block mb-1">
                Due Date (optional)
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="border-2 border-swiss-ink"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border-2 border-swiss-signal text-swiss-signal text-sm font-bold">
              {error}
            </div>
          )}
        </div>

        {/* Selected Questions Header */}
        <div className="px-4 py-3 border-b-2 border-swiss-ink flex items-center justify-between bg-swiss-paper">
          <div>
            <h3 className="font-black uppercase tracking-wider">Selected Questions</h3>
            <p className="text-xs text-swiss-lead font-bold uppercase tracking-wider">
              {selectedQuestions.length} question
              {selectedQuestions.length !== 1 ? "s" : ""} selected
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-widest text-swiss-lead block">
              Total Marks
            </span>
            <span className="text-3xl font-black">{totalMarks}</span>
          </div>
        </div>

        {/* Selected Questions List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {selectedQuestions.length === 0 ? (
            <div className="h-full flex items-center justify-center text-swiss-lead">
              <div className="text-center">
                <Plus className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="font-bold uppercase tracking-wider">No questions selected</p>
                <p className="text-sm mt-1">
                  Add questions from the bank on the left
                </p>
              </div>
            </div>
          ) : (
            selectedQuestions.map((question, index) => (
              <div
                key={question.id}
                className="border-2 border-swiss-ink bg-white p-3 flex items-center gap-3"
              >
                {/* Order number */}
                <div className="w-8 h-8 flex items-center justify-center bg-swiss-ink text-white font-black text-sm shrink-0">
                  {index + 1}
                </div>

                {/* Question info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="outline" className="text-xs border-swiss-ink">
                      {question.topic}
                    </Badge>
                    <Badge variant="outline" className="text-xs border-swiss-ink">
                      {question.marks} marks
                    </Badge>
                    {question.calculator_allowed && (
                      <Calculator className="w-3.5 h-3.5 text-swiss-lead" />
                    )}
                  </div>
                  <div className="text-sm line-clamp-2 overflow-hidden">
                    <LatexPreview
                      latex={question.question_latex}
                      className="text-sm"
                      showSkeleton={false}
                    />
                  </div>
                </div>

                {/* Reorder buttons */}
                <div className="flex flex-col gap-0.5 shrink-0">
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
                  className="h-8 w-8 p-0 text-swiss-signal hover:text-white hover:bg-swiss-signal shrink-0"
                  onClick={() => removeQuestion(question.id)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Submit Button */}
        <div className="p-4 border-t-2 border-swiss-ink bg-swiss-concrete">
          <Button
            className="w-full bg-swiss-signal hover:bg-swiss-ink text-white font-bold uppercase tracking-wider h-12"
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
                Create Assignment ({selectedQuestions.length} questions, {totalMarks} marks)
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Question Preview Modal */}
      {previewQuestion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="border-4 border-swiss-ink max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader className="border-b-2 border-swiss-ink">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl font-black uppercase tracking-wider text-swiss-ink">
                    Question Preview
                  </CardTitle>
                  <CardDescription className="flex gap-2 mt-2 flex-wrap">
                    <Badge variant="outline" className="border-2 border-swiss-ink">
                      {previewQuestion.topic_name || previewQuestion.topic}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        previewQuestion.difficulty === "Higher"
                          ? "border-2 border-swiss-signal text-swiss-signal"
                          : "border-2 border-swiss-ink"
                      }
                    >
                      {previewQuestion.difficulty}
                    </Badge>
                    <Badge variant="outline" className="border-2 border-swiss-ink">
                      {previewQuestion.marks} marks
                    </Badge>
                    {previewQuestion.is_verified && (
                      <Badge className="bg-swiss-signal text-white border-0">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewQuestion(null)}
                  className="border-2 border-swiss-ink"
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Question Display */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-swiss-ink">
                  Question
                </label>
                <QuestionDisplay
                  question={toDisplayQuestion(previewQuestion)}
                  variant="preview"
                  showSourceBadge={true}
                  showTopicInfo={false}
                  enableZoom={true}
                />
              </div>

              {/* Answer Key */}
              {previewQuestion.answer_key && (
                <div className="space-y-4">
                  {previewQuestion.answer_key.answer && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-swiss-ink">
                        Answer
                      </label>
                      <div className="border-2 border-swiss-ink bg-green-50 p-3">
                        <LatexPreview
                          latex={previewQuestion.answer_key.answer}
                          className="text-sm font-medium"
                        />
                      </div>
                    </div>
                  )}

                  {previewQuestion.answer_key.explanation && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-swiss-ink">
                        Explanation
                      </label>
                      <div className="border-2 border-swiss-ink bg-swiss-concrete p-3 max-h-[12rem] overflow-auto">
                        <LatexPreview
                          latex={previewQuestion.answer_key.explanation}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Metadata */}
              <div className="grid grid-cols-3 gap-4 border-t-2 border-swiss-ink pt-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-swiss-lead">
                    Source
                  </p>
                  <p className="text-sm font-bold uppercase">
                    {previewQuestion.content_type === "image_ocr"
                      ? "Image OCR"
                      : previewQuestion.content_type === "synthetic_image"
                      ? "AI Diagram"
                      : previewQuestion.content_type === "official_past_paper"
                      ? "Past Paper"
                      : "AI Generated"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-swiss-lead">
                    Calculator
                  </p>
                  <p className="text-sm font-bold uppercase">
                    {previewQuestion.calculator_allowed ? "Allowed" : "Not Allowed"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-swiss-lead">
                    Times Used
                  </p>
                  <p className="text-sm font-bold uppercase">
                    {previewQuestion.times_used || 0}x
                  </p>
                </div>
              </div>

              {/* Add to Assignment Button */}
              <div className="border-t-2 border-swiss-ink pt-4">
                <Button
                  onClick={() => {
                    addQuestion(previewQuestion)
                    setPreviewQuestion(null)
                  }}
                  disabled={selectedIds.has(previewQuestion.id)}
                  className="w-full bg-swiss-signal hover:bg-swiss-ink text-white font-bold uppercase tracking-wider"
                >
                  {selectedIds.has(previewQuestion.id) ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Already Added
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Add to Assignment
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
