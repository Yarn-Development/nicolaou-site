import { v } from "convex/values"
import { query } from "./_generated/server"

/**
 * Teacher library aggregations.
 *
 * Takes an explicit Convex `users` _id (resolved from the Clerk id in the
 * server action) rather than reading ctx.auth.
 */

/**
 * All assignments owned by the teacher (exams + shadow papers), with class
 * info and a question count. Sorted newest-first. The server action merges
 * these with revision lists into the unified LibraryItem array.
 */
export const getTeacherAssignments = query({
  args: { teacherId: v.id("users") },
  handler: async (ctx, { teacherId }) => {
    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_teacher", (q) => q.eq("teacherId", teacherId))
      .collect()

    const rows = []
    for (const a of assignments) {
      const cls = await ctx.db.get(a.classId)

      const aqs = await ctx.db
        .query("assignmentQuestions")
        .withIndex("by_assignment", (q) => q.eq("assignmentId", a._id))
        .collect()

      rows.push({
        id: a._id,
        title: a.title,
        assignmentType: a.assignmentType ?? "exam",
        sourceType: a.sourceType ?? null,
        status: a.status ?? null,
        createdAt: a._creationTime,
        className: cls?.name ?? "Unknown",
        subject: cls?.subject ?? "Unknown",
        questionCount: aqs.length,
      })
    }

    rows.sort((a, b) => b.createdAt - a.createdAt)
    return rows
  },
})
