import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getAssignmentFeedbackForPrint } from "@/app/actions/feedback"
import { PrintBatchClient } from "./print-batch-client"

interface Props {
  params: Promise<{
    assignmentId: string
  }>
}

export default async function PrintBatchPage({ params }: Props) {
  const { assignmentId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Verify teacher owns this assignment
  const { data: assignment } = await supabase
    .from("assignments")
    .select(`
      id,
      title,
      classes!inner(
        id,
        name,
        teacher_id
      )
    `)
    .eq("id", assignmentId)
    .single()

  if (!assignment) {
    redirect("/dashboard/assignments")
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const classData = assignment.classes as any
  if (classData.teacher_id !== user.id) {
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
