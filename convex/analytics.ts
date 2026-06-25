import { v } from "convex/values"
import { query } from "./_generated/server"

/**
 * Teacher analytics queries. Aggregates submissions across the teacher's
 * classes. Takes an explicit Convex `users` _id (resolved from the Clerk id in
 * the server action).
 *
 * The server action keeps all of the date-range bucketing / percentage math
 * (so its output shape stays byte-identical); these queries just gather the
 * raw rows it needs in camelCase + ms timestamps.
 */

/** Teacher's classes for the dropdown filter. */
export const getTeacherClasses = query({
  args: { teacherId: v.id("users") },
  handler: async (ctx, { teacherId }) => {
    const classes = await ctx.db
      .query("classes")
      .withIndex("by_teacher", (q) => q.eq("teacherId", teacherId))
      .collect()
    return classes
      .map((c) => ({
        id: c._id,
        name: c.name,
        subject: c.subject ?? "Mathematics",
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  },
})

/**
 * Raw analytics dataset for a teacher (optionally scoped to one class):
 * enrollments, published assignments (with a derived topic), and submissions.
 * The action filters by date range and computes all the stats.
 */
export const getAnalyticsDataset = query({
  args: {
    teacherId: v.id("users"),
    classId: v.optional(v.id("classes")),
  },
  handler: async (ctx, { teacherId, classId }) => {
    const allClasses = await ctx.db
      .query("classes")
      .withIndex("by_teacher", (q) => q.eq("teacherId", teacherId))
      .collect()

    const classes = classId ? allClasses.filter((c) => c._id === classId) : allClasses

    if (classes.length === 0) {
      return { enrollments: [], assignments: [], submissions: [] }
    }

    // Enrollments across the in-scope classes.
    const enrollments: { studentId: string; classId: string; joinedAt: number | null }[] = []
    const assignmentRows: {
      id: string
      classId: string
      title: string
      topic: string
      createdAt: number
    }[] = []
    const submissionRows: {
      id: string
      assignmentId: string
      studentId: string
      score: number | null
      status: string
      submittedAt: number | null
      gradedAt: number | null
    }[] = []

    for (const cls of classes) {
      const classEnrollments = await ctx.db
        .query("enrollments")
        .withIndex("by_class", (q) => q.eq("classId", cls._id))
        .collect()
      for (const e of classEnrollments) {
        enrollments.push({
          studentId: e.studentId,
          classId: e.classId,
          joinedAt: e.joinedAt ?? e._creationTime,
        })
      }

      const classAssignments = await ctx.db
        .query("assignments")
        .withIndex("by_class", (q) => q.eq("classId", cls._id))
        .collect()

      for (const a of classAssignments) {
        if (a.status !== "published") continue

        // Derive a topic from the assignment's questions (most common topic),
        // since Convex assignments don't carry a content.topic field. Falls
        // back to "" so the action's title-based extraction kicks in.
        const aqs = await ctx.db
          .query("assignmentQuestions")
          .withIndex("by_assignment", (q) => q.eq("assignmentId", a._id))
          .collect()
        const topicCounts = new Map<string, number>()
        for (const aq of aqs) {
          const q = await ctx.db.get(aq.questionId)
          const t = q?.topic ?? q?.topicName
          if (t) topicCounts.set(t, (topicCounts.get(t) ?? 0) + 1)
        }
        let topic = ""
        let best = 0
        for (const [t, c] of topicCounts) {
          if (c > best) {
            best = c
            topic = t
          }
        }

        assignmentRows.push({
          id: a._id,
          classId: a.classId,
          title: a.title,
          topic,
          createdAt: a._creationTime,
        })

        const subs = await ctx.db
          .query("submissions")
          .withIndex("by_assignment", (q) => q.eq("assignmentId", a._id))
          .collect()
        for (const s of subs) {
          submissionRows.push({
            id: s._id,
            assignmentId: s.assignmentId,
            studentId: s.studentId,
            score: s.totalMarksAwarded ?? null,
            // Map Convex "marked" → analytics "graded" so the action's
            // existing status checks keep working unchanged.
            status: s.status === "marked" ? "graded" : (s.status ?? "in_progress"),
            submittedAt: s.submittedAt ?? null,
            gradedAt: s.markedAt ?? null,
          })
        }
      }
    }

    return { enrollments, assignments: assignmentRows, submissions: submissionRows }
  },
})
