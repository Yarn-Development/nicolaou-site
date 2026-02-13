"use client"

import Link from "next/link"
import {
  ArrowLeft,
  BookOpen,
  FileText,
  Users,
  CheckCircle2,
  Clock,
  Circle,
  Calculator,
  Hash,
  Calendar,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LatexPreview } from "@/components/latex-preview"
import type { RevisionListQuestionResult } from "@/lib/types/database"

// =====================================================
// Types
// =====================================================

interface RevisionListInfo {
  id: string
  title: string
  description: string | null
  assignment_id: string
  assignment_title: string
  class_name: string
  subject: string
  created_at: string
}

interface AllocationInfo {
  studentId: string
  studentName: string
  status: string
  completedQuestions: number
  totalQuestions: number
}

interface RevisionDetailClientProps {
  revisionList: RevisionListInfo
  questions: RevisionListQuestionResult[]
  allocations: AllocationInfo[]
}

// =====================================================
// Status config
// =====================================================

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: typeof CheckCircle2; badgeClass: string }
> = {
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    badgeClass: "bg-green-100 text-green-800 border-green-300",
  },
  in_progress: {
    label: "In Progress",
    icon: Clock,
    badgeClass: "bg-blue-100 text-blue-800 border-blue-300",
  },
  pending: {
    label: "Pending",
    icon: Circle,
    badgeClass: "bg-gray-100 text-gray-600 border-gray-300",
  },
}

// =====================================================
// Component
// =====================================================

export function RevisionDetailClient({
  revisionList,
  questions,
  allocations,
}: RevisionDetailClientProps) {
  const completedStudents = allocations.filter(
    (a) => a.status === "completed"
  ).length
  const inProgressStudents = allocations.filter(
    (a) => a.status === "in_progress"
  ).length

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href="/dashboard/library">
        <Button
          variant="ghost"
          className="font-bold uppercase text-xs tracking-wider -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Library
        </Button>
      </Link>

      {/* Header */}
      <div className="border-b-2 border-swiss-ink pb-6">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 md:col-span-3">
            <span className="block text-sm font-bold uppercase tracking-widest text-swiss-signal mb-2">
              Revision List
            </span>
          </div>
          <div className="col-span-12 md:col-span-9">
            <div className="flex items-center gap-3 mb-2">
              <BookOpen className="h-6 w-6 text-amber-600" />
              <h1 className="text-4xl font-black tracking-tight uppercase">
                {revisionList.title}
              </h1>
            </div>
            {revisionList.description && (
              <p className="text-swiss-lead font-medium mb-3">
                {revisionList.description}
              </p>
            )}
            <div className="flex items-center gap-4 text-sm text-swiss-lead font-medium flex-wrap">
              <span className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                {revisionList.assignment_title}
              </span>
              <span className="text-swiss-ink/30">|</span>
              <span>{revisionList.class_name}</span>
              <span className="text-swiss-ink/30">|</span>
              <span>{revisionList.subject}</span>
              <span className="text-swiss-ink/30">|</span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(revisionList.created_at).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-0 md:grid-cols-3 border-2 border-swiss-ink">
        <div className="border-r-2 border-swiss-ink p-6 bg-swiss-paper">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-swiss-lead">
              Questions
            </span>
            <Hash className="h-5 w-5 text-swiss-ink" />
          </div>
          <div className="text-4xl font-black">{questions.length}</div>
          <p className="text-xs text-swiss-lead font-bold uppercase tracking-wider mt-1">
            revision questions
          </p>
        </div>

        <div className="border-r-2 border-swiss-ink p-6 bg-swiss-paper">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-swiss-lead">
              Students
            </span>
            <Users className="h-5 w-5 text-swiss-ink" />
          </div>
          <div className="text-4xl font-black">{allocations.length}</div>
          <p className="text-xs text-swiss-lead font-bold uppercase tracking-wider mt-1">
            allocated
          </p>
        </div>

        <div className="p-6 bg-green-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-green-700">
              Completed
            </span>
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
          <div className="text-4xl font-black text-green-700">
            {completedStudents}
            <span className="text-lg text-green-500 font-bold ml-1">
              / {allocations.length}
            </span>
          </div>
          <p className="text-xs text-green-600 font-bold uppercase tracking-wider mt-1">
            {inProgressStudents > 0
              ? `${inProgressStudents} in progress`
              : "students finished"}
          </p>
        </div>
      </div>

      {/* Questions Section */}
      <Card className="border-2 border-swiss-ink">
        <CardHeader className="border-b-2 border-swiss-ink">
          <CardTitle className="text-lg font-black uppercase tracking-wider">
            Questions
            <span className="text-swiss-lead font-bold ml-2">
              ({questions.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {questions.length === 0 ? (
            <div className="p-12 text-center">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-swiss-lead" />
              <p className="text-swiss-lead font-medium">
                No questions in this revision list.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-swiss-ink/20">
              {questions.map((question, index) => (
                <QuestionRow
                  key={question.question_id}
                  question={question}
                  index={index}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student Progress Section */}
      <Card className="border-2 border-swiss-ink">
        <CardHeader className="border-b-2 border-swiss-ink">
          <CardTitle className="text-lg font-black uppercase tracking-wider">
            Student Progress
            <span className="text-swiss-lead font-bold ml-2">
              ({allocations.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {allocations.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-swiss-lead" />
              <p className="text-swiss-lead font-medium">
                No students allocated to this revision list.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-swiss-ink/20">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-swiss-concrete/30">
                <div className="col-span-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-swiss-lead">
                    Student
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-swiss-lead">
                    Status
                  </span>
                </div>
                <div className="col-span-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-swiss-lead">
                    Progress
                  </span>
                </div>
                <div className="col-span-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-swiss-lead">
                    Completed
                  </span>
                </div>
              </div>

              {/* Student Rows */}
              {allocations.map((allocation) => (
                <StudentRow
                  key={allocation.studentId}
                  allocation={allocation}
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
// Question Row Component
// =====================================================

function QuestionRow({
  question,
  index,
}: {
  question: RevisionListQuestionResult
  index: number
}) {
  return (
    <div className="px-6 py-4">
      {/* Question Header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center border-2 border-swiss-ink bg-swiss-concrete/30 font-black text-sm">
            {index + 1}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-swiss-concrete text-swiss-ink border border-swiss-ink/20 text-[10px] font-bold uppercase tracking-wider">
              {question.topic}
            </Badge>
            {question.sub_topic && (
              <Badge className="bg-swiss-paper text-swiss-lead border border-swiss-ink/10 text-[10px] font-bold uppercase tracking-wider">
                {question.sub_topic}
              </Badge>
            )}
            <Badge
              className={`text-[10px] font-bold uppercase tracking-wider border ${
                question.difficulty === "Higher"
                  ? "bg-red-100 text-red-800 border-red-300"
                  : "bg-blue-100 text-blue-800 border-blue-300"
              }`}
            >
              {question.difficulty}
            </Badge>
            {question.calculator_allowed && (
              <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-bold uppercase tracking-wider border">
                <Calculator className="h-3 w-3 mr-1" />
                Calc
              </Badge>
            )}
          </div>
        </div>
        {question.marks && (
          <span className="text-sm font-black text-swiss-ink whitespace-nowrap">
            {question.marks} {question.marks === 1 ? "mark" : "marks"}
          </span>
        )}
      </div>

      {/* Question Content */}
      {question.question_latex && (
        <div className="ml-11">
          <LatexPreview
            latex={question.question_latex}
            className="text-sm"
          />
        </div>
      )}

      {/* Source Question Reference */}
      {question.source_question_number && (
        <div className="ml-11 mt-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-swiss-lead">
            Based on Q{question.source_question_number}
          </span>
          {question.source_question_latex && (
            <div className="mt-1 pl-3 border-l-2 border-swiss-ink/20">
              <LatexPreview
                latex={question.source_question_latex}
                className="text-xs text-swiss-lead"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// =====================================================
// Student Row Component
// =====================================================

function StudentRow({ allocation }: { allocation: AllocationInfo }) {
  const statusConfig = STATUS_CONFIG[allocation.status] || STATUS_CONFIG.pending
  const StatusIcon = statusConfig.icon
  const progressPercent =
    allocation.totalQuestions > 0
      ? Math.round(
          (allocation.completedQuestions / allocation.totalQuestions) * 100
        )
      : 0

  return (
    <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-swiss-concrete/30 transition-colors">
      {/* Student Name */}
      <div className="col-span-4">
        <span className="font-bold text-swiss-ink">
          {allocation.studentName}
        </span>
      </div>

      {/* Status Badge */}
      <div className="col-span-2">
        <Badge
          className={`${statusConfig.badgeClass} text-[10px] font-bold uppercase tracking-wider border`}
        >
          <StatusIcon className="h-3 w-3 mr-1" />
          {statusConfig.label}
        </Badge>
      </div>

      {/* Progress Bar */}
      <div className="col-span-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-swiss-concrete rounded-full overflow-hidden border border-swiss-ink/10">
            <div
              className={`h-full transition-all duration-300 ${
                progressPercent === 100
                  ? "bg-green-500"
                  : progressPercent > 0
                  ? "bg-blue-500"
                  : "bg-gray-300"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs font-bold text-swiss-lead w-10 text-right">
            {progressPercent}%
          </span>
        </div>
      </div>

      {/* Completed Count */}
      <div className="col-span-3">
        <span className="text-sm font-bold text-swiss-ink">
          {allocation.completedQuestions}
          <span className="text-swiss-lead font-medium">
            {" "}
            / {allocation.totalQuestions}
          </span>
        </span>
        <span className="text-xs text-swiss-lead ml-1">questions</span>
      </div>
    </div>
  )
}
