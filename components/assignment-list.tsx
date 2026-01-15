"use client"

import { useState, useEffect } from "react"
import { 
  getTeacherAssignments, 
  deleteAssignment, 
  publishAssignment,
  type AssignmentWithClass 
} from "@/app/actions/assignments"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { CreateAssignmentModal } from "./create-assignment-modal"
import { 
  MoreHorizontal, 
  Trash2, 
  Send, 
  FileText,
  Calendar,
  Users,
  Clock
} from "lucide-react"

export function AssignmentList() {
  const [assignments, setAssignments] = useState<AssignmentWithClass[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchAssignments()
  }, [])

  const fetchAssignments = async () => {
    setLoading(true)
    const result = await getTeacherAssignments()
    if (result.success && result.data) {
      setAssignments(result.data)
    }
    setLoading(false)
  }

  const handleDelete = async (assignmentId: string) => {
    if (!confirm("Are you sure you want to delete this assignment? This action cannot be undone.")) {
      return
    }

    setActionLoading(assignmentId)
    const result = await deleteAssignment(assignmentId)
    if (result.success) {
      fetchAssignments()
    }
    setActionLoading(null)
  }

  const handlePublish = async (assignmentId: string) => {
    setActionLoading(assignmentId)
    const result = await publishAssignment(assignmentId)
    if (result.success) {
      fetchAssignments()
    }
    setActionLoading(null)
  }

  const formatDueDate = (dueDate: string | null) => {
    if (!dueDate) return "No due date"
    const date = new Date(dueDate)
    const now = new Date()
    const isOverdue = date < now
    
    return (
      <span className={isOverdue ? "text-swiss-signal" : ""}>
        {date.toLocaleDateString("en-GB", { 
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        })}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black uppercase tracking-tight text-swiss-ink">
            Assignments
          </h3>
          <p className="text-sm text-swiss-lead font-medium">
            Create and manage class assignments
          </p>
        </div>
        <CreateAssignmentModal onCreated={() => fetchAssignments()} />
      </div>

      {/* Assignment List */}
      {loading ? (
        <div className="border-2 border-swiss-ink bg-swiss-paper p-12 text-center">
          <p className="text-swiss-lead font-bold uppercase tracking-wider">Loading assignments...</p>
        </div>
      ) : assignments.length === 0 ? (
        <div className="border-2 border-swiss-ink bg-swiss-paper p-12 text-center">
          <FileText className="w-12 h-12 mx-auto text-swiss-lead mb-4" />
          <p className="text-swiss-lead font-bold uppercase tracking-wider mb-2">
            No assignments yet
          </p>
          <p className="text-sm text-swiss-lead mb-6">
            Create your first assignment to get started
          </p>
          <CreateAssignmentModal onCreated={() => fetchAssignments()} />
        </div>
      ) : (
        <div className="border-2 border-swiss-ink bg-swiss-paper">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-swiss-ink bg-swiss-concrete">
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-swiss-lead">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-swiss-lead">
                    Class
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-swiss-lead">
                    Due Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-swiss-lead">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-swiss-lead">
                    Submissions
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-swiss-lead">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment) => (
                  <tr 
                    key={assignment.id} 
                    className="border-b border-swiss-ink last:border-0 hover:bg-swiss-concrete transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-swiss-lead flex-shrink-0" />
                        <span className="text-sm font-medium text-swiss-ink">
                          {assignment.title}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-swiss-lead">
                        <span className="font-medium text-swiss-ink">{assignment.class_name}</span>
                        <span className="text-swiss-lead"> - {assignment.subject}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-swiss-lead">
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        {formatDueDate(assignment.due_date)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge 
                        className={`font-bold uppercase tracking-wider text-xs ${
                          assignment.status === "published"
                            ? "bg-swiss-signal text-swiss-paper"
                            : "bg-swiss-concrete text-swiss-ink border-2 border-swiss-ink"
                        }`}
                      >
                        {assignment.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-swiss-lead">
                        <Users className="w-4 h-4 flex-shrink-0" />
                        {assignment.submission_count || 0}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="hover:bg-swiss-concrete"
                            disabled={actionLoading === assignment.id}
                          >
                            {actionLoading === assignment.id ? (
                              <Clock className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4" />
                            )}
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {assignment.status === "draft" && (
                            <DropdownMenuItem 
                              onClick={() => handlePublish(assignment.id)}
                            >
                              <Send className="w-4 h-4 mr-2" />
                              Publish
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => handleDelete(assignment.id)}
                            className="text-swiss-signal focus:text-swiss-signal"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stats Summary */}
      {!loading && assignments.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="border-2 border-swiss-ink bg-swiss-concrete p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-swiss-lead mb-1">
              Total
            </p>
            <p className="text-3xl font-black text-swiss-ink">
              {assignments.length}
            </p>
          </div>
          <div className="border-2 border-swiss-ink bg-swiss-paper p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-swiss-lead mb-1">
              Published
            </p>
            <p className="text-3xl font-black text-swiss-signal">
              {assignments.filter(a => a.status === "published").length}
            </p>
          </div>
          <div className="border-2 border-swiss-ink bg-swiss-paper p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-swiss-lead mb-1">
              Drafts
            </p>
            <p className="text-3xl font-black text-swiss-ink">
              {assignments.filter(a => a.status === "draft").length}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
