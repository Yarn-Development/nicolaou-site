import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { FeedbackOverviewClient } from "./feedback-overview-client"

interface Props {
  params: Promise<{
    assignmentId: string
  }>
}

export default async function FeedbackOverviewPage({ params }: Props) {
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

  return <FeedbackOverviewClient assignmentId={assignmentId} />
}
