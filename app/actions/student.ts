"use server"

import { getAuthUser } from "@/lib/auth"
import { fetchQuery, api, getConvexUserIdByClerkId } from "@/lib/convex/server"
import type { Id } from "@/convex/_generated/dataModel"

// =====================================================
// Types
// =====================================================

export interface StudentClass {
  class_id: string
  class_name: string
  subject: string
  teacher_name: string
  teacher_email: string
  joined_at: string
}

export interface StudentAssignment {
  id: string
  title: string
  class_id: string
  class_name: string
  due_date: string | null
  mode: "online" | "paper"
  status: "todo" | "submitted" | "graded"
  score: number | null
  max_marks: number
  percentage: number | null
  feedback_released: boolean
  submitted_at: string | null
  graded_at: string | null
  submission_id: string | null
}

// =====================================================
// Helpers
// =====================================================

/** Resolve the signed-in Clerk user to a Convex user id, or null. */
async function currentStudentId(): Promise<Id<"users"> | null> {
  const authUser = await getAuthUser()
  if (!authUser?.clerkId) return null
  return getConvexUserIdByClerkId(authUser.clerkId)
}

const toIso = (ms: number | null | undefined): string | null =>
  ms == null ? null : new Date(ms).toISOString()

// =====================================================
// Get Student's Enrolled Classes
// =====================================================

export async function getStudentClasses(): Promise<{
  success: boolean
  data?: StudentClass[]
  error?: string
}> {
  const studentId = await currentStudentId()
  if (!studentId) return { success: false, error: "You must be logged in" }

  try {
    const classes = await fetchQuery(api.students.getEnrolledClasses, { studentId })
    return {
      success: true,
      data: classes.map((c) => ({
        class_id: c.classId,
        class_name: c.className,
        subject: c.subject,
        teacher_name: c.teacherName,
        teacher_email: c.teacherEmail,
        joined_at: toIso(c.joinedAt) ?? new Date().toISOString(),
      })),
    }
  } catch (error) {
    console.error("Error in getStudentClasses:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// =====================================================
// Get Student's Assignments
// =====================================================

export async function getStudentAssignments(): Promise<{
  success: boolean
  data?: StudentAssignment[]
  error?: string
}> {
  const studentId = await currentStudentId()
  if (!studentId) return { success: false, error: "You must be logged in" }

  try {
    const assignments = await fetchQuery(api.students.getAssignments, { studentId })
    return {
      success: true,
      data: assignments.map((a) => ({
        id: a.id,
        title: a.title,
        class_id: a.classId,
        class_name: a.className,
        due_date: toIso(a.dueDate),
        mode: a.mode as "online" | "paper",
        status: a.status,
        score: a.score,
        max_marks: a.maxMarks,
        percentage: a.percentage,
        feedback_released: a.feedbackReleased,
        submitted_at: toIso(a.submittedAt),
        graded_at: toIso(a.gradedAt),
        submission_id: a.submissionId,
      })),
    }
  } catch (error) {
    console.error("Error in getStudentAssignments:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// =====================================================
// Get Pending Assignments Count
// =====================================================

export async function getPendingAssignmentsCount(): Promise<{
  success: boolean
  count?: number
  error?: string
}> {
  const result = await getStudentAssignments()
  if (!result.success || !result.data) {
    return { success: false, error: result.error }
  }
  const pendingCount = result.data.filter((a) => a.status === "todo").length
  return { success: true, count: pendingCount }
}

// =====================================================
// Get Assignment Details for Taking
// =====================================================

export interface AssignmentForTaking {
  id: string
  title: string
  class_name: string
  due_date: string | null
  total_marks: number
  questions: {
    id: string
    order_index: number
    marks: number
    question_latex: string
    image_url: string | null
    topic: string
    sub_topic: string | null
    calculator_allowed: boolean
  }[]
  existing_submission: {
    id: string
    status: string
    answers: Record<string, string>
  } | null
}

export async function getAssignmentForTaking(assignmentId: string): Promise<{
  success: boolean
  data?: AssignmentForTaking
  error?: string
}> {
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

    return {
      success: true,
      data: {
        id: result.id,
        title: result.title,
        class_name: result.className,
        due_date: toIso(result.dueDate),
        total_marks: result.totalMarks,
        questions: result.questions.map((q) => ({
          id: q.id,
          order_index: q.orderIndex,
          marks: q.marks,
          question_latex: q.questionLatex,
          image_url: q.imageUrl,
          topic: q.topic,
          sub_topic: q.subTopic,
          calculator_allowed: q.calculatorAllowed,
        })),
        existing_submission: result.existingSubmission
          ? {
              id: result.existingSubmission.id,
              status: result.existingSubmission.status,
              answers: result.existingSubmission.answers,
            }
          : null,
      },
    }
  } catch (error) {
    console.error("Error in getAssignmentForTaking:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
