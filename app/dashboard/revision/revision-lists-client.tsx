"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import {
  BookOpen,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Loader2,
  Trophy,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { StudentRevisionListResult, RevisionListQuestionResult } from "@/lib/types/database"
import { getRevisionListQuestions, updateRevisionProgress } from "@/app/actions/revision-lists"
import { toast } from "sonner"

// =====================================================
// Types
// =====================================================

interface RevisionListsClientProps {
  revisionLists: StudentRevisionListResult[]
  userName: string
  isStudent: boolean
}

// =====================================================
// Revision List Card
// =====================================================

interface RevisionListCardProps {
  list: StudentRevisionListResult
  isExpanded: boolean
  onToggleExpand: () => void
}

function RevisionListCard({ list, isExpanded, onToggleExpand }: RevisionListCardProps) {
  const [questions, setQuestions] = useState<RevisionListQuestionResult[]>([])
  const [loading, setLoading] = useState(false)
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const progress = list.total_questions > 0 
    ? Math.round((list.completed_questions / list.total_questions) * 100)
    : 0

  const statusColors = {
    pending: "bg-gray-100 text-gray-700 border-gray-300",
    in_progress: "bg-blue-100 text-blue-700 border-blue-300",
    completed: "bg-green-100 text-green-700 border-green-300",
  }

  const statusLabels = {
    pending: "Not Started",
    in_progress: "In Progress",
    completed: "Completed",
  }

  // Load questions when expanded
  const handleExpand = useCallback(async () => {
    if (!isExpanded && questions.length === 0) {
      setLoading(true)
      const result = await getRevisionListQuestions(list.revision_list_id)
      if (result.success && result.data) {
        setQuestions(result.data)
      }
      setLoading(false)
    }
    onToggleExpand()
  }, [isExpanded, questions.length, list.revision_list_id, onToggleExpand])

  // Toggle question completion
  const handleToggleComplete = useCallback(async (questionId: string, currentlyCompleted: boolean) => {
    setUpdatingId(questionId)
    
    const result = await updateRevisionProgress({
      revisionListId: list.revision_list_id,
      questionId,
      completed: !currentlyCompleted,
    })

    if (result.success) {
      setCompletedIds(prev => {
        const next = new Set(prev)
        if (currentlyCompleted) {
          next.delete(questionId)
        } else {
          next.add(questionId)
        }
        return next
      })
      toast.success(currentlyCompleted ? "Marked as incomplete" : "Marked as complete!")
    } else {
      toast.error("Failed to update progress")
    }
    
    setUpdatingId(null)
  }, [list.revision_list_id])

  return (
    <Card className="border-2 border-swiss-ink">
      {/* Header */}
      <CardHeader 
        className={`cursor-pointer transition-colors ${
          list.status === 'completed' ? 'bg-green-50' : 'bg-swiss-concrete'
        }`}
        onClick={handleExpand}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`
              w-12 h-12 rounded-lg flex items-center justify-center
              ${list.status === 'completed' ? 'bg-green-500' : 'bg-swiss-signal'}
            `}>
              {list.status === 'completed' ? (
                <Trophy className="h-6 w-6 text-white" />
              ) : (
                <BookOpen className="h-6 w-6 text-white" />
              )}
            </div>
            <div>
              <CardTitle className="text-lg font-black uppercase tracking-wider">
                {list.title}
              </CardTitle>
              <CardDescription>
                {list.assignment_title && `From: ${list.assignment_title}`}
                {list.class_name && ` | ${list.class_name}`}
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge className={statusColors[list.status]}>
              {statusLabels[list.status]}
            </Badge>
            
            <div className="text-right hidden md:block">
              <p className="text-sm font-bold">
                {list.completed_questions} / {list.total_questions}
              </p>
              <p className="text-xs text-swiss-lead">questions done</p>
            </div>
            
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-swiss-lead" />
            ) : (
              <ChevronDown className="h-5 w-5 text-swiss-lead" />
            )}
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-4">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-swiss-lead mt-1 text-right">{progress}% complete</p>
        </div>
      </CardHeader>

      {/* Expanded content */}
      {isExpanded && (
        <CardContent className="p-0 border-t-2 border-swiss-ink">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-swiss-signal" />
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-12 text-swiss-lead">
              No questions found
            </div>
          ) : (
            <div className="divide-y divide-swiss-ink/20">
              {questions.map((q, index) => {
                const isCompleted = completedIds.has(q.question_id) || 
                  (list.completed_questions > index && !completedIds.has(q.question_id))
                const isUpdating = updatingId === q.question_id

                return (
                  <div 
                    key={q.question_id}
                    className={`p-4 transition-colors ${isCompleted ? 'bg-green-50' : ''}`}
                  >
                    <div className="flex items-start gap-4">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleToggleComplete(q.question_id, isCompleted)}
                        disabled={isUpdating}
                        className={`
                          shrink-0 border-2 
                          ${isCompleted 
                            ? 'border-green-500 bg-green-500 text-white hover:bg-green-600' 
                            : 'border-swiss-ink hover:bg-swiss-concrete'
                          }
                        `}
                      >
                        {isUpdating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isCompleted ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <span className="text-sm font-bold">{index + 1}</span>
                        )}
                      </Button>
                      
                      <div className="flex-1">
                        {q.source_question_number && (
                          <p className="text-xs text-swiss-lead mb-1">
                            Based on Q{q.source_question_number}
                          </p>
                        )}
                        <p className={`font-mono text-sm ${isCompleted ? 'text-swiss-lead line-through' : ''}`}>
                          {q.question_latex}
                        </p>
                        
                        <div className="flex gap-2 mt-2">
                          <Badge variant="secondary">{q.topic}</Badge>
                          {q.sub_topic && (
                            <Badge variant="outline">{q.sub_topic}</Badge>
                          )}
                          <Badge>{q.marks} marks</Badge>
                        </div>

                        {/* Show answer */}
                        {q.answer_key && (
                          <details className="mt-3">
                            <summary className="text-xs text-blue-600 font-bold cursor-pointer">
                              View Answer
                            </summary>
                            <div className="mt-2 p-3 bg-white rounded border text-sm">
                              <p><strong>Answer:</strong> {q.answer_key.answer}</p>
                              {q.answer_key.explanation && (
                                <p className="mt-2 text-swiss-lead">
                                  {q.answer_key.explanation}
                                </p>
                              )}
                            </div>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

// =====================================================
// Main Component
// =====================================================

export function RevisionListsClient({ 
  revisionLists, 
  userName,
  isStudent: _isStudent,
}: RevisionListsClientProps) {
  void _isStudent // Available for conditional rendering if needed
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Stats
  const totalLists = revisionLists.length
  const completedLists = revisionLists.filter(l => l.status === 'completed').length
  const inProgressLists = revisionLists.filter(l => l.status === 'in_progress').length
  const totalQuestions = revisionLists.reduce((sum, l) => sum + l.total_questions, 0)
  const completedQuestions = revisionLists.reduce((sum, l) => sum + l.completed_questions, 0)

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="border-b-2 border-swiss-ink pb-6">
        <h1 className="text-3xl font-black uppercase tracking-tight">
          Revision Lists
        </h1>
        <p className="text-swiss-lead mt-1">
          Practice questions to help you prepare, {userName}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-2 border-swiss-ink">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-black text-swiss-signal">{totalLists}</p>
            <p className="text-xs font-bold uppercase tracking-wider text-swiss-lead">
              Revision Lists
            </p>
          </CardContent>
        </Card>
        <Card className="border-2 border-swiss-ink">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-black text-green-600">{completedLists}</p>
            <p className="text-xs font-bold uppercase tracking-wider text-swiss-lead">
              Completed
            </p>
          </CardContent>
        </Card>
        <Card className="border-2 border-swiss-ink">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-black text-blue-600">{inProgressLists}</p>
            <p className="text-xs font-bold uppercase tracking-wider text-swiss-lead">
              In Progress
            </p>
          </CardContent>
        </Card>
        <Card className="border-2 border-swiss-ink">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-black">
              {completedQuestions}/{totalQuestions}
            </p>
            <p className="text-xs font-bold uppercase tracking-wider text-swiss-lead">
              Questions Done
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revision lists */}
      {revisionLists.length === 0 ? (
        <Card className="border-2 border-swiss-ink">
          <CardContent className="p-12 text-center">
            <BookOpen className="h-16 w-16 mx-auto text-swiss-lead mb-4" />
            <h3 className="text-xl font-black uppercase tracking-wider mb-2">
              No Revision Lists Yet
            </h3>
            <p className="text-swiss-lead max-w-md mx-auto">
              When your teacher assigns revision materials, they will appear here.
              Check back later!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <h2 className="font-black uppercase tracking-wider text-sm text-swiss-lead">
            Your Revision Lists
          </h2>
          
          {revisionLists.map(list => (
            <RevisionListCard
              key={list.revision_list_id}
              list={list}
              isExpanded={expandedId === list.revision_list_id}
              onToggleExpand={() => setExpandedId(
                expandedId === list.revision_list_id ? null : list.revision_list_id
              )}
            />
          ))}
        </div>
      )}

      {/* Back link */}
      <div className="pt-4">
        <Link href="/dashboard">
          <Button variant="outline" className="border-2 border-swiss-ink">
            <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  )
}
