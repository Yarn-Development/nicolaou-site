"use server"

import { getAuthUser } from "@/lib/auth"
import { fetchQuery, fetchMutation, api, getConvexUserIdByClerkId } from "@/lib/convex/server"
import type { Id } from "@/convex/_generated/dataModel"

// =====================================================
// Types
// =====================================================

export interface WorksheetQuestion {
  id: string
  order_index: number
  marks: number
  question_latex: string | null
  image_url: string | null
  content_type: "generated_text" | "image_ocr" | "official_past_paper" | "synthetic_image"
  topic: string
  sub_topic: string | null
  calculator_allowed: boolean
}

export interface AssignmentData {
  id: string
  title: string
  class_name: string
  due_date: string | null
  total_marks: number
  mode: "online" | "paper"
  questions: WorksheetQuestion[]
}

export interface SubmissionData {
  id: string
  status: "submitted" | "graded"
  answers: Record<string, string>
  score: number | null
  submitted_at: string | null
  graded_at: string | null
}

export interface LoadAssignmentResult {
  success: boolean
  data?: {
    assignment: AssignmentData
    submission: SubmissionData | null
    mode: "answer" | "readonly"
  }
  error?: string
}

async function currentStudentId(): Promise<Id<"users"> | null> {
  const authUser = await getAuthUser()
  if (!authUser?.clerkId) return null
  return getConvexUserIdByClerkId(authUser.clerkId)
}

const toIso = (ms: number | null | undefined): string | null =>
  ms == null ? null : new Date(ms).toISOString()

// =====================================================
// Load Assignment for Student
// =====================================================

export async function loadAssignment(assignmentId: string): Promise<LoadAssignmentResult> {
  const studentId = await currentStudentId()
  if (!studentId) return { success: false, error: "You must be logged in" }

  try {
    const result = await fetchQuery(api.students.getAssignmentForTaking, {
      studentId,
      assignmentId: assignmentId as Id<"assignments">,
    })

    if ("error" in result) {
      return {
        success: false,
        error:
          result.error === "not_enrolled"
            ? "You are not enrolled in this class"
            : "Assignment not found or not published",
      }
    }

    const sub = result.existingSubmission
    const mode: "answer" | "readonly" = sub ? "readonly" : "answer"

    return {
      success: true,
      data: {
        assignment: {
          id: result.id,
          title: result.title,
          class_name: result.className,
          due_date: toIso(result.dueDate),
          total_marks: result.totalMarks,
          mode: result.mode as "online" | "paper",
          questions: result.questions.map((q) => ({
            id: q.id,
            order_index: q.orderIndex,
            marks: q.marks,
            question_latex: q.questionLatex,
            image_url: q.imageUrl,
            content_type: (q.contentType as WorksheetQuestion["content_type"]) ?? "generated_text",
            topic: q.topic,
            sub_topic: q.subTopic,
            calculator_allowed: q.calculatorAllowed,
          })),
        },
        submission: sub
          ? {
              id: sub.id,
              status: sub.status === "marked" ? "graded" : "submitted",
              answers: sub.answers,
              score: sub.score,
              submitted_at: toIso(sub.submittedAt),
              graded_at: toIso(sub.gradedAt),
            }
          : null,
        mode,
      },
    }
  } catch (error) {
    console.error("Error in loadAssignment:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// =====================================================
// Submit Assignment
// =====================================================

export interface SubmitAssignmentResult {
  success: boolean
  submission_id?: string
  error?: string
}

export async function submitAssignment(
  assignmentId: string,
  answers: Record<string, string>,
): Promise<SubmitAssignmentResult> {
  const studentId = await currentStudentId()
  if (!studentId) return { success: false, error: "You must be logged in" }

  try {
    const result = await fetchMutation(api.students.submitStudentAssignment, {
      studentId,
      assignmentId: assignmentId as Id<"assignments">,
      answers,
    })

    if ("error" in result) {
      const message =
        result.error === "not_enrolled"
          ? "You are not enrolled in this class"
          : result.error === "already_submitted"
            ? "Assignment already submitted"
            : "Assignment not found or not published"
      return { success: false, error: message }
    }

    return { success: true, submission_id: result.submissionId }
  } catch (error) {
    console.error("Error in submitAssignment:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
