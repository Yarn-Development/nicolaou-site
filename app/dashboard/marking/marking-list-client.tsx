"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  ClipboardCheck, 
  Clock, 
  Users, 
  CheckCircle2, 
  AlertCircle,
  Search,
  Filter,
  Calendar
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import type { AssignmentForMarkingList } from "@/app/actions/marking"

interface MarkingListClientProps {
  assignments: AssignmentForMarkingList[]
}

type FilterType = "all" | "needs_grading" | "completed"

export function MarkingListClient({ assignments }: MarkingListClientProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filter, setFilter] = useState<FilterType>("all")

  // Filter and search assignments
  const filteredAssignments = assignments.filter((a) => {
    // Search filter
    const matchesSearch = 
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.className.toLowerCase().includes(searchQuery.toLowerCase())

    // Status filter
    let matchesFilter = true
    if (filter === "needs_grading") {
      matchesFilter = a.needsGrading > 0
    } else if (filter === "completed") {
      matchesFilter = a.submittedCount > 0 && a.needsGrading === 0
    }

    return matchesSearch && matchesFilter
  })

  // Calculate stats
  const totalNeedsGrading = assignments.reduce((sum, a) => sum + a.needsGrading, 0)
  const totalSubmissions = assignments.reduce((sum, a) => sum + a.submittedCount, 0)
  const totalGraded = assignments.reduce((sum, a) => sum + a.gradedCount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b-2 border-swiss-ink pb-6">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 md:col-span-3">
            <span className="block text-sm font-bold uppercase tracking-widest text-swiss-signal mb-2">
              Marking
            </span>
          </div>
          <div className="col-span-12 md:col-span-9">
            <h1 className="text-4xl font-black tracking-tight uppercase mb-2">
              Assignment Marking
            </h1>
            <p className="text-swiss-lead font-medium">
              Grade student submissions and release feedback
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-0 md:grid-cols-3 border-2 border-swiss-ink">
        <div className="border-r-2 border-swiss-ink p-6 bg-swiss-paper">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-swiss-lead">
              Needs Grading
            </span>
            <AlertCircle className="h-5 w-5 text-swiss-signal" />
          </div>
          <div className="text-4xl font-black text-swiss-signal">{totalNeedsGrading}</div>
          <p className="text-xs text-swiss-lead font-bold uppercase tracking-wider mt-1">
            submissions pending
          </p>
        </div>

        <div className="border-r-2 border-swiss-ink p-6 bg-swiss-concrete">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-swiss-lead">
              Total Submissions
            </span>
            <Users className="h-5 w-5 text-swiss-ink" />
          </div>
          <div className="text-4xl font-black">{totalSubmissions}</div>
          <p className="text-xs text-swiss-lead font-bold uppercase tracking-wider mt-1">
            across all assignments
          </p>
        </div>

        <div className="p-6 bg-green-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-green-700">
              Graded
            </span>
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
          <div className="text-4xl font-black text-green-700">{totalGraded}</div>
          <p className="text-xs text-green-600 font-bold uppercase tracking-wider mt-1">
            submissions completed
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
        <div className="flex gap-2">
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
            variant={filter === "needs_grading" ? "default" : "outline"}
            onClick={() => setFilter("needs_grading")}
            className={`border-2 border-swiss-ink font-bold uppercase text-xs ${
              filter === "needs_grading" ? "bg-swiss-signal text-white border-swiss-signal" : ""
            }`}
          >
            <Clock className="h-3 w-3 mr-1" />
            Needs Grading
          </Button>
          <Button
            variant={filter === "completed" ? "default" : "outline"}
            onClick={() => setFilter("completed")}
            className={`border-2 border-swiss-ink font-bold uppercase text-xs ${
              filter === "completed" ? "bg-green-600 text-white border-green-600" : ""
            }`}
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completed
          </Button>
        </div>
      </div>

      {/* Assignment List */}
      <Card className="border-2 border-swiss-ink">
        <CardHeader className="border-b-2 border-swiss-ink bg-swiss-concrete">
          <CardTitle className="font-black uppercase tracking-tight">Assignments</CardTitle>
          <CardDescription className="font-bold text-xs uppercase tracking-wider text-swiss-lead">
            {filteredAssignments.length} assignment{filteredAssignments.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filteredAssignments.length === 0 ? (
            <div className="text-center py-12 text-swiss-lead">
              <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-bold uppercase tracking-wider">No Assignments Found</p>
              <p className="text-sm mt-1">
                {filter !== "all" 
                  ? "Try changing the filter or search query" 
                  : "Create assignments to start grading"
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-swiss-ink/20">
              {filteredAssignments.map((assignment) => (
                <AssignmentRow key={assignment.id} assignment={assignment} />
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

function AssignmentRow({ assignment }: { assignment: AssignmentForMarkingList }) {
  const progressPercent = assignment.totalStudents > 0 
    ? Math.round((assignment.gradedCount / assignment.totalStudents) * 100)
    : 0

  const submissionPercent = assignment.totalStudents > 0
    ? Math.round((assignment.submittedCount / assignment.totalStudents) * 100)
    : 0

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "No due date"
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const isPastDue = assignment.dueDate && new Date(assignment.dueDate) < new Date()

  return (
    <div className="p-4 hover:bg-swiss-concrete/30 transition-colors">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="font-bold text-lg truncate">{assignment.title}</h3>
            {assignment.status === "draft" && (
              <Badge variant="outline" className="border-swiss-lead text-swiss-lead font-bold text-xs">
                Draft
              </Badge>
            )}
            {assignment.needsGrading > 0 && (
              <Badge className="bg-swiss-signal text-white font-bold text-xs">
                {assignment.needsGrading} to grade
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-swiss-lead">
            <span className="font-medium">{assignment.className}</span>
            <span>•</span>
            <span>{assignment.subject}</span>
            <span>•</span>
            <span className={`flex items-center gap-1 ${isPastDue ? "text-swiss-signal" : ""}`}>
              <Calendar className="h-3 w-3" />
              {formatDate(assignment.dueDate)}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-xs font-bold uppercase tracking-widest text-swiss-lead mb-1">
              Submitted
            </div>
            <div className="font-black text-lg">
              {assignment.submittedCount}/{assignment.totalStudents}
            </div>
            <div className="text-xs text-swiss-lead">{submissionPercent}%</div>
          </div>
          
          <div className="text-center">
            <div className="text-xs font-bold uppercase tracking-widest text-swiss-lead mb-1">
              Graded
            </div>
            <div className={`font-black text-lg ${
              assignment.gradedCount === assignment.submittedCount && assignment.submittedCount > 0
                ? "text-green-600"
                : ""
            }`}>
              {assignment.gradedCount}/{assignment.submittedCount || assignment.totalStudents}
            </div>
            <div className="text-xs text-swiss-lead">{progressPercent}%</div>
          </div>

          <Link href={`/dashboard/assignments/${assignment.id}/mark`}>
            <Button 
              className={`font-bold uppercase tracking-wider border-2 ${
                assignment.needsGrading > 0 
                  ? "bg-swiss-signal hover:bg-swiss-signal/90 text-white border-swiss-signal"
                  : "bg-swiss-paper hover:bg-swiss-concrete text-swiss-ink border-swiss-ink"
              }`}
            >
              <ClipboardCheck className="h-4 w-4 mr-2" />
              {assignment.needsGrading > 0 ? "Grade Now" : "View Marks"}
            </Button>
          </Link>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3 flex gap-1">
        <div className="flex-1 h-2 bg-swiss-concrete rounded-sm overflow-hidden">
          <div 
            className="h-full bg-green-500 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  )
}
