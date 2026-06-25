/**
 * Server-side Convex helpers for Next.js server actions.
 * Uses fetchQuery/fetchMutation from convex/nextjs — no auth token required
 * because our Convex functions accept userId as an explicit argument rather
 * than reading from ctx.auth.
 *
 * This is a utility module (not a "use server" file).
 * Only import this from server-side code (actions, route handlers, server components).
 */

import { fetchQuery, fetchMutation } from "convex/nextjs"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

export { fetchQuery, fetchMutation, api }
export type { Id }

/**
 * Resolve the Convex user ID for a given Clerk ID.
 * Returns null if the user hasn't been migrated yet.
 */
export async function getConvexUserIdByClerkId(clerkId: string): Promise<Id<"users"> | null> {
  try {
    const user = await fetchQuery(api.users.getUserByClerkId, { clerkId })
    return user ? (user._id as Id<"users">) : null
  } catch {
    return null
  }
}
