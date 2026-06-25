"use server"

import { revalidatePath } from "next/cache"
import { getAuthUser } from "@/lib/auth"
import { fetchQuery, fetchMutation, api, getConvexUserIdByClerkId } from "@/lib/convex/server"
import type { Id } from "@/convex/_generated/dataModel"

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
  /** Class to assign to — omit to save to bank only without creating an assignment */
  classId?: string
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
  /** Paper metadata — used to tag questions in the bank */
  examBoard?: string
  level?: string
  year?: string
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
// Helpers
// =====================================================

/** Resolve the signed-in Clerk user to a Convex user id, or null. */
async function currentUserId(): Promise<Id<"users"> | null> {
  const authUser = await getAuthUser()
  if (!authUser?.clerkId) return null
  return getConvexUserIdByClerkId(authUser.clerkId)
}

// =====================================================
// Upload File to Storage
// =====================================================

/**
 * Uploads a PDF to Convex file storage.
 * Returns the served URL plus the storageId (as `path`, used later for deletion).
 */
export async function uploadExamPaper(formData: FormData): Promise<{
  success: boolean
  data?: { url: string; path: string }
  error?: string
}> {
  const authUser = await getAuthUser()
  if (!authUser?.clerkId) {
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

    // 3. Resolve the served URL for the stored file.
    const url = await fetchQuery(api.files.getUrl, { storageId })
    if (!url) {
      throw new Error("Could not resolve uploaded file URL")
    }

    return {
      success: true,
      data: {
        url,
        path: storageId,
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
 * Creates an external assignment.
 *
 * Steps:
 * 1. Validate input
 * 2. Save each mapped question to the bank (Convex `questions`)
 * 3. Create the assignment (Convex `assignments`) linking the questions, with
 *    external metadata (resource URL, exam board, etc.) on `metadata`.
 */
export async function createExternalAssignment(
  input: CreateExternalAssignmentInput
): Promise<{
  success: boolean
  data?: ExternalAssignment
  error?: string
}> {
  const userId = await currentUserId()
  if (!userId) {
    return { success: false, error: "You must be logged in" }
  }

  try {
    // 1. Validate mapped questions
    if (!input.mappedQuestions || input.mappedQuestions.length === 0) {
      return { success: false, error: "At least one question mapping is required" }
    }
    for (const q of input.mappedQuestions) {
      if (!q.questionNumber || !q.topic || !q.subTopic || q.marks <= 0) {
        return { success: false, error: "All questions must have question number, topic, sub-topic, and marks" }
      }
    }

    // 2. Verify teacher owns the class (only if assigning to a class)
    let classData: { id: Id<"classes">; name: string } | null = null
    if (input.classId) {
      const cls = await fetchQuery(api.classes.getClass, {
        classId: input.classId as Id<"classes">,
        teacherId: userId,
      })
      if (!cls) {
        return { success: false, error: "Class not found or you don't have permission" }
      }
      classData = { id: cls._id, name: cls.name }
    }

    // 3. Derive difficulty tier from level string
    const difficulty = input.level?.toLowerCase().includes("foundation") ? "Foundation" : "Higher"
    const metaTags = [input.examBoard, input.year, input.level].filter(Boolean) as string[]

    // 4. Save each question as a real row in the bank so it appears in the bank.
    const questionIds: Id<"questions">[] = []
    for (const q of input.mappedQuestions) {
      const id = await fetchMutation(api.questions.createQuestion, {
        createdBy: userId,
        contentType: "official_past_paper",
        topic: q.topic,
        topicName: q.topic,
        subTopic: q.subTopic,
        level: input.level ?? undefined,
        marks: q.marks,
        difficulty,
        tags: metaTags,
        answerKey: {
          answer: "",
          explanation: "",
          marks: q.marks,
          type: "manual" as const,
          source: {
            exam_board: input.examBoard ?? undefined,
            level: input.level ?? undefined,
            year: input.year ? parseInt(input.year, 10) : undefined,
            question_number: q.questionNumber ? `Q${q.questionNumber}` : undefined,
          },
          curriculum: {
            level: input.level,
            topic: q.topic,
            sub_topic: q.subTopic,
            context: input.resourceUrl,
          },
        },
      })
      questionIds.push(id as Id<"questions">)
    }

    const totalMarks = input.mappedQuestions.reduce((sum, q) => sum + q.marks, 0)

    // If no classId, bank-only save — return early
    if (!input.classId || !classData) {
      revalidatePath("/dashboard/questions/browse")
      return {
        success: true,
        data: {
          id: "",
          title: input.title,
          classId: "",
          className: "",
          resourceUrl: input.resourceUrl,
          sourceType: "external_upload",
          totalMarks,
          questionCount: input.mappedQuestions.length,
          createdAt: new Date().toISOString(),
        },
      }
    }

    // 5. Create the assignment record with linked questions and external metadata.
    const result = await fetchMutation(api.assignments.createAssignmentFull, {
      classId: classData.id,
      teacherId: userId,
      title: input.title,
      mode: input.mode || "paper",
      dueDate: input.dueDate ? new Date(input.dueDate).getTime() : undefined,
      status: "draft",
      questionIds,
      metadata: {
        external: true,
        sourceType: "external_upload",
        resourceUrl: input.resourceUrl,
        examBoard: input.examBoard,
        level: input.level,
        year: input.year,
        questionCount: input.mappedQuestions.length,
        totalMarks,
        // Per-question custom mappings keyed by question id.
        questionMappings: input.mappedQuestions.map((q, i) => ({
          questionId: questionIds[i],
          questionNumber: q.questionNumber,
          topic: q.topic,
          subTopic: q.subTopic,
          marks: q.marks,
        })),
      },
    })

    if ("error" in result) {
      // Questions are already saved to the bank — don't roll them back.
      return { success: false, error: "Questions saved to bank but failed to create assignment" }
    }

    revalidatePath("/dashboard/assignments")
    revalidatePath("/dashboard/questions/browse")

    return {
      success: true,
      data: {
        id: result.assignmentId as string,
        title: input.title,
        classId: classData.id as string,
        className: classData.name,
        resourceUrl: input.resourceUrl,
        sourceType: "external_upload",
        totalMarks,
        questionCount: input.mappedQuestions.length,
        createdAt: new Date().toISOString(),
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
 * Gets details of an external assignment including its mapped questions.
 */
export async function getExternalAssignmentDetails(
  assignmentId: string
): Promise<{
  success: boolean
  data?: ExternalAssignmentDetails
  error?: string
}> {
  const userId = await currentUserId()
  if (!userId) {
    return { success: false, error: "You must be logged in" }
  }

  try {
    const result = await fetchQuery(api.assignments.getAssignmentDetails, {
      assignmentId: assignmentId as Id<"assignments">,
      teacherId: userId,
    })

    if ("error" in result) {
      return {
        success: false,
        error: result.error === "forbidden" ? "Permission denied" : "Assignment not found",
      }
    }

    // Pull external metadata (resource URL, per-question mappings) off metadata.
    const meta = (result as { metadata?: Record<string, unknown> }).metadata ?? {}
    const resourceUrl = (meta.resourceUrl as string | undefined) ?? null
    const mappings = (meta.questionMappings as Array<{
      questionId: string
      questionNumber: string
      topic: string
      subTopic: string
      marks: number
    }> | undefined) ?? []
    const mappingByQuestionId = new Map(mappings.map((m) => [m.questionId, m]))

    const formattedQuestions = result.questions.map((q) => {
      const m = mappingByQuestionId.get(q.questionId as string)
      return {
        id: q.questionId as string,
        orderIndex: q.orderIndex,
        questionNumber: m?.questionNumber ?? `Q${q.orderIndex + 1}`,
        topic: m?.topic ?? q.topic,
        subTopic: m?.subTopic ?? q.subTopic,
        marks: m?.marks ?? q.marks,
        isGhost: false,
      }
    })

    const totalMarks = formattedQuestions.reduce((sum, q) => sum + q.marks, 0)

    return {
      success: true,
      data: {
        id: result.id as string,
        title: result.title,
        classId: result.classId as string,
        className: result.className,
        subject: result.subject,
        dueDate: result.dueDate != null ? new Date(result.dueDate).toISOString() : null,
        status: result.status ?? "draft",
        mode: (meta.mode as string | undefined) ?? "paper",
        sourceType: (meta.sourceType as string | undefined) ?? "external_upload",
        resourceUrl,
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
 * Updates the question mappings for an external assignment.
 * Creates fresh bank questions for the new mappings and replaces the
 * assignment's linked questions, refreshing the external metadata.
 */
export async function updateExternalAssignmentQuestions(
  assignmentId: string,
  mappedQuestions: MappedQuestion[]
): Promise<{
  success: boolean
  error?: string
}> {
  const userId = await currentUserId()
  if (!userId) {
    return { success: false, error: "You must be logged in" }
  }

  try {
    // 1. Verify ownership and read existing metadata.
    const details = await fetchQuery(api.assignments.getAssignmentDetails, {
      assignmentId: assignmentId as Id<"assignments">,
      teacherId: userId,
    })
    if ("error" in details) {
      return {
        success: false,
        error: details.error === "forbidden" ? "Permission denied" : "Assignment not found",
      }
    }

    const meta = (details as { metadata?: Record<string, unknown> }).metadata ?? {}
    if (meta.sourceType !== "external_upload") {
      return { success: false, error: "Can only update external assignments" }
    }

    const difficulty = (meta.level as string | undefined)?.toLowerCase().includes("foundation")
      ? "Foundation"
      : "Higher"
    const metaTags = [meta.examBoard, meta.year, meta.level].filter(Boolean) as string[]

    // 2. Create fresh bank questions for each new mapping.
    const questionIds: Id<"questions">[] = []
    for (const q of mappedQuestions) {
      const id = await fetchMutation(api.questions.createQuestion, {
        createdBy: userId,
        contentType: "official_past_paper",
        topic: q.topic,
        topicName: q.topic,
        subTopic: q.subTopic,
        level: (meta.level as string | undefined) ?? undefined,
        marks: q.marks,
        difficulty,
        tags: metaTags,
        answerKey: {
          answer: "",
          explanation: "",
          marks: q.marks,
          type: "manual" as const,
          curriculum: { topic: q.topic, sub_topic: q.subTopic },
        },
      })
      questionIds.push(id as Id<"questions">)
    }

    // 3. Replace the assignment's linked questions.
    const replaceResult = await fetchMutation(api.assignments.updateAssignmentQuestions, {
      assignmentId: assignmentId as Id<"assignments">,
      teacherId: userId,
      questionIds,
    })
    if ("error" in replaceResult) {
      return { success: false, error: "Failed to update questions" }
    }

    // 4. Update assignment external metadata.
    const totalMarks = mappedQuestions.reduce((sum, q) => sum + q.marks, 0)
    await fetchMutation(api.assignments.updateAssignment, {
      assignmentId: assignmentId as Id<"assignments">,
      teacherId: userId,
      metadata: {
        ...meta,
        external: true,
        questionCount: mappedQuestions.length,
        totalMarks,
        questionMappings: mappedQuestions.map((q, i) => ({
          questionId: questionIds[i],
          questionNumber: q.questionNumber,
          topic: q.topic,
          subTopic: q.subTopic,
          marks: q.marks,
        })),
      },
    })

    revalidatePath(`/dashboard/assignments/${assignmentId}`)

    return { success: true }
  } catch (error) {
    console.error("Error in updateExternalAssignmentQuestions:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// =====================================================
// Get Digitized Papers (for library picker)
// =====================================================

export interface DigitizedPaper {
  id: string
  title: string
  resource_url: string
  created_at: string
  exam_board: string | null
  level: string | null
  year: string | null
}

/**
 * Returns the teacher's assignments that have an uploaded PDF (resourceUrl in
 * metadata). Used by the shadow paper generator to pick an existing paper.
 */
export async function getDigitizedPapers(): Promise<{
  success: boolean
  data?: DigitizedPaper[]
  error?: string
}> {
  const userId = await currentUserId()
  if (!userId) {
    return { success: false, error: "You must be logged in" }
  }

  try {
    const assignments = await fetchQuery(api.assignments.getTeacherAssignments, {
      teacherId: userId,
    })

    const papers: DigitizedPaper[] = assignments
      .map((a) => {
        const meta = (a.metadata as Record<string, unknown> | undefined) ?? {}
        const resourceUrl = meta.resourceUrl as string | undefined
        if (!resourceUrl) return null
        return {
          id: a._id as string,
          title: a.title,
          resource_url: resourceUrl,
          created_at: new Date(a._creationTime).toISOString(),
          exam_board: (meta.examBoard as string | undefined) ?? null,
          level: (meta.level as string | undefined) ?? null,
          year: (meta.year as string | undefined) ?? null,
        } satisfies DigitizedPaper
      })
      .filter((p): p is DigitizedPaper => p !== null)
      .slice(0, 50)

    return { success: true, data: papers }
  } catch (error) {
    console.error("Error in getDigitizedPapers:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// =====================================================
// Delete Uploaded PDF
// =====================================================

/**
 * Deletes a PDF from Convex file storage.
 * `storageId` is the value returned as `path` from uploadExamPaper.
 */
export async function deleteExamPaper(storageId: string): Promise<{
  success: boolean
  error?: string
}> {
  const authUser = await getAuthUser()
  if (!authUser?.clerkId) {
    return { success: false, error: "You must be logged in" }
  }

  try {
    await fetchMutation(api.files.remove, {
      storageId: storageId as Id<"_storage">,
    })
    return { success: true }
  } catch (error) {
    console.error("Error in deleteExamPaper:", error)
    return { success: false, error: "Failed to delete file" }
  }
}
