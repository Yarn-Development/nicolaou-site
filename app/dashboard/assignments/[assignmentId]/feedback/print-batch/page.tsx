import { redirect } from "next/navigation"
import { getAuthUser } from "@/lib/auth"
import { getAssignmentDetails } from "@/app/actions/assignments"
import { getAssignmentFeedbackForPrint } from "@/app/actions/feedback"
import { PrintBatchClient } from "./print-batch-client"

interface Props {
  params: Promise<{
    assignmentId: string
  }>
}

export default async function PrintBatchPage({ params }: Props) {
  const { assignmentId } = await params

  const authUser = await getAuthUser()
  if (!authUser) {
    redirect("/sign-in")
  }

  // Verify teacher owns this assignment (scoped to the signed-in teacher).
  const assignment = await getAssignmentDetails(assignmentId)
  if (!assignment.success || !assignment.data) {
    redirect("/dashboard/assignments")
  }

  // Fetch all student feedback for printing
  const result = await getAssignmentFeedbackForPrint(assignmentId)

  if (!result.success || !result.data) {
    return (
      <div className="min-h-screen bg-swiss-paper p-8">
        <div className="max-w-4xl mx-auto">
          <div className="border-4 border-swiss-signal bg-red-50 p-8 text-center">
            <h1 className="text-2xl font-black uppercase tracking-wider text-swiss-signal mb-4">
              No Feedback Available
            </h1>
            <p className="text-swiss-lead mb-6">
              {result.error || "Please release feedback for students first."}
            </p>
            <a 
              href={`/dashboard/assignments/${assignmentId}/mark`}
              className="inline-block px-6 py-3 bg-swiss-ink text-white font-bold uppercase tracking-wider hover:bg-swiss-ink/80 transition-colors"
            >
              Return to Marking Grid
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <PrintBatchClient 
      assignmentId={assignmentId}
      assignmentTitle={result.data.assignmentTitle}
      className={result.data.className}
      studentFeedback={result.data.studentFeedback}
    />
  )
}
