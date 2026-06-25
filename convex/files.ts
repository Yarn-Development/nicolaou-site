import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

/**
 * Convex file storage — replaces the legacy storage buckets
 * (question-images, question-snippets, exam-papers). Clients request an upload
 * URL, POST the file directly, receive a storageId, and resolve a served URL
 * via getUrl. Store the returned storageId on the owning record.
 */

/** Generate a short-lived URL the client POSTs a file to. Returns { uploadUrl }. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const uploadUrl = await ctx.storage.generateUploadUrl()
    return { uploadUrl }
  },
})

/** Resolve a public, served URL for a stored file. */
export const getUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId)
  },
})

/** Delete a stored file. */
export const remove = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    await ctx.storage.delete(storageId)
    return { success: true }
  },
})
