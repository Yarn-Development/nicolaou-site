"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { QuestionDisplay } from "@/components/question-display"
import { LatexPreview } from "@/components/latex-preview"
import {
  getAuditQuestions,
  auditUpdateQuestion,
  auditDeleteQuestion,
  auditToggleVerified,
  auditRegenerateQuestion,
  type AuditQuestion,
  type AuditFilters,
} from "@/app/actions/audit"
import type { Question, ContentType } from "@/lib/types/database"
import {
  Pencil,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Search,
  Filter,
  ShieldCheck,
} from "lucide-react"

const PAGE_SIZE = 30

const CONTENT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "generated_text", label: "AI Generated" },
  { value: "image_ocr", label: "Scanned (OCR)" },
  { value: "official_past_paper", label: "Past Paper" },
  { value: "synthetic_image", label: "AI Diagram" },
  { value: "revision_generated", label: "Revision" },
]

const VERIFIED_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "verified", label: "Verified" },
  { value: "unverified", label: "Unverified" },
]

// Convert AuditQuestion to Question type for QuestionDisplay component
function toQuestion(aq: AuditQuestion): Question {
  return {
    id: aq.id,
    created_at: aq.created_at,
    updated_at: aq.created_at,
    content_type: aq.content_type as ContentType,
    question_latex: aq.question_latex,
    image_url: aq.image_url,
    topic: aq.topic || "",
    difficulty: (aq.difficulty as "Foundation" | "Higher") || "Foundation",
    meta_tags: [],
    answer_key: aq.answer_key as Question["answer_key"],
    created_by: aq.created_by,
    is_verified: aq.is_verified,
    verification_notes: null,
    times_used: 0,
    avg_score: null,
    curriculum_level: null,
    topic_name: aq.topic_name,
    sub_topic_name: aq.sub_topic_name,
    question_type: aq.question_type as Question["question_type"],
    marks: aq.marks,
    calculator_allowed: aq.calculator_allowed,
  }
}

export function AuditClient() {
  // ---- State ----
  const [questions, setQuestions] = useState<AuditQuestion[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)

  // Filters
  const [showSuspectFirst, setShowSuspectFirst] = useState(true)
  const [contentType, setContentType] = useState("all")
  const [verifiedStatus, setVerifiedStatus] = useState("all")
  const [search, setSearch] = useState("")
  const [searchDebounced, setSearchDebounced] = useState("")

  // Edit modal
  const [editingQuestion, setEditingQuestion] = useState<AuditQuestion | null>(null)
  const [editLatex, setEditLatex] = useState("")
  const [editSaving, setEditSaving] = useState(false)

  // Regenerating
  const [regeneratingIds, setRegeneratingIds] = useState<Set<string>>(new Set())

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null)

  // ---- Debounced search ----
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 400)
    return () => clearTimeout(timer)
  }, [search])

  // ---- Build filters ----
  const buildFilters = useCallback(
    (customOffset?: number): AuditFilters => ({
      showSuspectFirst,
      contentType,
      verifiedStatus,
      search: searchDebounced,
      limit: PAGE_SIZE,
      offset: customOffset ?? offset,
    }),
    [showSuspectFirst, contentType, verifiedStatus, searchDebounced, offset]
  )

  // ---- Load questions ----
  const loadQuestions = useCallback(
    async (reset = false) => {
      if (loading) return
      setLoading(true)

      const currentOffset = reset ? 0 : offset
      const filters = buildFilters(currentOffset)

      const result = await getAuditQuestions(filters)

      if (result.success && result.data) {
        if (reset) {
          setQuestions(result.data)
        } else {
          setQuestions((prev) => [...prev, ...result.data!])
        }
        setTotal(result.total ?? 0)
        setHasMore(result.data.length === PAGE_SIZE)
        setOffset(currentOffset + result.data.length)
      }

      setLoading(false)
      setInitialLoading(false)
    },
    [loading, offset, buildFilters]
  )

  // ---- Initial load + filter change reset ----
  useEffect(() => {
    setOffset(0)
    setQuestions([])
    setHasMore(true)
    setInitialLoading(true)

    const load = async () => {
      setLoading(true)
      const filters: AuditFilters = {
        showSuspectFirst,
        contentType,
        verifiedStatus,
        search: searchDebounced,
        limit: PAGE_SIZE,
        offset: 0,
      }
      const result = await getAuditQuestions(filters)
      if (result.success && result.data) {
        setQuestions(result.data)
        setTotal(result.total ?? 0)
        setHasMore(result.data.length === PAGE_SIZE)
        setOffset(result.data.length)
      }
      setLoading(false)
      setInitialLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSuspectFirst, contentType, verifiedStatus, searchDebounced])

  // ---- Intersection Observer for infinite scroll ----
  useEffect(() => {
    if (!sentinelRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadQuestions(false)
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, loading, loadQuestions])

  // ---- Quick Actions ----

  const handleEdit = (q: AuditQuestion) => {
    setEditingQuestion(q)
    setEditLatex(q.question_latex || "")
  }

  const handleEditSave = async () => {
    if (!editingQuestion) return
    setEditSaving(true)
    const result = await auditUpdateQuestion(editingQuestion.id, editLatex)
    if (result.success) {
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === editingQuestion.id
            ? { ...q, question_latex: editLatex, is_suspect: false }
            : q
        )
      )
      setEditingQuestion(null)
    }
    setEditSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this question permanently? This cannot be undone.")) return
    const result = await auditDeleteQuestion(id)
    if (result.success) {
      setQuestions((prev) => prev.filter((q) => q.id !== id))
      setTotal((prev) => prev - 1)
    }
  }

  const handleRegenerate = async (id: string) => {
    setRegeneratingIds((prev) => new Set(prev).add(id))
    const result = await auditRegenerateQuestion(id)
    if (result.success && result.newLatex) {
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === id
            ? { ...q, question_latex: result.newLatex!, is_suspect: false }
            : q
        )
      )
    }
    setRegeneratingIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const handleToggleVerified = async (id: string, currentValue: boolean) => {
    const result = await auditToggleVerified(id, !currentValue)
    if (result.success) {
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === id ? { ...q, is_verified: !currentValue } : q
        )
      )
    }
  }

  // ---- Stats ----
  const suspectCount = questions.filter((q) => q.is_suspect).length
  const verifiedCount = questions.filter((q) => q.is_verified).length

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-8 w-8 text-swiss-signal" />
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wider">
            QC Audit
          </h1>
          <p className="text-sm text-swiss-lead">
            Rapid quality control — scan, fix, or remove broken questions
          </p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-4 border-2 border-swiss-ink p-3 bg-swiss-concrete">
        <span className="text-xs font-black uppercase tracking-wider">
          Loaded: {questions.length}
        </span>
        <span className="text-xs font-bold text-swiss-lead">
          / {total} total
        </span>
        <span className="border-l-2 border-swiss-ink pl-4 text-xs font-black uppercase tracking-wider text-amber-600">
          Suspect: {suspectCount}
        </span>
        <span className="border-l-2 border-swiss-ink pl-4 text-xs font-black uppercase tracking-wider text-green-600">
          Verified: {verifiedCount}
        </span>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 border-2 border-swiss-ink p-4 bg-swiss-paper">
        <Filter className="h-4 w-4 text-swiss-lead" />

        {/* Suspect First Toggle */}
        <Button
          variant={showSuspectFirst ? "default" : "outline"}
          size="sm"
          onClick={() => setShowSuspectFirst(!showSuspectFirst)}
          className="text-xs font-bold uppercase tracking-wider"
        >
          <AlertTriangle className="h-3.5 w-3.5 mr-1" />
          Suspect First
        </Button>

        {/* Content Type */}
        <Select value={contentType} onValueChange={setContentType}>
          <SelectTrigger className="w-[160px] border-2 border-swiss-ink text-xs font-bold uppercase tracking-wider">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CONTENT_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Verified Status */}
        <Select value={verifiedStatus} onValueChange={setVerifiedStatus}>
          <SelectTrigger className="w-[140px] border-2 border-swiss-ink text-xs font-bold uppercase tracking-wider">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VERIFIED_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-swiss-lead" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search question text or topic..."
            className="pl-9 border-2 border-swiss-ink text-sm"
          />
        </div>
      </div>

      {/* Question Grid */}
      {initialLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-swiss-lead" />
          <span className="ml-3 text-sm font-bold uppercase tracking-wider text-swiss-lead">
            Loading questions...
          </span>
        </div>
      ) : questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-swiss-ink/30">
          <ShieldCheck className="h-12 w-12 text-swiss-lead/40 mb-4" />
          <p className="text-sm font-bold uppercase tracking-wider text-swiss-lead">
            No questions found
          </p>
          <p className="text-xs text-swiss-lead mt-1">
            Try adjusting your filters
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {questions.map((q) => (
            <AuditCard
              key={q.id}
              question={q}
              isRegenerating={regeneratingIds.has(q.id)}
              onEdit={() => handleEdit(q)}
              onDelete={() => handleDelete(q.id)}
              onRegenerate={() => handleRegenerate(q.id)}
              onToggleVerified={() =>
                handleToggleVerified(q.id, q.is_verified)
              }
            />
          ))}
        </div>
      )}

      {/* Infinite Scroll Sentinel */}
      <div ref={sentinelRef} className="h-10 flex items-center justify-center">
        {loading && !initialLoading && (
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-swiss-lead" />
            <span className="text-xs font-bold uppercase tracking-wider text-swiss-lead">
              Loading more...
            </span>
          </div>
        )}
        {!hasMore && questions.length > 0 && (
          <span className="text-xs font-bold uppercase tracking-wider text-swiss-lead/50">
            All questions loaded
          </span>
        )}
      </div>

      {/* Edit Modal */}
      <Dialog
        open={!!editingQuestion}
        onOpenChange={(open) => {
          if (!open) setEditingQuestion(null)
        }}
      >
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase tracking-wider">
              Edit Question LaTeX
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {/* Raw LaTeX Editor */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-swiss-lead">
                Raw LaTeX
              </label>
              <Textarea
                value={editLatex}
                onChange={(e) => setEditLatex(e.target.value)}
                className="min-h-[300px] font-mono text-sm border-2 border-swiss-ink"
                placeholder="Enter question LaTeX..."
              />
            </div>

            {/* Live Preview */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-swiss-lead">
                Live Preview
              </label>
              <div className="border-2 border-swiss-ink p-4 min-h-[300px] bg-white">
                <LatexPreview latex={editLatex} />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setEditingQuestion(null)}
              className="border-2 border-swiss-ink"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={editSaving}
              className="font-bold uppercase tracking-wider"
            >
              {editSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// =====================================================
// AuditCard — individual question card with hover overlay
// =====================================================

interface AuditCardProps {
  question: AuditQuestion
  isRegenerating: boolean
  onEdit: () => void
  onDelete: () => void
  onRegenerate: () => void
  onToggleVerified: () => void
}

function AuditCard({
  question,
  isRegenerating,
  onEdit,
  onDelete,
  onRegenerate,
  onToggleVerified,
}: AuditCardProps) {
  const q = toQuestion(question)

  return (
    <div className="group relative border-2 border-swiss-ink bg-swiss-paper overflow-hidden">
      {/* Suspect Badge */}
      {question.is_suspect && (
        <div className="absolute top-2 right-2 z-10">
          <Badge variant="warning" className="text-[10px] px-2 py-0.5">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Suspect
          </Badge>
        </div>
      )}

      {/* Verified Badge */}
      {question.is_verified && (
        <div className="absolute top-2 left-2 z-10">
          <Badge variant="success" className="text-[10px] px-2 py-0.5">
            <CheckCircle className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        </div>
      )}

      {/* Regenerating Overlay */}
      {isRegenerating && (
        <div className="absolute inset-0 z-20 bg-swiss-paper/80 flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-swiss-signal mb-2" />
          <span className="text-xs font-black uppercase tracking-wider text-swiss-signal">
            Regenerating...
          </span>
        </div>
      )}

      {/* Question Content */}
      <div className="p-4">
        <QuestionDisplay
          question={q}
          variant="card"
          showSourceBadge
          showTopicInfo
          enableZoom={false}
          maxHeight="280px"
        />
      </div>

      {/* Question ID (subtle) */}
      <div className="px-4 pb-2">
        <span className="text-[10px] font-mono text-swiss-lead/40 select-all">
          {question.id.slice(0, 8)}
        </span>
      </div>

      {/* Quick Actions Overlay — appears on hover */}
      <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-200 ease-out bg-swiss-ink/90 backdrop-blur-sm p-2 flex items-center justify-center gap-2 z-10">
        {/* Edit */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          className="h-8 w-8 text-swiss-paper hover:text-swiss-signal hover:bg-white/10"
          title="Edit LaTeX"
        >
          <Pencil className="h-4 w-4" />
        </Button>

        {/* Delete */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="h-8 w-8 text-swiss-paper hover:text-red-400 hover:bg-white/10"
          title="Delete question"
        >
          <Trash2 className="h-4 w-4" />
        </Button>

        {/* Regenerate */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onRegenerate}
          disabled={isRegenerating}
          className="h-8 w-8 text-swiss-paper hover:text-blue-400 hover:bg-white/10"
          title="Regenerate with AI"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>

        {/* Verify / Unverify */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleVerified}
          className="h-8 w-8 text-swiss-paper hover:text-green-400 hover:bg-white/10"
          title={question.is_verified ? "Unverify" : "Verify"}
        >
          {question.is_verified ? (
            <XCircle className="h-4 w-4" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  )
}
