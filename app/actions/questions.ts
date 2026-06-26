"use server"

import { revalidatePath } from "next/cache"
import { sanitize } from "@/lib/question-sanitizer"
import { lintQuestion } from "@/lib/ai-question-quality"
import { getAuthUser } from "@/lib/auth"
import { fetchQuery, fetchMutation, api, getConvexUserIdByClerkId } from "@/lib/convex/server"
import type { Id } from "@/convex/_generated/dataModel"

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
  source?: {
    exam_board?: string
    level?: string
    paper?: string
    year?: number
    question_number?: string
    is_calculator?: boolean
  }
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

const toIso = (ms: number | null | undefined): string =>
  ms == null ? new Date().toISOString() : new Date(ms).toISOString()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapQuestion(q: any): Question {
  return {
    id: q._id,
    created_at: toIso(q._creationTime),
    updated_at: toIso(q._creationTime),
    created_by: q.createdBy ?? null,
    content_type: (q.contentType as QuestionContentType) ?? "official_past_paper",
    question_latex: q.questionLatex ?? "",
    image_url: q.imageUrl ?? null,
    curriculum_level: q.level ?? "",
    topic: q.topic ?? "",
    topic_name: q.topicName ?? q.topic ?? null,
    sub_topic: q.subTopic ?? "",
    sub_topic_name: q.subTopic ?? null,
    difficulty: (q.difficulty as QuestionDifficulty) ?? "Higher",
    marks: q.marks ?? 1,
    question_type: (q.questionType as QuestionType) ?? "Fluency",
    calculator_allowed: q.calculatorAllowed ?? true,
    answer_key: (q.answerKey as QuestionAnswerKey) ?? { answer: "", explanation: "" },
    is_verified: q.isVerified ?? false,
  }
}

/**
 * Creates a new question in the database
 */
export async function createQuestion(input: CreateQuestionInput) {
  const authUser = await getAuthUser()
  if (!authUser?.clerkId) {
    return { success: false, error: "You must be logged in to create questions" }
  }
  if (authUser.role !== "teacher") {
    return { success: false, error: "Only teachers can create questions" }
  }
  const createdBy = await getConvexUserIdByClerkId(authUser.clerkId)
  if (!createdBy) {
    return { success: false, error: "Could not verify user profile" }
  }

  // OCR questions may have empty answers pending teacher review — only require explanation
  if (input.content_type !== 'image_ocr' && !input.answer_key.answer) {
    return { success: false, error: "Answer key must include an answer" }
  }
  if (!input.answer_key.explanation) {
    return { success: false, error: "Answer key must include an explanation" }
  }

  // Sanitize LaTeX content at save time to ensure exam-ready formatting
  const cleanLatex = input.question_latex ? sanitize(input.question_latex) : input.question_latex
  const cleanAnswer = input.answer_key.answer ? sanitize(input.answer_key.answer) : input.answer_key.answer
  const cleanExplanation = input.answer_key.explanation ? sanitize(input.answer_key.explanation) : input.answer_key.explanation
  const lintIssues = input.content_type === 'image_ocr'
    ? []
    : lintQuestion(
        {
          questionLatex: cleanLatex,
          answer: cleanAnswer,
          explanation: cleanExplanation,
          marks: input.marks,
        },
        {
          expectedMarks: input.marks,
          hasDiagram: Boolean(input.image_url),
          requireExplanation: true,
        }
      )

  if (lintIssues.length > 0) {
    return {
      success: false,
      error: `Question failed quality checks: ${lintIssues.join("; ")}`,
    }
  }

  try {
    const question = await fetchMutation(api.questions.createQuestionFull, {
      createdBy,
      contentType: input.content_type,
      questionLatex: cleanLatex,
      imageUrl: input.image_url || undefined,
      examBoard: input.answer_key.source?.exam_board,
      level: input.curriculum_level,
      topic: input.topic,
      topicName: input.topic,
      subTopic: input.sub_topic,
      difficulty: input.difficulty,
      marks: input.marks,
      questionType: input.question_type,
      calculatorAllowed: input.calculator_allowed,
      answerKey: {
        ...input.answer_key,
        answer: cleanAnswer,
        explanation: cleanExplanation,
      },
      isVerified: false,
    })

    revalidatePath("/dashboard")

    return { success: true, data: mapQuestion(question) }
  } catch (error) {
    console.error("Error creating question:", error)
    return { success: false, error: "Failed to create question. Please try again." }
  }
}

/**
 * Uploads an image to Convex file storage.
 * Returns the stored file's served URL plus its storageId (as `path`).
 */
export async function uploadQuestionImage(file: File) {
  const authUser = await getAuthUser()
  if (!authUser?.clerkId) {
    return {
      success: false,
      error: "You must be logged in to upload images"
    }
  }

  try {
    // 1. Get a short-lived upload URL from Convex.
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

    // 3. Resolve the served URL for the stored file.
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
    console.error("Error uploading image:", error)
    return {
      success: false,
      error: "Failed to upload image. Please try again."
    }
  }
}

/**
 * Gets all questions created by the current user
 */
export async function getMyQuestions() {
  const authUser = await getAuthUser()
  if (!authUser?.clerkId) {
    return { success: false, error: "You must be logged in" }
  }
  const createdBy = await getConvexUserIdByClerkId(authUser.clerkId)
  if (!createdBy) {
    return { success: false, error: "You must be logged in" }
  }

  try {
    const questions = await fetchQuery(api.questions.getMyQuestions, { createdBy })
    return { success: true, data: questions.map(mapQuestion) }
  } catch (error) {
    console.error("Error fetching questions:", error)
    return { success: false, error: "Failed to fetch questions" }
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
  const authUser = await getAuthUser()
  if (!authUser?.clerkId) {
    return { success: false, error: "You must be logged in" }
  }

  try {
    const questions = await fetchQuery(api.questions.getAllQuestions, {
      level: filters?.curriculum_level,
      topic: filters?.topic,
      difficulty: filters?.difficulty,
      verifiedOnly: filters?.verified_only,
    })
    return { success: true, data: questions.map(mapQuestion) }
  } catch (error) {
    console.error("Error fetching questions:", error)
    return { success: false, error: "Failed to fetch questions" }
  }
}

/**
 * Updates a question (only the creator can update)
 */
export async function updateQuestion(id: string, updates: Partial<CreateQuestionInput>) {
  const authUser = await getAuthUser()
  if (!authUser?.clerkId) {
    return { success: false, error: "You must be logged in" }
  }
  const createdBy = await getConvexUserIdByClerkId(authUser.clerkId)
  if (!createdBy) {
    return { success: false, error: "You must be logged in" }
  }

  try {
    const result = await fetchMutation(api.questions.updateQuestion, {
      questionId: id as Id<"questions">,
      createdBy,
      contentType: updates.content_type,
      questionLatex: updates.question_latex,
      imageUrl: updates.image_url === undefined ? undefined : updates.image_url ?? null,
      level: updates.curriculum_level,
      topic: updates.topic,
      topicName: updates.topic,
      subTopic: updates.sub_topic,
      difficulty: updates.difficulty,
      marks: updates.marks,
      questionType: updates.question_type,
      calculatorAllowed: updates.calculator_allowed,
      answerKey: updates.answer_key,
    })

    if ("error" in result) {
      return {
        success: false,
        error: "Failed to update question. You can only update your own questions.",
      }
    }

    revalidatePath("/dashboard")

    return { success: true, data: result.question ? mapQuestion(result.question) : undefined }
  } catch (error) {
    console.error("Error updating question:", error)
    return {
      success: false,
      error: "Failed to update question. You can only update your own questions.",
    }
  }
}

/**
 * Deletes a question (only the creator can delete)
 */
export async function deleteQuestion(id: string) {
  const authUser = await getAuthUser()
  if (!authUser?.clerkId) {
    return { success: false, error: "You must be logged in" }
  }
  const createdBy = await getConvexUserIdByClerkId(authUser.clerkId)
  if (!createdBy) {
    return { success: false, error: "You must be logged in" }
  }

  try {
    const result = await fetchMutation(api.questions.deleteQuestion, {
      questionId: id as Id<"questions">,
      createdBy,
    })
    if ("error" in result) {
      return {
        success: false,
        error: "Failed to delete question. You can only delete your own questions.",
      }
    }
  } catch (error) {
    console.error("Error deleting question:", error)
    return {
      success: false,
      error: "Failed to delete question. You can only delete your own questions.",
    }
  }

  revalidatePath("/dashboard")

  return { success: true }
}

/**
 * Toggles the verified status of a question
 */
export async function toggleQuestionVerification(id: string, isVerified: boolean) {
  const authUser = await getAuthUser()
  if (!authUser?.clerkId) {
    return { success: false, error: "You must be logged in" }
  }
  const createdBy = await getConvexUserIdByClerkId(authUser.clerkId)
  if (!createdBy) {
    return { success: false, error: "You must be logged in" }
  }

  try {
    const result = await fetchMutation(api.questions.toggleQuestionVerification, {
      questionId: id as Id<"questions">,
      createdBy,
      isVerified,
    })
    if ("error" in result) {
      return { success: false, error: "Failed to update question verification" }
    }

    revalidatePath("/dashboard")

    return { success: true, data: result.question ? mapQuestion(result.question) : undefined }
  } catch (error) {
    console.error("Error updating question verification:", error)
    return { success: false, error: "Failed to update question verification" }
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
  source?: QuestionContentType | "All"
  hasDiagram?: boolean
  limit?: number
  offset?: number
}

export interface QuestionBankResult {
  questions: Question[]
  total: number
  topics: string[]
}

/**
 * Fetches questions from Convex with optional filters.
 */
export async function getQuestionBankQuestions(
  filters: QuestionBankFilters = {}
): Promise<{ success: boolean; data?: QuestionBankResult; error?: string }> {
  const {
    search = "",
    topic = "All",
    difficulty = "All",
    calculatorAllowed = "All",
    isVerified = "All",
    source = "All",
    hasDiagram = false,
    limit = 50,
    offset = 0
  } = filters

  try {
    const result = await fetchQuery(api.questions.browseQuestions, {
      search: search && search.trim() !== "" ? search.trim() : undefined,
      topic: topic && topic !== "All" ? topic : undefined,
      difficulty: difficulty && difficulty !== "All" ? difficulty : undefined,
      calculatorAllowed: calculatorAllowed !== "All" && typeof calculatorAllowed === "boolean" ? calculatorAllowed : undefined,
      isVerified: isVerified !== "All" && typeof isVerified === "boolean" ? isVerified : undefined,
      contentType: source && source !== "All" ? source : undefined,
      hasDiagram: hasDiagram || undefined,
      limit,
      offset,
    })

    // Map Convex camelCase fields → Question interface (snake_case)
    const questions: Question[] = (result.questions || []).map((q) => ({
      ...mapQuestion(q),
      source_spec: q.sourceSpec as ("new-spec" | "legacy-modular" | "legacy-gcse" | null | undefined),
    } as Question))

    // Build unique topics list from returned data
    const topicsSet = new Set<string>()
    questions.forEach(q => {
      if (q.topic) topicsSet.add(q.topic)
      if (q.topic_name) topicsSet.add(q.topic_name)
    })
    const uniqueTopics = Array.from(topicsSet).sort()

    return {
      success: true,
      data: {
        questions,
        total: result.total,
        topics: uniqueTopics,
      }
    }
  } catch (convexError) {
    console.error("Convex read failed:", convexError)
    return { success: false, error: "An unexpected error occurred while fetching questions" }
  }
}

/**
 * Get a single question by ID
 */
export async function getQuestionById(
  questionId: string
): Promise<{ success: boolean; data?: Question; error?: string }> {
  try {
    const question = await fetchQuery(api.questions.getQuestionById, {
      questionId: questionId as Id<"questions">,
    })

    if (!question) {
      return { success: false, error: "Question not found" }
    }

    return { success: true, data: mapQuestion(question) }
  } catch (error) {
    console.error("Unexpected error in getQuestionById:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

/**
 * Increment the times_used counter for questions when added to an exam.
 * NOTE: the Convex schema has no usage counter field, so this is a no-op that
 * reports success. See migration report.
 */
export async function incrementQuestionUsage(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  questionIds: string[]
): Promise<{ success: boolean; error?: string }> {
  return { success: true }
}
