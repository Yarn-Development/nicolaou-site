"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// =====================================================
// Types
// =====================================================

export type AssignmentStatus = "draft" | "published"
export type AssignmentMode = "online" | "paper"
export type SubmissionStatus = "submitted" | "graded"

export type Assignment = {
  id: string
  class_id: string
  title: string
  due_date: string | null
  status: AssignmentStatus
  mode: AssignmentMode
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
  }
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
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      error: "You must be logged in to create an assignment",
    }
  }

  // Verify user is a teacher and owns this class
  const { data: classData, error: classError } = await supabase
    .from("classes")
    .select("teacher_id")
    .eq("id", classId)
    .single()

  if (classError || !classData) {
    return {
      success: false,
      error: "Class not found",
    }
  }

  if (classData.teacher_id !== user.id) {
    return {
      success: false,
      error: "You don't have permission to create assignments for this class",
    }
  }

  // Create the assignment
  const { data: newAssignment, error: insertError } = await supabase
    .from("assignments")
    .insert({
      class_id: classId,
      title: title.trim(),
      content: questionData,
      due_date: options.dueDate || null,
      status: options.status || "draft",
      mode: options.mode || "online",
    })
    .select()
    .single()

  if (insertError) {
    console.error("Error creating assignment:", insertError)
    return {
      success: false,
      error: "Failed to create assignment. Please try again.",
    }
  }

  revalidatePath("/dashboard")

  return {
    success: true,
    data: newAssignment as Assignment,
  }
}

/**
 * Gets all assignments for the logged-in teacher
 */
export async function getTeacherAssignments() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      error: "You must be logged in",
    }
  }

  // Get assignments with class info and submission counts
  const { data: assignments, error: assignmentsError } = await supabase
    .from("assignments")
    .select(
      `
      *,
      classes!inner(
        id,
        name,
        subject,
        teacher_id
      ),
      submissions(count)
    `
    )
    .eq("classes.teacher_id", user.id)
    .order("created_at", { ascending: false })

  if (assignmentsError) {
    console.error("Error fetching assignments:", assignmentsError)
    return {
      success: false,
      error: "Failed to fetch assignments",
    }
  }

  // Transform the data
  const transformedAssignments = assignments.map((a) => ({
    ...a,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    class_name: (a.classes as any).name,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    subject: (a.classes as any).subject,
    submission_count: Array.isArray(a.submissions) ? a.submissions.length : 0,
    classes: undefined,
    submissions: undefined,
  }))

  return {
    success: true,
    data: transformedAssignments as AssignmentWithClass[],
  }
}

/**
 * Gets assignments for a specific class
 */
export async function getClassAssignments(classId: string) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      error: "You must be logged in",
    }
  }

  const { data: assignments, error: assignmentsError } = await supabase
    .from("assignments")
    .select(
      `
      *,
      submissions(count)
    `
    )
    .eq("class_id", classId)
    .order("created_at", { ascending: false })

  if (assignmentsError) {
    console.error("Error fetching class assignments:", assignmentsError)
    return {
      success: false,
      error: "Failed to fetch assignments",
    }
  }

  const transformedAssignments = assignments.map((a) => ({
    ...a,
    submission_count: Array.isArray(a.submissions) ? a.submissions.length : 0,
    submissions: undefined,
  }))

  return {
    success: true,
    data: transformedAssignments as Assignment[],
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
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      error: "You must be logged in",
    }
  }

  const { data: updated, error: updateError } = await supabase
    .from("assignments")
    .update(updates)
    .eq("id", assignmentId)
    .select()
    .single()

  if (updateError) {
    console.error("Error updating assignment:", updateError)
    return {
      success: false,
      error: "Failed to update assignment",
    }
  }

  revalidatePath("/dashboard")

  return {
    success: true,
    data: updated as Assignment,
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
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      error: "You must be logged in",
    }
  }

  const { error: deleteError } = await supabase
    .from("assignments")
    .delete()
    .eq("id", assignmentId)

  if (deleteError) {
    console.error("Error deleting assignment:", deleteError)
    return {
      success: false,
      error: "Failed to delete assignment",
    }
  }

  revalidatePath("/dashboard")

  return { success: true }
}

// =====================================================
// Student Actions
// =====================================================

/**
 * Gets pending assignments for the logged-in student
 * Uses the database function for efficient querying
 */
export async function getStudentAssignments() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      error: "You must be logged in",
    }
  }

  // Use the helper function we created in the migration
  const { data: assignments, error: assignmentsError } = await supabase.rpc(
    "get_student_pending_assignments",
    { p_student_id: user.id }
  )

  if (assignmentsError) {
    console.error("Error fetching student assignments:", assignmentsError)
    return {
      success: false,
      error: "Failed to fetch assignments",
    }
  }

  return {
    success: true,
    data: assignments as StudentPendingAssignment[],
  }
}

/**
 * Submits answers for an assignment
 */
export async function submitAssignment(
  assignmentId: string,
  answers: Record<string, unknown>
) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      error: "You must be logged in to submit",
    }
  }

  // Check if student already submitted
  const { data: existingSubmission } = await supabase
    .from("submissions")
    .select("id")
    .eq("assignment_id", assignmentId)
    .eq("student_id", user.id)
    .single()

  if (existingSubmission) {
    // Update existing submission
    const { data: updated, error: updateError } = await supabase
      .from("submissions")
      .update({
        answers,
        submitted_at: new Date().toISOString(),
      })
      .eq("id", existingSubmission.id)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating submission:", updateError)
      return {
        success: false,
        error: "Failed to update submission",
      }
    }

    return {
      success: true,
      data: updated as Submission,
    }
  }

  // Create new submission
  const { data: submission, error: insertError } = await supabase
    .from("submissions")
    .insert({
      assignment_id: assignmentId,
      student_id: user.id,
      answers,
      status: "submitted",
    })
    .select()
    .single()

  if (insertError) {
    console.error("Error creating submission:", insertError)
    return {
      success: false,
      error: "Failed to submit assignment",
    }
  }

  revalidatePath("/dashboard")

  return {
    success: true,
    data: submission as Submission,
  }
}

// =====================================================
// Grading Actions (Teacher)
// =====================================================

/**
 * Gets all submissions for an assignment
 */
export async function getAssignmentSubmissions(assignmentId: string) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      error: "You must be logged in",
    }
  }

  const { data: submissions, error: submissionsError } = await supabase
    .from("submissions")
    .select(
      `
      *,
      student:profiles!submissions_student_id_fkey(
        id,
        email,
        full_name
      )
    `
    )
    .eq("assignment_id", assignmentId)
    .order("submitted_at", { ascending: true })

  if (submissionsError) {
    console.error("Error fetching submissions:", submissionsError)
    return {
      success: false,
      error: "Failed to fetch submissions",
    }
  }

  return {
    success: true,
    data: submissions,
  }
}

/**
 * Grades a submission
 */
export async function gradeSubmission(submissionId: string, score: number) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      error: "You must be logged in",
    }
  }

  const { data: graded, error: gradeError } = await supabase
    .from("submissions")
    .update({
      score,
      status: "graded" as SubmissionStatus,
      graded_at: new Date().toISOString(),
    })
    .eq("id", submissionId)
    .select()
    .single()

  if (gradeError) {
    console.error("Error grading submission:", gradeError)
    return {
      success: false,
      error: "Failed to grade submission",
    }
  }

  revalidatePath("/dashboard")

  return {
    success: true,
    data: graded as Submission,
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
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      error: "You must be logged in to create an assignment",
    }
  }

  // Verify user is a teacher and owns this class
  const { data: classData, error: classError } = await supabase
    .from("classes")
    .select("teacher_id")
    .eq("id", classId)
    .single()

  if (classError || !classData) {
    return {
      success: false,
      error: "Class not found",
    }
  }

  if (classData.teacher_id !== user.id) {
    return {
      success: false,
      error: "You don't have permission to create assignments for this class",
    }
  }

  // Create the assignment (also store question_ids in content for backward compatibility)
  const feedbackSettings = {
    generate_feedback: options.generateFeedback ?? true,
    include_remediation: options.includeRemediation ?? true,
  }

  const { data: newAssignment, error: insertError } = await supabase
    .from("assignments")
    .insert({
      class_id: classId,
      title: title.trim(),
      content: {
        question_ids: questionIds,
        description: options.description || "",
        ...feedbackSettings,
      },
      metadata: feedbackSettings,
      due_date: options.dueDate || null,
      status: options.status || "draft",
      mode: options.mode || "online",
    })
    .select()
    .single()

  if (insertError) {
    console.error("Error creating assignment:", insertError)
    return {
      success: false,
      error: "Failed to create assignment. Please try again.",
    }
  }

  // Insert rows into assignment_questions junction table
  if (questionIds.length > 0) {
    const assignmentQuestions = questionIds.map((questionId, index) => ({
      assignment_id: newAssignment.id,
      question_id: questionId,
      order_index: index,
    }))

    const { error: junctionError } = await supabase
      .from("assignment_questions")
      .insert(assignmentQuestions)

    if (junctionError) {
      console.error("Error creating assignment_questions entries:", junctionError)
      // Don't fail the whole operation - the assignment was created
      // The JSONB fallback will work
    }
  }

  revalidatePath("/dashboard")

  return {
    success: true,
    data: newAssignment as Assignment,
  }
}

/**
 * Gets detailed assignment information including ordered questions
 * Uses the junction table, falls back to JSONB content.question_ids
 */
export async function getAssignmentDetails(
  assignmentId: string
): Promise<{
  success: boolean
  data?: AssignmentDetails
  error?: string
}> {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      error: "You must be logged in",
    }
  }

  try {
    // Fetch assignment with class info
    const { data: assignment, error: assignmentError } = await supabase
      .from("assignments")
      .select(`
        id,
        title,
        class_id,
        due_date,
        status,
        content,
        classes!inner(
          id,
          name,
          subject,
          teacher_id
        )
      `)
      .eq("id", assignmentId)
      .single()

    if (assignmentError || !assignment) {
      console.error("Error fetching assignment:", assignmentError)
      return {
        success: false,
        error: "Assignment not found",
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const classData = assignment.classes as any

    // Try to get questions from junction table first
    const { data: junctionQuestions, error: junctionError } = await supabase.rpc(
      "get_assignment_questions",
      { p_assignment_id: assignmentId }
    )

    // Debug logging
    if (junctionError) {
      console.log("[getAssignmentDetails] RPC error:", junctionError.message)
    }
    console.log("[getAssignmentDetails] Junction questions found:", junctionQuestions?.length ?? 0)

    let questions: QuestionWithDetails[] = []

    if (!junctionError && junctionQuestions && junctionQuestions.length > 0) {
      // Use junction table data from RPC
      questions = junctionQuestions.map((q: {
        question_id: string
        order_index: number
        marks: number
        question_latex: string
        topic: string
        sub_topic: string
        difficulty: string
        question_type: string
        calculator_allowed: boolean
        answer_key: { answer: string; explanation: string }
        custom_question_number: string | null
        is_ghost: boolean
      }) => ({
        question_id: q.question_id,
        order_index: q.order_index,
        marks: q.marks,
        question_latex: q.question_latex,
        topic: q.topic,
        sub_topic: q.sub_topic,
        difficulty: q.difficulty,
        question_type: q.question_type,
        calculator_allowed: q.calculator_allowed,
        answer_key: q.answer_key,
      }))
    } else {
      // Fallback 1: Try direct query to junction table
      console.log("[getAssignmentDetails] Trying direct junction table query...")
      const { data: directJunction, error: directError } = await supabase
        .from("assignment_questions")
        .select(`
          question_id,
          order_index,
          questions!inner(
            id,
            marks,
            question_latex,
            topic,
            sub_topic,
            difficulty,
            question_type,
            calculator_allowed,
            answer_key
          )
        `)
        .eq("assignment_id", assignmentId)
        .order("order_index", { ascending: true })

      if (!directError && directJunction && directJunction.length > 0) {
        console.log("[getAssignmentDetails] Direct junction query found:", directJunction.length)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        questions = directJunction.map((aq: any) => {
          const q = aq.questions
          return {
            question_id: aq.question_id,
            order_index: aq.order_index,
            marks: q.marks,
            question_latex: q.question_latex,
            topic: q.topic,
            sub_topic: q.sub_topic,
            difficulty: q.difficulty,
            question_type: q.question_type,
            calculator_allowed: q.calculator_allowed,
            answer_key: q.answer_key,
          }
        })
      } else {
        // Fallback 2: Use JSONB content.question_ids
        if (directError) {
          console.log("[getAssignmentDetails] Direct junction error:", directError.message)
        }
        const questionIds = (assignment.content as { question_ids?: string[] })?.question_ids || []
        console.log("[getAssignmentDetails] Fallback to content.question_ids:", questionIds.length)

        if (questionIds.length > 0) {
          const { data: questionsData, error: questionsError } = await supabase
            .from("questions")
            .select("id, marks, question_latex, topic, sub_topic, difficulty, question_type, calculator_allowed, answer_key")
            .in("id", questionIds)

          console.log("[getAssignmentDetails] Questions fetch result:", questionsData?.length ?? 0, "error:", questionsError?.message)

          if (!questionsError && questionsData) {
            // Maintain order from question_ids array
            questions = questionIds
              .map((id, index) => {
                const q = questionsData.find((qd) => qd.id === id)
                if (!q) return null
                return {
                  question_id: q.id,
                  order_index: index,
                  marks: q.marks,
                  question_latex: q.question_latex,
                  topic: q.topic,
                  sub_topic: q.sub_topic,
                  difficulty: q.difficulty,
                  question_type: q.question_type,
                  calculator_allowed: q.calculator_allowed,
                  answer_key: q.answer_key as { answer: string; explanation: string },
                }
              })
              .filter((q): q is QuestionWithDetails => q !== null)
          }
        }
      }
    }

    const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0)

    return {
      success: true,
      data: {
        id: assignment.id,
        title: assignment.title,
        class_id: assignment.class_id,
        class_name: classData.name,
        subject: classData.subject,
        due_date: assignment.due_date,
        status: assignment.status as AssignmentStatus,
        total_marks: totalMarks,
        question_count: questions.length,
        questions,
      },
    }
  } catch (error) {
    console.error("Error in getAssignmentDetails:", error)
    return {
      success: false,
      error: "An unexpected error occurred",
    }
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
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      error: "You must be logged in",
    }
  }

  try {
    // Verify assignment exists and user has permission
    const { data: assignment, error: assignmentError } = await supabase
      .from("assignments")
      .select(`
        id,
        content,
        classes!inner(teacher_id)
      `)
      .eq("id", assignmentId)
      .single()

    if (assignmentError || !assignment) {
      return {
        success: false,
        error: "Assignment not found",
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((assignment.classes as any).teacher_id !== user.id) {
      return {
        success: false,
        error: "You don't have permission to update this assignment",
      }
    }

    // Delete existing junction table entries
    const { error: deleteError } = await supabase
      .from("assignment_questions")
      .delete()
      .eq("assignment_id", assignmentId)

    if (deleteError) {
      console.error("Error deleting old assignment_questions:", deleteError)
      return {
        success: false,
        error: "Failed to update questions",
      }
    }

    // Insert new junction table entries
    if (questionIds.length > 0) {
      const assignmentQuestions = questionIds.map((questionId, index) => ({
        assignment_id: assignmentId,
        question_id: questionId,
        order_index: index,
      }))

      const { error: insertError } = await supabase
        .from("assignment_questions")
        .insert(assignmentQuestions)

      if (insertError) {
        console.error("Error inserting new assignment_questions:", insertError)
        return {
          success: false,
          error: "Failed to update questions",
        }
      }
    }

    // Also update JSONB for backward compatibility
    const existingContent = (assignment.content as Record<string, unknown>) || {}
    const { error: updateError } = await supabase
      .from("assignments")
      .update({
        content: {
          ...existingContent,
          question_ids: questionIds,
        },
      })
      .eq("id", assignmentId)

    if (updateError) {
      console.error("Error updating assignment content:", updateError)
      // Non-fatal - junction table was updated
    }

    revalidatePath("/dashboard")

    return { success: true }
  } catch (error) {
    console.error("Error in updateAssignmentQuestions:", error)
    return {
      success: false,
      error: "An unexpected error occurred",
    }
  }
}
