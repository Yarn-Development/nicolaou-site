import { notFound } from "next/navigation"
import { getAssignmentDetails } from "@/app/actions/assignments"
import { AssignmentDetailClient } from "./assignment-detail-client"

interface AssignmentDetailPageProps {
  params: Promise<{ assignmentId: string }>
}

export default async function AssignmentDetailPage({ params }: AssignmentDetailPageProps) {
  const { assignmentId } = await params
  
  const result = await getAssignmentDetails(assignmentId)

  if (!result.success || !result.data) {
    notFound()
  }

  return <AssignmentDetailClient assignment={result.data} />
}
