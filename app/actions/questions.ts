"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

/**
 * Type definitions for Question system
 */
export type QuestionContentType = "generated_text" | "image_ocr" | "official_past_paper" | "synthetic_image"
export type QuestionDifficulty = "Foundation" | "Higher"
export type QuestionType = "Fluency" | "Problem Solving" | "Reasoning/Proof"

export interface QuestionAnswerKey {
  answer: string
  explanation: string
  mark_scheme?: string
  marks?: number
  type?: 'generated' | 'manual' | 'ocr'
}

export interface CreateQuestionInput {
  content_type: QuestionContentType
  question_latex: string
  image_url?: string | null
  curriculum_level: string
  topic: string
  sub_topic: string
  difficulty: QuestionDifficulty
  marks: number
  question_type: QuestionType
  calculator_allowed: boolean
  answer_key: QuestionAnswerKey
}

export interface Question extends CreateQuestionInput {
  id: string
  created_at: string
  created_by: string | null
  is_verified: boolean
  updated_at: string
  // Database schema fields
  topic_name: string | null
  sub_topic_name: string | null
  times_used?: number
  avg_score?: number | null
  meta_tags?: string[]
  verification_notes?: string | null
  // Helper property for diagram questions
  is_diagram_question?: boolean
}

/**
 * Creates a new question in the database
 */
export async function createQuestion(input: CreateQuestionInput) {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      error: "You must be logged in to create questions"
    }
  }

  // Verify user is a teacher
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profileError || !profile) {
    return {
      success: false,
      error: "Could not verify user profile"
    }
  }

  if (profile.role !== "teacher") {
    return {
      success: false,
      error: "Only teachers can create questions"
    }
  }

  // Validate answer_key structure
  if (!input.answer_key.answer || !input.answer_key.explanation) {
    return {
      success: false,
      error: "Answer key must include both answer and explanation"
    }
  }

  // Insert question
  const { data: question, error: insertError } = await supabase
    .from("questions")
    .insert({
      created_by: user.id,
      content_type: input.content_type,
      question_latex: input.question_latex,
      image_url: input.image_url || null,
      curriculum_level: input.curriculum_level,
      topic: input.topic,
      topic_name: input.topic,
      sub_topic_name: input.sub_topic,
      difficulty: input.difficulty,
      marks: input.marks,
      question_type: input.question_type,
      calculator_allowed: input.calculator_allowed,
      answer_key: input.answer_key,
      is_verified: false
    })
    .select()
    .single()

  if (insertError) {
    console.error("Error creating question:", insertError)
    return {
      success: false,
      error: "Failed to create question. Please try again."
    }
  }

  revalidatePath("/dashboard")

  return {
    success: true,
    data: question as Question
  }
}

/**
 * Uploads an image to the question-images storage bucket
 */
export async function uploadQuestionImage(file: File) {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      error: "You must be logged in to upload images"
    }
  }

  // Generate unique filename
  const fileExt = file.name.split('.').pop()
  const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

  // Upload to storage
  const { data: uploadData, error: uploadError } = await supabase
    .storage
    .from("question-images")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false
    })

  if (uploadError) {
    console.error("Error uploading image:", uploadError)
    return {
      success: false,
      error: "Failed to upload image. Please try again."
    }
  }

  // Get public URL
  const { data: { publicUrl } } = supabase
    .storage
    .from("question-images")
    .getPublicUrl(uploadData.path)

  return {
    success: true,
    data: {
      path: uploadData.path,
      url: publicUrl
    }
  }
}

/**
 * Gets all questions created by the current user
 */
export async function getMyQuestions() {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      error: "You must be logged in"
    }
  }

  const { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select("*")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false })

  if (questionsError) {
    console.error("Error fetching questions:", questionsError)
    return {
      success: false,
      error: "Failed to fetch questions"
    }
  }

  return {
    success: true,
    data: questions as Question[]
  }
}

/**
 * Gets all questions (shared resource bank for teachers)
 */
export async function getAllQuestions(filters?: {
  curriculum_level?: string
  topic?: string
  difficulty?: QuestionDifficulty
  verified_only?: boolean
}) {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      error: "You must be logged in"
    }
  }

  let query = supabase
    .from("questions")
    .select("*")
    .order("created_at", { ascending: false })

  // Apply filters
  if (filters?.curriculum_level) {
    query = query.eq("curriculum_level", filters.curriculum_level)
  }

  if (filters?.topic) {
    query = query.eq("topic", filters.topic)
  }

  if (filters?.difficulty) {
    query = query.eq("difficulty", filters.difficulty)
  }

  if (filters?.verified_only) {
    query = query.eq("is_verified", true)
  }

  const { data: questions, error: questionsError } = await query

  if (questionsError) {
    console.error("Error fetching questions:", questionsError)
    return {
      success: false,
      error: "Failed to fetch questions"
    }
  }

  return {
    success: true,
    data: questions as Question[]
  }
}

/**
 * Updates a question (only the creator can update)
 */
export async function updateQuestion(id: string, updates: Partial<CreateQuestionInput>) {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      error: "You must be logged in"
    }
  }

  const { data: question, error: updateError } = await supabase
    .from("questions")
    .update(updates)
    .eq("id", id)
    .eq("created_by", user.id)
    .select()
    .single()

  if (updateError) {
    console.error("Error updating question:", updateError)
    return {
      success: false,
      error: "Failed to update question. You can only update your own questions."
    }
  }

  revalidatePath("/dashboard")

  return {
    success: true,
    data: question as Question
  }
}

/**
 * Deletes a question (only the creator can delete)
 */
export async function deleteQuestion(id: string) {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      error: "You must be logged in"
    }
  }

  const { error: deleteError } = await supabase
    .from("questions")
    .delete()
    .eq("id", id)
    .eq("created_by", user.id)

  if (deleteError) {
    console.error("Error deleting question:", deleteError)
    return {
      success: false,
      error: "Failed to delete question. You can only delete your own questions."
    }
  }

  revalidatePath("/dashboard")

  return {
    success: true
  }
}

/**
 * Toggles the verified status of a question
 */
export async function toggleQuestionVerification(id: string, isVerified: boolean) {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      error: "You must be logged in"
    }
  }

  const { data: question, error: updateError } = await supabase
    .from("questions")
    .update({ is_verified: isVerified })
    .eq("id", id)
    .eq("created_by", user.id)
    .select()
    .single()

  if (updateError) {
    console.error("Error updating question verification:", updateError)
    return {
      success: false,
      error: "Failed to update question verification"
    }
  }

  revalidatePath("/dashboard")

  return {
    success: true,
    data: question as Question
  }
}

// =====================================================
// Question Bank for Exam Builder
// =====================================================

export interface QuestionBankFilters {
  search?: string
  topic?: string
  difficulty?: QuestionDifficulty | "All"
  calculatorAllowed?: boolean | "All"
  isVerified?: boolean | "All"
  limit?: number
  offset?: number
}

export interface QuestionBankResult {
  questions: Question[]
  total: number
  topics: string[]
}

/**
 * Fetches questions from the questions table with optional filters
 * Includes search by topic or question_latex content
 */
export async function getQuestionBankQuestions(
  filters: QuestionBankFilters = {}
): Promise<{ success: boolean; data?: QuestionBankResult; error?: string }> {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      error: "You must be logged in"
    }
  }

  const {
    search = "",
    topic = "All",
    difficulty = "All",
    calculatorAllowed = "All",
    isVerified = "All",
    limit = 50,
    offset = 0
  } = filters

  try {
    // Build the query
    let query = supabase
      .from("questions")
      .select("*", { count: "exact" })

    // Apply search filter (searches topic, topic_name, sub_topic_name, and question_latex)
    if (search && search.trim() !== "") {
      const searchTerm = search.trim()
      // Use ilike for case-insensitive search
      query = query.or(
        `topic.ilike.%${searchTerm}%,topic_name.ilike.%${searchTerm}%,sub_topic_name.ilike.%${searchTerm}%,question_latex.ilike.%${searchTerm}%`
      )
    }

    // Apply topic filter
    if (topic && topic !== "All") {
      query = query.or(`topic.eq.${topic},topic_name.eq.${topic}`)
    }

    // Apply difficulty filter
    if (difficulty && difficulty !== "All") {
      query = query.eq("difficulty", difficulty)
    }

    // Apply calculator filter
    if (calculatorAllowed !== "All" && typeof calculatorAllowed === "boolean") {
      query = query.eq("calculator_allowed", calculatorAllowed)
    }

    // Apply verified filter
    if (isVerified !== "All" && typeof isVerified === "boolean") {
      query = query.eq("is_verified", isVerified)
    }

    // Apply pagination and ordering
    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: questions, error: questionsError, count } = await query

    if (questionsError) {
      console.error("Error fetching questions:", questionsError)
      return {
        success: false,
        error: "Failed to fetch questions from the database"
      }
    }

    // Fetch unique topics for the filter dropdown
    const { data: topicsData, error: topicsError } = await supabase
      .from("questions")
      .select("topic, topic_name")

    if (topicsError) {
      console.error("Error fetching topics:", topicsError)
    }

    // Extract unique topics
    const topicsSet = new Set<string>()
    topicsData?.forEach(q => {
      if (q.topic) topicsSet.add(q.topic)
      if (q.topic_name) topicsSet.add(q.topic_name)
    })
    const uniqueTopics = Array.from(topicsSet).sort()

    return {
      success: true,
      data: {
        questions: (questions || []) as Question[],
        total: count || 0,
        topics: uniqueTopics
      }
    }
  } catch (error) {
    console.error("Unexpected error in getQuestionBankQuestions:", error)
    return {
      success: false,
      error: "An unexpected error occurred while fetching questions"
    }
  }
}

/**
 * Get a single question by ID
 */
export async function getQuestionById(
  questionId: string
): Promise<{ success: boolean; data?: Question; error?: string }> {
  const supabase = await createClient()

  try {
    const { data: question, error } = await supabase
      .from("questions")
      .select("*")
      .eq("id", questionId)
      .single()

    if (error) {
      console.error("Error fetching question:", error)
      return {
        success: false,
        error: "Question not found"
      }
    }

    return {
      success: true,
      data: question as Question
    }
  } catch (error) {
    console.error("Unexpected error in getQuestionById:", error)
    return {
      success: false,
      error: "An unexpected error occurred"
    }
  }
}

/**
 * Increment the times_used counter for questions when added to an exam
 */
export async function incrementQuestionUsage(
  questionIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  try {
    // Update each question's times_used counter
    for (const id of questionIds) {
      // Get current times_used
      const { data: question } = await supabase
        .from("questions")
        .select("times_used")
        .eq("id", id)
        .single()
      
      if (question) {
        await supabase
          .from("questions")
          .update({ times_used: (question.times_used || 0) + 1 })
          .eq("id", id)
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Error incrementing question usage:", error)
    return {
      success: false,
      error: "Failed to update question usage statistics"
    }
  }
}
