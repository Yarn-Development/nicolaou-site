"use client"

import { Calendar, Clock, FileText, BookOpen, Target } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface TopicSummary {
  topic: string
  subTopics: string[]
  questionCount: number
  totalMarks: number
}

interface PaperExamPrepSheetProps {
  title: string
  className: string
  dueDate: string | null
  totalMarks: number
  topicSummaries: TopicSummary[]
  estimatedDuration?: number // in minutes
}

export function PaperExamPrepSheet({
  title,
  className,
  dueDate,
  totalMarks,
  topicSummaries,
  estimatedDuration,
}: PaperExamPrepSheetProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set"
    const date = new Date(dateString)
    return date.toLocaleDateString("en-GB", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatTime = (dateString: string | null) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    return date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const totalQuestions = topicSummaries.reduce((sum, t) => sum + t.questionCount, 0)

  return (
    <div className="min-h-screen bg-swiss-paper">
      {/* Header */}
      <div className="border-b-4 border-swiss-ink bg-swiss-paper">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between">
            <div>
              <Badge className="mb-3 bg-blue-600 text-white font-bold uppercase tracking-wider">
                Paper Exam - Preparation Sheet
              </Badge>
              <h1 className="text-4xl font-black uppercase tracking-tight text-swiss-ink mb-2">
                {title}
              </h1>
              <p className="text-lg font-bold text-swiss-lead uppercase tracking-wider">
                {className}
              </p>
            </div>
            <Link href="/student-dashboard">
              <Button variant="outline" className="border-2 border-swiss-ink font-bold uppercase">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Exam Details Card */}
        <Card className="border-2 border-swiss-ink">
          <CardHeader className="border-b-2 border-swiss-ink bg-swiss-concrete">
            <CardTitle className="font-black uppercase tracking-tight flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Exam Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Date */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 border-2 border-swiss-ink bg-swiss-paper flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-5 w-5 text-swiss-ink" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-swiss-lead mb-1">
                    Exam Date
                  </p>
                  <p className="font-bold text-sm">{formatDate(dueDate)}</p>
                  {dueDate && (
                    <p className="text-xs text-swiss-lead font-bold">{formatTime(dueDate)}</p>
                  )}
                </div>
              </div>

              {/* Duration */}
              {estimatedDuration && (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 border-2 border-swiss-ink bg-swiss-paper flex items-center justify-center flex-shrink-0">
                    <Clock className="h-5 w-5 text-swiss-ink" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-swiss-lead mb-1">
                      Duration
                    </p>
                    <p className="font-bold text-sm">{estimatedDuration} minutes</p>
                  </div>
                </div>
              )}

              {/* Total Marks */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 border-2 border-swiss-ink bg-swiss-paper flex items-center justify-center flex-shrink-0">
                  <Target className="h-5 w-5 text-swiss-ink" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-swiss-lead mb-1">
                    Total Marks
                  </p>
                  <p className="font-bold text-sm">{totalMarks} marks</p>
                </div>
              </div>

              {/* Question Count */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 border-2 border-swiss-ink bg-swiss-paper flex items-center justify-center flex-shrink-0">
                  <BookOpen className="h-5 w-5 text-swiss-ink" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-swiss-lead mb-1">
                    Questions
                  </p>
                  <p className="font-bold text-sm">{totalQuestions} questions</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions Card */}
        <Card className="border-2 border-blue-600 bg-blue-50">
          <CardHeader className="border-b-2 border-blue-600 bg-blue-100">
            <CardTitle className="font-black uppercase tracking-tight text-blue-900">
              Exam Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ul className="space-y-2 text-sm font-bold text-blue-900">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-black">•</span>
                <span>This is a <strong>paper-based exam</strong>. You will complete it on physical exam paper.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-black">•</span>
                <span>Bring all necessary materials (pens, pencils, calculator if allowed, ruler, etc.).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-black">•</span>
                <span>Review the topics listed below to prepare for the exam.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-black">•</span>
                <span>Your teacher will mark your paper and enter your marks digitally.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-black">•</span>
                <span>Once marked, you will be able to view your results and personalized revision sheet here.</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Topics to Review */}
        <Card className="border-2 border-swiss-ink">
          <CardHeader className="border-b-2 border-swiss-ink bg-swiss-concrete">
            <CardTitle className="font-black uppercase tracking-tight">
              Topics Covered in This Exam
            </CardTitle>
            <p className="text-xs font-bold uppercase tracking-wider text-swiss-lead mt-2">
              Review these topics to prepare
            </p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {topicSummaries.map((topicSummary, index) => (
                <div
                  key={index}
                  className="border-2 border-swiss-ink bg-swiss-paper p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-black uppercase text-lg text-swiss-ink">
                        {topicSummary.topic}
                      </h3>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-right">
                        <p className="text-xs font-black uppercase tracking-widest text-swiss-lead">
                          Questions
                        </p>
                        <p className="font-bold">{topicSummary.questionCount}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black uppercase tracking-widest text-swiss-lead">
                          Marks
                        </p>
                        <p className="font-bold">{topicSummary.totalMarks}</p>
                      </div>
                    </div>
                  </div>

                  {topicSummary.subTopics.length > 0 && (
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-swiss-lead mb-2">
                        Sub-Topics:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {topicSummary.subTopics.map((subTopic, subIndex) => (
                          <Badge
                            key={subIndex}
                            variant="outline"
                            className="border-2 border-swiss-ink bg-swiss-concrete font-bold uppercase text-xs"
                          >
                            {subTopic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <Card className="border-2 border-green-600 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black uppercase text-lg text-green-900 mb-1">
                  Ready to Prepare?
                </h3>
                <p className="text-sm font-bold text-green-800">
                  Review your notes and practice questions on these topics.
                </p>
              </div>
              <Link href="/student-dashboard/practice">
                <Button className="bg-green-600 hover:bg-green-700 text-white font-bold uppercase tracking-wider border-2 border-green-800">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Practice Questions
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
