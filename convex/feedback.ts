import { v } from "convex/values"
import { query, mutation } from "./_generated/server"
import type { Doc, Id } from "./_generated/dataModel"

/**
 * Feedback domain queries/mutations.
 *
 * All functions take explicit Convex ids (resolved from Clerk in the server
 * actions) — never ctx.auth. Per-question marks live in `submissionAnswers`
 * (keyed by `assignmentQuestionId`), NOT in a grading_data JSON blob, so topic
 * breakdowns are built by joining submissionAnswers → assignmentQuestions →
 * questions. The legacy `feedback_released` flag is modelled by
 * `feedbackSheets.isPublished`.
 */

// =====================================================
// Shared shapes
// =====================================================

interface QuestionRow {
  id: string // questionId
  assignmentQuestionId: string
  questionLatex: string
  imageUrl: string | null
  contentType: string
  marks: number
  topic: string
  subTopic: string
  difficulty: string
}

/**
 * Build the ordered question list for an assignment, joining each
 * assignmentQuestions row to its underlying question for topic/difficulty/etc.
 */
async function loadQuestions(
  ctx: { db: { query: (t: string) => any; get: (id: any) => any } },
  assignmentId: Id<"assignments">,
): Promise<QuestionRow[]> {
  const aqs = await ctx.db
    .query("assignmentQuestions")
    .withIndex("by_assignment", (q: any) => q.eq("assignmentId", assignmentId))
    .collect()
  aqs.sort((a: Doc<"assignmentQuestions">, b: Doc<"assignmentQuestions">) => a.order - b.order)

  const rows: QuestionRow[] = []
  for (const aq of aqs) {
    const q = (await ctx.db.get(aq.questionId)) as Doc<"questions"> | null
    rows.push({
      id: aq.questionId as string,
      assignmentQuestionId: aq._id as string,
      questionLatex: aq.questionLatex ?? q?.questionLatex ?? "",
      imageUrl: aq.imageUrl ?? q?.imageUrl ?? null,
      contentType: q?.contentType ?? "generated_text",
      marks: aq.marks ?? q?.marks ?? 1,
      topic: q?.topic ?? q?.topicName ?? "General",
      subTopic: q?.subTopic ?? q?.topic ?? q?.topicName ?? "General",
      difficulty: q?.difficulty ?? "Foundation",
    })
  }
  return rows
}

/** Map assignmentQuestionId -> marksAwarded for a submission. */
async function loadEarnedMarks(
  ctx: { db: { query: (t: string) => any } },
  submissionId: Id<"submissions">,
): Promise<Map<string, number>> {
  const answers = await ctx.db
    .query("submissionAnswers")
    .withIndex("by_submission", (q: any) => q.eq("submissionId", submissionId))
    .collect()
  const map = new Map<string, number>()
  for (const a of answers as Doc<"submissionAnswers">[]) {
    map.set(a.assignmentQuestionId as string, a.marksAwarded ?? 0)
  }
  return map
}

// =====================================================
// generateFeedback — assignment-wide summary (teacher)
// =====================================================

export const getAssignmentFeedback = query({
  args: { assignmentId: v.id("assignments"), teacherId: v.id("users") },
  handler: async (ctx, { assignmentId, teacherId }) => {
    const assignment = await ctx.db.get(assignmentId)
    if (!assignment) return { error: "not_found" as const }

    const cls = await ctx.db.get(assignment.classId)
    if (!cls) return { error: "not_found" as const }
    if (cls.teacherId !== teacherId) return { error: "forbidden" as const }

    const questions = await loadQuestions(ctx, assignmentId)

    // Graded submissions (status 'marked') with student profile.
    const allSubs = await ctx.db
      .query("submissions")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", assignmentId))
      .collect()
    const submissions = allSubs.filter((s) => s.status === "marked")

    const submissionPayloads = []
    for (const s of submissions) {
      const student = await ctx.db.get(s.studentId)
      const earned = await loadEarnedMarks(ctx, s._id)
      submissionPayloads.push({
        id: s._id as string,
        studentId: s.studentId as string,
        studentName: student?.fullName ?? null,
        studentEmail: student?.email ?? "",
        score: s.totalMarksAwarded ?? 0,
        earnedByAssignmentQuestionId: Object.fromEntries(earned),
      })
    }

    return {
      assignment: { id: assignment._id as string, title: assignment.title },
      className: cls.name,
      questions,
      submissions: submissionPayloads,
    }
  },
})

// =====================================================
// Revision candidates for weak topics
// =====================================================

/**
 * Returns up to `limit` questions whose topic is in `topics`, excluding
 * `excludeIds`. Used by getStudentAssignmentFeedback / generateFeedback to
 * build revision lists.
 */
export const getRevisionByTopics = query({
  args: {
    topics: v.array(v.string()),
    excludeIds: v.array(v.id("questions")),
    limit: v.number(),
  },
  handler: async (ctx, { topics, excludeIds, limit }) => {
    const exclude = new Set(excludeIds.map((id) => id as string))
    const seen = new Set<string>()
    const out: Doc<"questions">[] = []
    for (const topic of topics) {
      const rows = await ctx.db
        .query("questions")
        .withIndex("by_topic", (q) => q.eq("topic", topic))
        .collect()
      for (const q of rows) {
        const id = q._id as string
        if (exclude.has(id) || seen.has(id)) continue
        seen.add(id)
        out.push(q)
        if (out.length >= limit) break
      }
      if (out.length >= limit) break
    }
    return out.slice(0, limit).map((q) => ({
      id: q._id as string,
      questionLatex: q.questionLatex ?? "",
      imageUrl: q.imageUrl ?? null,
      contentType: q.contentType ?? "generated_text",
      marks: q.marks ?? 1,
      topic: q.topic ?? q.topicName ?? "General",
      subTopic: q.subTopic ?? null,
      difficulty: q.difficulty ?? "Foundation",
      answerKey: (q.answerKey ?? null) as unknown,
    }))
  },
})

/**
 * Returns up to `limit` questions matching a sub_topic (and difficulty),
 * falling back to topic-level if none, excluding `excludeIds`. Drives the
 * per-submission revision pack in generateStudentFeedback.
 */
export const getRevisionForSubTopic = query({
  args: {
    topic: v.string(),
    subTopic: v.string(),
    difficulty: v.string(),
    excludeIds: v.array(v.id("questions")),
    limit: v.number(),
  },
  handler: async (ctx, { topic, subTopic, difficulty, excludeIds, limit }) => {
    const exclude = new Set(excludeIds.map((id) => id as string))

    const map = (q: Doc<"questions">) => ({
      id: q._id as string,
      questionLatex: q.questionLatex ?? "",
      imageUrl: q.imageUrl ?? null,
      contentType: q.contentType ?? "generated_text",
      marks: q.marks ?? 1,
      topic: q.topic ?? q.topicName ?? "General",
      subTopic: q.subTopic ?? "",
      difficulty: q.difficulty ?? "Foundation",
      answerKey: (q.answerKey ?? null) as unknown,
    })

    // Exact sub_topic + difficulty match (topic indexed, filtered in memory).
    const byTopic = await ctx.db
      .query("questions")
      .withIndex("by_topic", (q) => q.eq("topic", topic))
      .collect()

    const subMatches = byTopic
      .filter(
        (q) =>
          (q.subTopic ?? "") === subTopic &&
          (q.difficulty ?? "") === difficulty &&
          !exclude.has(q._id as string),
      )
      .slice(0, limit)
      .map(map)

    if (subMatches.length > 0) return subMatches

    // Fallback: topic + difficulty match.
    const topicMatches = byTopic
      .filter((q) => (q.difficulty ?? "") === difficulty && !exclude.has(q._id as string))
      .slice(0, 1)
      .map(map)

    return topicMatches
  },
})

/**
 * Extension/stretch questions for a sub-topic the student is STRONG in — picks
 * the hardest available questions (Higher/Extension difficulty, then by marks),
 * excluding questions already used. Puts stretch work on high performers' sheets.
 */
export const getExtensionForSubTopic = query({
  args: {
    topic: v.string(),
    subTopic: v.string(),
    excludeIds: v.array(v.id("questions")),
    limit: v.number(),
  },
  handler: async (ctx, { topic, subTopic, excludeIds, limit }) => {
    const exclude = new Set(excludeIds.map((id) => id as string))
    const map = (q: Doc<"questions">) => ({
      id: q._id as string,
      questionLatex: q.questionLatex ?? "",
      imageUrl: q.imageUrl ?? null,
      contentType: q.contentType ?? "generated_text",
      marks: q.marks ?? 1,
      topic: q.topic ?? q.topicName ?? "General",
      subTopic: q.subTopic ?? "",
      difficulty: q.difficulty ?? "Foundation",
      answerKey: (q.answerKey ?? null) as unknown,
    })

    const rank = (d: string) => {
      const v = (d ?? "").toLowerCase()
      if (v.includes("extension") || v.includes("stretch")) return 3
      if (v.includes("higher") || v.includes("hard")) return 2
      if (v.includes("crossover") || v.includes("intermediate")) return 1
      return 0
    }

    const byTopic = await ctx.db
      .query("questions")
      .withIndex("by_topic", (q) => q.eq("topic", topic))
      .collect()

    const usable = byTopic.filter(
      (q) =>
        !exclude.has(q._id as string) &&
        !(q.imageUrl ?? "").includes("supabase.co"),
    )

    const sortHardest = (arr: Doc<"questions">[]) =>
      [...arr].sort(
        (a, b) =>
          rank(b.difficulty ?? "") - rank(a.difficulty ?? "") ||
          (b.marks ?? 0) - (a.marks ?? 0),
      )

    const subMatches = sortHardest(usable.filter((q) => (q.subTopic ?? "") === subTopic))
    if (subMatches.length > 0) return subMatches.slice(0, limit).map(map)

    return sortHardest(usable).slice(0, limit).map(map)
  },
})

// =====================================================
// generateStudentFeedback — single submission (teacher or student)
// =====================================================

export const getSubmissionFeedback = query({
  args: { submissionId: v.id("submissions"), requesterId: v.id("users") },
  handler: async (ctx, { submissionId, requesterId }) => {
    const submission = await ctx.db.get(submissionId)
    if (!submission) return { error: "not_found" as const }
    if (submission.status !== "marked") return { error: "not_graded" as const }

    const student = await ctx.db.get(submission.studentId)
    if (!student) return { error: "no_profile" as const }

    const assignment = await ctx.db.get(submission.assignmentId)
    if (!assignment) return { error: "not_found" as const }

    const cls = await ctx.db.get(assignment.classId)
    if (!cls) return { error: "not_found" as const }

    const isTeacher = cls.teacherId === requesterId
    const isStudent = submission.studentId === requesterId
    if (!isTeacher && !isStudent) return { error: "forbidden" as const }

    const questions = await loadQuestions(ctx, submission.assignmentId)
    const earned = await loadEarnedMarks(ctx, submissionId)

    return {
      submission: {
        id: submission._id as string,
        assignmentId: submission.assignmentId as string,
        studentId: submission.studentId as string,
        score: submission.totalMarksAwarded ?? 0,
      },
      student: {
        id: student._id as string,
        fullName: student.fullName ?? null,
        email: student.email ?? "",
      },
      assignment: { id: assignment._id as string, title: assignment.title },
      className: cls.name,
      questions: questions.map((q) => ({
        ...q,
        earned: earned.get(q.assignmentQuestionId) ?? 0,
      })),
    }
  },
})

// =====================================================
// getStudentAssignmentFeedback — single student/assignment
// =====================================================

export const getStudentAssignmentFeedback = query({
  args: {
    assignmentId: v.id("assignments"),
    studentId: v.id("users"),
    requesterId: v.id("users"),
  },
  handler: async (ctx, { assignmentId, studentId, requesterId }) => {
    const assignment = await ctx.db.get(assignmentId)
    if (!assignment) return { error: "not_found" as const }

    const submission = await ctx.db
      .query("submissions")
      .withIndex("by_assignment_student", (q) =>
        q.eq("assignmentId", assignmentId).eq("studentId", studentId),
      )
      .unique()
    if (!submission) return { error: "no_submission" as const }

    const student = await ctx.db.get(studentId)
    if (!student) return { error: "no_profile" as const }

    // Feedback-released flag (unless a teacher is viewing another student).
    const isViewingOther = requesterId !== studentId
    let isPublished = false
    const sheet = await ctx.db
      .query("feedbackSheets")
      .withIndex("by_submission", (q) => q.eq("submissionId", submission._id))
      .first()
    isPublished = !!sheet?.isPublished

    if (!isViewingOther && !isPublished) return { error: "not_released" as const }

    const questions = await loadQuestions(ctx, assignmentId)
    const earned = await loadEarnedMarks(ctx, submission._id)

    return {
      assignment: { id: assignment._id as string, title: assignment.title },
      submission: { id: submission._id as string, score: submission.totalMarksAwarded ?? 0 },
      student: {
        id: student._id as string,
        fullName: student.fullName ?? null,
        email: student.email ?? "",
      },
      questions: questions.map((q) => ({
        ...q,
        earned: earned.get(q.assignmentQuestionId) ?? 0,
      })),
    }
  },
})

// =====================================================
// releaseFeedbackAndGeneratePacks support
// =====================================================

/**
 * Marks the assignment closed and publishes a feedbackSheet for every graded
 * (status 'marked') submission, creating sheets where missing. Returns the
 * graded submission ids so the server action can build packs per-student.
 */
export const releaseFeedback = mutation({
  args: { assignmentId: v.id("assignments"), teacherId: v.id("users") },
  handler: async (ctx, { assignmentId, teacherId }) => {
    const assignment = await ctx.db.get(assignmentId)
    if (!assignment) return { error: "not_found" as const }

    const cls = await ctx.db.get(assignment.classId)
    if (!cls) return { error: "not_found" as const }
    if (cls.teacherId !== teacherId) return { error: "forbidden" as const }

    const allSubs = await ctx.db
      .query("submissions")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", assignmentId))
      .collect()
    const graded = allSubs.filter((s) => s.status === "marked")

    if (graded.length === 0) return { error: "no_graded" as const }

    // Mark the assignment closed (legacy used status 'graded').
    if (assignment.status !== "closed") {
      await ctx.db.patch(assignmentId, { status: "closed" })
    }

    const now = Date.now()
    for (const s of graded) {
      const sheet = await ctx.db
        .query("feedbackSheets")
        .withIndex("by_submission", (q) => q.eq("submissionId", s._id))
        .first()
      if (sheet) {
        if (!sheet.isPublished) {
          await ctx.db.patch(sheet._id, { isPublished: true, publishedAt: now })
        }
      } else {
        await ctx.db.insert("feedbackSheets", {
          submissionId: s._id,
          studentId: s.studentId,
          assignmentId,
          score: s.totalMarksAwarded ?? 0,
          isPublished: true,
          publishedAt: now,
        })
      }
    }

    return {
      assignment: { id: assignment._id as string, title: assignment.title },
      className: cls.name,
      submissionIds: graded.map((s) => s._id as string),
    }
  },
})

// =====================================================
// getAssignmentFeedbackForPrint support
// =====================================================

/**
 * Returns graded + published (feedback released) submission ids for an
 * assignment, plus assignment/class names. Teacher-only.
 */
export const getReleasedSubmissions = query({
  args: { assignmentId: v.id("assignments"), teacherId: v.id("users") },
  handler: async (ctx, { assignmentId, teacherId }) => {
    const assignment = await ctx.db.get(assignmentId)
    if (!assignment) return { error: "not_found" as const }

    const cls = await ctx.db.get(assignment.classId)
    if (!cls) return { error: "not_found" as const }
    if (cls.teacherId !== teacherId) return { error: "forbidden" as const }

    const allSubs = await ctx.db
      .query("submissions")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", assignmentId))
      .collect()

    const ids: string[] = []
    for (const s of allSubs) {
      if (s.status !== "marked") continue
      const sheet = await ctx.db
        .query("feedbackSheets")
        .withIndex("by_submission", (q) => q.eq("submissionId", s._id))
        .first()
      if (sheet?.isPublished) ids.push(s._id as string)
    }

    return {
      assignment: { id: assignment._id as string, title: assignment.title },
      className: cls.name,
      submissionIds: ids,
    }
  },
})

// =====================================================
// email-feedback support
// =====================================================

/** Update the parent email on a student profile. Teacher/admin or self only. */
export const setStudentParentEmail = mutation({
  args: {
    studentId: v.id("users"),
    requesterId: v.id("users"),
    parentEmail: v.string(),
  },
  handler: async (ctx, { studentId, requesterId, parentEmail }) => {
    const caller = await ctx.db.get(requesterId)
    if (!caller) return { error: "forbidden" as const }
    const isPrivileged = caller.role === "teacher" || caller.role === "admin"
    if (!isPrivileged && requesterId !== studentId) return { error: "forbidden" as const }

    await ctx.db.patch(studentId, { parentEmail: parentEmail || undefined })
    return { ok: true as const }
  },
})

/** Parent email + name for a student. */
export const getStudentParentInfo = query({
  args: { studentId: v.id("users") },
  handler: async (ctx, { studentId }) => {
    const student = await ctx.db.get(studentId)
    if (!student) return null
    return {
      parentEmail: student.parentEmail ?? null,
      fullName: student.fullName ?? null,
      email: student.email ?? "",
    }
  },
})

/**
 * Graded submissions for an assignment with each student's parent email.
 * Teacher-only. Drives emailFeedbackToAllParents.
 */
export const getGradedSubmissionsWithParents = query({
  args: { assignmentId: v.id("assignments"), teacherId: v.id("users") },
  handler: async (ctx, { assignmentId, teacherId }) => {
    const assignment = await ctx.db.get(assignmentId)
    if (!assignment) return { error: "not_found" as const }

    const cls = await ctx.db.get(assignment.classId)
    if (!cls) return { error: "not_found" as const }
    if (cls.teacherId !== teacherId) return { error: "forbidden" as const }

    const allSubs = await ctx.db
      .query("submissions")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", assignmentId))
      .collect()
    const graded = allSubs.filter((s) => s.status === "marked")

    const rows = []
    for (const s of graded) {
      const student = await ctx.db.get(s.studentId)
      rows.push({
        submissionId: s._id as string,
        studentId: s.studentId as string,
        parentEmail: student?.parentEmail ?? null,
      })
    }

    return {
      assignment: { id: assignment._id as string, title: assignment.title },
      submissions: rows,
    }
  },
})
