import { v } from "convex/values"
import { query, mutation } from "./_generated/server"

/**
 * Question-audit queries/mutations for the admin audit tool. Reads/updates the
 * `questions` table. All take an explicit Convex `users` _id (resolved from the
 * Clerk id in the server action).
 *
 * `is_suspect` detection stays in the server action (pure string heuristic);
 * these functions just surface the raw question rows and apply patches.
 */

/**
 * Paginated list of questions for audit, newest first, with optional filters.
 * Returns rows mapped onto the camelCase fields the server action expects.
 */
export const listQuestions = query({
  args: {
    contentType: v.optional(v.string()), // "all" or a specific type
    verifiedStatus: v.optional(v.string()), // "all" | "verified" | "unverified"
    search: v.optional(v.string()),
    limit: v.number(),
    offset: v.number(),
  },
  handler: async (ctx, { contentType, verifiedStatus, search, limit, offset }) => {
    // Newest-first: _creationTime descending.
    let all = await ctx.db.query("questions").order("desc").collect()

    if (contentType && contentType !== "all") {
      all = all.filter((q) => q.contentType === contentType)
    }
    if (verifiedStatus === "verified") {
      all = all.filter((q) => q.isVerified === true)
    } else if (verifiedStatus === "unverified") {
      all = all.filter((q) => !q.isVerified)
    }
    if (search) {
      const needle = search.toLowerCase()
      all = all.filter((q) => {
        return (
          (q.questionLatex ?? "").toLowerCase().includes(needle) ||
          (q.topic ?? "").toLowerCase().includes(needle) ||
          (q.topicName ?? "").toLowerCase().includes(needle)
        )
      })
    }

    const total = all.length
    const page = all.slice(offset, offset + limit)

    const rows = page.map((q) => ({
      id: q._id,
      questionLatex: q.questionLatex ?? null,
      imageUrl: q.imageUrl ?? null,
      contentType: q.contentType ?? "generated_text",
      topic: q.topic ?? null,
      topicName: q.topicName ?? null,
      subTopicName: q.subTopic ?? null,
      difficulty: q.difficulty ?? null,
      marks: q.marks ?? null,
      questionType: q.questionType ?? null,
      calculatorAllowed: q.calculatorAllowed ?? null,
      answerKey: (q.answerKey as Record<string, unknown> | null) ?? null,
      isVerified: q.isVerified ?? false,
      createdAt: q._creationTime,
      createdBy: (q.createdBy as string | null) ?? null,
    }))

    return { questions: rows, total }
  },
})

/** Get a single question's audit-relevant fields (for regenerate/fix-formatting). */
export const getQuestion = query({
  args: { id: v.id("questions") },
  handler: async (ctx, { id }) => {
    const q = await ctx.db.get(id)
    if (!q) return null
    return {
      id: q._id,
      questionLatex: q.questionLatex ?? null,
      answerKey: (q.answerKey as Record<string, unknown> | null) ?? null,
      // `curriculum_level` does not exist in the Convex schema — difficulty is the
      // closest equivalent and the action falls back to it.
      difficulty: q.difficulty ?? null,
      topic: q.topic ?? null,
      topicName: q.topicName ?? null,
      subTopicName: q.subTopic ?? null,
      marks: q.marks ?? null,
      questionType: q.questionType ?? null,
      calculatorAllowed: q.calculatorAllowed ?? null,
    }
  },
})

/** Patch a question's latex and/or answer key. */
export const updateQuestion = mutation({
  args: {
    id: v.id("questions"),
    questionLatex: v.optional(v.string()),
    answerKey: v.optional(v.any()),
    isVerified: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, questionLatex, answerKey, isVerified }) => {
    const patch: Record<string, unknown> = {}
    if (questionLatex !== undefined) patch.questionLatex = questionLatex
    if (answerKey !== undefined) patch.answerKey = answerKey
    if (isVerified !== undefined) patch.isVerified = isVerified
    await ctx.db.patch(id, patch)
    return { ok: true as const }
  },
})

/** Delete a question. */
export const deleteQuestion = mutation({
  args: { id: v.id("questions") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id)
    return { ok: true as const }
  },
})

/** Toggle a question's verification flag. */
export const setVerified = mutation({
  args: { id: v.id("questions"), isVerified: v.boolean() },
  handler: async (ctx, { id, isVerified }) => {
    await ctx.db.patch(id, { isVerified })
    return { ok: true as const }
  },
})
