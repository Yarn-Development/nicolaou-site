"use server"

import { createClient } from "@/lib/supabase/server"

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
// Get Student's Enrolled Classes
// =====================================================

/**
 * Gets all classes the current student is enrolled in
 * Returns class details including teacher name
 */
export async function getStudentClasses(): Promise<{
  success: boolean
  data?: StudentClass[]
  error?: string
}> {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: "You must be logged in" }
  }

  try {
    // Query enrollments joined with classes and teacher profiles
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from("enrollments")
      .select(`
        class_id,
        joined_at,
        classes!inner (
          id,
          name,
          subject,
          teacher_id
        )
      `)
      .eq("student_id", user.id)
      .order("joined_at", { ascending: false })

    if (enrollmentsError) {
      console.error("Error fetching enrollments:", enrollmentsError)
      return { success: false, error: "Failed to fetch classes" }
    }

    if (!enrollments || enrollments.length === 0) {
      return { success: true, data: [] }
    }

    // Get teacher IDs to fetch their profiles
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const teacherIds = [...new Set(enrollments.map((e: any) => e.classes.teacher_id))]

    // Fetch teacher profiles
    const { data: teacherProfiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", teacherIds)

    if (profilesError) {
      console.error("Error fetching teacher profiles:", profilesError)
      // Continue without teacher names if profiles fail
    }

    // Create a map for quick teacher lookup
    const teacherMap = new Map(
      (teacherProfiles || []).map((p) => [p.id, p])
    )

    // Transform the data
    const classes: StudentClass[] = enrollments.map((e) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cls = e.classes as any
      const teacher = teacherMap.get(cls.teacher_id)

      return {
        class_id: cls.id,
        class_name: cls.name,
        subject: cls.subject,
        teacher_name: teacher?.full_name || "Unknown Teacher",
        teacher_email: teacher?.email || "",
        joined_at: e.joined_at,
      }
    })

    return { success: true, data: classes }
  } catch (error) {
    console.error("Error in getStudentClasses:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// =====================================================
// Get Student's Assignments
// =====================================================

/**
 * Gets all assignments for the student's enrolled classes
 * Includes submission status for each assignment
 */
export async function getStudentAssignments(): Promise<{
  success: boolean
  data?: StudentAssignment[]
  error?: string
}> {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: "You must be logged in" }
  }

  try {
    // First get the student's enrolled class IDs with class names
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from("enrollments")
      .select(`
        class_id,
        classes (
          id,
          name
        )
      `)
      .eq("student_id", user.id)

    if (enrollmentsError) {
      console.error("Error fetching enrollments:", enrollmentsError)
      return { success: false, error: "Failed to fetch enrolled classes" }
    }

    if (!enrollments || enrollments.length === 0) {
      return { success: true, data: [] }
    }

    // Build class ID to name map
    const classMap = new Map<string, string>()
    const classIds: string[] = []
    
    for (const e of enrollments) {
      classIds.push(e.class_id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cls = e.classes as any
      if (cls) {
        classMap.set(e.class_id, cls.name || "Unknown Class")
      }
    }

    // Get published assignments for enrolled classes (simple query without join)
    const { data: assignments, error: assignmentsError } = await supabase
      .from("assignments")
      .select("id, title, class_id, due_date, status, mode, content")
      .in("class_id", classIds)
      .eq("status", "published")
      .order("due_date", { ascending: true, nullsFirst: false })

    if (assignmentsError) {
      console.error("Error fetching assignments:", assignmentsError)
      return { success: false, error: `Failed to fetch assignments: ${assignmentsError.message}` }
    }

    if (!assignments || assignments.length === 0) {
      return { success: true, data: [] }
    }

    // Get submissions for these assignments
    const assignmentIds = assignments.map((a) => a.id)
    const { data: submissions, error: submissionsError } = await supabase
      .from("submissions")
      .select("id, assignment_id, score, status, submitted_at, graded_at, feedback_released")
      .eq("student_id", user.id)
      .in("assignment_id", assignmentIds)

    if (submissionsError) {
      console.error("Error fetching submissions:", submissionsError)
      // Continue without submissions if they fail
    }

    // Create submission lookup map
    const submissionMap = new Map(
      (submissions || []).map((s) => [s.assignment_id, s])
    )

    // Get question marks for each assignment (to calculate max marks)
    const assignmentQuestionMarks: Map<string, number> = new Map()

    // Get all assignment questions in one query
    const { data: assignmentQuestions } = await supabase
      .from("assignment_questions")
      .select(`
        assignment_id,
        custom_marks,
        questions!inner (
          marks
        )
      `)
      .in("assignment_id", assignmentIds)

    if (assignmentQuestions) {
      for (const aq of assignmentQuestions) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const questionMarks = aq.custom_marks || (aq.questions as any)?.marks || 1
        const current = assignmentQuestionMarks.get(aq.assignment_id) || 0
        assignmentQuestionMarks.set(aq.assignment_id, current + questionMarks)
      }
    }

    // Fallback: check JSONB content for question_ids if no junction table data
    for (const assignment of assignments) {
      if (!assignmentQuestionMarks.has(assignment.id)) {
        const questionIds = (assignment.content as { question_ids?: string[] })?.question_ids || []
        
        if (questionIds.length > 0) {
          const { data: questions } = await supabase
            .from("questions")
            .select("marks")
            .in("id", questionIds)

          if (questions) {
            const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0)
            assignmentQuestionMarks.set(assignment.id, totalMarks)
          }
        }
      }
    }

    // Transform assignments
    const result: StudentAssignment[] = assignments.map((a) => {
      const submission = submissionMap.get(a.id)
      const maxMarks = assignmentQuestionMarks.get(a.id) || 0

      // Determine status
      let status: "todo" | "submitted" | "graded" = "todo"
      if (submission) {
        status = submission.status === "graded" ? "graded" : "submitted"
      }

      // Calculate percentage
      const percentage = submission?.score !== null && submission?.score !== undefined && maxMarks > 0
        ? Math.round((submission.score / maxMarks) * 100)
        : null

      return {
        id: a.id,
        title: a.title,
        class_id: a.class_id,
        class_name: classMap.get(a.class_id) || "Unknown Class",
        due_date: a.due_date,
        mode: (a.mode as "online" | "paper") || "online",
        status,
        score: submission?.score ?? null,
        max_marks: maxMarks,
        percentage,
        feedback_released: submission?.feedback_released || false,
        submitted_at: submission?.submitted_at ?? null,
        graded_at: submission?.graded_at ?? null,
        submission_id: submission?.id ?? null,
      }
    })

    return { success: true, data: result }
  } catch (error) {
    console.error("Error in getStudentAssignments:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// =====================================================
// Get Pending Assignments Count
// =====================================================

/**
 * Gets count of assignments that haven't been submitted yet
 */
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

/**
 * Gets full assignment details for a student to take
 * Includes questions and any existing submission
 */
export async function getAssignmentForTaking(assignmentId: string): Promise<{
  success: boolean
  data?: AssignmentForTaking
  error?: string
}> {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: "You must be logged in" }
  }

  try {
    // Verify student is enrolled in the class for this assignment
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
      return { success: false, error: "Assignment not found or not published" }
    }

    // Check enrollment
    const { data: enrollment, error: enrollmentError } = await supabase
      .from("enrollments")
      .select("id")
      .eq("class_id", assignment.class_id)
      .eq("student_id", user.id)
      .single()

    if (enrollmentError || !enrollment) {
      return { success: false, error: "You are not enrolled in this class" }
    }

    // Get questions using the RPC function
    const { data: questions, error: questionsError } = await supabase.rpc(
      "get_assignment_questions",
      { p_assignment_id: assignmentId }
    )

    if (questionsError) {
      console.error("Error fetching questions:", questionsError)
      return { success: false, error: "Failed to fetch questions" }
    }

    // Get existing submission if any
    const { data: submission } = await supabase
      .from("submissions")
      .select("id, status, answers")
      .eq("assignment_id", assignmentId)
      .eq("student_id", user.id)
      .single()

    // Calculate total marks
    const totalMarks = (questions || []).reduce(
      (sum: number, q: { marks: number }) => sum + (q.marks || 1),
      0
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cls = assignment.classes as any

    return {
      success: true,
      data: {
        id: assignment.id,
        title: assignment.title,
        class_name: cls.name,
        due_date: assignment.due_date,
        total_marks: totalMarks,
        questions: (questions || []).map((q: {
          question_id: string
          order_index: number
          marks: number
          question_latex: string
          topic: string
          sub_topic: string | null
          calculator_allowed: boolean
        }) => ({
          id: q.question_id,
          order_index: q.order_index,
          marks: q.marks || 1,
          question_latex: q.question_latex || "",
          image_url: null, // TODO: fetch from questions table if needed
          topic: q.topic,
          sub_topic: q.sub_topic,
          calculator_allowed: q.calculator_allowed,
        })),
        existing_submission: submission
          ? {
              id: submission.id,
              status: submission.status,
              answers: (submission.answers as Record<string, string>) || {},
            }
          : null,
      },
    }
  } catch (error) {
    console.error("Error in getAssignmentForTaking:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
