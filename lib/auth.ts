/**
 * Unified auth utility.
 * Clerk issues the session; user/profile data lives in Convex (the legacy SQL
 * backend has been retired). We resolve the signed-in Clerk user to a Convex
 * `users` record by `clerkId` — the reliable, unique lookup the rest of the
 * server actions already use via `getConvexUserIdByClerkId`.
 */

import { fetchQuery, fetchMutation, api } from "@/lib/convex/server"

export type AuthUser = {
  id: string                  // Convex user _id (or Clerk ID for brand-new users)
  email: string | null
  role?: string
  clerkId?: string            // Present when Clerk is active
  isNewUser?: boolean         // True when no Convex user record exists yet
  onboardingComplete?: boolean
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const hasClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  if (!hasClerk) return null

  try {
    const { auth, currentUser } = await import("@clerk/nextjs/server")
    const { userId } = await auth()
    if (!userId) return null

    const clerkUser = await currentUser()
    const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? null

    // Resolve the Convex user by Clerk ID (unique fast path for returning users).
    const user = await fetchQuery(api.users.getUserByClerkId, { clerkId: userId })

    if (user) {
      return {
        id: user._id,
        email: user.email ?? email,
        role: user.role,
        clerkId: userId,
        isNewUser: false,
        onboardingComplete: user.onboardingComplete ?? false,
      }
    }

    // Brand-new Clerk user — no Convex record yet. Onboarding will create one.
    return {
      id: userId,
      email,
      clerkId: userId,
      isNewUser: true,
      onboardingComplete: false,
    }
  } catch {
    return null
  }
}

/**
 * Create (or fetch) a Convex user for a Clerk user completing onboarding and
 * mark onboarding complete. Returns the Convex user _id.
 */
export async function createProfileForClerkUser(params: {
  clerkId: string
  email: string
  fullName: string
  role: "teacher" | "student"
}): Promise<{ id: string } | null> {
  try {
    const user = await fetchMutation(api.users.getOrCreateUser, {
      clerkId: params.clerkId,
      email: params.email,
      fullName: params.fullName,
      role: params.role,
    })
    if (!user) return null

    await fetchMutation(api.users.updateUser, {
      id: user._id,
      fullName: params.fullName,
      role: params.role,
      onboardingComplete: true,
    })

    return { id: user._id }
  } catch {
    return null
  }
}

/**
 * Get the auth user in API route handlers.
 */
export async function getRouteAuthUser(): Promise<AuthUser | null> {
  // Same logic — `auth()` from Clerk works in both Server Components and Route Handlers
  return getAuthUser()
}
