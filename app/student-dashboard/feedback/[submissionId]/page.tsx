import { redirect, notFound } from "next/navigation"
import { getAuthUser } from "@/lib/auth"
import { generateStudentFeedback } from "@/app/actions/feedback"
import { StudentFeedbackSheet } from "@/components/student-feedback-sheet"

interface Props {
  params: Promise<{ submissionId: string }>
}

export default async function StudentFeedbackPage({ params }: Props) {
  const { submissionId } = await params

  const authUser = await getAuthUser()
  if (!authUser) redirect("/sign-in")

  const result = await generateStudentFeedback(submissionId)

  if (!result.success || !result.data) {
    if (result.error === "Submission has not been graded yet") {
      redirect("/student-dashboard?error=not_graded")
    }
    if (result.error === "Permission denied") {
      redirect("/student-dashboard")
    }
    notFound()
  }

  return <StudentFeedbackSheet feedback={result.data} />
}
