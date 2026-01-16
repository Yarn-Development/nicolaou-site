import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { generateStudentFeedback } from "@/app/actions/feedback"
import { FeedbackPageClient } from "./feedback-page-client"

interface Props {
  params: Promise<{
    submissionId: string
  }>
}

export default async function FeedbackPage({ params }: Props) {
  const { submissionId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Generate feedback data
  const result = await generateStudentFeedback(submissionId)

  if (!result.success || !result.data) {
    // Check if it's a permission or not found issue
    if (result.error === "Permission denied") {
      redirect("/dashboard")
    }
    if (result.error === "Submission not found") {
      notFound()
    }
    if (result.error === "Submission has not been graded yet") {
      // Redirect back with error message
      redirect("/dashboard/assignments")
    }
    notFound()
  }

  return <FeedbackPageClient feedback={result.data} />
}
