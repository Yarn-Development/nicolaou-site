import { v } from "convex/values"
import { query, mutation } from "./_generated/server"

/**
 * Saved / starred questions per teacher.
 *
 * All functions take an explicit Convex `users` _id (resolved from the Clerk id
 * in the server action) rather than reading ctx.auth.
 *
 * Note: the legacy `saved_questions` table had `folder` and `notes`
 * columns. The Convex `savedQuestions` schema does not, so the server action
 * defaults folder to "General" and notes to null when mapping the return shape.
 */

/** Save a question to a teacher's bank (insert if not already saved). */
export const saveQuestion = mutation({
  args: {
    userId: v.id("users"),
    questionId: v.id("questions"),
  },
  handler: async (ctx, { userId, questionId }) => {
    const existing = await ctx.db
      .query("savedQuestions")
      .withIndex("by_user_question", (q) =>
        q.eq("userId", userId).eq("questionId", questionId),
      )
      .unique()

    if (existing) return existing._id

    return await ctx.db.insert("savedQuestions", {
      userId,
      questionId,
      savedAt: Date.now(),
    })
  },
})

/** Remove a saved question from a teacher's bank. */
export const unsaveQuestion = mutation({
  args: {
    userId: v.id("users"),
    questionId: v.id("questions"),
  },
  handler: async (ctx, { userId, questionId }) => {
    const existing = await ctx.db
      .query("savedQuestions")
      .withIndex("by_user_question", (q) =>
        q.eq("userId", userId).eq("questionId", questionId),
      )
      .unique()

    if (existing) await ctx.db.delete(existing._id)
    return null
  },
})

/** All saved questions for a teacher, joined with question data. */
export const getSavedQuestions = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const saved = await ctx.db
      .query("savedQuestions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect()

    // Most-recent first (savedAt, falling back to creation time).
    saved.sort(
      (a, b) =>
        (b.savedAt ?? b._creationTime) - (a.savedAt ?? a._creationTime),
    )

    const rows = []
    for (const s of saved) {
      const q = await ctx.db.get(s.questionId)
      rows.push({
        id: s._id,
        questionId: s.questionId,
        savedAt: s.savedAt ?? s._creationTime,
        questionLatex: q?.questionLatex ?? "",
        topic: q?.topic ?? q?.topicName ?? "",
        subTopic: q?.subTopic ?? "",
        difficulty: q?.difficulty ?? "",
        marks: q?.marks ?? 0,
        contentType: q?.contentType ?? "generated_text",
      })
    }
    return rows
  },
})

/** Whether a specific question is saved by the teacher. */
export const isQuestionSaved = query({
  args: {
    userId: v.id("users"),
    questionId: v.id("questions"),
  },
  handler: async (ctx, { userId, questionId }) => {
    const existing = await ctx.db
      .query("savedQuestions")
      .withIndex("by_user_question", (q) =>
        q.eq("userId", userId).eq("questionId", questionId),
      )
      .unique()
    return !!existing
  },
})

/** All saved question IDs for a teacher (for bulk checking). */
export const getSavedQuestionIds = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const saved = await ctx.db
      .query("savedQuestions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect()
    return saved.map((s) => s.questionId)
  },
})
