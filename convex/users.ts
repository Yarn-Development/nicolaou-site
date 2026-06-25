import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

/** Get or create a user record by Clerk ID */
export const getOrCreateUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    fullName: v.optional(v.string()),
    role: v.optional(v.union(v.literal("teacher"), v.literal("student"), v.literal("admin"), v.literal("parent"))),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", args.clerkId))
      .unique()

    if (existing) return existing

    const id = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      fullName: args.fullName,
      role: args.role ?? "teacher",
      onboardingComplete: false,
    })
    return await ctx.db.get(id)
  },
})

/** Get user by email — used by seed scripts to resolve a user ID without auth */
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", q => q.eq("email", args.email))
      .unique()
  },
})

/** Get user by Clerk ID */
export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", args.clerkId))
      .unique()
  },
})

/** Update user profile */
export const updateUser = mutation({
  args: {
    id: v.id("users"),
    fullName: v.optional(v.string()),
    role: v.optional(v.union(v.literal("teacher"), v.literal("student"), v.literal("admin"), v.literal("parent"))),
    onboardingComplete: v.optional(v.boolean()),
    parentEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args
    await ctx.db.patch(id, updates)
    return await ctx.db.get(id)
  },
})

/** Get all students enrolled in classes taught by a teacher */
export const getStudentsForTeacher = query({
  args: { teacherId: v.id("users") },
  handler: async (ctx, args) => {
    const classes = await ctx.db
      .query("classes")
      .withIndex("by_teacher", q => q.eq("teacherId", args.teacherId))
      .collect()

    const enrollments = await Promise.all(
      classes.map(cls =>
        ctx.db.query("enrollments").withIndex("by_class", q => q.eq("classId", cls._id)).collect()
      )
    )

    const studentIds = [...new Set(enrollments.flat().map(e => e.studentId))]
    const students = await Promise.all(studentIds.map(id => ctx.db.get(id)))
    return students.filter(Boolean)
  },
})
