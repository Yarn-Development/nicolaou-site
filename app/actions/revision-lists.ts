"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { 
  GeneratedSimilarQuestion, 
  StudentRevisionListResult,
  RevisionListQuestionResult 
} from "@/lib/types/database"

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
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: "You must be logged in" }
  }

  try {
    // 1. Verify teacher owns the assignment/class
    const { data: assignment, error: assignmentError } = await supabase
      .from("assignments")
      .select(`
        id,
        title,
        class_id,
        classes!inner(id, teacher_id)
      `)
      .eq("id", input.assignmentId)
      .single()

    if (assignmentError || !assignment) {
      return { success: false, error: "Assignment not found" }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const classData = assignment.classes as any
    if (classData.teacher_id !== user.id) {
      return { success: false, error: "Permission denied" }
    }

    // Filter to only included questions
    const includedQuestions = input.generatedQuestions.filter(q => q.included)
    
    if (includedQuestions.length === 0) {
      return { success: false, error: "At least one question must be included" }
    }

    // 2. Save all generated questions to the questions table
    const questionsToInsert = includedQuestions.map(q => ({
      created_by: user.id,
      content_type: 'revision_generated' as const,
      question_latex: q.questionLatex,
      topic: q.topic,
      topic_name: q.topic,
      sub_topic_name: q.subTopic,
      difficulty: q.difficulty,
      marks: q.marks,
      question_type: 'Fluency' as const, // Default for revision questions
      calculator_allowed: true, // Default
      answer_key: {
        answer: q.answerKey.answer,
        explanation: q.answerKey.explanation,
        type: 'generated'
      },
      is_verified: false,
      curriculum_level: q.difficulty === 'Higher' ? 'GCSE Higher' : 'GCSE Foundation'
    }))

    const { data: savedQuestions, error: saveQuestionsError } = await supabase
      .from("questions")
      .insert(questionsToInsert)
      .select("id")

    if (saveQuestionsError || !savedQuestions) {
      console.error("Failed to save questions:", saveQuestionsError)
      return { success: false, error: "Failed to save generated questions" }
    }

    // 3. Create the revision list record
    const { data: revisionList, error: revisionListError } = await supabase
      .from("revision_lists")
      .insert({
        assignment_id: input.assignmentId,
        title: input.title,
        description: input.description || null,
        created_by: user.id,
      })
      .select("id, created_at")
      .single()

    if (revisionListError || !revisionList) {
      console.error("Failed to create revision list:", revisionListError)
      // Rollback: delete the saved questions
      const questionIds = savedQuestions.map(q => q.id)
      await supabase.from("questions").delete().in("id", questionIds)
      return { success: false, error: "Failed to create revision list" }
    }

    // 4. Link questions to the revision list
    const revisionListQuestions = savedQuestions.map((q, index) => {
      const originalQ = includedQuestions[index]
      return {
        revision_list_id: revisionList.id,
        question_id: q.id,
        source_question_number: originalQ.sourceQuestionNumber,
        source_question_latex: originalQ.sourceQuestionLatex,
        order_index: index,
      }
    })

    const { error: linkError } = await supabase
      .from("revision_list_questions")
      .insert(revisionListQuestions)

    if (linkError) {
      console.error("Failed to link questions:", linkError)
      // Rollback
      await supabase.from("revision_lists").delete().eq("id", revisionList.id)
      const questionIds = savedQuestions.map(q => q.id)
      await supabase.from("questions").delete().in("id", questionIds)
      return { success: false, error: "Failed to link questions to revision list" }
    }

    // 5. Auto-allocate to all students in the class
    const { data: allocationCount, error: allocationError } = await supabase
      .rpc("allocate_revision_list_to_class", {
        p_revision_list_id: revisionList.id,
        p_class_id: input.classId
      })

    if (allocationError) {
      console.error("Failed to allocate to students:", allocationError)
      // Don't rollback - revision list is still usable, just not auto-allocated
    }

    revalidatePath("/dashboard/assignments")
    revalidatePath("/dashboard/revision")

    return {
      success: true,
      data: {
        id: revisionList.id,
        title: input.title,
        description: input.description || null,
        assignmentId: input.assignmentId,
        questionCount: savedQuestions.length,
        studentsAllocated: allocationCount || 0,
        createdAt: revisionList.created_at,
      }
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
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: "You must be logged in" }
  }

  try {
    const { data, error } = await supabase.rpc("get_student_revision_lists", {
      p_student_id: user.id
    })

    if (error) {
      console.error("Failed to get revision lists:", error)
      return { success: false, error: "Failed to fetch revision lists" }
    }

    return { success: true, data: data || [] }
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
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: "You must be logged in" }
  }

  try {
    const { data, error } = await supabase.rpc("get_revision_list_questions", {
      p_revision_list_id: revisionListId
    })

    if (error) {
      console.error("Failed to get revision list questions:", error)
      return { success: false, error: "Failed to fetch questions" }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error("Error in getRevisionListQuestions:", error)
    return { success: false, error: "An unexpected error occurred" }
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
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: "You must be logged in" }
  }

  try {
    // Get current allocation
    const { data: allocation, error: allocationError } = await supabase
      .from("student_revision_allocations")
      .select("id, progress, status")
      .eq("revision_list_id", input.revisionListId)
      .eq("student_id", user.id)
      .single()

    if (allocationError || !allocation) {
      return { success: false, error: "Revision list not found" }
    }

    // Update progress
    const currentProgress = allocation.progress || {}
    const newProgress = {
      ...currentProgress,
      [input.questionId]: {
        completed: input.completed,
        completed_at: input.completed ? new Date().toISOString() : null
      }
    }

    // Determine new status
    let newStatus = allocation.status
    const completedCount = Object.values(newProgress).filter(
      (p: { completed: boolean }) => p.completed
    ).length

    // Get total question count
    const { count: totalQuestions } = await supabase
      .from("revision_list_questions")
      .select("*", { count: "exact", head: true })
      .eq("revision_list_id", input.revisionListId)

    if (completedCount === 0) {
      newStatus = 'pending'
    } else if (completedCount === totalQuestions) {
      newStatus = 'completed'
    } else {
      newStatus = 'in_progress'
    }

    // Update the allocation
    const updateData: {
      progress: typeof newProgress
      status: typeof newStatus
      started_at?: string
      completed_at?: string | null
    } = {
      progress: newProgress,
      status: newStatus,
    }

    // Set started_at if this is the first progress
    if (allocation.status === 'pending' && newStatus === 'in_progress') {
      updateData.started_at = new Date().toISOString()
    }

    // Set completed_at if all done
    if (newStatus === 'completed') {
      updateData.completed_at = new Date().toISOString()
    } else {
      updateData.completed_at = null
    }

    const { error: updateError } = await supabase
      .from("student_revision_allocations")
      .update(updateData)
      .eq("id", allocation.id)

    if (updateError) {
      console.error("Failed to update progress:", updateError)
      return { success: false, error: "Failed to update progress" }
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
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: "You must be logged in" }
  }

  try {
    // Get the revision list
    const { data: revisionList, error: listError } = await supabase
      .from("revision_lists")
      .select("id, title, description, created_at, created_by")
      .eq("assignment_id", assignmentId)
      .single()

    if (listError) {
      // No revision list exists for this assignment
      if (listError.code === 'PGRST116') {
        return { success: true, data: null }
      }
      console.error("Failed to get revision list:", listError)
      return { success: false, error: "Failed to fetch revision list" }
    }

    // Verify ownership
    if (revisionList.created_by !== user.id) {
      return { success: false, error: "Permission denied" }
    }

    // Get questions
    const { data: questions, error: questionsError } = await supabase.rpc(
      "get_revision_list_questions",
      { p_revision_list_id: revisionList.id }
    )

    if (questionsError) {
      console.error("Failed to get questions:", questionsError)
    }

    // Get allocations with student info
    const { data: allocations, error: allocationsError } = await supabase
      .from("student_revision_allocations")
      .select(`
        student_id,
        status,
        progress,
        profiles!inner(full_name)
      `)
      .eq("revision_list_id", revisionList.id)

    if (allocationsError) {
      console.error("Failed to get allocations:", allocationsError)
    }

    const totalQuestions = questions?.length || 0

    const formattedAllocations = (allocations || []).map(a => {
      const progress = a.progress || {}
      const completedCount = Object.values(progress).filter(
        (p: { completed?: boolean }) => p.completed
      ).length

      return {
        studentId: a.student_id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        studentName: (a.profiles as any)?.full_name || 'Unknown',
        status: a.status,
        completedQuestions: completedCount,
        totalQuestions,
      }
    })

    return {
      success: true,
      data: {
        revisionList: {
          id: revisionList.id,
          title: revisionList.title,
          description: revisionList.description,
          createdAt: revisionList.created_at,
        },
        questions: questions || [],
        allocations: formattedAllocations,
      }
    }
  } catch (error) {
    console.error("Error in getAssignmentRevisionList:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
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
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: "You must be logged in" }
  }

  try {
    const { data: revisionLists, error } = await supabase
      .from("revision_lists")
      .select(`
        id,
        title,
        description,
        assignment_id,
        created_at,
        assignments!inner(
          id,
          title,
          classes!inner(
            name,
            subject,
            teacher_id
          )
        ),
        revision_list_questions(count),
        student_revision_allocations(count)
      `)
      .eq("created_by", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching teacher revision lists:", error)
      return { success: false, error: "Failed to fetch revision lists" }
    }

    const transformed: TeacherRevisionListItem[] = (revisionLists || []).map((rl) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const assignment = rl.assignments as any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cls = assignment?.classes as any

      return {
        id: rl.id,
        title: rl.title,
        description: rl.description,
        assignment_id: rl.assignment_id,
        assignment_title: assignment?.title || "Unknown",
        class_name: cls?.name || "Unknown",
        subject: cls?.subject || "Unknown",
        question_count: Array.isArray(rl.revision_list_questions)
          ? rl.revision_list_questions.length
          : 0,
        student_count: Array.isArray(rl.student_revision_allocations)
          ? rl.student_revision_allocations.length
          : 0,
        created_at: rl.created_at,
      }
    })

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
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: "You must be logged in" }
  }

  try {
    // Get the revision list with assignment/class info
    const { data: revisionList, error: listError } = await supabase
      .from("revision_lists")
      .select(`
        id, title, description, assignment_id, created_at, created_by,
        assignments!inner(
          title,
          classes!inner(name, subject)
        )
      `)
      .eq("id", revisionListId)
      .single()

    if (listError) {
      if (listError.code === "PGRST116") {
        return { success: true, data: null }
      }
      console.error("Failed to get revision list:", listError)
      return { success: false, error: "Failed to fetch revision list" }
    }

    // Verify ownership
    if (revisionList.created_by !== user.id) {
      return { success: false, error: "Permission denied" }
    }

    // Get questions
    const { data: questions, error: questionsError } = await supabase.rpc(
      "get_revision_list_questions",
      { p_revision_list_id: revisionList.id }
    )

    if (questionsError) {
      console.error("Failed to get questions:", questionsError)
    }

    // Get allocations with student info
    const { data: allocations, error: allocationsError } = await supabase
      .from("student_revision_allocations")
      .select(`
        student_id,
        status,
        progress,
        profiles!inner(full_name)
      `)
      .eq("revision_list_id", revisionList.id)

    if (allocationsError) {
      console.error("Failed to get allocations:", allocationsError)
    }

    const totalQuestions = questions?.length || 0

    const formattedAllocations = (allocations || []).map((a) => {
      const progress = a.progress || {}
      const completedCount = Object.values(progress).filter(
        (p: { completed?: boolean }) => p.completed
      ).length

      return {
        studentId: a.student_id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        studentName: (a.profiles as any)?.full_name || "Unknown",
        status: a.status,
        completedQuestions: completedCount,
        totalQuestions,
      }
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const assignment = revisionList.assignments as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cls = assignment?.classes as any

    return {
      success: true,
      data: {
        revisionList: {
          id: revisionList.id,
          title: revisionList.title,
          description: revisionList.description,
          assignment_id: revisionList.assignment_id,
          assignment_title: assignment?.title || "Unknown",
          class_name: cls?.name || "Unknown",
          subject: cls?.subject || "Unknown",
          created_at: revisionList.created_at,
        },
        questions: questions || [],
        allocations: formattedAllocations,
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
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: "You must be logged in" }
  }

  try {
    // Verify ownership
    const { data: revisionList, error: fetchError } = await supabase
      .from("revision_lists")
      .select("id, created_by")
      .eq("id", revisionListId)
      .single()

    if (fetchError || !revisionList) {
      return { success: false, error: "Revision list not found" }
    }

    if (revisionList.created_by !== user.id) {
      return { success: false, error: "Permission denied" }
    }

    // Delete (cascades to questions + allocations)
    const { error: deleteError } = await supabase
      .from("revision_lists")
      .delete()
      .eq("id", revisionListId)

    if (deleteError) {
      console.error("Failed to delete revision list:", deleteError)
      return { success: false, error: "Failed to delete revision list" }
    }

    revalidatePath("/dashboard/library")
    revalidatePath("/dashboard/revision")

    return { success: true }
  } catch (error) {
    console.error("Error in deleteRevisionList:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
