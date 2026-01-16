"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { 
  ArrowLeft, 
  Users, 
  TrendingDown, 
  TrendingUp,
  Printer,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Target,
  Eye
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { generateFeedback, type AssignmentFeedbackSummary } from "@/app/actions/feedback"

interface Props {
  assignmentId: string
}

export function FeedbackOverviewClient({ assignmentId }: Props) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<AssignmentFeedbackSummary | null>(null)

  useEffect(() => {
    loadFeedback()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId])

  const loadFeedback = async () => {
    setIsLoading(true)
    setError(null)
    
    const result = await generateFeedback(assignmentId)
    
    if (result.success && result.data) {
      setFeedback(result.data)
    } else {
      setError(result.error || "Failed to generate feedback")
    }
    
    setIsLoading(false)
  }

  if (isLoading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-swiss-signal mb-4" />
        <p className="text-sm font-bold uppercase tracking-wider text-swiss-lead">
          Analyzing student performance...
        </p>
      </div>
    )
  }

  if (error || !feedback) {
    return (
      <div className="p-8">
        <Card className="border-2 border-red-500 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <div>
                <p className="font-bold text-red-800">Error Loading Feedback</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getRAGColor = (percentage: number) => {
    if (percentage >= 70) return { bg: "bg-green-100", text: "text-green-700", border: "border-green-500" }
    if (percentage >= 40) return { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-500" }
    return { bg: "bg-red-100", text: "text-red-700", border: "border-red-500" }
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="border-b-2 border-swiss-ink pb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Link href={`/dashboard/assignments/${assignmentId}/mark`}>
              <Button variant="outline" size="icon" className="border-2 border-swiss-ink">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tight">
                CLASS FEEDBACK
              </h1>
              <p className="text-sm text-swiss-lead font-bold uppercase tracking-wider mt-1">
                {feedback.assignmentTitle} • {feedback.className}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-2 border-swiss-ink">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-swiss-signal" />
              <div>
                <p className="text-3xl font-black">{feedback.gradedStudents}</p>
                <p className="text-xs font-bold uppercase tracking-wider text-swiss-lead">
                  Students Graded
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-2 ${getRAGColor(feedback.averageScore).border}`}>
          <CardContent className={`pt-6 ${getRAGColor(feedback.averageScore).bg}`}>
            <div className="flex items-center gap-3">
              <Target className={`h-8 w-8 ${getRAGColor(feedback.averageScore).text}`} />
              <div>
                <p className={`text-3xl font-black ${getRAGColor(feedback.averageScore).text}`}>
                  {feedback.averageScore}%
                </p>
                <p className="text-xs font-bold uppercase tracking-wider text-swiss-lead">
                  Class Average
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-swiss-ink">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-3xl font-black text-green-600">
                  {feedback.studentFeedback.filter(s => s.overallPercentage >= 70).length}
                </p>
                <p className="text-xs font-bold uppercase tracking-wider text-swiss-lead">
                  Strong (70%+)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-swiss-ink">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingDown className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-3xl font-black text-red-600">
                  {feedback.studentFeedback.filter(s => s.overallPercentage < 40).length}
                </p>
                <p className="text-xs font-bold uppercase tracking-wider text-swiss-lead">
                  Need Support (&lt;40%)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Topic Breakdown */}
      <Card className="border-2 border-swiss-ink">
        <CardHeader className="border-b-2 border-swiss-ink bg-swiss-concrete">
          <CardTitle className="font-black uppercase tracking-tight">
            Topic Performance
          </CardTitle>
          <CardDescription className="font-bold text-xs uppercase tracking-wider text-swiss-lead">
            Class-wide breakdown by topic. Red topics need whole-class intervention.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {feedback.topicBreakdown.map((topic) => {
              const colors = getRAGColor(topic.averagePercentage)
              return (
                <div key={topic.topic} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm uppercase tracking-wider">
                        {topic.topic}
                      </span>
                      <div className="flex items-center gap-3">
                        {topic.studentsStruggling > 0 && (
                          <Badge variant="outline" className={`${colors.border} ${colors.text}`}>
                            {topic.studentsStruggling} struggling
                          </Badge>
                        )}
                        <span className={`font-black text-lg ${colors.text}`}>
                          {topic.averagePercentage}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-3 bg-swiss-concrete border border-swiss-ink">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          topic.averagePercentage >= 70 ? "bg-green-500" :
                          topic.averagePercentage >= 40 ? "bg-amber-500" : "bg-red-500"
                        }`}
                        style={{ width: `${topic.averagePercentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Student List */}
      <Card className="border-2 border-swiss-ink">
        <CardHeader className="border-b-2 border-swiss-ink bg-swiss-concrete">
          <CardTitle className="font-black uppercase tracking-tight">
            Individual Students
          </CardTitle>
          <CardDescription className="font-bold text-xs uppercase tracking-wider text-swiss-lead">
            Click on a student to view their detailed feedback and print revision worksheets.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-swiss-ink/20">
            {feedback.studentFeedback.map((student) => {
              const colors = getRAGColor(student.overallPercentage)
              return (
                <div 
                  key={student.studentId}
                  className={`p-4 flex items-center justify-between hover:bg-swiss-concrete/50 transition-colors ${colors.bg}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${colors.border} ${colors.bg}`}>
                      <span className={`text-lg font-black ${colors.text}`}>
                        {student.overallPercentage}%
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-sm">{student.studentName}</p>
                      <p className="text-xs text-swiss-lead">{student.studentEmail}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-bold text-swiss-lead">
                          {student.overallScore}/{student.maxMarks} marks
                        </span>
                        {student.weakTopics.length > 0 && (
                          <Badge variant="outline" className="text-xs border-red-500 text-red-600">
                            {student.weakTopics.length} weak topic{student.weakTopics.length > 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link href={`/dashboard/feedback/submission/${student.submissionId}`}>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-2 border-swiss-ink font-bold uppercase text-xs"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Feedback
                      </Button>
                    </Link>
                    {student.weakTopics.length > 0 ? (
                      <Link href={`/revision/${student.studentId}/${assignmentId}`} target="_blank">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-2 border-swiss-ink font-bold uppercase text-xs"
                        >
                          <Printer className="h-4 w-4 mr-2" />
                          Print Revision
                        </Button>
                      </Link>
                    ) : (
                      <Badge className="bg-green-500 text-white font-bold uppercase text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        No Revision Needed
                      </Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {feedback.studentFeedback.length === 0 && (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 mx-auto text-swiss-lead/40 mb-4" />
              <p className="font-bold text-swiss-lead uppercase tracking-wider">
                No graded submissions yet
              </p>
              <p className="text-sm text-swiss-lead mt-1">
                Mark student work to see feedback analysis
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
