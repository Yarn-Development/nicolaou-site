"use server"

import { getAuthUser } from "@/lib/auth"
import { fetchQuery, fetchMutation, api, getConvexUserIdByClerkId } from "@/lib/convex/server"
import type { Id } from "@/convex/_generated/dataModel"
import { revalidatePath } from "next/cache"

// =====================================================
// Types
// =====================================================

export interface QuestionForMarking {
  id: string
  question_latex: string
  marks: number
  topic: string
  sub_topic: string
  difficulty: string
  // Ghost question fields (for external paper uploads)
  is_ghost?: boolean
  custom_question_number?: string | null
}

export interface StudentForMarking {
  id: string
  email: string
  full_name: string | null
  submission_id: string | null
  grading_data: Record<string, { score: number }> | null
  total_score: number | null
  status: "not_submitted" | "submitted" | "graded"
  feedback_released: boolean
}

export interface AssignmentMarkingData {
  assignment: {
    id: string
    title: string
    class_id: string
    class_name: string
    subject: string
    due_date: string | null
    status: string
    mode: "online" | "paper"
    // External paper fields
    source_type: "bank_builder" | "external_upload"
    resource_url: string | null
  }
  questions: QuestionForMarking[]
  students: StudentForMarking[]
  maxTotalMarks: number
}

// =====================================================
// Helpers
// =====================================================

/** Resolve the signed-in Clerk user to a Convex user id, or null. */
async function currentTeacherId(): Promise<Id<"users"> | null> {
  const authUser = await getAuthUser()
  if (!authUser?.clerkId) return null
  return getConvexUserIdByClerkId(authUser.clerkId)
}

const toIso = (ms: number | null | undefined): string | null =>
  ms == null ? null : new Date(ms).toISOString()

// =====================================================
// Fetch Marking Data
// =====================================================

/**
 * Fetches all data needed for the marking interface
 */
export async function getAssignmentMarkingData(assignmentId: string): Promise<{
  success: boolean
  data?: AssignmentMarkingData
  error?: string
}> {
  const teacherId = await currentTeacherId()
  if (!teacherId) {
    return {
      success: false,
      error: "You must be logged in to access marking",
    }
  }

  try {
    const result = await fetchQuery(api.marking.getMarkingData, {
      teacherId,
      assignmentId: assignmentId as Id<"assignments">,
    })

    if ("error" in result) {
      return {
        success: false,
        error:
          result.error === "forbidden"
            ? "You don't have permission to mark this assignment"
            : "Assignment not found",
      }
    }

    const questions: QuestionForMarking[] = result.questions.map((q) => ({
      id: q.id,
      question_latex: q.questionLatex,
      marks: q.marks,
      topic: q.topic,
      sub_topic: q.subTopic,
      difficulty: q.difficulty,
      is_ghost: q.isGhost,
      custom_question_number: q.customQuestionNumber,
    }))

    const students: StudentForMarking[] = result.students.map((s) => ({
      id: s.id,
      email: s.email,
      full_name: s.fullName,
      submission_id: s.submissionId,
      grading_data: s.gradingData,
      total_score: s.totalScore,
      status: s.status,
      feedback_released: s.feedbackReleased,
    }))

    // Sort students by name
    students.sort((a, b) => {
      const nameA = a.full_name || a.email
      const nameB = b.full_name || b.email
      return nameA.localeCompare(nameB)
    })

    return {
      success: true,
      data: {
        assignment: {
          id: result.assignment.id,
          title: result.assignment.title,
          class_id: result.assignment.classId,
          class_name: result.assignment.className,
          subject: result.assignment.subject,
          due_date: toIso(result.assignment.dueDate),
          status: result.assignment.status,
          mode: result.assignment.mode as "online" | "paper",
          source_type: result.assignment.sourceType as
            | "bank_builder"
            | "external_upload",
          resource_url: result.assignment.resourceUrl,
        },
        questions,
        students,
        maxTotalMarks: result.maxTotalMarks,
      },
    }
  } catch (error) {
    console.error("Error in getAssignmentMarkingData:", error)
    return {
      success: false,
      error: "An unexpected error occurred",
    }
  }
}

// =====================================================
// Save Marks
// =====================================================

export interface GradingData {
  [questionId: string]: { score: number }
}

/**
 * Saves marks for a student's submission
 * Creates a submission if one doesn't exist
 */
export async function saveMarks(
  assignmentId: string,
  studentId: string,
  gradingData: GradingData
): Promise<{
  success: boolean
  data?: {
    submission_id: string
    total_score: number
  }
  error?: string
}> {
  const teacherId = await currentTeacherId()
  if (!teacherId) {
    return {
      success: false,
      error: "You must be logged in",
    }
  }

  try {
    const result = await fetchMutation(api.marking.saveMarks, {
      teacherId,
      assignmentId: assignmentId as Id<"assignments">,
      studentId: studentId as Id<"users">,
      gradingData,
    })

    revalidatePath(`/dashboard/assignments/${assignmentId}/mark`)

    return {
      success: true,
      data: {
        submission_id: result.submissionId,
        total_score: result.totalScore,
      },
    }
  } catch (error) {
    console.error("Error in saveMarks:", error)
    return {
      success: false,
      error: "An unexpected error occurred",
    }
  }
}

// =====================================================
// Toggle Feedback Release
// =====================================================

/**
 * Toggles feedback release for all submissions in an assignment
 */
export async function toggleFeedbackRelease(
  assignmentId: string,
  release: boolean
): Promise<{
  success: boolean
  error?: string
}> {
  const teacherId = await currentTeacherId()
  if (!teacherId) {
    return {
      success: false,
      error: "You must be logged in",
    }
  }

  try {
    await fetchMutation(api.marking.toggleFeedbackRelease, {
      teacherId,
      assignmentId: assignmentId as Id<"assignments">,
      release,
    })

    revalidatePath(`/dashboard/assignments/${assignmentId}/mark`)

    return { success: true }
  } catch (error) {
    console.error("Error in toggleFeedbackRelease:", error)
    return {
      success: false,
      error: "An unexpected error occurred",
    }
  }
}

// =====================================================
// Get Assignments for Marking List
// =====================================================

export interface AssignmentForMarkingList {
  id: string
  title: string
  className: string
  subject: string
  dueDate: string | null
  totalStudents: number
  submittedCount: number
  gradedCount: number
  needsGrading: number
  status: "published" | "draft"
  createdAt: string
}

/**
 * Fetches all assignments with grading statistics
 */
export async function getAssignmentsForMarking(): Promise<{
  success: boolean
  data?: AssignmentForMarkingList[]
  error?: string
}> {
  const teacherId = await currentTeacherId()
  if (!teacherId) {
    return {
      success: false,
      error: "You must be logged in",
    }
  }

  try {
    const rows = await fetchQuery(api.marking.getAssignmentsForMarking, {
      teacherId,
    })

    const data: AssignmentForMarkingList[] = rows.map((a) => ({
      id: a.id,
      title: a.title,
      className: a.className,
      subject: a.subject,
      dueDate: toIso(a.dueDate),
      totalStudents: a.totalStudents,
      submittedCount: a.submittedCount,
      gradedCount: a.gradedCount,
      needsGrading: a.needsGrading,
      status: a.status as "published" | "draft",
      createdAt: toIso(a.createdAt) ?? new Date().toISOString(),
    }))

    return { success: true, data }
  } catch (error) {
    console.error("Error in getAssignmentsForMarking:", error)
    return {
      success: false,
      error: "An unexpected error occurred",
    }
  }
}
