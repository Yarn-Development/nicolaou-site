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
  DialogDescription,
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
  auditFixFormatting,
  auditFullyRegenerateQuestion,
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
  Wand2,
  Sparkles,
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

// =====================================================
// Main Client
// =====================================================

export function AuditClient() {
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
  const [editAnswer, setEditAnswer] = useState("")
  const [editExplanation, setEditExplanation] = useState("")
  const [editSaving, setEditSaving] = useState(false)

  // Delete confirm modal
  const [deletingQuestion, setDeletingQuestion] = useState<AuditQuestion | null>(null)
  const [deleteConfirming, setDeleteConfirming] = useState(false)

  // Regenerate choice modal
  const [regeneratingQuestion, setRegeneratingQuestion] = useState<AuditQuestion | null>(null)
  const [regeneratingIds, setRegeneratingIds] = useState<Set<string>>(new Set())

  const sentinelRef = useRef<HTMLDivElement>(null)

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 400)
    return () => clearTimeout(timer)
  }, [search])

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

  // Reset on filter change
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
  }, [showSuspectFirst, contentType, verifiedStatus, searchDebounced])

  // Infinite scroll
  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) loadQuestions(false)
      },
      { threshold: 0.1 }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, loading, loadQuestions])

  // ---- Handlers ----

  const handleEdit = (q: AuditQuestion) => {
    setEditingQuestion(q)
    setEditLatex(q.question_latex || "")
    const ak = q.answer_key as Record<string, string> | null
    setEditAnswer(ak?.answer || "")
    setEditExplanation(ak?.explanation || "")
  }

  const handleEditSave = async () => {
    if (!editingQuestion) return
    setEditSaving(true)
    const result = await auditUpdateQuestion(
      editingQuestion.id,
      editLatex,
      { answer: editAnswer, explanation: editExplanation }
    )
    if (result.success) {
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === editingQuestion.id
            ? {
                ...q,
                question_latex: editLatex,
                answer_key: { answer: editAnswer, explanation: editExplanation },
                is_suspect: false,
              }
            : q
        )
      )
      setEditingQuestion(null)
    }
    setEditSaving(false)
  }

  const handleDeleteRequest = (q: AuditQuestion) => {
    setDeletingQuestion(q)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingQuestion) return
    setDeleteConfirming(true)
    const result = await auditDeleteQuestion(deletingQuestion.id)
    if (result.success) {
      setQuestions((prev) => prev.filter((q) => q.id !== deletingQuestion.id))
      setTotal((prev) => prev - 1)
      setDeletingQuestion(null)
    }
    setDeleteConfirming(false)
  }

  const handleRegenerateRequest = (q: AuditQuestion) => {
    setRegeneratingQuestion(q)
  }

  const handleRegenerateConfirm = async (mode: "format" | "new") => {
    if (!regeneratingQuestion) return
    const id = regeneratingQuestion.id
    setRegeneratingQuestion(null)
    setRegeneratingIds((prev) => new Set(prev).add(id))

    const action = mode === "new" ? auditFullyRegenerateQuestion : auditFixFormatting
    const result = await action(id)

    if (result.success) {
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === id
            ? {
                ...q,
                question_latex: result.newLatex ?? q.question_latex,
                answer_key: result.newAnswerKey
                  ? { answer: result.newAnswerKey.answer, explanation: result.newAnswerKey.explanation }
                  : q.answer_key,
                is_suspect: false,
                is_verified: mode === "new" ? false : q.is_verified,
              }
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
        prev.map((q) => (q.id === id ? { ...q, is_verified: !currentValue } : q))
      )
    }
  }

  const suspectCount = questions.filter((q) => q.is_suspect).length
  const verifiedCount = questions.filter((q) => q.is_verified).length

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-8 w-8 text-swiss-signal" />
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wider">QC Audit</h1>
          <p className="text-sm text-swiss-lead">
            Scan, fix, or replace broken questions
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 border-2 border-swiss-ink p-3 bg-swiss-concrete">
        <span className="text-xs font-black uppercase tracking-wider">
          Loaded: {questions.length}
        </span>
        <span className="text-xs font-bold text-swiss-lead">/ {total} total</span>
        <span className="border-l-2 border-swiss-ink pl-4 text-xs font-black uppercase tracking-wider text-amber-600">
          Suspect: {suspectCount}
        </span>
        <span className="border-l-2 border-swiss-ink pl-4 text-xs font-black uppercase tracking-wider">
          Verified: {verifiedCount}
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 border-2 border-swiss-ink p-4 bg-swiss-paper">
        <Filter className="h-4 w-4 text-swiss-lead" />
        <Button
          variant={showSuspectFirst ? "default" : "outline"}
          size="sm"
          onClick={() => setShowSuspectFirst(!showSuspectFirst)}
          className="text-xs font-bold uppercase tracking-wider"
        >
          <AlertTriangle className="h-3.5 w-3.5 mr-1" />
          Suspect First
        </Button>
        <Select value={contentType} onValueChange={setContentType}>
          <SelectTrigger className="w-[160px] border-2 border-swiss-ink text-xs font-bold uppercase tracking-wider">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CONTENT_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={verifiedStatus} onValueChange={setVerifiedStatus}>
          <SelectTrigger className="w-[140px] border-2 border-swiss-ink text-xs font-bold uppercase tracking-wider">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VERIFIED_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
          <p className="text-sm font-bold uppercase tracking-wider text-swiss-lead">No questions found</p>
          <p className="text-xs text-swiss-lead mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {questions.map((q) => (
            <AuditCard
              key={q.id}
              question={q}
              isRegenerating={regeneratingIds.has(q.id)}
              onEdit={() => handleEdit(q)}
              onDelete={() => handleDeleteRequest(q)}
              onRegenerate={() => handleRegenerateRequest(q)}
              onToggleVerified={() => handleToggleVerified(q.id, q.is_verified)}
            />
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-10 flex items-center justify-center">
        {loading && !initialLoading && (
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-swiss-lead" />
            <span className="text-xs font-bold uppercase tracking-wider text-swiss-lead">Loading more...</span>
          </div>
        )}
        {!hasMore && questions.length > 0 && (
          <span className="text-xs font-bold uppercase tracking-wider text-swiss-lead/50">
            All questions loaded
          </span>
        )}
      </div>

      {/* ── Edit Modal ── */}
      <Dialog open={!!editingQuestion} onOpenChange={(open) => { if (!open) setEditingQuestion(null) }}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase tracking-wider">Edit Question</DialogTitle>
            <DialogDescription className="text-xs text-swiss-lead">
              {editingQuestion?.topic_name} · {editingQuestion?.sub_topic_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Question LaTeX */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-swiss-lead">Question LaTeX</label>
                <Textarea
                  value={editLatex}
                  onChange={(e) => setEditLatex(e.target.value)}
                  className="min-h-[200px] font-mono text-sm border-2 border-swiss-ink"
                  placeholder="Enter question LaTeX..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-swiss-lead">Preview</label>
                <div className="border-2 border-swiss-ink p-4 min-h-[200px] bg-white">
                  <LatexPreview latex={editLatex} />
                </div>
              </div>
            </div>

            {/* Answer + Explanation */}
            <div className="border-t-2 border-swiss-ink pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-swiss-lead">Answer</label>
                <Textarea
                  value={editAnswer}
                  onChange={(e) => setEditAnswer(e.target.value)}
                  className="min-h-[80px] font-mono text-sm border-2 border-swiss-ink"
                  placeholder="e.g. x = 4"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-swiss-lead">Explanation / Mark Scheme</label>
                <Textarea
                  value={editExplanation}
                  onChange={(e) => setEditExplanation(e.target.value)}
                  className="min-h-[80px] font-mono text-sm border-2 border-swiss-ink"
                  placeholder="Step-by-step working..."
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditingQuestion(null)} className="border-2 border-swiss-ink">
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={editSaving} className="font-bold uppercase tracking-wider">
              {editSaving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Modal ── */}
      <Dialog open={!!deletingQuestion} onOpenChange={(open) => { if (!open) setDeletingQuestion(null) }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase tracking-wider text-swiss-signal">
              Delete Question?
            </DialogTitle>
            <DialogDescription className="text-sm text-swiss-lead mt-1">
              This cannot be undone. The question will be permanently removed from the question bank.
            </DialogDescription>
          </DialogHeader>

          {deletingQuestion && (
            <div className="border-2 border-swiss-ink p-4 bg-swiss-concrete my-4 max-h-[120px] overflow-hidden">
              <p className="text-xs font-mono text-swiss-lead line-clamp-4">
                {deletingQuestion.question_latex}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingQuestion(null)}
              className="border-2 border-swiss-ink"
              disabled={deleteConfirming}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              disabled={deleteConfirming}
              className="bg-swiss-signal text-white hover:bg-red-700 font-bold uppercase tracking-wider"
            >
              {deleteConfirming ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Deleting...</> : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Regenerate Choice Modal ── */}
      <Dialog open={!!regeneratingQuestion} onOpenChange={(open) => { if (!open) setRegeneratingQuestion(null) }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase tracking-wider">
              Fix This Question
            </DialogTitle>
            <DialogDescription className="text-sm text-swiss-lead mt-1">
              Choose how to fix the question.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 my-4">
            {/* Option 1: Fix formatting */}
            <button
              onClick={() => handleRegenerateConfirm("format")}
              className="text-left border-2 border-swiss-ink p-4 bg-swiss-paper hover:bg-swiss-concrete transition-colors"
            >
              <div className="flex items-start gap-3">
                <Wand2 className="h-5 w-5 mt-0.5 text-swiss-lead flex-shrink-0" />
                <div>
                  <p className="text-sm font-black uppercase tracking-wider">Fix LaTeX formatting</p>
                  <p className="text-xs text-swiss-lead mt-1">
                    Keeps the same maths content and numbers — just cleans up broken LaTeX syntax,
                    missing braces, and delimiter errors.
                  </p>
                </div>
              </div>
            </button>

            {/* Option 2: New question */}
            <button
              onClick={() => handleRegenerateConfirm("new")}
              className="text-left border-2 border-swiss-ink p-4 bg-swiss-paper hover:bg-swiss-concrete transition-colors"
            >
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 mt-0.5 text-swiss-signal flex-shrink-0" />
                <div>
                  <p className="text-sm font-black uppercase tracking-wider">Generate a new question</p>
                  <p className="text-xs text-swiss-lead mt-1">
                    Replaces this question entirely with a fresh one on the same topic, marks,
                    and difficulty. The question will be marked unverified.
                  </p>
                  {regeneratingQuestion && (
                    <p className="text-xs font-bold mt-2 text-swiss-ink">
                      Topic: {regeneratingQuestion.sub_topic_name || regeneratingQuestion.topic_name || regeneratingQuestion.topic} ·{" "}
                      {regeneratingQuestion.marks}M · {regeneratingQuestion.difficulty}
                    </p>
                  )}
                </div>
              </div>
            </button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRegeneratingQuestion(null)} className="border-2 border-swiss-ink">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// =====================================================
// AuditCard
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
    <div className="relative border-2 border-swiss-ink bg-swiss-paper overflow-hidden flex flex-col">
      {/* Status badges */}
      <div className="absolute top-2 right-2 z-10 flex flex-col items-end gap-1">
        {question.is_suspect && (
          <Badge variant="warning" className="text-[10px] px-2 py-0.5">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Suspect
          </Badge>
        )}
        {question.is_verified && (
          <Badge variant="success" className="text-[10px] px-2 py-0.5">
            <CheckCircle className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        )}
      </div>

      {/* Regenerating overlay */}
      {isRegenerating && (
        <div className="absolute inset-0 z-20 bg-swiss-paper/90 flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-swiss-signal" />
          <span className="text-xs font-black uppercase tracking-wider text-swiss-signal">
            Working...
          </span>
        </div>
      )}

      {/* Content */}
      <div className="p-4 flex-1">
        <QuestionDisplay
          question={q}
          variant="card"
          showSourceBadge
          showTopicInfo
          enableZoom={false}
          maxHeight="260px"
        />
      </div>

      {/* ID */}
      <div className="px-4 pb-1">
        <span className="text-[10px] font-mono text-swiss-lead/40 select-all">
          {question.id.slice(0, 8)}
        </span>
      </div>

      {/* Action bar — always visible */}
      <div className="border-t-2 border-swiss-ink grid grid-cols-4">
        <ActionButton
          onClick={onEdit}
          icon={<Pencil className="h-3.5 w-3.5" />}
          label="Edit"
          title="Edit question and answer"
        />
        <ActionButton
          onClick={onRegenerate}
          icon={<RefreshCw className="h-3.5 w-3.5" />}
          label="Fix"
          title="Fix formatting or generate new question"
          disabled={isRegenerating}
        />
        <ActionButton
          onClick={onToggleVerified}
          icon={question.is_verified ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
          label={question.is_verified ? "Unverify" : "Verify"}
          title={question.is_verified ? "Remove verification" : "Mark as verified"}
          active={question.is_verified}
        />
        <ActionButton
          onClick={onDelete}
          icon={<Trash2 className="h-3.5 w-3.5" />}
          label="Delete"
          title="Delete question permanently"
          danger
        />
      </div>
    </div>
  )
}

function ActionButton({
  onClick,
  icon,
  label,
  title,
  disabled,
  danger,
  active,
}: {
  onClick: () => void
  icon: React.ReactNode
  label: string
  title: string
  disabled?: boolean
  danger?: boolean
  active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-bold uppercase tracking-wider
        border-r-2 border-swiss-ink last:border-r-0
        transition-colors disabled:opacity-40 disabled:cursor-not-allowed
        ${danger
          ? "text-swiss-signal hover:bg-swiss-signal hover:text-white"
          : active
          ? "text-swiss-ink bg-swiss-concrete hover:bg-swiss-signal hover:text-white"
          : "text-swiss-lead hover:bg-swiss-ink hover:text-swiss-paper"
        }
      `}
    >
      {icon}
      {label}
    </button>
  )
}
