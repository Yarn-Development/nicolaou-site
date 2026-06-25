"use server"

import { revalidatePath } from "next/cache"
import { getAuthUser } from "@/lib/auth"
import { fetchQuery, fetchMutation, api, getConvexUserIdByClerkId } from "@/lib/convex/server"
import type { Id } from "@/convex/_generated/dataModel"

/**
 * Type definitions for the Ingestion system
 */
export type ExamBoard = "AQA" | "Edexcel" | "OCR" | "MEI" | "WJEC" | "CIE" | "IB"
export type CurriculumLevel =
  | "GCSE Foundation"
  | "GCSE Higher"
  | "AS Level"
  | "A Level"
  | "IGCSE"
  | "IB SL"
  | "IB HL"

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

  // Spec version (A Level only)
  source_spec?: "new-spec" | "legacy-modular" | "legacy-gcse" | null

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
 * Upload a snippet image to Convex file storage.
 * Returns the stored file's served URL plus its storageId (as `path`).
 */
export async function uploadSnippetImage(formData: FormData): Promise<{
  success: boolean
  data?: { path: string; url: string }
  error?: string
}> {
  // Resolve and authorise the user.
  const authUser = await getAuthUser()
  if (!authUser?.clerkId) {
    return {
      success: false,
      error: "You must be logged in to upload images"
    }
  }
  if (authUser.role !== "teacher") {
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

  try {
    // 1. Request an upload URL from Convex.
    const { uploadUrl } = await fetchMutation(api.files.generateUploadUrl, {})

    // 2. POST the file directly to Convex storage.
    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    })
    if (!res.ok) {
      throw new Error(`Upload failed with status ${res.status}`)
    }
    const { storageId } = (await res.json()) as { storageId: Id<"_storage"> }

    // 3. Resolve the served URL.
    const url = await fetchQuery(api.files.getUrl, { storageId })
    if (!url) {
      throw new Error("Could not resolve uploaded file URL")
    }

    return {
      success: true,
      data: {
        path: storageId,
        url,
      }
    }
  } catch (error) {
    console.error("Error uploading snippet:", error)
    return {
      success: false,
      error: "Failed to upload image. Please try again."
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
  // Resolve and authorise the user.
  const authUser = await getAuthUser()
  if (!authUser?.clerkId) {
    return {
      success: false,
      error: "You must be logged in to ingest questions"
    }
  }
  if (authUser.role !== "teacher") {
    return {
      success: false,
      error: "Only teachers can ingest questions"
    }
  }
  const convexUserId = await getConvexUserIdByClerkId(authUser.clerkId)
  if (!convexUserId) {
    return {
      success: false,
      error: "Could not verify user profile"
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

  try {
    const questionId = await fetchMutation(api.questions.createQuestion, {
      createdBy: convexUserId,
      contentType: "official_past_paper",
      questionLatex: input.question_content || "",
      imageUrl: input.image_url || undefined,
      examBoard: input.exam_board,
      level: input.level,
      paperReference: input.paper_reference,
      questionNumberRef: input.question_number_ref || undefined,
      topic: input.topic,
      topicName: input.topic,
      subTopic: input.sub_topic || undefined,
      marks: input.marks || 1,
      calculatorAllowed: input.calculator_allowed ?? true,
      difficulty,
      sourceSpec: (input.source_spec as "new-spec" | "legacy-modular" | "legacy-gcse" | null) ?? null,
      answerKey: {
        answer: input.answer_key?.answer || "",
        explanation: input.answer_key?.explanation || "",
        mark_scheme: input.answer_key?.mark_scheme || "",
        type: "manual",
        source: {
          exam_board: input.exam_board,
          level: input.level,
          paper: input.paper_reference || undefined,
          question_number: input.question_number_ref || undefined,
          is_calculator: input.calculator_allowed,
        },
      },
    })

    revalidatePath("/dashboard/questions/browse")
    revalidatePath("/dashboard/ingest")

    const now = new Date().toISOString()
    return {
      success: true,
      data: {
        id: questionId as string,
        created_at: now,
        updated_at: now,
        content_type: "official_past_paper",
        question_content: input.question_content || "",
        image_url: input.image_url,
        exam_board: input.exam_board,
        level: input.level,
        paper_reference: input.paper_reference,
        question_number_ref: input.question_number_ref || "",
        topic: input.topic,
        sub_topic: input.sub_topic || "",
        marks: input.marks || 1,
        calculator_allowed: input.calculator_allowed ?? true,
        is_verified: false,
        created_by: convexUserId as string,
      },
    }
  } catch (error) {
    console.error("Error ingesting question:", error)
    return {
      success: false,
      error: "Failed to ingest question. Please try again."
    }
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
  const authUser = await getAuthUser()
  if (!authUser?.clerkId) {
    return {
      success: false,
      error: "You must be logged in"
    }
  }

  try {
    // Convex's getAllQuestions supports level/topic filters; exam_board and the
    // official_past_paper content-type are filtered in-memory below.
    const all = await fetchQuery(api.questions.getAllQuestions, {
      level: filters?.level,
      topic: filters?.topic,
    })

    const filtered = all.filter((q) => {
      if (q.contentType !== "official_past_paper") return false
      if (filters?.exam_board && q.examBoard !== filters.exam_board) return false
      return true
    })

    // getAllQuestions already returns newest-first.
    const data: IngestedQuestion[] = filtered.map((q) => {
      const iso = new Date(q._creationTime).toISOString()
      return {
        id: q._id as string,
        created_at: iso,
        updated_at: iso,
        content_type: "official_past_paper",
        question_content: q.questionLatex ?? q.questionContent ?? "",
        image_url: q.imageUrl ?? "",
        exam_board: (q.examBoard as ExamBoard) ?? "AQA",
        level: (q.level as CurriculumLevel) ?? "GCSE Higher",
        paper_reference: q.paperReference ?? "",
        question_number_ref: q.questionNumberRef ?? "",
        topic: q.topic ?? q.topicName ?? "",
        sub_topic: q.subTopic ?? "",
        marks: q.marks ?? 1,
        calculator_allowed: q.calculatorAllowed ?? true,
        is_verified: q.isVerified ?? false,
        created_by: q.createdBy as string,
      }
    })

    return { success: true, data }
  } catch (error) {
    console.error("Error fetching ingested questions:", error)
    return {
      success: false,
      error: "Failed to fetch questions"
    }
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
  const authUser = await getAuthUser()
  if (!authUser?.clerkId) {
    return {
      success: false,
      error: "You must be logged in"
    }
  }

  const byBoard: Record<ExamBoard, number> = {
    AQA: 0,
    Edexcel: 0,
    OCR: 0,
    MEI: 0,
    WJEC: 0,
    CIE: 0,
    IB: 0,
  }

  const byLevel: Record<CurriculumLevel, number> = {
    "GCSE Foundation": 0,
    "GCSE Higher": 0,
    "AS Level": 0,
    "A Level": 0,
    "IGCSE": 0,
    "IB SL": 0,
    "IB HL": 0,
  }

  try {
    const all = await fetchQuery(api.questions.getAllQuestions, {})
    const pastPapers = all.filter((q) => q.contentType === "official_past_paper")

    for (const q of pastPapers) {
      if (q.examBoard && byBoard[q.examBoard as ExamBoard] !== undefined) {
        byBoard[q.examBoard as ExamBoard]++
      }
      if (q.level && byLevel[q.level as CurriculumLevel] !== undefined) {
        byLevel[q.level as CurriculumLevel]++
      }
    }

    return {
      success: true,
      data: {
        total: pastPapers.length,
        byBoard,
        byLevel
      }
    }
  } catch (error) {
    console.error("Error fetching ingest stats:", error)
    return {
      success: false,
      error: "Failed to fetch stats"
    }
  }
}
