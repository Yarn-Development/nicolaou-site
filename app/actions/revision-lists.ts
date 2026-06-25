"use server"

import { getAuthUser } from "@/lib/auth"
import {
  fetchQuery,
  fetchMutation,
  api,
  getConvexUserIdByClerkId,
} from "@/lib/convex/server"
import type { Id } from "@/convex/_generated/dataModel"
import { revalidatePath } from "next/cache"
import type {
  GeneratedSimilarQuestion,
  StudentRevisionListResult,
  RevisionListQuestionResult,
} from "@/lib/types/database"

// =====================================================
// Helpers
// =====================================================

/** Resolve the signed-in Clerk user to a Convex user id, or null. */
async function currentUserId(): Promise<Id<"users"> | null> {
  const authUser = await getAuthUser()
  if (!authUser?.clerkId) return null
  return getConvexUserIdByClerkId(authUser.clerkId)
}

const toIso = (ms: number | null | undefined): string =>
  ms == null ? new Date().toISOString() : new Date(ms).toISOString()

// =====================================================
// Types
// =====================================================

export interface CreateRevisionListInput {
  /** Assignment ID this revision list is for */
  assignmentId: string
  /** Title for the revision list */
  title: string
  /** Optional description */
  description?: string
  /** Generated similar questions to save */
  generatedQuestions: GeneratedSimilarQuestion[]
  /** Class ID for auto-allocation */
  classId: string
}

export interface RevisionListResult {
  id: string
  title: string
  description: string | null
  assignmentId: string
  questionCount: number
  studentsAllocated: number
  createdAt: string
}

// =====================================================
// Create Revision List with Generated Questions
// =====================================================

/**
 * Creates a revision list from generated similar questions.
 *
 * Steps:
 * 1. Save all generated questions to the questions table
 * 2. Create the revision list record
 * 3. Link questions to the revision list
 * 4. Auto-allocate to all students in the class
 */
export async function createRevisionListWithQuestions(
  input: CreateRevisionListInput
): Promise<{
  success: boolean
  data?: RevisionListResult
  error?: string
}> {
  const userId = await currentUserId()
  if (!userId) return { success: false, error: "You must be logged in" }

  try {
    // Filter to only included questions
    const includedQuestions = input.generatedQuestions.filter((q) => q.included)

    if (includedQuestions.length === 0) {
      return { success: false, error: "At least one question must be included" }
    }

    const result = await fetchMutation(api.revisionLists.createWithQuestions, {
      userId,
      classId: input.classId as Id<"classes">,
      title: input.title,
      description: input.description || undefined,
      questions: includedQuestions.map((q) => ({
        questionLatex: q.questionLatex,
        topic: q.topic,
        subTopic: q.subTopic,
        difficulty: q.difficulty,
        marks: q.marks,
        calculatorAllowed: true,
        answerKey: {
          answer: q.answerKey.answer,
          explanation: q.answerKey.explanation,
          type: "generated",
        },
      })),
    })

    if ("error" in result) {
      const error =
        result.error === "class_not_found"
          ? "Assignment not found"
          : result.error === "permission_denied"
            ? "Permission denied"
            : result.error === "no_questions"
              ? "At least one question must be included"
              : "Failed to create revision list"
      return { success: false, error }
    }

    revalidatePath("/dashboard/assignments")
    revalidatePath("/dashboard/revision")

    return {
      success: true,
      data: {
        id: result.revisionListId,
        title: input.title,
        description: input.description || null,
        assignmentId: input.assignmentId,
        questionCount: result.questionCount,
        studentsAllocated: result.studentsAllocated,
        createdAt: toIso(result.createdAt),
      },
    }
  } catch (error) {
    console.error("Error in createRevisionListWithQuestions:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// =====================================================
// Get Student's Revision Lists
// =====================================================

/**
 * Gets all revision lists allocated to the current student
 */
export async function getStudentRevisionLists(): Promise<{
  success: boolean
  data?: StudentRevisionListResult[]
  error?: string
}> {
  const studentId = await currentUserId()
  if (!studentId) return { success: false, error: "You must be logged in" }

  try {
    const lists = await fetchQuery(api.revisionLists.getStudentRevisionLists, {
      studentId,
    })

    const data: StudentRevisionListResult[] = lists.map((l) => ({
      revision_list_id: l.revisionListId,
      title: l.title,
      description: l.description,
      assignment_id: null,
      assignment_title: null,
      class_name: null,
      status: l.status as StudentRevisionListResult["status"],
      allocated_at: toIso(l.allocatedAt),
      total_questions: l.totalQuestions,
      completed_questions: l.completedQuestions,
      created_at: toIso(l.createdAt),
    }))

    return { success: true, data }
  } catch (error) {
    console.error("Error in getStudentRevisionLists:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// =====================================================
// Get Revision List Questions
// =====================================================

/**
 * Gets all questions in a revision list
 */
export async function getRevisionListQuestions(
  revisionListId: string
): Promise<{
  success: boolean
  data?: RevisionListQuestionResult[]
  error?: string
}> {
  const userId = await currentUserId()
  if (!userId) return { success: false, error: "You must be logged in" }

  try {
    const questions = await fetchQuery(
      api.revisionLists.getRevisionListQuestions,
      { revisionListId: revisionListId as Id<"revisionLists"> }
    )

    return { success: true, data: questions.map(mapQuestion) }
  } catch (error) {
    console.error("Error in getRevisionListQuestions:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// Map a Convex question row onto the legacy RevisionListQuestionResult shape.
function mapQuestion(q: {
  questionId: string
  orderIndex: number
  questionLatex: string | null
  imageUrl: string | null
  topic: string
  subTopic: string | null
  difficulty: string
  marks: number | null
  answerKey: unknown
  calculatorAllowed: boolean | null
}): RevisionListQuestionResult {
  return {
    question_id: q.questionId,
    order_index: q.orderIndex,
    source_question_number: null,
    source_question_latex: null,
    question_latex: q.questionLatex,
    image_url: q.imageUrl,
    topic: q.topic,
    sub_topic: q.subTopic,
    difficulty: q.difficulty,
    marks: q.marks,
    answer_key: (q.answerKey ??
      null) as RevisionListQuestionResult["answer_key"],
    calculator_allowed: q.calculatorAllowed,
  }
}

// =====================================================
// Update Student Progress
// =====================================================

export interface UpdateProgressInput {
  revisionListId: string
  questionId: string
  completed: boolean
}

/**
 * Updates a student's progress on a revision list question
 */
export async function updateRevisionProgress(
  input: UpdateProgressInput
): Promise<{
  success: boolean
  error?: string
}> {
  const studentId = await currentUserId()
  if (!studentId) return { success: false, error: "You must be logged in" }

  try {
    const result = await fetchMutation(api.revisionLists.updateProgress, {
      studentId,
      revisionListId: input.revisionListId as Id<"revisionLists">,
      questionId: input.questionId,
      completed: input.completed,
    })

    if ("error" in result) {
      return { success: false, error: "Revision list not found" }
    }

    revalidatePath("/dashboard/revision")

    return { success: true }
  } catch (error) {
    console.error("Error in updateRevisionProgress:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// =====================================================
// Get Teacher's Revision Lists for an Assignment
// =====================================================

/**
 * Gets the revision list for a specific assignment (teacher view)
 *
 * Note: the migrated Convex `revisionLists` table no longer stores an
 * `assignmentId`, so there is no way to look a list up by assignment. This now
 * always reports "no revision list" for the assignment. Use
 * getRevisionListDetail / getTeacherRevisionLists instead.
 */
export async function getAssignmentRevisionList(
  assignmentId: string
): Promise<{
  success: boolean
  data?: {
    revisionList: {
      id: string
      title: string
      description: string | null
      createdAt: string
    }
    questions: RevisionListQuestionResult[]
    allocations: {
      studentId: string
      studentName: string
      status: string
      completedQuestions: number
      totalQuestions: number
    }[]
  } | null
  error?: string
}> {
  void assignmentId
  const userId = await currentUserId()
  if (!userId) return { success: false, error: "You must be logged in" }

  // No assignment linkage exists in the Convex schema; report none.
  return { success: true, data: null }
}

// =====================================================
// Get All Teacher's Revision Lists (for Library)
// =====================================================

export interface TeacherRevisionListItem {
  id: string
  title: string
  description: string | null
  assignment_id: string
  assignment_title: string
  class_name: string
  subject: string
  question_count: number
  student_count: number
  created_at: string
}

/**
 * Gets all revision lists created by the current teacher
 */
export async function getTeacherRevisionLists(): Promise<{
  success: boolean
  data?: TeacherRevisionListItem[]
  error?: string
}> {
  const userId = await currentUserId()
  if (!userId) return { success: false, error: "You must be logged in" }

  try {
    const lists = await fetchQuery(api.revisionLists.getTeacherRevisionLists, {
      userId,
    })

    const transformed: TeacherRevisionListItem[] = lists.map((rl) => ({
      id: rl.id,
      title: rl.title,
      description: rl.description,
      // No assignment / class linkage in the Convex schema.
      assignment_id: "",
      assignment_title: "Unknown",
      class_name: "Unknown",
      subject: "Unknown",
      question_count: rl.questionCount,
      student_count: rl.studentCount,
      created_at: toIso(rl.createdAt),
    }))

    return { success: true, data: transformed }
  } catch (error) {
    console.error("Error in getTeacherRevisionLists:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// =====================================================
// Get Revision List Detail (Teacher View)
// =====================================================

/**
 * Gets a single revision list with questions and student allocations.
 * Used by the dedicated revision detail page.
 */
export async function getRevisionListDetail(
  revisionListId: string
): Promise<{
  success: boolean
  data?: {
    revisionList: {
      id: string
      title: string
      description: string | null
      assignment_id: string
      assignment_title: string
      class_name: string
      subject: string
      created_at: string
    }
    questions: RevisionListQuestionResult[]
    allocations: {
      studentId: string
      studentName: string
      status: string
      completedQuestions: number
      totalQuestions: number
    }[]
  } | null
  error?: string
}> {
  const userId = await currentUserId()
  if (!userId) return { success: false, error: "You must be logged in" }

  try {
    const result = await fetchQuery(api.revisionLists.getDetail, {
      userId,
      revisionListId: revisionListId as Id<"revisionLists">,
    })

    if ("error" in result) {
      if (result.error === "not_found") return { success: true, data: null }
      return { success: false, error: "Permission denied" }
    }

    return {
      success: true,
      data: {
        revisionList: {
          id: result.revisionList.id,
          title: result.revisionList.title,
          description: result.revisionList.description,
          // No assignment / class linkage in the Convex schema.
          assignment_id: "",
          assignment_title: "Unknown",
          class_name: "Unknown",
          subject: "Unknown",
          created_at: toIso(result.revisionList.createdAt),
        },
        questions: result.questions.map(mapQuestion),
        allocations: result.allocations.map((a) => ({
          studentId: a.studentId,
          studentName: a.studentName,
          status: a.status,
          completedQuestions: a.completedQuestions,
          totalQuestions: a.totalQuestions,
        })),
      },
    }
  } catch (error) {
    console.error("Error in getRevisionListDetail:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// =====================================================
// Delete Revision List
// =====================================================

/**
 * Deletes a revision list and all associated data.
 * Cascades to revision_list_questions and student_revision_allocations.
 */
export async function deleteRevisionList(
  revisionListId: string
): Promise<{
  success: boolean
  error?: string
}> {
  const userId = await currentUserId()
  if (!userId) return { success: false, error: "You must be logged in" }

  try {
    const result = await fetchMutation(api.revisionLists.remove, {
      userId,
      revisionListId: revisionListId as Id<"revisionLists">,
    })

    if ("error" in result) {
      return {
        success: false,
        error:
          result.error === "not_found"
            ? "Revision list not found"
            : "Permission denied",
      }
    }

    revalidatePath("/dashboard/library")
    revalidatePath("/dashboard/revision")

    return { success: true }
  } catch (error) {
    console.error("Error in deleteRevisionList:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
