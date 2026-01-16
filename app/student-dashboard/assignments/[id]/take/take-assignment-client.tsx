"use client"

import { useRouter } from "next/navigation"
import { WorksheetPlayer } from "@/components/worksheet-player"
import { WorksheetQuestion } from "@/app/actions/student-work"

interface TakeAssignmentClientProps {
  assignmentId: string
  title: string
  className: string
  dueDate: string | null
  totalMarks: number
  questions: WorksheetQuestion[]
  initialAnswers: Record<string, string>
  mode: "answer" | "readonly"
}

export function TakeAssignmentClient(props: TakeAssignmentClientProps) {
  const router = useRouter()

  const handleSubmitSuccess = () => {
    // Refresh the page to show the submitted view
    router.refresh()
  }

  return (
    <WorksheetPlayer
      {...props}
      onSubmitSuccess={handleSubmitSuccess}
    />
  )
}
