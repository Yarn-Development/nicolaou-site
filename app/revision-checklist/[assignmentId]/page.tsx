import { notFound } from "next/navigation"
import { getAssignmentDetails } from "@/app/actions/assignments"
import { RevisionChecklist } from "@/components/print/revision-checklist"

interface RevisionChecklistPageProps {
  params: Promise<{
    assignmentId: string
  }>
}

export default async function RevisionChecklistPage({ params }: RevisionChecklistPageProps) {
  const { assignmentId } = await params

  // Fetch assignment details
  const result = await getAssignmentDetails(assignmentId)

  if (!result.success || !result.data) {
    notFound()
  }

  const assignment = result.data

  // Transform questions to the format expected by RevisionChecklist
  const questions = assignment.questions.map((q) => ({
    topic: q.topic,
    sub_topic: q.sub_topic,
    topic_name: q.topic,
    sub_topic_name: q.sub_topic,
    marks: q.marks,
  }))

  return (
    <RevisionChecklist
      examTitle={assignment.title}
      examDate={assignment.due_date}
      questions={questions}
      backUrl={`/dashboard/assignments/${assignmentId}/mark`}
    />
  )
}
