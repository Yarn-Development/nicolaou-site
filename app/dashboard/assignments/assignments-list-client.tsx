"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  Search,
  Filter,
  Calendar,
  Download,
  FileText,
  PlusCircle,
  ClipboardCheck,
  MoreVertical,
  Trash2,
  Monitor,
  FileStack,
  Eye,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { AssignmentWithClass } from "@/app/actions/assignments"
import { getAssignmentDetails, deleteAssignment } from "@/app/actions/assignments"
import { exportExamToWord, exportExamWithMarkScheme, type ExamQuestion } from "@/lib/docx-exporter"

interface AssignmentsListClientProps {
  assignments: AssignmentWithClass[]
}

type FilterType = "all" | "online" | "paper" | "draft" | "published"

export function AssignmentsListClient({ assignments }: AssignmentsListClientProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filter, setFilter] = useState<FilterType>("all")
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  // Filter and search assignments
  const filteredAssignments = assignments.filter((a) => {
    // Search filter
    const matchesSearch =
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.class_name.toLowerCase().includes(searchQuery.toLowerCase())

    // Status/mode filter
    let matchesFilter = true
    if (filter === "online") {
      matchesFilter = a.mode === "online"
    } else if (filter === "paper") {
      matchesFilter = a.mode === "paper"
    } else if (filter === "draft") {
      matchesFilter = a.status === "draft"
    } else if (filter === "published") {
      matchesFilter = a.status === "published"
    }

    return matchesSearch && matchesFilter
  })

  // Calculate stats
  const totalAssignments = assignments.length
  const paperCount = assignments.filter((a) => a.mode === "paper").length
  const onlineCount = assignments.filter((a) => a.mode === "online").length
  const publishedCount = assignments.filter((a) => a.status === "published").length

  // Handle downloading paper exam
  const handleDownload = async (assignmentId: string, title: string, withMarkScheme: boolean) => {
    setDownloadingId(assignmentId)
    try {
      const result = await getAssignmentDetails(assignmentId)
      if (!result.success || !result.data) {
        console.error("Failed to get assignment details:", result.error)
        return
      }

      // Transform questions to ExamQuestion format
      const examQuestions: ExamQuestion[] = result.data.questions.map((q) => ({
        id: q.question_id,
        content_type: "generated_text" as const,
        question_latex: q.question_latex,
        image_url: null,
        topic: q.topic,
        difficulty: q.difficulty as "Foundation" | "Higher",
        marks: q.marks,
        calculator_allowed: q.calculator_allowed,
        answer_key: q.answer_key,
      }))

      if (withMarkScheme) {
        await exportExamWithMarkScheme(examQuestions, title)
      } else {
        await exportExamToWord(examQuestions, title)
      }
    } catch (error) {
      console.error("Error downloading exam:", error)
    } finally {
      setDownloadingId(null)
    }
  }

  // Handle delete
  const handleDelete = async (assignmentId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      return
    }
    const result = await deleteAssignment(assignmentId)
    if (!result.success) {
      console.error("Failed to delete assignment:", result.error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b-2 border-swiss-ink pb-6">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 md:col-span-3">
            <span className="block text-sm font-bold uppercase tracking-widest text-swiss-signal mb-2">
              Manage
            </span>
          </div>
          <div className="col-span-12 md:col-span-9">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-4xl font-black tracking-tight uppercase mb-2">
                  Assignments
                </h1>
                <p className="text-swiss-lead font-medium">
                  Create, manage, and track all your class assignments
                </p>
              </div>
              <Link href="/dashboard/assignments/create">
                <Button className="bg-swiss-signal hover:bg-swiss-signal/90 text-white font-bold uppercase tracking-wider border-2 border-swiss-signal">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  New Assignment
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-0 md:grid-cols-4 border-2 border-swiss-ink">
        <div className="border-r-2 border-swiss-ink p-6 bg-swiss-paper">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-swiss-lead">
              Total
            </span>
            <ClipboardList className="h-5 w-5 text-swiss-ink" />
          </div>
          <div className="text-4xl font-black">{totalAssignments}</div>
          <p className="text-xs text-swiss-lead font-bold uppercase tracking-wider mt-1">
            assignments
          </p>
        </div>

        <div className="border-r-2 border-swiss-ink p-6 bg-swiss-concrete">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-swiss-lead">
              Online
            </span>
            <Monitor className="h-5 w-5 text-blue-600" />
          </div>
          <div className="text-4xl font-black text-blue-600">{onlineCount}</div>
          <p className="text-xs text-swiss-lead font-bold uppercase tracking-wider mt-1">
            digital submissions
          </p>
        </div>

        <div className="border-r-2 border-swiss-ink p-6 bg-amber-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-700">
              Paper
            </span>
            <FileStack className="h-5 w-5 text-amber-600" />
          </div>
          <div className="text-4xl font-black text-amber-700">{paperCount}</div>
          <p className="text-xs text-amber-600 font-bold uppercase tracking-wider mt-1">
            printed exams
          </p>
        </div>

        <div className="p-6 bg-green-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-green-700">
              Published
            </span>
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
          <div className="text-4xl font-black text-green-700">{publishedCount}</div>
          <p className="text-xs text-green-600 font-bold uppercase tracking-wider mt-1">
            live assignments
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-swiss-lead" />
          <Input
            placeholder="Search assignments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-2 border-swiss-ink font-medium"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
            className={`border-2 border-swiss-ink font-bold uppercase text-xs ${
              filter === "all" ? "bg-swiss-ink text-swiss-paper" : ""
            }`}
          >
            <Filter className="h-3 w-3 mr-1" />
            All
          </Button>
          <Button
            variant={filter === "online" ? "default" : "outline"}
            onClick={() => setFilter("online")}
            className={`border-2 border-swiss-ink font-bold uppercase text-xs ${
              filter === "online" ? "bg-blue-600 text-white border-blue-600" : ""
            }`}
          >
            <Monitor className="h-3 w-3 mr-1" />
            Online
          </Button>
          <Button
            variant={filter === "paper" ? "default" : "outline"}
            onClick={() => setFilter("paper")}
            className={`border-2 border-swiss-ink font-bold uppercase text-xs ${
              filter === "paper" ? "bg-amber-600 text-white border-amber-600" : ""
            }`}
          >
            <FileStack className="h-3 w-3 mr-1" />
            Paper
          </Button>
          <Button
            variant={filter === "published" ? "default" : "outline"}
            onClick={() => setFilter("published")}
            className={`border-2 border-swiss-ink font-bold uppercase text-xs ${
              filter === "published" ? "bg-green-600 text-white border-green-600" : ""
            }`}
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Published
          </Button>
          <Button
            variant={filter === "draft" ? "default" : "outline"}
            onClick={() => setFilter("draft")}
            className={`border-2 border-swiss-ink font-bold uppercase text-xs ${
              filter === "draft" ? "bg-swiss-lead text-white border-swiss-lead" : ""
            }`}
          >
            <Clock className="h-3 w-3 mr-1" />
            Drafts
          </Button>
        </div>
      </div>

      {/* Assignment List */}
      <Card className="border-2 border-swiss-ink">
        <CardHeader className="border-b-2 border-swiss-ink bg-swiss-concrete">
          <CardTitle className="font-black uppercase tracking-tight">All Assignments</CardTitle>
          <CardDescription className="font-bold text-xs uppercase tracking-wider text-swiss-lead">
            {filteredAssignments.length} assignment{filteredAssignments.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filteredAssignments.length === 0 ? (
            <div className="text-center py-12 text-swiss-lead">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-bold uppercase tracking-wider">No Assignments Found</p>
              <p className="text-sm mt-1">
                {filter !== "all"
                  ? "Try changing the filter or search query"
                  : "Create your first assignment to get started"}
              </p>
              <Link href="/dashboard/assignments/create">
                <Button className="mt-4 bg-swiss-signal hover:bg-swiss-signal/90 text-white font-bold uppercase tracking-wider">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create Assignment
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-swiss-ink/20">
              {filteredAssignments.map((assignment) => (
                <AssignmentRow
                  key={assignment.id}
                  assignment={assignment}
                  onDownload={handleDownload}
                  onDelete={handleDelete}
                  isDownloading={downloadingId === assignment.id}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// =====================================================
// Assignment Row Component
// =====================================================

interface AssignmentRowProps {
  assignment: AssignmentWithClass
  onDownload: (id: string, title: string, withMarkScheme: boolean) => Promise<void>
  onDelete: (id: string, title: string) => Promise<void>
  isDownloading: boolean
}

function AssignmentRow({ assignment, onDownload, onDelete, isDownloading }: AssignmentRowProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "No due date"
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatCreatedDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  }

  const isPastDue = assignment.due_date && new Date(assignment.due_date) < new Date()
  const questionCount = assignment.content?.question_ids?.length || 0

  return (
    <div className="p-4 hover:bg-swiss-concrete/30 transition-colors">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <Link href={`/dashboard/assignments/${assignment.id}`} className="hover:text-swiss-signal transition-colors">
              <h3 className="font-bold text-lg truncate">{assignment.title}</h3>
            </Link>

            {/* Mode Badge */}
            {assignment.mode === "paper" ? (
              <Badge className="bg-amber-100 text-amber-800 border border-amber-300 font-bold text-xs">
                <FileStack className="h-3 w-3 mr-1" />
                Paper
              </Badge>
            ) : (
              <Badge className="bg-blue-100 text-blue-800 border border-blue-300 font-bold text-xs">
                <Monitor className="h-3 w-3 mr-1" />
                Online
              </Badge>
            )}

            {/* Status Badge */}
            {assignment.status === "draft" && (
              <Badge variant="outline" className="border-swiss-lead text-swiss-lead font-bold text-xs">
                Draft
              </Badge>
            )}
            {assignment.status === "published" && (
              <Badge className="bg-green-100 text-green-800 border border-green-300 font-bold text-xs">
                Published
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-swiss-lead">
            <span className="font-medium">{assignment.class_name}</span>
            <span>|</span>
            <span>{assignment.subject}</span>
            <span>|</span>
            <span>{questionCount} questions</span>
            <span>|</span>
            <span className={`flex items-center gap-1 ${isPastDue ? "text-swiss-signal" : ""}`}>
              <Calendar className="h-3 w-3" />
              {formatDate(assignment.due_date)}
            </span>
            <span className="text-swiss-lead/60">
              Created {formatCreatedDate(assignment.created_at)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Mark Button */}
          <Link href={`/dashboard/assignments/${assignment.id}/mark`}>
            <Button
              variant="outline"
              className="border-2 border-swiss-ink font-bold uppercase text-xs hover:bg-swiss-concrete"
            >
              <ClipboardCheck className="h-4 w-4 mr-1" />
              Mark
            </Button>
          </Link>

          {/* Download Button (Paper mode only) */}
          {assignment.mode === "paper" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="border-2 border-amber-600 text-amber-700 font-bold uppercase text-xs hover:bg-amber-50"
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <>
                      <Clock className="h-4 w-4 mr-1 animate-spin" />
                      ...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="border-2 border-swiss-ink">
                <DropdownMenuItem
                  onClick={() => onDownload(assignment.id, assignment.title, false)}
                  className="font-medium cursor-pointer"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Exam Paper Only
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDownload(assignment.id, assignment.title, true)}
                  className="font-medium cursor-pointer"
                >
                  <FileStack className="h-4 w-4 mr-2" />
                  With Mark Scheme
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* More Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="border-2 border-swiss-ink">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-2 border-swiss-ink">
              <DropdownMenuItem asChild className="font-medium cursor-pointer">
                <Link href={`/dashboard/assignments/${assignment.id}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="font-medium cursor-pointer">
                <Link href={`/dashboard/assignments/${assignment.id}/feedback`}>
                  <FileText className="h-4 w-4 mr-2" />
                  View Feedback
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(assignment.id, assignment.title)}
                className="font-medium cursor-pointer text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Submission stats for published assignments */}
      {assignment.status === "published" && assignment.submission_count !== undefined && (
        <div className="mt-2 text-xs text-swiss-lead">
          <span className="font-medium">{assignment.submission_count}</span> submissions received
        </div>
      )}
    </div>
  )
}
