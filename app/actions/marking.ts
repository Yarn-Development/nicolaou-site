"use server"

import { createClient } from "@/lib/supabase/server"
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
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      error: "You must be logged in to access marking",
    }
  }

  try {
    // 1. Fetch assignment with class info
    const { data: assignment, error: assignmentError } = await supabase
      .from("assignments")
      .select(`
        id,
        title,
        class_id,
        due_date,
        status,
        mode,
        content,
        source_type,
        resource_url,
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

    // Verify teacher owns this class
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const classData = assignment.classes as any
    if (classData.teacher_id !== user.id) {
      return {
        success: false,
        error: "You don't have permission to mark this assignment",
      }
    }

    // 2. Try to get questions from junction table first, then fallback to JSONB
    let questions: QuestionForMarking[] = []

    // Try junction table via RPC function
    const { data: junctionQuestions, error: junctionError } = await supabase.rpc(
      "get_assignment_questions",
      { p_assignment_id: assignmentId }
    )

    if (!junctionError && junctionQuestions && junctionQuestions.length > 0) {
      // Use junction table data (maintains proper order)
      // Now supports both bank questions and ghost questions (external papers)
      questions = junctionQuestions.map((q: {
        question_id: string
        question_latex: string
        marks: number
        topic: string
        sub_topic: string
        difficulty: string
        custom_question_number: string | null
        is_ghost: boolean
      }) => ({
        id: q.question_id,
        question_latex: q.question_latex,
        marks: q.marks,
        topic: q.topic,
        sub_topic: q.sub_topic,
        difficulty: q.difficulty,
        is_ghost: q.is_ghost || false,
        custom_question_number: q.custom_question_number,
      }))
    } else {
      // Fallback to JSONB content.question_ids
      const questionIds = (assignment.content as { question_ids?: string[] })?.question_ids || []

      if (questionIds.length > 0) {
        const { data: questionsData, error: questionsError } = await supabase
          .from("questions")
          .select("id, question_latex, marks, topic, sub_topic, difficulty")
          .in("id", questionIds)

        if (questionsError) {
          console.error("Error fetching questions:", questionsError)
        } else {
          // Maintain the order from question_ids
          questions = questionIds
            .map(id => questionsData?.find(q => q.id === id))
            .filter((q): q is QuestionForMarking => q !== undefined)
        }
      }
    }

    // 3. Fetch all students enrolled in the class
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from("enrollments")
      .select("student_id")
      .eq("class_id", assignment.class_id)

    if (enrollmentsError) {
      console.error("Error fetching enrollments:", enrollmentsError)
      return {
        success: false,
        error: "Failed to fetch enrolled students",
      }
    }

    const studentIds = enrollments?.map(e => e.student_id) || []

    // 4. Fetch student profiles
    let studentProfiles: { id: string; email: string; full_name: string | null }[] = []
    if (studentIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", studentIds)

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError)
      } else {
        studentProfiles = profiles || []
      }
    }

    // 5. Fetch existing submissions for this assignment
    const { data: submissions, error: submissionsError } = await supabase
      .from("submissions")
      .select("id, student_id, score, status, grading_data, feedback_released")
      .eq("assignment_id", assignmentId)

    if (submissionsError) {
      console.error("Error fetching submissions:", submissionsError)
    }

    // 6. Build students array with submission data
    const submissionMap = new Map(
      (submissions || []).map(s => [s.student_id, s])
    )

    const students: StudentForMarking[] = studentProfiles.map(profile => {
      const submission = submissionMap.get(profile.id)
      return {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        submission_id: submission?.id || null,
        grading_data: (submission?.grading_data as Record<string, { score: number }>) || null,
        total_score: submission?.score || null,
        status: submission
          ? (submission.status as "submitted" | "graded")
          : "not_submitted",
        feedback_released: submission?.feedback_released || false,
      }
    })

    // Sort students by name
    students.sort((a, b) => {
      const nameA = a.full_name || a.email
      const nameB = b.full_name || b.email
      return nameA.localeCompare(nameB)
    })

    // Calculate max total marks
    const maxTotalMarks = questions.reduce((sum, q) => sum + q.marks, 0)

    return {
      success: true,
      data: {
        assignment: {
          id: assignment.id,
          title: assignment.title,
          class_id: assignment.class_id,
          class_name: classData.name,
          subject: classData.subject,
          due_date: assignment.due_date,
          status: assignment.status,
          mode: (assignment.mode as "online" | "paper") || "online",
          source_type: (assignment.source_type as "bank_builder" | "external_upload") || "bank_builder",
          resource_url: assignment.resource_url || null,
        },
        questions,
        students,
        maxTotalMarks,
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
    // Calculate total score
    const totalScore = Object.values(gradingData).reduce(
      (sum, data) => sum + (data.score || 0),
      0
    )

    // Check if submission exists
    const { data: existingSubmission } = await supabase
      .from("submissions")
      .select("id")
      .eq("assignment_id", assignmentId)
      .eq("student_id", studentId)
      .single()

    let submissionId: string

    if (existingSubmission) {
      // Update existing submission
      const { error: updateError } = await supabase
        .from("submissions")
        .update({
          grading_data: gradingData,
          score: totalScore,
          status: "graded",
          graded_at: new Date().toISOString(),
        })
        .eq("id", existingSubmission.id)

      if (updateError) {
        console.error("Error updating submission:", updateError)
        return {
          success: false,
          error: "Failed to save marks",
        }
      }

      submissionId = existingSubmission.id
    } else {
      // Create new submission with grading data
      const { data: newSubmission, error: insertError } = await supabase
        .from("submissions")
        .insert({
          assignment_id: assignmentId,
          student_id: studentId,
          grading_data: gradingData,
          score: totalScore,
          status: "graded",
          graded_at: new Date().toISOString(),
          answers: {}, // Empty answers since teacher is entering marks directly
        })
        .select("id")
        .single()

      if (insertError) {
        console.error("Error creating submission:", insertError)
        return {
          success: false,
          error: "Failed to save marks",
        }
      }

      submissionId = newSubmission.id
    }

    revalidatePath(`/dashboard/assignments/${assignmentId}/mark`)

    return {
      success: true,
      data: {
        submission_id: submissionId,
        total_score: totalScore,
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
    const { error: updateError } = await supabase
      .from("submissions")
      .update({ feedback_released: release })
      .eq("assignment_id", assignmentId)

    if (updateError) {
      console.error("Error toggling feedback release:", updateError)
      return {
        success: false,
        error: "Failed to update feedback release status",
      }
    }

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
    // Get teacher's classes
    const { data: classes } = await supabase
      .from("classes")
      .select("id, name, subject")
      .eq("teacher_id", user.id)

    if (!classes || classes.length === 0) {
      return { success: true, data: [] }
    }

    const classIds = classes.map((c) => c.id)
    const classMap = new Map(classes.map((c) => [c.id, { name: c.name, subject: c.subject }]))

    // Get enrollment counts per class
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("class_id")
      .in("class_id", classIds)

    const enrollmentCounts = new Map<string, number>()
    for (const e of enrollments || []) {
      enrollmentCounts.set(e.class_id, (enrollmentCounts.get(e.class_id) || 0) + 1)
    }

    // Get all assignments (both published and draft)
    const { data: assignments, error: assignmentsError } = await supabase
      .from("assignments")
      .select("id, title, class_id, due_date, status, created_at")
      .in("class_id", classIds)
      .order("created_at", { ascending: false })

    if (assignmentsError) {
      console.error("Error fetching assignments:", assignmentsError)
      return { success: false, error: "Failed to fetch assignments" }
    }

    if (!assignments || assignments.length === 0) {
      return { success: true, data: [] }
    }

    // Get submission stats per assignment
    const assignmentIds = assignments.map((a) => a.id)
    const { data: submissions } = await supabase
      .from("submissions")
      .select("assignment_id, status")
      .in("assignment_id", assignmentIds)

    // Calculate stats per assignment
    const submissionStats = new Map<string, { submitted: number; graded: number }>()
    for (const s of submissions || []) {
      const stats = submissionStats.get(s.assignment_id) || { submitted: 0, graded: 0 }
      stats.submitted++
      if (s.status === "graded") {
        stats.graded++
      }
      submissionStats.set(s.assignment_id, stats)
    }

    // Build result
    const result: AssignmentForMarkingList[] = assignments.map((a) => {
      const classInfo = classMap.get(a.class_id)
      const totalStudents = enrollmentCounts.get(a.class_id) || 0
      const stats = submissionStats.get(a.id) || { submitted: 0, graded: 0 }

      return {
        id: a.id,
        title: a.title,
        className: classInfo?.name || "Unknown Class",
        subject: classInfo?.subject || "Unknown",
        dueDate: a.due_date,
        totalStudents,
        submittedCount: stats.submitted,
        gradedCount: stats.graded,
        needsGrading: stats.submitted - stats.graded,
        status: a.status as "published" | "draft",
        createdAt: a.created_at,
      }
    })

    return { success: true, data: result }
  } catch (error) {
    console.error("Error in getAssignmentsForMarking:", error)
    return {
      success: false,
      error: "An unexpected error occurred",
    }
  }
}
