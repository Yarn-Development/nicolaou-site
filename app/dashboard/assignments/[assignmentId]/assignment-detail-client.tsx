"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, FileText, CheckCircle, ClipboardList, Calendar, Users, Hash, Calculator, Ban, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { AssignmentDetails } from "@/app/actions/assignments"
import "katex/dist/katex.min.css"
import { InlineMath } from "react-katex"

interface AssignmentDetailClientProps {
  assignment: AssignmentDetails
}

// Helper to render LaTeX content
function renderLatex(text: string) {
  if (!text) return null
  
  // Split by $ delimiters
  const parts = text.split(/(\$[^$]+\$)/g)
  
  return parts.map((part, i) => {
    if (part.startsWith("$") && part.endsWith("$")) {
      const latex = part.slice(1, -1)
      try {
        return <InlineMath key={i} math={latex} />
      } catch {
        return <span key={i}>{part}</span>
      }
    }
    return <span key={i}>{part}</span>
  })
}

export function AssignmentDetailClient({ assignment }: AssignmentDetailClientProps) {
  const router = useRouter()

  const statusColors: Record<string, string> = {
    draft: "bg-amber-100 text-amber-800 border-amber-300",
    published: "bg-green-100 text-green-800 border-green-300",
  }

  return (
    <div className="min-h-screen bg-swiss-coffee">
      {/* Header */}
      <div className="bg-white border-b-2 border-swiss-ink sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/dashboard/assignments")}
                className="hover:bg-swiss-coffee"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-black uppercase tracking-wider text-swiss-ink">
                  {assignment.title}
                </h1>
                <p className="text-sm text-swiss-lead">
                  {assignment.class_name} - {assignment.subject}
                </p>
              </div>
            </div>
            <Badge className={`${statusColors[assignment.status]} uppercase font-bold text-xs tracking-wider`}>
              {assignment.status}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border-2 border-swiss-ink p-4">
            <div className="flex items-center gap-2 mb-2">
              <Hash className="w-4 h-4 text-swiss-signal" />
              <span className="text-xs text-swiss-lead uppercase tracking-wider">Questions</span>
            </div>
            <p className="text-2xl font-black text-swiss-ink">{assignment.question_count}</p>
          </div>
          <div className="bg-white border-2 border-swiss-ink p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-swiss-signal" />
              <span className="text-xs text-swiss-lead uppercase tracking-wider">Total Marks</span>
            </div>
            <p className="text-2xl font-black text-swiss-ink">{assignment.total_marks}</p>
          </div>
          <div className="bg-white border-2 border-swiss-ink p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-swiss-signal" />
              <span className="text-xs text-swiss-lead uppercase tracking-wider">Due Date</span>
            </div>
            <p className="text-lg font-bold text-swiss-ink">
              {assignment.due_date 
                ? new Date(assignment.due_date).toLocaleDateString("en-GB", { 
                    day: "numeric", 
                    month: "short" 
                  })
                : "Not set"
              }
            </p>
          </div>
          <div className="bg-white border-2 border-swiss-ink p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-swiss-signal" />
              <span className="text-xs text-swiss-lead uppercase tracking-wider">Class</span>
            </div>
            <p className="text-lg font-bold text-swiss-ink truncate">{assignment.class_name}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-8">
          <Link href={`/dashboard/assignments/${assignment.id}/mark`}>
            <Button className="bg-swiss-signal hover:bg-swiss-signal/90 text-white font-bold uppercase tracking-wider">
              <ClipboardList className="w-4 h-4 mr-2" />
              Mark Submissions
            </Button>
          </Link>
          <Link href={`/dashboard/assignments/${assignment.id}/feedback`}>
            <Button variant="outline" className="border-2 border-swiss-ink font-bold uppercase tracking-wider">
              <FileText className="w-4 h-4 mr-2" />
              View Feedback
            </Button>
          </Link>
          <Link href={`/dashboard/assignments/${assignment.id}/print`}>
            <Button variant="outline" className="border-2 border-swiss-ink font-bold uppercase tracking-wider">
              <Printer className="w-4 h-4 mr-2" />
              Print Exam Paper
            </Button>
          </Link>
          <Link href={`/dashboard/assignments/${assignment.id}/print?view=marksheet`}>
            <Button variant="outline" className="border-2 border-swiss-ink font-bold uppercase tracking-wider">
              <ClipboardList className="w-4 h-4 mr-2" />
              Student Marksheet
            </Button>
          </Link>
        </div>

        {/* Questions List */}
        <div className="bg-white border-2 border-swiss-ink">
          <div className="border-b-2 border-swiss-ink px-6 py-4">
            <h2 className="text-lg font-black uppercase tracking-wider text-swiss-ink">
              Questions
            </h2>
          </div>
          <div className="divide-y-2 divide-swiss-ink/20">
            {assignment.questions.map((q, index) => (
              <div key={q.question_id} className="px-6 py-4">
                <div className="flex items-start gap-4">
                  {/* Question Number */}
                  <div className="flex-shrink-0 w-10 h-10 bg-swiss-ink text-white flex items-center justify-center font-black text-lg">
                    {index + 1}
                  </div>
                  
                  {/* Question Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant="outline" className="text-xs font-medium">
                        {q.topic}
                      </Badge>
                      <Badge variant="outline" className="text-xs font-medium bg-swiss-coffee">
                        {q.sub_topic}
                      </Badge>
                      <Badge variant="outline" className="text-xs font-medium">
                        {q.difficulty}
                      </Badge>
                      {q.calculator_allowed ? (
                        <span title="Calculator allowed">
                          <Calculator className="w-4 h-4 text-green-600" />
                        </span>
                      ) : (
                        <span title="No calculator" className="relative">
                          <Calculator className="w-4 h-4 text-red-500" />
                          <Ban className="w-4 h-4 text-red-500 absolute inset-0" />
                        </span>
                      )}
                    </div>
                    <p className="text-swiss-ink leading-relaxed">
                      {renderLatex(q.question_latex)}
                    </p>
                  </div>
                  
                  {/* Marks */}
                  <div className="flex-shrink-0 text-right">
                    <span className="text-lg font-black text-swiss-signal">{q.marks}</span>
                    <span className="text-xs text-swiss-lead block uppercase">marks</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
