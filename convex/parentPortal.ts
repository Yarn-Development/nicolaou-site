import { v } from "convex/values"
import { query, mutation } from "./_generated/server"

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 90 // 90 days

function randomToken(): string {
  // 32 hex chars — sufficient entropy for a magic-link credential.
  let s = ""
  for (let i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16)
  return s
}

/**
 * Get (or create) a non-expired parent access token for a student, created by
 * the calling teacher. Verifies the caller is a teacher/admin.
 */
export const getOrCreateToken = mutation({
  args: {
    teacherId: v.id("users"),
    studentId: v.id("users"),
  },
  handler: async (ctx, { teacherId, studentId }) => {
    const caller = await ctx.db.get(teacherId)
    if (!caller || (caller.role !== "teacher" && caller.role !== "admin")) {
      return { error: "permission_denied" as const }
    }

    const now = Date.now()
    const existingForStudent = await ctx.db
      .query("parentTokens")
      .withIndex("by_student", (q) => q.eq("studentId", studentId))
      .collect()
    const existing = existingForStudent
      .filter((t) => t.createdBy === teacherId && t.expiresAt > now)
      .sort((a, b) => b._creationTime - a._creationTime)[0]

    if (existing) return { token: existing.token }

    const token = randomToken()
    await ctx.db.insert("parentTokens", {
      token,
      studentId,
      createdBy: teacherId,
      expiresAt: now + TOKEN_TTL_MS,
    })
    return { token }
  },
})

/** Resolve a parent token to its student (public — token is the credential). */
export const resolveToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const row = await ctx.db
      .query("parentTokens")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first()

    if (!row || row.expiresAt <= Date.now()) {
      return { error: "invalid" as const }
    }

    const student = await ctx.db.get(row.studentId)
    const studentName =
      student?.fullName || student?.email?.split("@")[0] || "Student"

    return { studentId: row.studentId, studentName }
  },
})

/**
 * List published feedback sheets for a student, resolved via a parent token.
 * Returns one row per published feedback sheet.
 */
export const getPortalData = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const tokenRow = await ctx.db
      .query("parentTokens")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first()
    if (!tokenRow || tokenRow.expiresAt <= Date.now()) {
      return { error: "invalid" as const }
    }

    const student = await ctx.db.get(tokenRow.studentId)
    const studentName =
      student?.fullName || student?.email?.split("@")[0] || "Student"

    const sheets = await ctx.db
      .query("feedbackSheets")
      .withIndex("by_student", (q) => q.eq("studentId", tokenRow.studentId))
      .collect()

    const feedbackSheets = []
    for (const sheet of sheets) {
      if (!sheet.isPublished) continue
      const assignment = await ctx.db.get(sheet.assignmentId)
      if (!assignment) continue
      const cls = await ctx.db.get(assignment.classId)

      const score = sheet.score ?? 0
      const maxScore = sheet.maxScore ?? 0
      const percentage =
        maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
      const status =
        percentage > 80 ? "green" : percentage >= 50 ? "amber" : "red"

      feedbackSheets.push({
        submissionId: sheet.submissionId,
        assignmentTitle: assignment.title,
        className: cls?.name ?? "",
        totalScore: score,
        maxMarks: maxScore,
        percentage,
        generatedAt: sheet.publishedAt ?? sheet._creationTime,
        status: status as "green" | "amber" | "red",
      })
    }

    return { studentName, feedbackSheets }
  },
})

/**
 * Compute full feedback detail for a specific submission, resolved via a parent
 * token. Verifies the submission belongs to the token's student and that
 * feedback is published. Rebuilds per-question scores from submissionAnswers.
 */
export const getFeedbackDetail = query({
  args: { token: v.string(), submissionId: v.id("submissions") },
  handler: async (ctx, { token, submissionId }) => {
    const tokenRow = await ctx.db
      .query("parentTokens")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first()
    if (!tokenRow || tokenRow.expiresAt <= Date.now()) {
      return { error: "invalid" as const }
    }
    const studentId = tokenRow.studentId

    const submission = await ctx.db.get(submissionId)
    if (!submission || submission.studentId !== studentId) {
      return { error: "not_found" as const }
    }

    // Feedback must be published.
    const sheet = await ctx.db
      .query("feedbackSheets")
      .withIndex("by_submission", (q) => q.eq("submissionId", submissionId))
      .first()
    if (!sheet?.isPublished) {
      return { error: "not_available" as const }
    }

    const student = await ctx.db.get(studentId)
    const assignment = await ctx.db.get(submission.assignmentId)
    if (!assignment) return { error: "not_found" as const }
    const cls = await ctx.db.get(assignment.classId)

    // Assignment questions ordered by `order`.
    const aqs = await ctx.db
      .query("assignmentQuestions")
      .withIndex("by_assignment", (q) =>
        q.eq("assignmentId", submission.assignmentId),
      )
      .collect()
    aqs.sort((a, b) => a.order - b.order)

    // Per-question awarded marks from submissionAnswers, keyed by questionId.
    const answers = await ctx.db
      .query("submissionAnswers")
      .withIndex("by_submission", (q) => q.eq("submissionId", submissionId))
      .collect()
    const awardedByAq = new Map(
      answers.map((a) => [a.assignmentQuestionId as string, a.marksAwarded ?? 0]),
    )

    const questions = []
    for (const aq of aqs) {
      const q = await ctx.db.get(aq.questionId)
      questions.push({
        id: aq.questionId as string,
        questionLatex: aq.questionLatex ?? q?.questionLatex ?? "",
        marks: aq.marks ?? q?.marks ?? 1,
        topic: q?.topic ?? q?.topicName ?? "General",
        subTopic: q?.subTopic ?? q?.topic ?? q?.topicName ?? "General",
        difficulty: q?.difficulty ?? "Foundation",
        earned: awardedByAq.get(aq._id as string) ?? 0,
      })
    }

    const maxMarks = questions.reduce((s, q) => s + q.marks, 0)

    const subTopicMap = new Map<
      string,
      {
        topic: string
        subTopic: string
        score: number
        total: number
        questionIds: string[]
      }
    >()
    for (const q of questions) {
      const key = `${q.topic}::${q.subTopic}`
      if (!subTopicMap.has(key)) {
        subTopicMap.set(key, {
          topic: q.topic,
          subTopic: q.subTopic,
          score: 0,
          total: 0,
          questionIds: [],
        })
      }
      const e = subTopicMap.get(key)!
      e.score += q.earned
      e.total += q.marks
      e.questionIds.push(q.id)
    }

    const topicBreakdown = [...subTopicMap.values()]
      .map((e) => {
        const pct = e.total > 0 ? Math.round((e.score / e.total) * 100) : 0
        const status =
          pct > 80 ? "green" : pct >= 50 ? "amber" : "red"
        return {
          topic: e.topic,
          subTopic: e.subTopic,
          score: e.score,
          total: e.total,
          percentage: pct,
          status: status as "green" | "amber" | "red",
          questionIds: e.questionIds,
        }
      })
      .sort((a, b) => a.percentage - b.percentage)

    const totalScore = submission.totalMarksAwarded ?? sheet.score ?? 0
    const percentage =
      maxMarks > 0 ? Math.round((totalScore / maxMarks) * 100) : 0
    const overallStatus =
      percentage > 80 ? "green" : percentage >= 50 ? "amber" : "red"
    const studentName =
      student?.fullName || student?.email?.split("@")[0] || "Student"

    return {
      submissionId: submissionId as string,
      studentId: studentId as string,
      studentName,
      studentEmail: student?.email ?? "",
      assignmentId: assignment._id as string,
      assignmentTitle: assignment.title,
      className: cls?.name ?? "",
      totalScore,
      maxMarks,
      percentage,
      overallStatus: overallStatus as "green" | "amber" | "red",
      topicBreakdown,
    }
  },
})
