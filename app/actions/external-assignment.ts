"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// =====================================================
// Types
// =====================================================

export interface MappedQuestion {
  id: string
  questionNumber: string
  topic: string
  subTopic: string
  marks: number
}

export interface CreateExternalAssignmentInput {
  /** Class to assign to */
  classId: string
  /** Assignment title */
  title: string
  /** Due date (optional) */
  dueDate?: string | null
  /** URL of uploaded PDF (from storage) */
  resourceUrl: string
  /** Mapped questions with topics and marks */
  mappedQuestions: MappedQuestion[]
  /** Assignment mode: paper or online */
  mode?: "paper" | "online"
}

export interface ExternalAssignment {
  id: string
  title: string
  classId: string
  className: string
  resourceUrl: string
  sourceType: "external_upload"
  totalMarks: number
  questionCount: number
  createdAt: string
}

// =====================================================
// Upload File to Storage
// =====================================================

/**
 * Uploads a file to the exam-papers storage bucket
 * Returns the public URL
 */
export async function uploadExamPaper(formData: FormData): Promise<{
  success: boolean
  data?: { url: string; path: string }
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
    const file = formData.get("file") as File
    
    if (!file) {
      return { success: false, error: "No file provided" }
    }

    // Validate file type
    if (file.type !== "application/pdf") {
      return { success: false, error: "Only PDF files are allowed" }
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return { success: false, error: "File size must be less than 10MB" }
    }

    // Generate unique filename
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const filePath = `${user.id}/${timestamp}_${sanitizedName}`

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("exam-papers")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      })

    if (uploadError) {
      console.error("Upload error details:", {
        message: uploadError.message,
        name: uploadError.name,
      })
      
      // Provide specific error messages based on the error type
      let userMessage = "Failed to upload file"
      
      if (uploadError.message?.includes("Payload too large") || 
          uploadError.message?.includes("size") ||
          uploadError.message?.includes("exceeded")) {
        userMessage = "File size exceeds the storage limit. Please use a smaller file (max 10MB)."
      } else if (uploadError.message?.includes("policy") || 
                 uploadError.message?.includes("permission") ||
                 uploadError.message?.includes("RLS")) {
        userMessage = "Permission denied. Storage policy violation - please contact support."
      } else if (uploadError.message?.includes("timeout") || 
                 uploadError.message?.includes("network")) {
        userMessage = "Upload timed out. Please check your connection and try again."
      } else if (uploadError.message?.includes("bucket") || 
                 uploadError.message?.includes("not found")) {
        userMessage = "Storage bucket not configured. Please contact support."
      } else if (uploadError.message?.includes("duplicate") || 
                 uploadError.message?.includes("already exists")) {
        userMessage = "A file with this name already exists. Please rename and try again."
      } else if (uploadError.message) {
        // Return the actual error message for debugging
        userMessage = `Upload failed: ${uploadError.message}`
      }
      
      return { success: false, error: userMessage }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("exam-papers")
      .getPublicUrl(filePath)

    return {
      success: true,
      data: {
        url: urlData.publicUrl,
        path: filePath,
      },
    }
  } catch (error) {
    console.error("Error in uploadExamPaper:", error)
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred"
    return { success: false, error: `Upload error: ${errorMessage}` }
  }
}

// =====================================================
// Create External Assignment
// =====================================================

/**
 * Creates an external assignment with ghost questions
 * 
 * Steps:
 * 1. Validate input
 * 2. Create assignment record with source_type = 'external_upload'
 * 3. Insert ghost questions into assignment_questions
 */
export async function createExternalAssignment(
  input: CreateExternalAssignmentInput
): Promise<{
  success: boolean
  data?: ExternalAssignment
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
    // 1. Verify teacher owns the class
    const { data: classData, error: classError } = await supabase
      .from("classes")
      .select("id, name, teacher_id")
      .eq("id", input.classId)
      .single()

    if (classError || !classData) {
      return { success: false, error: "Class not found" }
    }

    if (classData.teacher_id !== user.id) {
      return { success: false, error: "You don't have permission to create assignments for this class" }
    }

    // 2. Validate mapped questions
    if (!input.mappedQuestions || input.mappedQuestions.length === 0) {
      return { success: false, error: "At least one question mapping is required" }
    }

    for (const q of input.mappedQuestions) {
      if (!q.questionNumber || !q.topic || !q.subTopic || q.marks <= 0) {
        return { success: false, error: "All questions must have question number, topic, sub-topic, and marks" }
      }
    }

    // 3. Create assignment record
    const { data: assignment, error: assignmentError } = await supabase
      .from("assignments")
      .insert({
        class_id: input.classId,
        title: input.title,
        due_date: input.dueDate || null,
        status: "draft",
        mode: input.mode || "paper",
        source_type: "external_upload",
        resource_url: input.resourceUrl,
        content: {
          // Store metadata about the external paper
          external: true,
          questionCount: input.mappedQuestions.length,
          totalMarks: input.mappedQuestions.reduce((sum, q) => sum + q.marks, 0),
        },
      })
      .select("id, title, class_id, created_at")
      .single()

    if (assignmentError) {
      console.error("Assignment creation error:", assignmentError)
      return { success: false, error: "Failed to create assignment" }
    }

    // 4. Insert ghost questions into assignment_questions
    const ghostQuestions = input.mappedQuestions.map((q, index) => ({
      assignment_id: assignment.id,
      question_id: null, // Ghost question - no linked question
      order_index: index,
      custom_question_number: q.questionNumber,
      custom_topic: q.topic,
      custom_sub_topic: q.subTopic,
      custom_marks: q.marks,
    }))

    const { error: questionsError } = await supabase
      .from("assignment_questions")
      .insert(ghostQuestions)

    if (questionsError) {
      console.error("Ghost questions insertion error:", questionsError)
      
      // Rollback: delete the assignment
      await supabase
        .from("assignments")
        .delete()
        .eq("id", assignment.id)
      
      return { success: false, error: "Failed to save question mappings" }
    }

    // 5. Calculate totals
    const totalMarks = input.mappedQuestions.reduce((sum, q) => sum + q.marks, 0)

    revalidatePath("/dashboard/assignments")

    return {
      success: true,
      data: {
        id: assignment.id,
        title: assignment.title,
        classId: assignment.class_id,
        className: classData.name,
        resourceUrl: input.resourceUrl,
        sourceType: "external_upload",
        totalMarks,
        questionCount: input.mappedQuestions.length,
        createdAt: assignment.created_at,
      },
    }
  } catch (error) {
    console.error("Error in createExternalAssignment:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// =====================================================
// Get External Assignment Details
// =====================================================

export interface ExternalAssignmentDetails {
  id: string
  title: string
  classId: string
  className: string
  subject: string
  dueDate: string | null
  status: string
  mode: string
  sourceType: string
  resourceUrl: string | null
  totalMarks: number
  questions: {
    id: string
    orderIndex: number
    questionNumber: string
    topic: string
    subTopic: string
    marks: number
    isGhost: boolean
  }[]
}

/**
 * Gets details of an external assignment including ghost questions
 */
export async function getExternalAssignmentDetails(
  assignmentId: string
): Promise<{
  success: boolean
  data?: ExternalAssignmentDetails
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
    // 1. Get assignment with class info
    const { data: assignment, error: assignmentError } = await supabase
      .from("assignments")
      .select(`
        id,
        title,
        class_id,
        due_date,
        status,
        mode,
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
      return { success: false, error: "Assignment not found" }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const classData = assignment.classes as any

    // Verify teacher permission
    if (classData.teacher_id !== user.id) {
      return { success: false, error: "Permission denied" }
    }

    // 2. Get questions using the updated function
    const { data: questions, error: questionsError } = await supabase.rpc(
      "get_assignment_questions",
      { p_assignment_id: assignmentId }
    )

    if (questionsError) {
      console.error("Questions fetch error:", questionsError)
      return { success: false, error: "Failed to fetch questions" }
    }

    // 3. Transform to output format
    const formattedQuestions = (questions || []).map((q: {
      question_id: string
      order_index: number
      marks: number
      topic: string
      sub_topic: string
      custom_question_number: string | null
      is_ghost: boolean
    }) => ({
      id: q.question_id,
      orderIndex: q.order_index,
      questionNumber: q.custom_question_number || `Q${q.order_index + 1}`,
      topic: q.topic,
      subTopic: q.sub_topic,
      marks: q.marks,
      isGhost: q.is_ghost,
    }))

    const totalMarks = formattedQuestions.reduce((sum: number, q: { marks: number }) => sum + q.marks, 0)

    return {
      success: true,
      data: {
        id: assignment.id,
        title: assignment.title,
        classId: assignment.class_id,
        className: classData.name,
        subject: classData.subject,
        dueDate: assignment.due_date,
        status: assignment.status,
        mode: assignment.mode,
        sourceType: assignment.source_type,
        resourceUrl: assignment.resource_url,
        totalMarks,
        questions: formattedQuestions,
      },
    }
  } catch (error) {
    console.error("Error in getExternalAssignmentDetails:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// =====================================================
// Update External Assignment Questions
// =====================================================

/**
 * Updates the question mappings for an external assignment
 */
export async function updateExternalAssignmentQuestions(
  assignmentId: string,
  mappedQuestions: MappedQuestion[]
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
    // 1. Verify ownership
    const { data: assignment, error: assignmentError } = await supabase
      .from("assignments")
      .select(`
        id,
        source_type,
        classes!inner(teacher_id)
      `)
      .eq("id", assignmentId)
      .single()

    if (assignmentError || !assignment) {
      return { success: false, error: "Assignment not found" }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const classData = assignment.classes as any
    if (classData.teacher_id !== user.id) {
      return { success: false, error: "Permission denied" }
    }

    if (assignment.source_type !== "external_upload") {
      return { success: false, error: "Can only update external assignments" }
    }

    // 2. Delete existing ghost questions
    const { error: deleteError } = await supabase
      .from("assignment_questions")
      .delete()
      .eq("assignment_id", assignmentId)
      .is("question_id", null) // Only delete ghost questions

    if (deleteError) {
      console.error("Delete error:", deleteError)
      return { success: false, error: "Failed to update questions" }
    }

    // 3. Insert new ghost questions
    const ghostQuestions = mappedQuestions.map((q, index) => ({
      assignment_id: assignmentId,
      question_id: null,
      order_index: index,
      custom_question_number: q.questionNumber,
      custom_topic: q.topic,
      custom_sub_topic: q.subTopic,
      custom_marks: q.marks,
    }))

    const { error: insertError } = await supabase
      .from("assignment_questions")
      .insert(ghostQuestions)

    if (insertError) {
      console.error("Insert error:", insertError)
      return { success: false, error: "Failed to save question mappings" }
    }

    // 4. Update assignment content metadata
    const totalMarks = mappedQuestions.reduce((sum, q) => sum + q.marks, 0)
    
    await supabase
      .from("assignments")
      .update({
        content: {
          external: true,
          questionCount: mappedQuestions.length,
          totalMarks,
        },
      })
      .eq("id", assignmentId)

    revalidatePath(`/dashboard/assignments/${assignmentId}`)

    return { success: true }
  } catch (error) {
    console.error("Error in updateExternalAssignmentQuestions:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// =====================================================
// Delete Uploaded PDF
// =====================================================

/**
 * Deletes a PDF from the exam-papers storage bucket
 */
export async function deleteExamPaper(filePath: string): Promise<{
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
    // Verify the file belongs to this user
    if (!filePath.startsWith(user.id)) {
      return { success: false, error: "Permission denied" }
    }

    const { error } = await supabase.storage
      .from("exam-papers")
      .remove([filePath])

    if (error) {
      console.error("Delete error:", error)
      return { success: false, error: "Failed to delete file" }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in deleteExamPaper:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
