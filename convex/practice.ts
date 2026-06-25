import { v } from "convex/values"
import { mutation } from "./_generated/server"
import type { Doc } from "./_generated/dataModel"

/**
 * Generate a shorter, easier "pre-homework" practice test from an existing
 * assessment: for each topic in the source paper, pick an easier question (not
 * already used, renderable), and create a new published `practice` assignment.
 */
export const generateFromAssignment = mutation({
  args: { teacherId: v.id("users"), sourceAssignmentId: v.id("assignments") },
  handler: async (ctx, { teacherId, sourceAssignmentId }) => {
    const src = await ctx.db.get(sourceAssignmentId)
    if (!src) return { error: "not_found" as const }
    if (src.teacherId !== teacherId) return { error: "forbidden" as const }

    const aqs = await ctx.db
      .query("assignmentQuestions")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", sourceAssignmentId))
      .collect()
    const sourceQ = new Set(aqs.map((a) => a.questionId as string))

    const topics: string[] = []
    for (const aq of aqs) {
      const q = await ctx.db.get(aq.questionId)
      const t = q?.topic ?? q?.topicName
      if (t && !topics.includes(t)) topics.push(t)
    }
    if (topics.length === 0) return { error: "no_topics" as const }

    // Easier-first ranking: Foundation < crossover/intermediate < Higher.
    const rank = (d: string) => {
      const x = (d ?? "").toLowerCase()
      if (x.includes("found")) return 0
      if (x.includes("cross") || x.includes("inter")) return 1
      return 2
    }

    const picked: Doc<"questions">[] = []
    for (const topic of topics) {
      if (picked.length >= 6) break
      const cand = (
        await ctx.db
          .query("questions")
          .withIndex("by_topic", (q) => q.eq("topic", topic))
          .collect()
      )
        .filter(
          (q) =>
            !sourceQ.has(q._id as string) &&
            !(q.imageUrl ?? "").includes("supabase.co") &&
            !!q.questionLatex,
        )
        .sort(
          (a, b) =>
            rank(a.difficulty ?? "") - rank(b.difficulty ?? "") ||
            (a.marks ?? 1) - (b.marks ?? 1),
        )
      if (cand[0]) picked.push(cand[0])
    }
    if (picked.length === 0) return { error: "no_questions" as const }

    const totalMarks = picked.reduce((s, q) => s + (q.marks ?? 1), 0)
    const newId = await ctx.db.insert("assignments", {
      classId: src.classId,
      teacherId,
      title: `Pre-Homework: ${src.title}`,
      mode: "practice",
      status: "published",
      dueDate: Date.now() + 3 * 24 * 60 * 60 * 1000,
      totalMarks,
      metadata: { practiceFor: sourceAssignmentId },
    })
    let order = 0
    for (const q of picked) {
      await ctx.db.insert("assignmentQuestions", {
        assignmentId: newId,
        questionId: q._id,
        order: order++,
        marks: q.marks ?? 1,
      })
    }
    return { id: newId as string, questionCount: picked.length, topics }
  },
})
