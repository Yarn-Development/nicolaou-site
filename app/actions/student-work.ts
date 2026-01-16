"use server"

import { createClient } from "@/lib/supabase/server"

// =====================================================
// Types
// =====================================================

export interface WorksheetQuestion {
  id: string
  order_index: number
  marks: number
  question_latex: string | null
  image_url: string | null
  content_type: "generated_text" | "image_ocr"
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

// =====================================================
// Load Assignment for Student
// =====================================================

/**
 * Loads an assignment for a student to take or review
 * - Verifies enrollment
 * - Fetches assignment details and questions
 * - Checks for existing submission
 * - Returns mode: "answer" if they can still submit, "readonly" if already submitted
 */
export async function loadAssignment(assignmentId: string): Promise<LoadAssignmentResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: "You must be logged in" }
  }

  try {
    // 1. Get assignment details with class info
    const { data: assignment, error: assignmentError } = await supabase
      .from("assignments")
      .select(`
        id,
        title,
        due_date,
        status,
        class_id,
        classes!inner (
          id,
          name
        )
      `)
      .eq("id", assignmentId)
      .eq("status", "published")
      .single()

    if (assignmentError || !assignment) {
      console.error("Assignment error:", assignmentError)
      return { success: false, error: "Assignment not found or not published" }
    }

    // 2. Verify student is enrolled in the class
    const { data: enrollment, error: enrollmentError } = await supabase
      .from("enrollments")
      .select("id")
      .eq("class_id", assignment.class_id)
      .eq("student_id", user.id)
      .single()

    if (enrollmentError || !enrollment) {
      return { success: false, error: "You are not enrolled in this class" }
    }

    // 3. Get questions using the RPC function
    const { data: questions, error: questionsError } = await supabase.rpc(
      "get_assignment_questions",
      { p_assignment_id: assignmentId }
    )

    if (questionsError) {
      console.error("Questions error:", questionsError)
      return { success: false, error: "Failed to fetch questions" }
    }

    // Also get the image_url and content_type from questions table
    const questionIds = (questions || []).map((q: { question_id: string }) => q.question_id)
    
    let questionDetails: Record<string, { image_url: string | null; content_type: string }> = {}
    
    if (questionIds.length > 0) {
      const { data: fullQuestions } = await supabase
        .from("questions")
        .select("id, image_url, content_type")
        .in("id", questionIds)

      if (fullQuestions) {
        questionDetails = Object.fromEntries(
          fullQuestions.map((q) => [q.id, { image_url: q.image_url, content_type: q.content_type }])
        )
      }
    }

    // 4. Check for existing submission
    const { data: submission } = await supabase
      .from("submissions")
      .select("id, status, answers, score, submitted_at, graded_at")
      .eq("assignment_id", assignmentId)
      .eq("student_id", user.id)
      .single()

    // 5. Determine mode - if submission exists, it's readonly (already submitted)
    const mode: "answer" | "readonly" = submission ? "readonly" : "answer"

    // 6. Calculate total marks
    const totalMarks = (questions || []).reduce(
      (sum: number, q: { marks: number }) => sum + (q.marks || 1),
      0
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cls = assignment.classes as any

    // 7. Transform questions
    const transformedQuestions: WorksheetQuestion[] = (questions || []).map(
      (q: {
        question_id: string
        order_index: number
        marks: number
        question_latex: string | null
        topic: string
        sub_topic: string | null
        calculator_allowed: boolean
      }) => {
        const details = questionDetails[q.question_id]
        return {
          id: q.question_id,
          order_index: q.order_index,
          marks: q.marks || 1,
          question_latex: q.question_latex,
          image_url: details?.image_url || null,
          content_type: (details?.content_type as "generated_text" | "image_ocr") || "generated_text",
          topic: q.topic,
          sub_topic: q.sub_topic,
          calculator_allowed: q.calculator_allowed,
        }
      }
    )

    return {
      success: true,
      data: {
        assignment: {
          id: assignment.id,
          title: assignment.title,
          class_name: cls.name,
          due_date: assignment.due_date,
          total_marks: totalMarks,
          questions: transformedQuestions,
        },
        submission: submission
          ? {
              id: submission.id,
              status: submission.status as "submitted" | "graded",
              answers: (submission.answers as Record<string, string>) || {},
              score: submission.score,
              submitted_at: submission.submitted_at,
              graded_at: submission.graded_at,
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

/**
 * Final submission of assignment
 * - Creates submission in submissions table
 * - Sets status to 'submitted'
 * - Records submission timestamp
 */
export async function submitAssignment(
  assignmentId: string,
  answers: Record<string, string>
): Promise<SubmitAssignmentResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: "You must be logged in" }
  }

  try {
    // Verify assignment exists and is published
    const { data: assignment, error: assignmentError } = await supabase
      .from("assignments")
      .select("id, class_id, status")
      .eq("id", assignmentId)
      .eq("status", "published")
      .single()

    if (assignmentError || !assignment) {
      return { success: false, error: "Assignment not found or not published" }
    }

    // Verify enrollment
    const { data: enrollment, error: enrollmentError } = await supabase
      .from("enrollments")
      .select("id")
      .eq("class_id", assignment.class_id)
      .eq("student_id", user.id)
      .single()

    if (enrollmentError || !enrollment) {
      return { success: false, error: "You are not enrolled in this class" }
    }

    // Check for existing submission
    const { data: existingSubmission } = await supabase
      .from("submissions")
      .select("id, status")
      .eq("assignment_id", assignmentId)
      .eq("student_id", user.id)
      .single()

    // If already submitted, don't allow resubmission
    if (existingSubmission) {
      return { success: false, error: "Assignment already submitted" }
    }

    // Create new submission
    const { data: newSubmission, error: insertError } = await supabase
      .from("submissions")
      .insert({
        assignment_id: assignmentId,
        student_id: user.id,
        answers,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (insertError) {
      console.error("Insert error:", insertError)
      return { success: false, error: "Failed to submit assignment" }
    }

    return { success: true, submission_id: newSubmission.id }
  } catch (error) {
    console.error("Error in submitAssignment:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
