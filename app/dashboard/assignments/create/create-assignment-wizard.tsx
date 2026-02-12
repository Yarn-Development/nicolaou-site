"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
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
  BookOpen,
  ImageIcon,
  Filter,
  Eye,
  Monitor,
  FileDown,
  HelpCircle,
  ScrollText,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { LatexPreview } from "@/components/latex-preview"
import { QuestionDisplayCompact, QuestionDisplay, SourceBadge } from "@/components/question-display"
import type { Question as DatabaseQuestion } from "@/lib/types/database"
import {
  getQuestionBankQuestions,
  type Question,
  type QuestionBankFilters,
  type QuestionContentType,
} from "@/app/actions/questions"
import {
  createAssignmentWithQuestions,
  type AssignmentMode,
  type Assignment
} from "@/app/actions/assignments"
import { createClass, type Class } from "@/app/actions/classes"
import {
  exportExamToWord,
  exportExamWithMarkScheme,
  type ExamQuestion
} from "@/lib/docx-exporter"
import { toast } from "sonner"
import { Stepper } from "@/components/ui/stepper"

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
  content_type?: string
  answer_key?: {
    answer?: string
    explanation?: string
  } | null
}

type WizardStep = "builder" | "configuration" | "success"

// Wizard steps configuration for stepper
const WIZARD_STEPS = [
  { id: "builder", title: "Select Questions", number: 1 },
  { id: "configuration", title: "Configure", number: 2 },
  { id: "success", title: "Publish", number: 3 },
]

// Topics list matching the question bank
const TOPICS = [
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
// Main Component
// =====================================================

export function CreateAssignmentWizard({ classes }: CreateAssignmentWizardProps) {

  // Wizard State
  const [currentStep, setCurrentStep] = useState<WizardStep>("builder")

  // Step 1: Builder State
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
  const [selectedQuestions, setSelectedQuestions] = useState<SelectedQuestion[]>([])
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null)

  // Step 2: Configuration State
  const [title, setTitle] = useState("")
  const [mode, setMode] = useState<AssignmentMode>("online")
  const [selectedClassId, setSelectedClassId] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [generateFeedbackSheets, setGenerateFeedbackSheets] = useState(true)
  const [previewMode, setPreviewMode] = useState<"screen" | "print">("screen")
  
  // Quick Create Class State
  const [showCreateClassDialog, setShowCreateClassDialog] = useState(false)
  const [newClassName, setNewClassName] = useState("")
  const [creatingClass, setCreatingClass] = useState(false)
  const [availableClasses, setAvailableClasses] = useState<Class[]>(classes)

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
        content_type: question.content_type,
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

  const handleCopyLink = useCallback(async () => {
    if (!createdAssignment) return

    const url = `${window.location.origin}/student-dashboard/assignments/${createdAssignment.id}/take`
    await navigator.clipboard.writeText(url)
    setLinkCopied(true)
    toast.success("Link copied to clipboard!")
    setTimeout(() => setLinkCopied(false), 3000)
  }, [createdAssignment])

  const handleCreateClass = async () => {
    if (!newClassName.trim()) return

    setCreatingClass(true)
    try {
      const result = await createClass(newClassName.trim(), "Maths")
      if (result.success && result.data) {
        setAvailableClasses((prev) => [...prev, result.data!])
        setSelectedClassId(result.data.id)
        setShowCreateClassDialog(false)
        setNewClassName("")
        toast.success(`Class "${result.data.name}" created!`)
      } else {
        toast.error(result.error || "Failed to create class")
      }
    } catch (err) {
      console.error("Error creating class:", err)
      toast.error("An unexpected error occurred")
    } finally {
      setCreatingClass(false)
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

  const selectedClass = availableClasses.find((c) => c.id === selectedClassId)

  // =====================================================
  // Render Steps
  // =====================================================

  // Step 1: Builder
  if (currentStep === "builder") {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {/* Header */}
        <div className="border-b-2 border-swiss-ink bg-swiss-concrete px-6 py-4">
          {/* Stepper */}
          <div className="mb-4">
            <Stepper steps={WIZARD_STEPS} currentStep={currentStep} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/assignments">
                <Button variant="outline" size="icon" className="border-2 border-swiss-ink">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Select Questions
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Selected
                </p>
                <p className="text-lg font-bold">
                  {selectedQuestions.length} questions / {totalMarks} marks
                </p>
              </div>
              <Button
                onClick={() => setCurrentStep("configuration")}
                disabled={selectedQuestions.length === 0}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md"
              >
                Next: Configure
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>

        {/* Split Screen Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Question Bank */}
          <div className="w-3/5 border-r-2 border-swiss-ink flex flex-col bg-swiss-paper">
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
                      <SelectItem value="All">All Topics</SelectItem>
                      {TOPICS.map((topic) => (
                        <SelectItem key={topic} value={topic}>
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
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-40 text-swiss-lead" />
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

          {/* Right Panel - Selected Questions */}
          <div className="w-2/5 flex flex-col bg-swiss-concrete">
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
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center max-w-xs">
                    <div className="w-16 h-16 mx-auto mb-4 bg-muted/50 border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                      <FileText className="w-8 h-8 opacity-50" />
                    </div>
                    <p className="font-bold text-foreground mb-1">Build Your Paper</p>
                    <p className="text-sm">
                      Click the <span className="font-semibold text-primary">+ Add</span> button on questions from the bank to build your exam paper.
                    </p>
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
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className="text-xs border-swiss-ink font-bold">
                          {question.topic}
                        </Badge>
                        <Badge variant="outline" className="text-xs border-swiss-ink font-bold">
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

  // Step 2: Configuration
  if (currentStep === "configuration") {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {/* Header */}
        <div className="border-b-2 border-swiss-ink bg-swiss-concrete px-6 py-4">
          {/* Stepper */}
          <div className="mb-4">
            <Stepper steps={WIZARD_STEPS} currentStep={currentStep} />
          </div>
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
                <h1 className="text-2xl font-bold text-foreground">
                  Assignment Details
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Selected
                </p>
                <p className="text-lg font-bold">
                  {selectedQuestions.length} questions / {totalMarks} marks
                </p>
              </div>
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

        {/* Split Screen Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Configuration Form */}
          <div className="w-1/2 border-r-2 border-swiss-ink flex flex-col bg-swiss-paper">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
                <div className="grid grid-cols-2 gap-3">
                  {/* Online Mode Card */}
                  <button
                    onClick={() => setMode("online")}
                    className={`border-2 p-4 text-left transition-all ${mode === "online"
                      ? "border-swiss-signal bg-swiss-signal/5"
                      : "border-swiss-ink hover:border-swiss-lead"
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 ${mode === "online" ? "bg-swiss-signal text-white" : "bg-swiss-concrete"}`}>
                        <Laptop className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-black uppercase tracking-wider text-sm mb-1">Online</h3>
                        <p className="text-xs text-swiss-lead">
                          Students take on device
                        </p>
                      </div>
                    </div>
                    {mode === "online" && (
                      <div className="mt-3 flex items-center gap-2 text-swiss-signal">
                        <CheckCircle className="w-3 h-3" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Selected</span>
                      </div>
                    )}
                  </button>

                  {/* Paper Mode Card */}
                  <button
                    onClick={() => setMode("paper")}
                    className={`border-2 p-4 text-left transition-all ${mode === "paper"
                      ? "border-swiss-signal bg-swiss-signal/5"
                      : "border-swiss-ink hover:border-swiss-lead"
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 ${mode === "paper" ? "bg-swiss-signal text-white" : "bg-swiss-concrete"}`}>
                        <Printer className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-black uppercase tracking-wider text-sm mb-1">Paper</h3>
                        <p className="text-xs text-swiss-lead">
                          Print and mark manually
                        </p>
                      </div>
                    </div>
                    {mode === "paper" && (
                      <div className="mt-3 flex items-center gap-2 text-swiss-signal">
                        <CheckCircle className="w-3 h-3" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Selected</span>
                      </div>
                    )}
                  </button>
                </div>
              </div>

              {/* Class Selection with Create New */}
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-swiss-lead mb-2">
                  <Users className="w-4 h-4 inline mr-2" />
                  Assign to Class *
                </label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger className="border-2 border-swiss-ink bg-swiss-paper font-bold">
                    <SelectValue placeholder="Select a class..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableClasses.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name} ({cls.subject})
                      </SelectItem>
                    ))}
                    <div className="border-t border-swiss-ink/20 mt-1 pt-1">
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setShowCreateClassDialog(true)
                        }}
                        className="w-full px-2 py-2 text-left text-sm font-bold text-swiss-signal hover:bg-swiss-signal/10 flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Create New Class
                      </button>
                    </div>
                  </SelectContent>
                </Select>
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

              {/* Generate Student Feedback Sheets Toggle */}
              <div className="border-2 border-swiss-ink bg-swiss-concrete p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <ScrollText className="w-4 h-4 text-swiss-ink" />
                      <span className="font-black uppercase tracking-wider text-sm">
                        Generate Student Feedback Sheets
                      </span>
                      <div className="relative group">
                        <HelpCircle className="w-4 h-4 text-swiss-lead cursor-help" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-swiss-ink text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          <p>When enabled, personalized revision lists will be generated for each student based on their performance, highlighting topics they need to review.</p>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-swiss-ink"></div>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-swiss-lead">
                      Creates personalized revision lists based on student performance
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={generateFeedbackSheets}
                      onChange={(e) => setGenerateFeedbackSheets(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-swiss-lead/30 peer-checked:bg-swiss-signal rounded-full transition-colors"></div>
                    <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white border border-swiss-ink rounded-full transition-transform peer-checked:translate-x-5"></div>
                  </label>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 border-2 border-red-500 text-red-700 font-bold">
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t-2 border-swiss-ink bg-swiss-paper px-6 py-4">
              <Button
                variant="outline"
                onClick={() => setCurrentStep("builder")}
                className="border-2 border-swiss-ink font-bold uppercase tracking-wider"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Questions
              </Button>
            </div>
          </div>

          {/* Right Panel - Live Preview */}
          <div className="w-1/2 flex flex-col bg-swiss-concrete">
            {/* Preview Header */}
            <div className="px-4 py-3 border-b-2 border-swiss-ink/20 flex items-center justify-between bg-swiss-paper">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                <h3 className="font-black uppercase tracking-wider">Preview</h3>
              </div>
              <div className="flex items-center gap-2">
                {/* Screen/Print Mode Toggle */}
                <div className="flex border-2 border-swiss-ink">
                  <button
                    onClick={() => setPreviewMode("screen")}
                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
                      previewMode === "screen"
                        ? "bg-swiss-ink text-white"
                        : "bg-swiss-paper text-swiss-ink hover:bg-swiss-concrete"
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    Screen
                  </button>
                  <button
                    onClick={() => setPreviewMode("print")}
                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
                      previewMode === "print"
                        ? "bg-swiss-ink text-white"
                        : "bg-swiss-paper text-swiss-ink hover:bg-swiss-concrete"
                    }`}
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print
                  </button>
                </div>
                {/* Download Buttons */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExportExam(false)}
                  disabled={isExporting || selectedQuestions.length === 0}
                  className="border-2 border-swiss-ink text-xs font-bold uppercase"
                >
                  <FileDown className="w-3.5 h-3.5 mr-1" />
                  Word
                </Button>
              </div>
            </div>

            {/* Preview Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {previewMode === "screen" ? (
                /* Screen Mode - Scrollable List */
                <div className="space-y-4">
                  {selectedQuestions.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground py-20">
                      <div className="text-center">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-40" />
                        <p className="font-bold">No questions selected</p>
                        <p className="text-sm">Go back to add questions to preview</p>
                      </div>
                    </div>
                  ) : (
                    selectedQuestions.map((question, index) => (
                      <div key={question.id} className="border-2 border-swiss-ink bg-swiss-paper p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 flex items-center justify-center bg-swiss-ink text-white font-black text-sm shrink-0">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <Badge variant="outline" className="text-xs border-swiss-ink font-bold">
                                {question.topic}
                              </Badge>
                              <Badge variant="outline" className="text-xs border-swiss-ink font-bold">
                                {question.marks} marks
                              </Badge>
                              {question.calculator_allowed && (
                                <Badge variant="outline" className="text-xs border-swiss-lead">
                                  <Calculator className="w-3 h-3 mr-1" />
                                  Calculator
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm">
                              <LatexPreview
                                latex={question.question_latex}
                                className="text-sm"
                                showSkeleton={false}
                              />
                            </div>
                            {question.image_url && (
                              <div className="mt-2">
                                <Image
                                  src={question.image_url}
                                  alt="Question diagram"
                                  width={400}
                                  height={160}
                                  className="max-w-full h-auto max-h-40 border border-swiss-ink/20 object-contain"
                                  unoptimized
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                /* Print Mode - A4 Page Preview */
                <div className="flex justify-center">
                  <div
                    className="bg-white shadow-lg border border-swiss-ink/20 p-8 origin-top"
                    style={{
                      width: "210mm",
                      minHeight: "297mm",
                      transform: "scale(0.5)",
                      transformOrigin: "top center",
                    }}
                  >
                    {/* Paper Header */}
                    <div className="text-center mb-8 border-b-2 border-swiss-ink pb-4">
                      <h1 className="text-2xl font-black uppercase tracking-wider">
                        {title || "Untitled Exam"}
                      </h1>
                      <p className="text-sm text-swiss-lead mt-1">
                        {selectedQuestions.length} Questions | {totalMarks} Marks
                      </p>
                    </div>

                    {/* Questions */}
                    <div className="space-y-6">
                      {selectedQuestions.map((question, index) => (
                        <div key={question.id} className="pb-4 border-b border-swiss-ink/20">
                          <div className="flex gap-3">
                            <span className="font-black text-lg">{index + 1}.</span>
                            <div className="flex-1">
                              <LatexPreview
                                latex={question.question_latex}
                                className="text-base"
                                showSkeleton={false}
                              />
                              {question.image_url && (
                                <Image
                                  src={question.image_url}
                                  alt="Question diagram"
                                  width={320}
                                  height={200}
                                  className="max-w-xs h-auto mt-2 object-contain"
                                  unoptimized
                                />
                              )}
                              <div className="mt-2 text-right text-sm text-swiss-lead">
                                [{question.marks} marks]
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Create Class Dialog */}
        <Dialog open={showCreateClassDialog} onOpenChange={setShowCreateClassDialog}>
          <DialogContent className="border-2 border-swiss-ink">
            <DialogHeader>
              <DialogTitle className="font-black uppercase tracking-wider">
                Create New Class
              </DialogTitle>
              <DialogDescription>
                Add a new class to assign this assessment to.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="className" className="text-xs font-black uppercase tracking-widest text-swiss-lead">
                  Class Name
                </Label>
                <Input
                  id="className"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="e.g. Year 10 Set 1"
                  className="border-2 border-swiss-ink mt-2"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newClassName.trim()) {
                      handleCreateClass()
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateClassDialog(false)
                  setNewClassName("")
                }}
                className="border-2 border-swiss-ink font-bold uppercase tracking-wider"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateClass}
                disabled={creatingClass || !newClassName.trim()}
                className="bg-swiss-signal hover:bg-swiss-ink text-white font-bold uppercase tracking-wider"
              >
                {creatingClass ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Class
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
                  <Link href={`/revision-checklist/${createdAssignment.id}`} className="block">
                    <Button
                      variant="outline"
                      className="w-full border-2 border-swiss-ink font-bold uppercase tracking-wider"
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      Download Revision Checklist
                    </Button>
                  </Link>
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
