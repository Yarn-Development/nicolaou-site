"use server"

import { revalidatePath } from "next/cache"
import { getAuthUser } from "@/lib/auth"
import { fetchQuery, fetchMutation, api, getConvexUserIdByClerkId } from "@/lib/convex/server"
import type { Id } from "@/convex/_generated/dataModel"

// =====================================================
// Types
// =====================================================

export type AssignmentStatus = "draft" | "published"
export type AssignmentMode = "online" | "paper"
export type AssignmentType = "exam" | "shadow_paper"
export type SubmissionStatus = "submitted" | "graded"

export type Assignment = {
  id: string
  class_id: string
  title: string
  due_date: string | null
  status: AssignmentStatus
  mode: AssignmentMode
  assignment_type: AssignmentType
  content: {
    question_ids?: string[]
    description?: string
    [key: string]: unknown
  }
  created_at: string
  updated_at: string
}

export type AssignmentWithClass = Assignment & {
  class_name: string
  subject: string
  student_count?: number
  submission_count?: number
}

export type Submission = {
  id: string
  assignment_id: string
  student_id: string
  score: number | null
  status: SubmissionStatus
  answers: Record<string, unknown>
  submitted_at: string
  graded_at: string | null
}

export type StudentPendingAssignment = {
  assignment_id: string
  title: string
  due_date: string | null
  class_id: string
  class_name: string
  subject: string
  has_submitted: boolean
}

export interface AssignmentQuestion {
  id: string
  question_id: string
  order_index: number
  custom_marks: number | null
}

export interface QuestionWithDetails {
  question_id: string
  order_index: number
  marks: number
  question_latex: string
  topic: string
  sub_topic: string
  difficulty: string
  question_type: string
  calculator_allowed: boolean
  answer_key: {
    answer: string
    explanation: string
    source?: {
      exam_board?: string
      level?: string
      paper?: string
      year?: number
      question_number?: string
    }
  }
  image_url: string | null
  content_type: string
}

export interface CoverConfig {
  /** "standard" = exam-board candidate cover; "simple" = clean branded cover. */
  style: "standard" | "simple"
  course: string
  title: string
  schoolName: string
  teacherName: string
  showCandidateBoxes: boolean
}

export interface AssignmentDetails {
  id: string
  title: string
  class_id: string
  class_name: string
  subject: string
  due_date: string | null
  status: AssignmentStatus
  total_marks: number
  question_count: number
  questions: QuestionWithDetails[]
  cover_config: CoverConfig | null
}

// =====================================================
// Helpers
// =====================================================

const toIso = (ms: number | null | undefined): string | null =>
  ms == null ? null : new Date(ms).toISOString()

async function teacherCtx(): Promise<
  | { teacherId: Id<"users"> }
  | { error: string }
> {
  const authUser = await getAuthUser()
  if (!authUser?.clerkId) return { error: "You must be logged in" }
  const teacherId = await getConvexUserIdByClerkId(authUser.clerkId)
  if (!teacherId) return { error: "You must be logged in" }
  return { teacherId }
}

type ConvexAssignment = {
  _id: string
  _creationTime: number
  classId: string
  title: string
  dueDate?: number
  status?: string
  mode?: string
  metadata?: unknown
}

function mapAssignment(a: ConvexAssignment): Assignment {
  const metadata = (a.metadata as Record<string, unknown> | undefined) ?? {}
  return {
    id: a._id,
    class_id: a.classId,
    title: a.title,
    due_date: toIso(a.dueDate),
    status: (a.status === "published" ? "published" : "draft") as AssignmentStatus,
    mode: (a.mode === "paper" ? "paper" : "online") as AssignmentMode,
    assignment_type: "exam" as AssignmentType,
    content: metadata as Assignment["content"],
    created_at: toIso(a._creationTime) ?? new Date().toISOString(),
    updated_at: toIso(a._creationTime) ?? new Date().toISOString(),
  }
}

// =====================================================
// Teacher Actions
// =====================================================

/**
 * Creates a new assignment for a class
 */
export async function createAssignment(
  classId: string,
  title: string,
  questionData: {
    question_ids?: string[]
    description?: string
    [key: string]: unknown
  } = {},
  options: {
    dueDate?: string
    status?: AssignmentStatus
    mode?: AssignmentMode
  } = {}
) {
  const ctx = await teacherCtx()
  if ("error" in ctx) {
    return { success: false, error: "You must be logged in to create an assignment" }
  }

  try {
    const questionIds = (questionData.question_ids ?? []) as string[]
    const result = await fetchMutation(api.assignments.createAssignmentFull, {
      classId: classId as Id<"classes">,
      teacherId: ctx.teacherId,
      title: title.trim(),
      mode: (options.mode ?? "online") as "online" | "paper",
      dueDate: options.dueDate ? new Date(options.dueDate).getTime() : undefined,
      status: options.status ?? "draft",
      questionIds: questionIds as Id<"questions">[],
      metadata: questionData,
    })

    if ("error" in result) {
      return {
        success: false,
        error:
          result.error === "forbidden"
            ? "You don't have permission to create assignments for this class"
            : "Class not found",
      }
    }

    revalidatePath("/dashboard")

    const data: Assignment = {
      id: result.assignmentId,
      class_id: classId,
      title: title.trim(),
      due_date: options.dueDate ?? null,
      status: options.status ?? "draft",
      mode: options.mode ?? "online",
      assignment_type: "exam",
      content: questionData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    return { success: true, data }
  } catch (error) {
    console.error("Error creating assignment:", error)
    return { success: false, error: "Failed to create assignment. Please try again." }
  }
}

/**
 * Gets all assignments for the logged-in teacher
 */
export async function getTeacherAssignments() {
  const ctx = await teacherCtx()
  if ("error" in ctx) return { success: false, error: ctx.error }

  try {
    const assignments = await fetchQuery(api.assignments.getTeacherAssignments, {
      teacherId: ctx.teacherId,
    })

    const counts = await fetchQuery(api.assignments.getSubmissionCounts, {
      assignmentIds: assignments.map((a) => a._id as Id<"assignments">),
    })

    const data: AssignmentWithClass[] = assignments.map((a) => ({
      ...mapAssignment(a as ConvexAssignment),
      class_name: a.className ?? "",
      subject: "Maths",
      submission_count: counts[a._id] ?? 0,
    }))

    return { success: true, data }
  } catch (error) {
    console.error("Error fetching assignments:", error)
    return { success: false, error: "Failed to fetch assignments" }
  }
}

/**
 * Gets assignments for a specific class
 */
export async function getClassAssignments(classId: string) {
  const ctx = await teacherCtx()
  if ("error" in ctx) return { success: false, error: ctx.error }

  try {
    const assignments = await fetchQuery(api.assignments.getClassAssignments, {
      classId: classId as Id<"classes">,
    })

    const counts = await fetchQuery(api.assignments.getSubmissionCounts, {
      assignmentIds: assignments.map((a) => a._id as Id<"assignments">),
    })

    const data = assignments.map((a) => ({
      ...mapAssignment(a as ConvexAssignment),
      submission_count: counts[a._id] ?? 0,
    }))

    return { success: true, data: data as Assignment[] }
  } catch (error) {
    console.error("Error fetching class assignments:", error)
    return { success: false, error: "Failed to fetch assignments" }
  }
}

/**
 * Updates an assignment
 */
export async function updateAssignment(
  assignmentId: string,
  updates: Partial<{
    title: string
    due_date: string | null
    status: AssignmentStatus
    content: Record<string, unknown>
  }>
) {
  const ctx = await teacherCtx()
  if ("error" in ctx) return { success: false, error: ctx.error }

  try {
    const result = await fetchMutation(api.assignments.updateAssignment, {
      assignmentId: assignmentId as Id<"assignments">,
      teacherId: ctx.teacherId,
      title: updates.title,
      dueDate:
        updates.due_date === undefined
          ? undefined
          : updates.due_date === null
            ? null
            : new Date(updates.due_date).getTime(),
      status: updates.status,
      metadata: updates.content,
    })

    if ("error" in result) {
      return { success: false, error: "Failed to update assignment" }
    }

    revalidatePath("/dashboard")

    return {
      success: true,
      data: result.assignment ? mapAssignment(result.assignment as ConvexAssignment) : undefined,
    }
  } catch (error) {
    console.error("Error updating assignment:", error)
    return { success: false, error: "Failed to update assignment" }
  }
}

/**
 * Publishes an assignment (changes status from draft to published)
 */
export async function publishAssignment(assignmentId: string) {
  return updateAssignment(assignmentId, { status: "published" })
}

/**
 * Deletes an assignment
 */
export async function deleteAssignment(assignmentId: string) {
  const ctx = await teacherCtx()
  if ("error" in ctx) return { success: false, error: ctx.error }

  try {
    const result = await fetchMutation(api.assignments.deleteAssignment, {
      assignmentId: assignmentId as Id<"assignments">,
      teacherId: ctx.teacherId,
    })
    if (result && "error" in result) {
      return { success: false, error: "Failed to delete assignment" }
    }
  } catch (error) {
    console.error("Error deleting assignment:", error)
    return { success: false, error: "Failed to delete assignment" }
  }

  revalidatePath("/dashboard")

  return { success: true }
}

// =====================================================
// Student Actions
// =====================================================

/**
 * Gets pending assignments for the logged-in student
 */
export async function getStudentAssignments() {
  const authUser = await getAuthUser()
  if (!authUser?.clerkId) return { success: false, error: "You must be logged in" }
  const studentId = await getConvexUserIdByClerkId(authUser.clerkId)
  if (!studentId) return { success: false, error: "You must be logged in" }

  try {
    const assignments = await fetchQuery(api.students.getAssignments, { studentId })
    const data: StudentPendingAssignment[] = assignments.map((a) => ({
      assignment_id: a.id,
      title: a.title,
      due_date: toIso(a.dueDate),
      class_id: a.classId,
      class_name: a.className,
      subject: "Maths",
      has_submitted: a.status !== "todo",
    }))
    return { success: true, data }
  } catch (error) {
    console.error("Error fetching student assignments:", error)
    return { success: false, error: "Failed to fetch assignments" }
  }
}

/**
 * Submits answers for an assignment
 */
export async function submitAssignment(
  assignmentId: string,
  answers: Record<string, unknown>
) {
  const authUser = await getAuthUser()
  if (!authUser?.clerkId) {
    return { success: false, error: "You must be logged in to submit" }
  }
  const studentId = await getConvexUserIdByClerkId(authUser.clerkId)
  if (!studentId) {
    return { success: false, error: "You must be logged in to submit" }
  }

  try {
    const result = await fetchMutation(api.assignments.submitAssignment, {
      assignmentId: assignmentId as Id<"assignments">,
      studentId,
    })

    const s = result.submission
    if (!s) {
      return { success: false, error: "Failed to submit assignment" }
    }

    revalidatePath("/dashboard")

    const data: Submission = {
      id: s._id,
      assignment_id: s.assignmentId,
      student_id: s.studentId,
      score: s.totalMarksAwarded ?? null,
      status: (s.status === "marked" ? "graded" : "submitted") as SubmissionStatus,
      answers,
      submitted_at: toIso(s.submittedAt) ?? new Date().toISOString(),
      graded_at: toIso(s.markedAt),
    }
    return { success: true, data }
  } catch (error) {
    console.error("Error submitting assignment:", error)
    return { success: false, error: "Failed to submit assignment" }
  }
}

// =====================================================
// Grading Actions (Teacher)
// =====================================================

/**
 * Gets all submissions for an assignment
 */
export async function getAssignmentSubmissions(assignmentId: string) {
  const ctx = await teacherCtx()
  if ("error" in ctx) return { success: false, error: ctx.error }

  try {
    const result = await fetchQuery(api.assignments.getAssignmentSubmissions, {
      assignmentId: assignmentId as Id<"assignments">,
      teacherId: ctx.teacherId,
    })

    if ("error" in result) {
      return { success: false, error: "Failed to fetch submissions" }
    }

    const data = result.submissions.map((s) => ({
      id: s.id,
      assignment_id: s.assignmentId,
      student_id: s.studentId,
      score: s.score,
      status: (s.status === "marked" ? "graded" : "submitted") as SubmissionStatus,
      submitted_at: toIso(s.submittedAt),
      graded_at: toIso(s.gradedAt),
      student: s.student
        ? { id: s.student.id, email: s.student.email, full_name: s.student.fullName }
        : null,
    }))

    return { success: true, data }
  } catch (error) {
    console.error("Error fetching submissions:", error)
    return { success: false, error: "Failed to fetch submissions" }
  }
}

/**
 * Grades a submission
 */
export async function gradeSubmission(submissionId: string, score: number) {
  const ctx = await teacherCtx()
  if ("error" in ctx) return { success: false, error: ctx.error }

  try {
    const result = await fetchMutation(api.assignments.gradeSubmission, {
      submissionId: submissionId as Id<"submissions">,
      teacherId: ctx.teacherId,
      score,
    })

    if ("error" in result) {
      return { success: false, error: "Failed to grade submission" }
    }

    revalidatePath("/dashboard")

    const s = result.submission
    const data: Submission | undefined = s
      ? {
          id: s._id,
          assignment_id: s.assignmentId,
          student_id: s.studentId,
          score: s.totalMarksAwarded ?? null,
          status: "graded" as SubmissionStatus,
          answers: {},
          submitted_at: toIso(s.submittedAt) ?? new Date().toISOString(),
          graded_at: toIso(s.markedAt),
        }
      : undefined

    return { success: true, data }
  } catch (error) {
    console.error("Error grading submission:", error)
    return { success: false, error: "Failed to grade submission" }
  }
}

// =====================================================
// Assignment-Questions Junction Table Actions
// =====================================================

/**
 * Creates a new assignment with linked questions using the junction table
 */
export async function createAssignmentWithQuestions(
  classId: string,
  title: string,
  questionIds: string[],
  options: {
    dueDate?: string
    status?: AssignmentStatus
    mode?: AssignmentMode
    description?: string
    generateFeedback?: boolean
    includeRemediation?: boolean
  } = {}
) {
  const ctx = await teacherCtx()
  if ("error" in ctx) {
    return { success: false, error: "You must be logged in to create an assignment" }
  }

  const feedbackSettings = {
    generate_feedback: options.generateFeedback ?? true,
    include_remediation: options.includeRemediation ?? true,
  }
  const metadata = {
    question_ids: questionIds,
    description: options.description || "",
    ...feedbackSettings,
  }

  try {
    const result = await fetchMutation(api.assignments.createAssignmentFull, {
      classId: classId as Id<"classes">,
      teacherId: ctx.teacherId,
      title: title.trim(),
      mode: (options.mode ?? "online") as "online" | "paper",
      dueDate: options.dueDate ? new Date(options.dueDate).getTime() : undefined,
      status: options.status ?? "draft",
      questionIds: questionIds as Id<"questions">[],
      metadata,
    })

    if ("error" in result) {
      return {
        success: false,
        error:
          result.error === "forbidden"
            ? "You don't have permission to create assignments for this class"
            : "Class not found",
      }
    }

    revalidatePath("/dashboard")

    const data: Assignment = {
      id: result.assignmentId,
      class_id: classId,
      title: title.trim(),
      due_date: options.dueDate ?? null,
      status: options.status ?? "draft",
      mode: options.mode ?? "online",
      assignment_type: "exam",
      content: metadata,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    return { success: true, data }
  } catch (error) {
    console.error("Error creating assignment:", error)
    return { success: false, error: "Failed to create assignment. Please try again." }
  }
}

/**
 * Gets detailed assignment information including ordered questions
 */
export async function getAssignmentDetails(
  assignmentId: string
): Promise<{
  success: boolean
  data?: AssignmentDetails
  error?: string
}> {
  const ctx = await teacherCtx()
  if ("error" in ctx) return { success: false, error: ctx.error }

  try {
    const result = await fetchQuery(api.assignments.getAssignmentDetails, {
      assignmentId: assignmentId as Id<"assignments">,
      teacherId: ctx.teacherId,
    })

    if ("error" in result) {
      return { success: false, error: "Assignment not found" }
    }

    const questions: QuestionWithDetails[] = result.questions.map((q) => ({
      question_id: q.questionId,
      order_index: q.orderIndex,
      marks: q.marks,
      question_latex: q.questionLatex,
      topic: q.topic,
      sub_topic: q.subTopic,
      difficulty: q.difficulty,
      question_type: q.questionType,
      calculator_allowed: q.calculatorAllowed,
      answer_key: q.answerKey as QuestionWithDetails["answer_key"],
      image_url: q.imageUrl ?? null,
      content_type: q.contentType ?? "generated_text",
    }))

    const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0)

    return {
      success: true,
      data: {
        id: result.id,
        title: result.title,
        class_id: result.classId,
        class_name: result.className,
        subject: result.subject,
        due_date: toIso(result.dueDate),
        status: (result.status === "published" ? "published" : "draft") as AssignmentStatus,
        total_marks: totalMarks,
        question_count: questions.length,
        questions,
        cover_config: (result.coverConfig as CoverConfig | null) ?? null,
      },
    }
  } catch (error) {
    console.error("Error in getAssignmentDetails:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

/**
 * Saves the editable front-cover config for an assignment.
 */
export async function saveCoverConfig(
  assignmentId: string,
  config: CoverConfig,
): Promise<{ success: boolean; error?: string }> {
  const ctx = await teacherCtx()
  if ("error" in ctx) return { success: false, error: ctx.error }
  try {
    const result = await fetchMutation(api.assignments.setCoverConfig, {
      assignmentId: assignmentId as Id<"assignments">,
      teacherId: ctx.teacherId,
      coverConfig: config,
    })
    if ("error" in result) {
      return { success: false, error: result.error === "forbidden" ? "Permission denied" : "Assignment not found" }
    }
    return { success: true }
  } catch (error) {
    console.error("Error in saveCoverConfig:", error)
    return { success: false, error: "Failed to save cover" }
  }
}

/**
 * Updates the questions linked to an assignment
 */
export async function updateAssignmentQuestions(
  assignmentId: string,
  questionIds: string[]
): Promise<{
  success: boolean
  error?: string
}> {
  const ctx = await teacherCtx()
  if ("error" in ctx) return { success: false, error: ctx.error }

  try {
    const result = await fetchMutation(api.assignments.updateAssignmentQuestions, {
      assignmentId: assignmentId as Id<"assignments">,
      teacherId: ctx.teacherId,
      questionIds: questionIds as Id<"questions">[],
    })

    if ("error" in result) {
      return {
        success: false,
        error:
          result.error === "forbidden"
            ? "You don't have permission to update this assignment"
            : "Assignment not found",
      }
    }

    revalidatePath("/dashboard")

    return { success: true }
  } catch (error) {
    console.error("Error in updateAssignmentQuestions:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
