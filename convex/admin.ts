import { v } from "convex/values"
import { query, mutation } from "./_generated/server"

/**
 * Admin user-management queries/mutations. All take an explicit Convex `users`
 * _id (resolved from the Clerk id in the server action) rather than reading
 * from ctx.auth.
 */

/** List all users (admin/teacher only). Returns rows the admin table maps onto. */
export const listUsers = query({
  args: { actorId: v.id("users") },
  handler: async (ctx, { actorId }) => {
    const actor = await ctx.db.get(actorId)
    if (!actor || (actor.role !== "admin" && actor.role !== "teacher")) {
      return { error: "forbidden" as const }
    }

    const users = await ctx.db.query("users").collect()
    const rows = users
      .map((u) => ({
        id: u._id,
        email: u.email,
        fullName: u.fullName ?? null,
        role: u.role,
        institution: u.schoolDomain ?? null,
        onboardingComplete: u.onboardingComplete ?? false,
        createdAt: u._creationTime,
      }))
      .sort((a, b) => b.createdAt - a.createdAt)

    return { users: rows }
  },
})

/** Change a user's role (admin only). */
export const setUserRole = mutation({
  args: {
    actorId: v.id("users"),
    targetUserId: v.id("users"),
    newRole: v.union(v.literal("student"), v.literal("teacher"), v.literal("admin")),
  },
  handler: async (ctx, { actorId, targetUserId, newRole }) => {
    const actor = await ctx.db.get(actorId)
    if (!actor || actor.role !== "admin") {
      return { error: "forbidden" as const }
    }
    if (actorId === targetUserId) {
      return { error: "self" as const }
    }
    await ctx.db.patch(targetUserId, { role: newRole })
    return { ok: true as const }
  },
})

/** Remove a user (admin only). Deletes the Convex users row. */
export const deleteUser = mutation({
  args: {
    actorId: v.id("users"),
    targetUserId: v.id("users"),
  },
  handler: async (ctx, { actorId, targetUserId }) => {
    const actor = await ctx.db.get(actorId)
    if (!actor || actor.role !== "admin") {
      return { error: "forbidden" as const }
    }
    if (actorId === targetUserId) {
      return { error: "self" as const }
    }
    await ctx.db.delete(targetUserId)
    return { ok: true as const }
  },
})

/**
 * Create a placeholder user record for an invited user (admin/teacher only).
 * The invitee completes onboarding when they sign in. Returns an error if a
 * user with that email already exists. `clerkId` is left as a placeholder
 * (the invite token) until the real Clerk id is bound at sign-in.
 */
export const inviteUser = mutation({
  args: {
    actorId: v.id("users"),
    email: v.string(),
    fullName: v.string(),
    role: v.union(v.literal("student"), v.literal("teacher")),
  },
  handler: async (ctx, { actorId, email, fullName, role }) => {
    const actor = await ctx.db.get(actorId)
    if (!actor || (actor.role !== "admin" && actor.role !== "teacher")) {
      return { error: "forbidden" as const }
    }

    const normalizedEmail = email.toLowerCase()
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .unique()
    if (existing) {
      return { error: "exists" as const }
    }

    await ctx.db.insert("users", {
      clerkId: `invite:${normalizedEmail}`,
      email: normalizedEmail,
      fullName,
      role,
      onboardingComplete: false,
      schoolDomain: actor.schoolDomain,
    })

    return { ok: true as const, institution: actor.schoolDomain ?? null }
  },
})
