import { redirect } from "next/navigation"
import { loadAssignment } from "@/app/actions/student-work"
import { SubmittedView } from "@/components/worksheet-player"
import { createClient } from "@/lib/supabase/server"
import { TakeAssignmentClient } from "./take-assignment-client"

interface Props {
  params: Promise<{
    id: string
  }>
}

export default async function TakeAssignmentPage({ params }: Props) {
  const { id: assignmentId } = await params
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Load assignment data
  const result = await loadAssignment(assignmentId)

  if (!result.success || !result.data) {
    return (
      <div className="min-h-screen bg-swiss-paper flex items-center justify-center p-6">
        <div className="max-w-md w-full border-2 border-swiss-ink bg-swiss-paper p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 border-2 border-red-500 bg-red-100 flex items-center justify-center">
            <svg 
              className="w-8 h-8 text-red-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
              />
            </svg>
          </div>
          <h1 className="text-2xl font-black uppercase tracking-wider text-swiss-ink mb-2">
            Error Loading Assignment
          </h1>
          <p className="text-sm text-swiss-lead mb-6">
            {result.error || "Unable to load the assignment. Please try again."}
          </p>
          <a
            href="/student-dashboard"
            className="inline-block px-6 py-3 border-2 border-swiss-ink font-bold uppercase tracking-wider text-sm hover:bg-swiss-ink hover:text-swiss-paper transition-colors"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    )
  }

  const { assignment, submission, mode } = result.data

  // If already submitted or graded, show the submitted view
  if (mode === "readonly" && submission) {
    const answeredCount = Object.values(submission.answers).filter(a => a.trim() !== "").length

    return (
      <SubmittedView
        title={assignment.title}
        className={assignment.class_name}
        submittedAt={submission.submitted_at}
        answeredCount={answeredCount}
        totalQuestions={assignment.questions.length}
        status={submission.status as "submitted" | "graded"}
        score={submission.score}
        totalMarks={assignment.total_marks}
      />
    )
  }

  // No questions - show error
  if (assignment.questions.length === 0) {
    return (
      <div className="min-h-screen bg-swiss-paper flex items-center justify-center p-6">
        <div className="max-w-md w-full border-2 border-swiss-ink bg-swiss-paper p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 border-2 border-amber-500 bg-amber-100 flex items-center justify-center">
            <svg 
              className="w-8 h-8 text-amber-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
          </div>
          <h1 className="text-2xl font-black uppercase tracking-wider text-swiss-ink mb-2">
            No Questions
          </h1>
          <p className="text-sm text-swiss-lead mb-6">
            This assignment doesn&apos;t have any questions yet. Please contact your teacher.
          </p>
          <a
            href="/student-dashboard"
            className="inline-block px-6 py-3 border-2 border-swiss-ink font-bold uppercase tracking-wider text-sm hover:bg-swiss-ink hover:text-swiss-paper transition-colors"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    )
  }

  // Render the worksheet player
  return (
    <TakeAssignmentClient
      assignmentId={assignment.id}
      title={assignment.title}
      className={assignment.class_name}
      dueDate={assignment.due_date}
      totalMarks={assignment.total_marks}
      questions={assignment.questions}
      initialAnswers={submission?.answers || {}}
      mode={mode}
    />
  )
}
