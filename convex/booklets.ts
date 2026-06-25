import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

/** Create a booklet job */
export const createBookletJob = mutation({
  args: {
    teacherId: v.id("users"),
    classId: v.id("classes"),
    bankFilter: v.any(),
    unusedCount: v.optional(v.number()),
    totalInScope: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const thirtyDays = Date.now() + 30 * 24 * 60 * 60 * 1000
    return await ctx.db.insert("bookletJobs", {
      ...args,
      status: "generating",
      expiresAt: thirtyDays,
    })
  },
})

/** Update booklet job status */
export const updateBookletJob = mutation({
  args: {
    jobId: v.id("bookletJobs"),
    status: v.union(
      v.literal("pending"),
      v.literal("generating"),
      v.literal("done"),
      v.literal("failed")
    ),
    pdfUrl: v.optional(v.string()),
    errorLog: v.optional(v.string()),
    unusedCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { jobId, ...updates } = args
    await ctx.db.patch(jobId, {
      ...updates,
      completedAt: args.status === "done" || args.status === "failed" ? Date.now() : undefined,
    })
  },
})

/** Get booklet jobs for a teacher */
export const getTeacherBookletJobs = query({
  args: { teacherId: v.id("users") },
  handler: async (ctx, args) => {
    const jobs = await ctx.db
      .query("bookletJobs")
      .withIndex("by_teacher", q => q.eq("teacherId", args.teacherId))
      .order("desc")
      .take(20)

    return await Promise.all(
      jobs.map(async j => {
        const cls = await ctx.db.get(j.classId)
        return { ...j, className: cls?.name }
      })
    )
  },
})

/** Get a single booklet job */
export const getBookletJob = query({
  args: { jobId: v.id("bookletJobs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId)
  },
})
