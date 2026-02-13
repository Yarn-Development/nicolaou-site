"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

// =====================================================
// Types
// =====================================================

interface DemoStudent {
  name: string
  email: string
}

// =====================================================
// Demo Data Seeding
// =====================================================

/**
 * Seeds demo data for the logged-in teacher
 * Creates a demo class with 5 fake students, a mock exam assignment,
 * and graded submissions so the teacher can see the marking/feedback workflow
 */
export async function seedDemoData(): Promise<{
  success: boolean
  data?: {
    classId: string
    className: string
    assignmentId: string
    studentCount: number
  }
  error?: string
  alreadySeeded?: boolean
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
      error: "You must be logged in to seed demo data",
    }
  }

  // Verify user is a teacher
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "teacher") {
    return {
      success: false,
      error: "Only teachers can seed demo data",
    }
  }

  try {
    // Check if demo class already exists for this teacher
    const { data: existingClass } = await supabase
      .from("classes")
      .select("id, name")
      .eq("teacher_id", user.id)
      .eq("name", "Year 13 Demo")
      .single()

    if (existingClass) {
      return {
        success: true,
        alreadySeeded: true,
        data: {
          classId: existingClass.id,
          className: existingClass.name,
          assignmentId: "",
          studentCount: 5,
        },
        error: "Demo data has already been seeded. Check your 'Year 13 Demo' class.",
      }
    }

    // 1. Create demo class
    const { data: newClass, error: classError } = await supabase
      .from("classes")
      .insert({
        teacher_id: user.id,
        name: "Year 13 Demo",
        subject: "Maths",
        join_code: "DEMO" + Math.random().toString(36).substring(2, 6).toUpperCase(),
      })
      .select()
      .single()

    if (classError || !newClass) {
      console.error("Error creating demo class:", classError)
      return {
        success: false,
        error: "Failed to create demo class",
      }
    }

    // 2. Create demo student profiles using admin client
    // We need the admin client to:
    // - Create auth.users entries (profiles.id has FK to auth.users)
    // - Bypass RLS (no INSERT policy exists on profiles for authenticated users)
    const admin = createAdminClient()

    const demoStudents: DemoStudent[] = [
      { name: "Alice Thompson", email: `demo.alice.${user.id.slice(0, 8)}@demo.nicolaou.app` },
      { name: "Ben Carter", email: `demo.ben.${user.id.slice(0, 8)}@demo.nicolaou.app` },
      { name: "Charlotte Lee", email: `demo.charlotte.${user.id.slice(0, 8)}@demo.nicolaou.app` },
      { name: "David Patel", email: `demo.david.${user.id.slice(0, 8)}@demo.nicolaou.app` },
      { name: "Emma Wilson", email: `demo.emma.${user.id.slice(0, 8)}@demo.nicolaou.app` },
    ]

    const studentIds: string[] = []

    for (const student of demoStudents) {
      // Create a real auth.users entry — this also triggers handle_new_user()
      // which auto-creates the profile row with role 'student'
      const { data: authUser, error: authError } = await admin.auth.admin.createUser({
        email: student.email,
        email_confirm: true,
        user_metadata: { full_name: student.name },
        // No password — demo users cannot log in
      })

      if (authError || !authUser.user) {
        console.error(`Error creating demo student ${student.name}:`, authError)
        continue
      }

      const studentId = authUser.user.id

      // Update the profile full_name in case the trigger didn't set it correctly
      await admin
        .from("profiles")
        .update({ full_name: student.name })
        .eq("id", studentId)

      studentIds.push(studentId)

      // 3. Enroll student in the demo class
      const { error: enrollError } = await admin
        .from("enrollments")
        .insert({
          class_id: newClass.id,
          student_id: studentId,
        })

      if (enrollError) {
        console.error(`Error enrolling demo student ${student.name}:`, enrollError)
      }
    }

    if (studentIds.length === 0) {
      return {
        success: false,
        error: "Failed to create demo students. Please check your database permissions.",
      }
    }

    // 4. Get some questions from the question bank for the mock exam
    const { data: questions, error: questionsError } = await supabase
      .from("questions")
      .select("id, marks, topic, sub_topic")
      .limit(8)
      .order("created_at", { ascending: false })

    if (questionsError || !questions || questions.length === 0) {
      console.error("Error fetching questions:", questionsError)
      return {
        success: false,
        error: "No questions found in the question bank. Please add questions first.",
      }
    }

    // 5. Create the mock exam assignment
    const questionIds = questions.map(q => q.id)
    
    const { data: newAssignment, error: assignmentError } = await supabase
      .from("assignments")
      .insert({
        class_id: newClass.id,
        title: "Mock Exam - Demo",
        content: {
          question_ids: questionIds,
          description: "Demo mock exam to showcase the marking and feedback workflow",
        },
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Due in 7 days
        status: "published",
        mode: "paper",
      })
      .select()
      .single()

    if (assignmentError || !newAssignment) {
      console.error("Error creating demo assignment:", assignmentError)
      return {
        success: false,
        error: "Failed to create demo assignment",
      }
    }

    // 6. Insert into assignment_questions junction table
    const assignmentQuestions = questionIds.map((questionId, index) => ({
      assignment_id: newAssignment.id,
      question_id: questionId,
      order_index: index,
    }))

    const { error: junctionError } = await admin
      .from("assignment_questions")
      .insert(assignmentQuestions)

    if (junctionError) {
      console.error("Error creating assignment_questions entries:", junctionError)
      // Non-fatal - continue
    }

    // 7. Create graded submissions for each student
    for (let i = 0; i < studentIds.length; i++) {
      const studentId = studentIds[i]
      
      // Generate random scores for each question (varying performance levels)
      // Student performance decreases slightly as we go through the list
      // to create realistic variation
      const performanceMultiplier = 0.95 - (i * 0.1) // 95%, 85%, 75%, 65%, 55%
      
      const gradingData: Record<string, { score: number }> = {}
      let totalScore = 0

      for (const question of questions) {
        // Random score with bias based on performance multiplier
        const maxScore = question.marks
        const baseScore = Math.floor(maxScore * performanceMultiplier)
        // Add some randomness (-1 to +1)
        const variance = Math.floor(Math.random() * 3) - 1
        const score = Math.max(0, Math.min(maxScore, baseScore + variance))
        
        gradingData[question.id] = { score }
        totalScore += score
      }

      // Create submission
      const {  error: submissionError } = await admin
        .from("submissions")
        .insert({
          assignment_id: newAssignment.id,
          student_id: studentId,
          grading_data: gradingData,
          score: totalScore,
          status: "graded",
          answers: {},
          submitted_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
          graded_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
          feedback_released: false,
        })
        .select("id")
        .single()

      if (submissionError) {
        console.error(`Error creating submission for student ${i + 1}:`, submissionError)
        continue
      }
    }

    // Revalidate paths
    revalidatePath("/dashboard")
    revalidatePath("/dashboard/students")
    revalidatePath("/dashboard/marking")
    revalidatePath("/dashboard/assignments")

    return {
      success: true,
      data: {
        classId: newClass.id,
        className: newClass.name,
        assignmentId: newAssignment.id,
        studentCount: studentIds.length,
      },
    }
  } catch (error) {
    console.error("Error in seedDemoData:", error)
    return {
      success: false,
      error: "An unexpected error occurred while seeding demo data",
    }
  }
}

/**
 * Removes all demo data for the logged-in teacher
 * Deletes the demo class and all associated data (students, assignments, submissions)
 */
export async function removeDemoData(): Promise<{
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
    const admin = createAdminClient()

    // Find the demo class
    const { data: demoClass } = await supabase
      .from("classes")
      .select("id")
      .eq("teacher_id", user.id)
      .eq("name", "Year 13 Demo")
      .single()

    if (!demoClass) {
      return {
        success: false,
        error: "No demo data found to remove",
      }
    }

    // Get demo students (those enrolled in this class with demo email pattern)
    const { data: enrollments } = await admin
      .from("enrollments")
      .select("student_id")
      .eq("class_id", demoClass.id)

    const studentIds = enrollments?.map(e => e.student_id) || []

    // Delete enrollments first
    await admin
      .from("enrollments")
      .delete()
      .eq("class_id", demoClass.id)

    // Delete demo student profiles and auth.users entries
    if (studentIds.length > 0) {
      // Profiles will be cascade-deleted when we delete the auth.users entries
      // (profiles.id FK references auth.users(id) ON DELETE CASCADE)
      for (const studentId of studentIds) {
        const { error: deleteUserError } = await admin.auth.admin.deleteUser(studentId)
        if (deleteUserError) {
          console.error(`Error deleting demo auth user ${studentId}:`, deleteUserError)
        }
      }
    }

    // Delete the demo class (this should cascade delete assignments, submissions, etc.)
    const { error: deleteError } = await admin
      .from("classes")
      .delete()
      .eq("id", demoClass.id)

    if (deleteError) {
      console.error("Error deleting demo class:", deleteError)
      return {
        success: false,
        error: "Failed to remove demo data",
      }
    }

    revalidatePath("/dashboard")
    revalidatePath("/dashboard/students")
    revalidatePath("/dashboard/marking")

    return { success: true }
  } catch (error) {
    console.error("Error in removeDemoData:", error)
    return {
      success: false,
      error: "An unexpected error occurred",
    }
  }
}

/**
 * Checks if demo data already exists for the logged-in teacher
 */
export async function checkDemoDataExists(): Promise<{
  exists: boolean
  classId?: string
  assignmentId?: string
}> {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { exists: false }
  }

  const { data: demoClass } = await supabase
    .from("classes")
    .select("id")
    .eq("teacher_id", user.id)
    .eq("name", "Year 13 Demo")
    .single()

  if (!demoClass) {
    return { exists: false }
  }

  // Get the demo assignment
  const { data: demoAssignment } = await supabase
    .from("assignments")
    .select("id")
    .eq("class_id", demoClass.id)
    .eq("title", "Mock Exam - Demo")
    .single()

  return {
    exists: true,
    classId: demoClass.id,
    assignmentId: demoAssignment?.id,
  }
}
