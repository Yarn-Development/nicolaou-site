import { redirect } from "next/navigation"
import { getAuthUser } from "@/lib/auth"
import { getAssignmentDetails } from "@/app/actions/assignments"
import { FeedbackOverviewClient } from "./feedback-overview-client"

interface Props {
  params: Promise<{
    assignmentId: string
  }>
}

export default async function FeedbackOverviewPage({ params }: Props) {
  const { assignmentId } = await params

  const authUser = await getAuthUser()
  if (!authUser) {
    redirect("/sign-in")
  }

  // Verify teacher owns this assignment (getAssignmentDetails is scoped to the
  // signed-in teacher and returns an error if they don't own it).
  const assignment = await getAssignmentDetails(assignmentId)
  if (!assignment.success || !assignment.data) {
    redirect("/dashboard/assignments")
  }

  return <FeedbackOverviewClient assignmentId={assignmentId} />
}
