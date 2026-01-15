import { notFound } from "next/navigation"
import { getAssignmentMarkingData } from "@/app/actions/marking"
import { MarkingInterface } from "./marking-interface"

interface MarkPageProps {
  params: Promise<{ assignmentId: string }>
}

export default async function MarkPage({ params }: MarkPageProps) {
  const { assignmentId } = await params
  
  const result = await getAssignmentMarkingData(assignmentId)

  if (!result.success || !result.data) {
    notFound()
  }

  return <MarkingInterface data={result.data} />
}
