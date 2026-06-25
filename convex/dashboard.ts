import { v } from "convex/values"
import { query } from "./_generated/server"
import type { QueryCtx } from "./_generated/server"
import type { Id } from "./_generated/dataModel"

/**
 * Teacher-facing dashboard read queries. Every query takes an explicit Convex
 * `users` _id (resolved from the Clerk id in the server action) — never ctx.auth.
 *
 * All timestamps are returned as raw ms numbers (or null) and converted to ISO
 * strings in the server action layer. Field names here are camelCase; the action
 * maps them back to the snake_case / ISO shapes the client expects.
 *
 * Schema mapping notes:
 *  - legacy `profiles` -> Convex `users`
 *  - `submissions.score` -> `totalMarksAwarded`
 *  - `submissions.graded_at` -> `markedAt`
 *  - status 'graded' -> 'marked'
 *  - `feedback_released` column does not exist -> derived from a published
 *    feedbackSheet (isPublished) for the submission.
 *  - assignments have no created_at/updated_at -> use `_creationTime`.
 */

/** Load a teacher's classes (newest first by creation time). */
async function getTeacherClasses(
  ctx: QueryCtx,
  teacherId: Id<"users">,
) {
  const classes = await ctx.db
    .query("classes")
    .withIndex("by_teacher", (q) => q.eq("teacherId", teacherId))
    .collect()
  return classes.sort((a, b) => b._creationTime - a._creationTime)
}

/** Whether a submission has a published feedback sheet. */
async function isFeedbackReleased(
  ctx: QueryCtx,
  submissionId: Id<"submissions">,
): Promise<boolean> {
  const sheet = await ctx.db
    .query("feedbackSheets")
    .withIndex("by_submission", (q) => q.eq("submissionId", submissionId))
    .first()
  return !!sheet?.isPublished
}

/**
 * Comprehensive dashboard payload: classes, enrollments (+ student profiles),
 * assignments, and submissions for the teacher. The action computes stats,
 * recent activity, and the class overview from these rows.
 */
export const getTeacherDashboard = query({
  args: { teacherId: v.id("users") },
  handler: async (ctx, { teacherId }) => {
    const classes = await getTeacherClasses(ctx, teacherId)

    if (classes.length === 0) {
      return {
        classes: [],
        enrollments: [],
        students: [],
        assignments: [],
        submissions: [],
      }
    }

    // Enrollments across all the teacher's classes.
    const enrollments = []
    for (const cls of classes) {
      const classEnrollments = await ctx.db
        .query("enrollments")
        .withIndex("by_class", (q) => q.eq("classId", cls._id))
        .collect()
      for (const e of classEnrollments) {
        enrollments.push({
          studentId: e.studentId as string,
          classId: e.classId as string,
          joinedAt: e.joinedAt ?? e._creationTime,
        })
      }
    }

    // Unique student profiles.
    const uniqueStudentIds = [...new Set(enrollments.map((e) => e.studentId))]
    const students = []
    for (const sid of uniqueStudentIds) {
      const u = await ctx.db.get(sid as Id<"users">)
      if (u) {
        students.push({
          id: u._id as string,
          email: u.email ?? "",
          fullName: u.fullName ?? null,
        })
      }
    }

    // Assignments across all classes (newest first).
    const assignments = []
    for (const cls of classes) {
      const classAssignments = await ctx.db
        .query("assignments")
        .withIndex("by_class", (q) => q.eq("classId", cls._id))
        .collect()
      for (const a of classAssignments) {
        const aqs = await ctx.db
          .query("assignmentQuestions")
          .withIndex("by_assignment", (q) => q.eq("assignmentId", a._id))
          .collect()
        let maxMarks = aqs.reduce((sum, aq) => sum + (aq.marks ?? 1), 0)
        if (maxMarks === 0 && a.totalMarks) maxMarks = a.totalMarks
        assignments.push({
          id: a._id as string,
          classId: a.classId as string,
          title: a.title,
          status: a.status ?? "draft",
          dueDate: a.dueDate ?? null,
          maxMarks,
          createdAt: a._creationTime,
          updatedAt: a._creationTime,
        })
      }
    }
    assignments.sort((a, b) => b.createdAt - a.createdAt)

    // Submissions for those assignments (newest submitted first).
    const submissions = []
    for (const a of assignments) {
      const subs = await ctx.db
        .query("submissions")
        .withIndex("by_assignment", (q) =>
          q.eq("assignmentId", a.id as Id<"assignments">),
        )
        .collect()
      for (const s of subs) {
        const score = s.totalMarksAwarded ?? null
        const percentage =
          score !== null && a.maxMarks > 0 ? Math.round((score / a.maxMarks) * 100) : null
        submissions.push({
          id: s._id as string,
          assignmentId: s.assignmentId as string,
          studentId: s.studentId as string,
          score,
          percentage,
          status: s.status ?? "in_progress",
          submittedAt: s.submittedAt ?? null,
          gradedAt: s.markedAt ?? null,
          feedbackReleased: await isFeedbackReleased(ctx, s._id),
        })
      }
    }
    submissions.sort((a, b) => (b.submittedAt ?? 0) - (a.submittedAt ?? 0))

    return {
      classes: classes.map((c) => ({
        id: c._id as string,
        name: c.name,
        subject: c.subject ?? "Mathematics",
        createdAt: c._creationTime,
      })),
      enrollments,
      students,
      assignments,
      submissions,
    }
  },
})

/**
 * Graded submissions (with marked timestamp) over the teacher's classes, used
 * for the weekly performance chart. Returns score + gradedAt (ms).
 */
export const getPerformanceSubmissions = query({
  args: { teacherId: v.id("users") },
  handler: async (ctx, { teacherId }) => {
    const classes = await getTeacherClasses(ctx, teacherId)
    if (classes.length === 0) return []

    const rows: { score: number; gradedAt: number }[] = []
    for (const cls of classes) {
      const assignments = await ctx.db
        .query("assignments")
        .withIndex("by_class", (q) => q.eq("classId", cls._id))
        .collect()
      for (const a of assignments) {
        const subs = await ctx.db
          .query("submissions")
          .withIndex("by_assignment", (q) => q.eq("assignmentId", a._id))
          .collect()
        for (const s of subs) {
          if (s.status !== "marked") continue
          if (s.totalMarksAwarded == null) continue
          if (s.markedAt == null) continue
          rows.push({ score: s.totalMarksAwarded, gradedAt: s.markedAt })
        }
      }
    }
    return rows.sort((a, b) => a.gradedAt - b.gradedAt)
  },
})

/**
 * Published assignments for the teacher with enrollment + submission counts,
 * used by recent-assignments, upcoming-tasks, and attention-queue views.
 * Returns the richest superset so the action can derive each shape.
 */
export const getPublishedAssignmentsWithCounts = query({
  args: { teacherId: v.id("users") },
  handler: async (ctx, { teacherId }) => {
    const classes = await getTeacherClasses(ctx, teacherId)
    if (classes.length === 0) return []

    // Enrollment count per class.
    const enrollmentCount = new Map<string, number>()
    for (const cls of classes) {
      const es = await ctx.db
        .query("enrollments")
        .withIndex("by_class", (q) => q.eq("classId", cls._id))
        .collect()
      enrollmentCount.set(cls._id as string, es.length)
    }

    const rows = []
    for (const cls of classes) {
      const assignments = await ctx.db
        .query("assignments")
        .withIndex("by_class", (q) => q.eq("classId", cls._id))
        .collect()
      for (const a of assignments) {
        if (a.status !== "published") continue

        const subs = await ctx.db
          .query("submissions")
          .withIndex("by_assignment", (q) => q.eq("assignmentId", a._id))
          .collect()

        const submissions = []
        for (const s of subs) {
          submissions.push({
            id: s._id as string,
            status: s.status ?? "in_progress",
            score: s.totalMarksAwarded ?? null,
            submittedAt: s.submittedAt ?? null,
            feedbackReleased: await isFeedbackReleased(ctx, s._id),
          })
        }

        rows.push({
          id: a._id as string,
          title: a.title,
          classId: a.classId as string,
          className: cls.name,
          dueDate: a.dueDate ?? null,
          status: a.status ?? "draft",
          createdAt: a._creationTime,
          enrollmentCount: enrollmentCount.get(cls._id as string) ?? 0,
          submissions,
        })
      }
    }
    // Newest first by creation time.
    return rows.sort((a, b) => b.createdAt - a.createdAt)
  },
})

/**
 * Most recently created/updated assignments (any status) for the activity feed,
 * with total + graded submission counts. Limited to the latest 5.
 */
export const getRecentAssignmentActivity = query({
  args: { teacherId: v.id("users") },
  handler: async (ctx, { teacherId }) => {
    const classes = await getTeacherClasses(ctx, teacherId)
    if (classes.length === 0) return []

    const classNameById = new Map(classes.map((c) => [c._id as string, c.name]))

    const all = []
    for (const cls of classes) {
      const assignments = await ctx.db
        .query("assignments")
        .withIndex("by_class", (q) => q.eq("classId", cls._id))
        .collect()
      for (const a of assignments) {
        all.push({
          id: a._id,
          title: a.title,
          classId: a.classId as string,
          status: a.status ?? "draft",
          createdAt: a._creationTime,
          updatedAt: a._creationTime,
        })
      }
    }
    // No updatedAt column -> order by creation time (proxy for updated_at).
    all.sort((a, b) => b.updatedAt - a.updatedAt)
    const top = all.slice(0, 5)

    const rows = []
    for (const a of top) {
      const subs = await ctx.db
        .query("submissions")
        .withIndex("by_assignment", (q) => q.eq("assignmentId", a.id))
        .collect()
      const submissionCount = subs.length
      const gradedCount = subs.filter((s) => s.status === "marked").length
      rows.push({
        id: a.id as string,
        title: a.title,
        className: classNameById.get(a.classId) ?? "Unknown Class",
        status: a.status,
        submissionCount,
        gradedCount,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      })
    }
    return rows
  },
})
