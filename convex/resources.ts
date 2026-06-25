import { v } from "convex/values"
import { query, mutation } from "./_generated/server"

/** Class resources for a set of classes (used by the student dashboard). */
export const getForClasses = query({
  args: { classIds: v.array(v.id("classes")) },
  handler: async (ctx, { classIds }) => {
    const all = []
    for (const classId of classIds) {
      const rows = await ctx.db
        .query("classResources")
        .withIndex("by_class", (q) => q.eq("classId", classId))
        .collect()
      all.push(...rows)
    }
    return all
      .map((r) => ({
        id: r._id,
        teacherId: r.teacherId,
        classId: r.classId,
        title: r.title,
        resourceType: r.resourceType ?? "link",
        url: r.url ?? null,
        description: r.description ?? null,
        topicTags: r.topicTags ?? [],
        createdAt: r._creationTime,
      }))
      .sort((a, b) => b.createdAt - a.createdAt)
  },
})

/** Resources owned by a teacher, optionally filtered to a single class. */
export const getForTeacher = query({
  args: {
    teacherId: v.id("users"),
    classId: v.optional(v.id("classes")),
  },
  handler: async (ctx, { teacherId, classId }) => {
    const rows = await ctx.db
      .query("classResources")
      .withIndex("by_teacher", (q) => q.eq("teacherId", teacherId))
      .collect()

    return rows
      .filter((r) => (classId ? r.classId === classId : true))
      .map((r) => ({
        id: r._id,
        teacherId: r.teacherId,
        classId: r.classId,
        title: r.title,
        resourceType: r.resourceType ?? "link",
        url: r.url ?? null,
        description: r.description ?? null,
        topicTags: r.topicTags ?? [],
        createdAt: r._creationTime,
      }))
      .sort((a, b) => b.createdAt - a.createdAt)
  },
})

/** Create a class resource owned by the calling teacher. */
export const create = mutation({
  args: {
    teacherId: v.id("users"),
    classId: v.optional(v.id("classes")),
    title: v.string(),
    resourceType: v.string(),
    url: v.optional(v.string()),
    description: v.optional(v.string()),
    topicTags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    if (!args.classId) return { error: "class_required" as const }
    const id = await ctx.db.insert("classResources", {
      classId: args.classId,
      teacherId: args.teacherId,
      title: args.title,
      resourceType: args.resourceType,
      url: args.url,
      description: args.description,
      topicTags: args.topicTags ?? [],
    })
    const r = await ctx.db.get(id)
    if (!r) return { error: "not_found" as const }
    return {
      id: r._id,
      teacherId: r.teacherId,
      classId: r.classId,
      title: r.title,
      resourceType: r.resourceType ?? "link",
      url: r.url ?? null,
      description: r.description ?? null,
      topicTags: r.topicTags ?? [],
      createdAt: r._creationTime,
    }
  },
})

/** Delete a resource, only if owned by the calling teacher. */
export const remove = mutation({
  args: {
    teacherId: v.id("users"),
    resourceId: v.id("classResources"),
  },
  handler: async (ctx, { teacherId, resourceId }) => {
    const r = await ctx.db.get(resourceId)
    if (!r || r.teacherId !== teacherId) return { error: "not_found" as const }
    await ctx.db.delete(resourceId)
    return { ok: true as const }
  },
})
