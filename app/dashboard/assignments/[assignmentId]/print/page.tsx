import { notFound } from "next/navigation"
import { getAssignmentDetails } from "@/app/actions/assignments"
import { ExamPaperClient } from "./exam-paper-client"

interface PrintPageProps {
  params: Promise<{ assignmentId: string }>
  searchParams: Promise<{ view?: string }>
}

export default async function PrintPage({ params, searchParams }: PrintPageProps) {
  const { assignmentId } = await params
  const { view } = await searchParams

  const result = await getAssignmentDetails(assignmentId)

  if (!result.success || !result.data) {
    notFound()
  }

  return (
    <ExamPaperClient
      assignment={result.data}
      initialView={view === "marksheet" ? "marksheet" : "paper"}
    />
  )
}
