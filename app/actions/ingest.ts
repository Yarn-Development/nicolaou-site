"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

/**
 * Type definitions for the Ingestion system
 */
export type ExamBoard = "AQA" | "Edexcel" | "OCR" | "MEI"
// Use a union that covers both database and curriculum-data types
export type CurriculumLevel = 
  | "KS3"
  | "GCSE Foundation" 
  | "GCSE Higher" 
  | "A-Level Pure" 
  | "A-Level Stats" 
  | "A-Level Statistics"
  | "A-Level Mechanics"

export interface IngestQuestionInput {
  // Question content
  question_content: string
  image_url: string
  
  // Exam metadata
  exam_board: ExamBoard
  level: CurriculumLevel
  paper_reference: string  // e.g., "June 2023 Paper 1H"
  question_number_ref: string  // e.g., "Q4", "Q12a"
  
  // Curriculum tags
  topic: string
  sub_topic: string
  
  // Pedagogy
  marks: number
  calculator_allowed: boolean
  
  // Answer key (optional)
  answer_key?: {
    answer: string
    explanation: string
    mark_scheme?: string
  }
}

export interface IngestedQuestion {
  id: string
  created_at: string
  updated_at: string
  content_type: 'official_past_paper'
  question_content: string
  image_url: string
  exam_board: ExamBoard
  level: CurriculumLevel
  paper_reference: string
  question_number_ref: string
  topic: string
  sub_topic: string
  marks: number
  calculator_allowed: boolean
  is_verified: boolean
  created_by: string
}

/**
 * Upload a snippet image to Supabase Storage (question-snippets bucket)
 */
export async function uploadSnippetImage(formData: FormData): Promise<{
  success: boolean
  data?: { path: string; url: string }
  error?: string
}> {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      error: "You must be logged in to upload images"
    }
  }

  // Verify user is a teacher
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profileError || !profile || profile.role !== "teacher") {
    return {
      success: false,
      error: "Only teachers can upload question snippets"
    }
  }

  const file = formData.get('file') as File
  if (!file) {
    return {
      success: false,
      error: "No file provided"
    }
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    return {
      success: false,
      error: "Only image files are allowed"
    }
  }

  // Validate file size (10MB max for snippets)
  if (file.size > 10 * 1024 * 1024) {
    return {
      success: false,
      error: "Image must be smaller than 10MB"
    }
  }

  // Generate unique filename
  const fileExt = file.name.split('.').pop()
  const timestamp = Date.now()
  const randomStr = Math.random().toString(36).substring(7)
  const fileName = `${user.id}/${timestamp}-${randomStr}.${fileExt}`

  // Upload to storage (question-snippets bucket)
  const { data: uploadData, error: uploadError } = await supabase
    .storage
    .from("question-snippets")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false
    })

  if (uploadError) {
    console.error("Error uploading snippet:", uploadError)
    return {
      success: false,
      error: `Failed to upload image: ${uploadError.message}`
    }
  }

  // Get public URL
  const { data: { publicUrl } } = supabase
    .storage
    .from("question-snippets")
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
 * Ingest a past paper question into the database
 */
export async function ingestQuestion(input: IngestQuestionInput): Promise<{
  success: boolean
  data?: IngestedQuestion
  error?: string
}> {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      error: "You must be logged in to ingest questions"
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
      error: "Only teachers can ingest questions"
    }
  }

  // Validate required fields
  if (!input.image_url) {
    return {
      success: false,
      error: "Image URL is required"
    }
  }

  if (!input.exam_board || !input.level) {
    return {
      success: false,
      error: "Exam board and level are required"
    }
  }

  if (!input.paper_reference) {
    return {
      success: false,
      error: "Paper reference is required (e.g., 'June 2023 Paper 1H')"
    }
  }

  if (!input.topic) {
    return {
      success: false,
      error: "Topic is required"
    }
  }

  // Determine difficulty from level
  const difficulty = input.level.includes('Foundation') ? 'Foundation' : 'Higher'

  // Insert question - use question_latex as the primary database column
  const { data: question, error: insertError } = await supabase
    .from("questions")
    .insert({
      created_by: user.id,
      content_type: 'official_past_paper',
      question_latex: input.question_content || '',  // Store in question_latex column
      image_url: input.image_url,
      
      // Exam metadata
      exam_board: input.exam_board,
      level: input.level,
      paper_reference: input.paper_reference,
      question_number_ref: input.question_number_ref || '',
      
      // Curriculum tags
      topic: input.topic,
      topic_name: input.topic,
      sub_topic: input.sub_topic || '',
      
      // Legacy fields for compatibility
      curriculum_level: input.level,
      difficulty: difficulty,
      
      // Pedagogy
      marks: input.marks || 1,
      calculator_allowed: input.calculator_allowed ?? true,
      
      // Question metadata
      question_type: 'Fluency', // Default for ingested questions
      is_verified: false,
      
      // Answer key (if provided)
      answer_key: input.answer_key ? {
        answer: input.answer_key.answer || '',
        explanation: input.answer_key.explanation || '',
        mark_scheme: input.answer_key.mark_scheme || '',
        type: 'manual'
      } : null,
    })
    .select()
    .single()

  if (insertError) {
    console.error("Error ingesting question:", insertError)
    return {
      success: false,
      error: `Failed to ingest question: ${insertError.message}`
    }
  }

  revalidatePath("/dashboard/questions/browse")
  revalidatePath("/dashboard/ingest")

  return {
    success: true,
    data: question as IngestedQuestion
  }
}

/**
 * Get all ingested past paper questions
 */
export async function getIngestedQuestions(filters?: {
  exam_board?: ExamBoard
  level?: CurriculumLevel
  topic?: string
}): Promise<{
  success: boolean
  data?: IngestedQuestion[]
  error?: string
}> {
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
    .eq("content_type", "official_past_paper")
    .order("created_at", { ascending: false })

  // Apply filters
  if (filters?.exam_board) {
    query = query.eq("exam_board", filters.exam_board)
  }

  if (filters?.level) {
    query = query.eq("level", filters.level)
  }

  if (filters?.topic) {
    query = query.eq("topic", filters.topic)
  }

  const { data: questions, error: questionsError } = await query

  if (questionsError) {
    console.error("Error fetching ingested questions:", questionsError)
    return {
      success: false,
      error: "Failed to fetch questions"
    }
  }

  return {
    success: true,
    data: questions as IngestedQuestion[]
  }
}

/**
 * Get count of ingested questions by exam board
 */
export async function getIngestStats(): Promise<{
  success: boolean
  data?: {
    total: number
    byBoard: Record<ExamBoard, number>
    byLevel: Record<CurriculumLevel, number>
  }
  error?: string
}> {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      error: "You must be logged in"
    }
  }

  const { data: questions, error } = await supabase
    .from("questions")
    .select("exam_board, level")
    .eq("content_type", "official_past_paper")

  if (error) {
    console.error("Error fetching ingest stats:", error)
    return {
      success: false,
      error: "Failed to fetch stats"
    }
  }

  const byBoard: Record<ExamBoard, number> = {
    AQA: 0,
    Edexcel: 0,
    OCR: 0,
    MEI: 0
  }

  const byLevel: Record<CurriculumLevel, number> = {
    "KS3": 0,
    "GCSE Foundation": 0,
    "GCSE Higher": 0,
    "A-Level Pure": 0,
    "A-Level Stats": 0,
    "A-Level Statistics": 0,
    "A-Level Mechanics": 0
  }

  for (const q of questions || []) {
    if (q.exam_board && byBoard[q.exam_board as ExamBoard] !== undefined) {
      byBoard[q.exam_board as ExamBoard]++
    }
    if (q.level && byLevel[q.level as CurriculumLevel] !== undefined) {
      byLevel[q.level as CurriculumLevel]++
    }
  }

  return {
    success: true,
    data: {
      total: questions?.length || 0,
      byBoard,
      byLevel
    }
  }
}
