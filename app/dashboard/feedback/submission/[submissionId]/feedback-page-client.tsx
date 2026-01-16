"use client"

import { StudentFeedbackSheet } from "@/components/student-feedback-sheet"
import type { StudentFeedbackData } from "@/app/actions/feedback"

interface FeedbackPageClientProps {
  feedback: StudentFeedbackData
}

export function FeedbackPageClient({ feedback }: FeedbackPageClientProps) {
  return <StudentFeedbackSheet feedback={feedback} />
}
