import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

/** Get or create a submission for a student on an assignment */
export const getOrCreateSubmission = mutation({
  args: {
    assignmentId: v.id("assignments"),
    studentId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("submissions")
      .withIndex("by_assignment_student", q =>
        q.eq("assignmentId", args.assignmentId).eq("studentId", args.studentId)
      )
      .unique()

    if (existing) return existing

    const id = await ctx.db.insert("submissions", {
      assignmentId: args.assignmentId,
      studentId: args.studentId,
      status: "in_progress",
    })
    return await ctx.db.get(id)
  },
})

/** Save/update an answer on a submission (auto-save) */
export const saveAnswer = mutation({
  args: {
    submissionId: v.id("submissions"),
    assignmentQuestionId: v.id("assignmentQuestions"),
    answerText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("submissionAnswers")
      .withIndex("by_submission", q => q.eq("submissionId", args.submissionId))
      .filter(q => q.eq(q.field("assignmentQuestionId"), args.assignmentQuestionId))
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, { answerText: args.answerText })
      return existing._id
    }

    return await ctx.db.insert("submissionAnswers", {
      submissionId: args.submissionId,
      assignmentQuestionId: args.assignmentQuestionId,
      answerText: args.answerText,
    })
  },
})

/** Submit an assignment */
export const submitAssignment = mutation({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.submissionId, {
      status: "submitted",
      submittedAt: Date.now(),
    })
  },
})

/** Get all submissions for an assignment (for teacher marking) */
export const getAssignmentSubmissions = query({
  args: { assignmentId: v.id("assignments") },
  handler: async (ctx, args) => {
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_assignment", q => q.eq("assignmentId", args.assignmentId))
      .collect()

    return await Promise.all(
      submissions.map(async s => {
        const student = await ctx.db.get(s.studentId)
        const answers = await ctx.db
          .query("submissionAnswers")
          .withIndex("by_submission", q => q.eq("submissionId", s._id))
          .collect()
        return { ...s, student, answers }
      })
    )
  },
})

/** Save marks for a submission answer (teacher marking) */
export const markAnswer = mutation({
  args: {
    submissionId: v.id("submissions"),
    assignmentQuestionId: v.id("assignmentQuestions"),
    marksAwarded: v.number(),
    marksMax: v.optional(v.number()),
    teacherComment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("submissionAnswers")
      .withIndex("by_submission", q => q.eq("submissionId", args.submissionId))
      .filter(q => q.eq(q.field("assignmentQuestionId"), args.assignmentQuestionId))
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, {
        marksAwarded: args.marksAwarded,
        marksMax: args.marksMax,
        teacherComment: args.teacherComment,
      })
    } else {
      await ctx.db.insert("submissionAnswers", {
        submissionId: args.submissionId,
        assignmentQuestionId: args.assignmentQuestionId,
        marksAwarded: args.marksAwarded,
        marksMax: args.marksMax,
        teacherComment: args.teacherComment,
      })
    }

    // Recompute total marks
    const allAnswers = await ctx.db
      .query("submissionAnswers")
      .withIndex("by_submission", q => q.eq("submissionId", args.submissionId))
      .collect()

    const total = allAnswers.reduce((sum, a) => sum + (a.marksAwarded ?? 0), 0)
    await ctx.db.patch(args.submissionId, {
      totalMarksAwarded: total,
      status: "marked",
      markedAt: Date.now(),
    })
  },
})
