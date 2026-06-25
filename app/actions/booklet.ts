"use server"

import { revalidatePath } from "next/cache"
import { getAuthUser } from "@/lib/auth"
import { fetchQuery, fetchMutation, api, getConvexUserIdByClerkId } from "@/lib/convex/server"
import type { Id } from "@/convex/_generated/dataModel"

export type BookletSpec = "new-spec" | "legacy-modular" | "legacy-gcse" | null

export interface BankFilter {
  board?: string
  level?: string
  spec?: BookletSpec
  modules?: string[]         // legacy modular: ["C3", "C4"]
  yearFrom?: number
  yearTo?: number
  topicIds?: string[]
  marksTarget?: number
}

export interface GapAnalysisResult {
  totalInScope: number
  usedCount: number
  unusedCount: number
  unusedByTopic: { topic: string; count: number }[]
  unusedQuestions: UnusedQuestion[]
  warning?: "empty" | "too_large"
}

export interface UnusedQuestion {
  id: string
  image_url: string | null
  question_latex?: string | null
  marks: number
  calculator_allowed: boolean
  topic: string
  sub_topic: string
  exam_board: string
  level: string
  paper_reference: string
  question_number_ref: string
  source_spec: BookletSpec
  answer_key?: {
    answer?: string
    explanation?: string
    mark_scheme?: string
  } | null
}

export interface BookletJob {
  id: string
  class_id: string
  class_name: string
  bank_filter: BankFilter
  unused_count: number
  total_in_scope: number
  status: "pending" | "generating" | "done" | "failed"
  pdf_url: string | null
  error_log: string | null
  created_at: string
  completed_at: string | null
}

// =====================================================
// Helpers
// =====================================================

/** Resolve the signed-in Clerk user to a Convex user id, or null. */
async function currentTeacherId(): Promise<Id<"users"> | null> {
  const authUser = await getAuthUser()
  if (!authUser?.clerkId) return null
  return getConvexUserIdByClerkId(authUser.clerkId)
}

const toIso = (ms: number | null | undefined): string =>
  ms == null ? new Date().toISOString() : new Date(ms).toISOString()

const toIsoOrNull = (ms: number | null | undefined): string | null =>
  ms == null ? null : new Date(ms).toISOString()

/** Map a Convex question row onto the UnusedQuestion shape used by the booklet UI. */
function mapUnusedQuestion(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  q: any,
): UnusedQuestion {
  return {
    id: q._id,
    image_url: q.imageUrl ?? null,
    question_latex: q.questionLatex ?? null,
    marks: q.marks ?? 0,
    calculator_allowed: q.calculatorAllowed ?? false,
    topic: q.topic ?? q.topicName ?? "",
    sub_topic: q.subTopic ?? "",
    exam_board: q.examBoard ?? "",
    level: q.level ?? "",
    paper_reference: q.paperReference ?? "",
    question_number_ref: q.questionNumberRef ?? "",
    source_spec: (q.sourceSpec ?? null) as BookletSpec,
    answer_key: q.answerKey ?? null,
  }
}

/**
 * Load teacher's classes for the class selector step.
 */
export async function getTeacherClassesForBooklet(): Promise<{
  classes: { id: string; name: string; subject: string; assessmentCount: number }[]
  error?: string
}> {
  const teacherId = await currentTeacherId()
  if (!teacherId) return { classes: [], error: "Not authenticated" }

  try {
    const classes = await fetchQuery(api.classes.getTeacherClasses, { teacherId })

    const classesWithCounts = await Promise.all(
      classes.map(async (c) => {
        const assignments = await fetchQuery(api.assignments.getClassAssignments, {
          classId: c._id,
        })
        return {
          id: c._id as string,
          name: c.name,
          subject: c.subject ?? "Mathematics",
          assessmentCount: assignments.length,
        }
      }),
    )

    // Sort by name to match the previous .order("name")
    classesWithCounts.sort((a, b) => a.name.localeCompare(b.name))
    return { classes: classesWithCounts }
  } catch (error) {
    console.error("Error in getTeacherClassesForBooklet:", error)
    return { classes: [], error: "Failed to load classes" }
  }
}

/**
 * Run the gap analysis: determine which questions in the bank filter
 * have NOT been used in any assignment for the selected class.
 */
export async function runGapAnalysis(
  classId: string,
  filter: BankFilter
): Promise<{ result: GapAnalysisResult | null; error?: string }> {
  const teacherId = await currentTeacherId()
  if (!teacherId) return { result: null, error: "Not authenticated" }

  try {
    // Verify teacher owns the class
    const cls = await fetchQuery(api.classes.getClass, {
      classId: classId as Id<"classes">,
      teacherId,
    })
    if (!cls) return { result: null, error: "Access denied" }

    // Fetch the in-scope, unused set from Convex (handles used-question exclusion,
    // board/level/spec scoping). Year/module/topic refinement + marks capping below.
    const unusedRows = await fetchQuery(api.questions.getUnusedQuestionsForClass, {
      classId: classId as Id<"classes">,
      examBoard: filter.board,
      level: filter.level,
      sourceSpec: filter.spec === undefined ? undefined : filter.spec,
    })

    let filtered = unusedRows.map(mapUnusedQuestion)

    // Filter by year range if specified (paper_reference typically includes year)
    if (filter.yearFrom || filter.yearTo) {
      filtered = filtered.filter((q) => {
        const yearMatch = q.paper_reference?.match(/\b(20\d{2})\b/)
        if (!yearMatch) return true
        const year = parseInt(yearMatch[1])
        if (filter.yearFrom && year < filter.yearFrom) return false
        if (filter.yearTo && year > filter.yearTo) return false
        return true
      })
    }

    // Filter by modules for legacy modular
    if (filter.modules && filter.modules.length > 0) {
      const mods = filter.modules.map((m) => m.toUpperCase())
      filtered = filtered.filter((q) => {
        const ref = q.paper_reference?.toUpperCase() || ""
        return mods.some((m) => ref.includes(m))
      })
    }

    // Filter by topic IDs if specified
    if (filter.topicIds && filter.topicIds.length > 0) {
      filtered = filtered.filter((q) =>
        filter.topicIds!.some(
          (t) =>
            q.sub_topic?.toLowerCase().includes(t.toLowerCase()) ||
            q.topic?.toLowerCase().includes(t.toLowerCase()),
        ),
      )
    }

    const totalInScope = filtered.length
    // getUnusedQuestionsForClass already excludes used questions, so unused == in-scope here.
    const usedCount = 0

    // Apply marks target: cap selection to approximately marksTarget marks
    let selected = filtered
    if (filter.marksTarget && filter.marksTarget > 0) {
      let accMarks = 0
      selected = []
      for (const q of filtered) {
        if (accMarks >= filter.marksTarget) break
        selected.push(q)
        accMarks += q.marks || 0
      }
    }

    // Aggregate by topic
    const topicCounts: Record<string, number> = {}
    for (const q of selected) {
      const key = q.topic || "Uncategorised"
      topicCounts[key] = (topicCounts[key] || 0) + 1
    }
    const unusedByTopic = Object.entries(topicCounts)
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)

    let warning: GapAnalysisResult["warning"] = undefined
    if (selected.length === 0 && totalInScope > 0) warning = "empty"
    else if (selected.length > 200 && !filter.marksTarget) warning = "too_large"

    return {
      result: {
        totalInScope,
        usedCount,
        unusedCount: selected.length,
        unusedByTopic,
        unusedQuestions: selected,
        warning,
      },
    }
  } catch (error) {
    console.error("Error in runGapAnalysis:", error)
    return { result: null, error: "Failed to run gap analysis" }
  }
}

/**
 * Create a booklet job record and trigger PDF generation.
 * Returns the job ID immediately; generation happens asynchronously via
 * the /api/pdf/booklet/[jobId] route.
 */
export async function createBookletJob(
  classId: string,
  filter: BankFilter,
  unusedQuestions: UnusedQuestion[]
): Promise<{ jobId: string | null; error?: string }> {
  const teacherId = await currentTeacherId()
  if (!teacherId) return { jobId: null, error: "Not authenticated" }

  try {
    // Verify ownership
    const cls = await fetchQuery(api.classes.getClass, {
      classId: classId as Id<"classes">,
      teacherId,
    })
    if (!cls) return { jobId: null, error: "Access denied" }

    // Store the question ID list on the bank_filter so the PDF route can rebuild
    // the booklet in order (mirrors the old _questionIds approach).
    const jobId = await fetchMutation(api.booklets.createBookletJob, {
      teacherId,
      classId: classId as Id<"classes">,
      bankFilter: {
        ...filter,
        _questionIds: unusedQuestions.map((q) => q.id),
      },
      unusedCount: unusedQuestions.length,
      totalInScope: 0,
    })

    revalidatePath("/dashboard/library/booklet")
    return { jobId: jobId as string }
  } catch (error) {
    console.error("Error in createBookletJob:", error)
    return { jobId: null, error: "Failed to create job" }
  }
}

/**
 * Get a booklet job by ID (teacher auth required).
 */
export async function getBookletJob(jobId: string): Promise<BookletJob | null> {
  const teacherId = await currentTeacherId()
  if (!teacherId) return null

  try {
    const job = await fetchQuery(api.booklets.getBookletJob, {
      jobId: jobId as Id<"bookletJobs">,
    })
    if (!job || job.teacherId !== teacherId) return null

    const cls = await fetchQuery(api.classes.getClass, {
      classId: job.classId,
      teacherId,
    })

    return {
      id: job._id as string,
      class_id: job.classId as string,
      class_name: cls?.name ?? "",
      bank_filter: job.bankFilter as BankFilter,
      unused_count: job.unusedCount ?? 0,
      total_in_scope: job.totalInScope ?? 0,
      status: job.status,
      pdf_url: job.pdfUrl ?? null,
      error_log: job.errorLog ?? null,
      created_at: toIso(job._creationTime),
      completed_at: toIsoOrNull(job.completedAt),
    }
  } catch (error) {
    console.error("Error in getBookletJob:", error)
    return null
  }
}

/**
 * List recent booklet jobs for the teacher.
 */
export async function listBookletJobs(): Promise<BookletJob[]> {
  const teacherId = await currentTeacherId()
  if (!teacherId) return []

  try {
    const jobs = await fetchQuery(api.booklets.getTeacherBookletJobs, { teacherId })

    return jobs.map((d) => ({
      id: d._id as string,
      class_id: d.classId as string,
      class_name: d.className ?? "",
      bank_filter: d.bankFilter as BankFilter,
      unused_count: d.unusedCount ?? 0,
      total_in_scope: d.totalInScope ?? 0,
      status: d.status,
      pdf_url: d.pdfUrl ?? null,
      error_log: d.errorLog ?? null,
      created_at: toIso(d._creationTime),
      completed_at: toIsoOrNull(d.completedAt),
    }))
  } catch (error) {
    console.error("Error in listBookletJobs:", error)
    return []
  }
}
