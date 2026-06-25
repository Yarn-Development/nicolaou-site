"use server"

import { getAuthUser, createProfileForClerkUser } from "@/lib/auth"
import { fetchQuery, fetchMutation, api, getConvexUserIdByClerkId } from "@/lib/convex/server"
import { revalidatePath } from "next/cache"

export interface OnboardingInput {
  role: "teacher" | "student"
  fullName: string
  institution?: string
}

export interface OnboardingResult {
  success: boolean
  error?: string
  redirectTo?: string
}

/**
 * Complete onboarding for the signed-in Clerk user.
 * Creates or updates the Convex `users` record.
 */
export async function completeOnboarding(input: OnboardingInput): Promise<OnboardingResult> {
  const authUser = await getAuthUser()
  if (!authUser || !authUser.clerkId) return { success: false, error: "Not authenticated" }

  if (authUser.isNewUser) {
    // Brand-new Clerk user — create a fresh Convex user record.
    const result = await createProfileForClerkUser({
      clerkId: authUser.clerkId,
      email: authUser.email ?? "",
      fullName: input.fullName,
      role: input.role,
    })
    if (!result) return { success: false, error: "Failed to create profile" }
  } else {
    // Existing Convex user — update in place.
    const convexUserId = await getConvexUserIdByClerkId(authUser.clerkId)
    if (!convexUserId) return { success: false, error: "User record not found" }

    await fetchMutation(api.users.updateUser, {
      id: convexUserId,
      fullName: input.fullName,
      role: input.role,
      onboardingComplete: true,
    })
  }

  revalidatePath("/onboarding")
  revalidatePath("/dashboard")
  revalidatePath("/student-dashboard")

  const redirectTo = input.role === "teacher" ? "/dashboard" : "/student-dashboard"
  return { success: true, redirectTo }
}

/**
 * Get onboarding state — called by the onboarding page.
 */
export async function getOnboardingState(): Promise<{
  initialRole: "teacher" | "student" | null
  roleSource: "pending" | "auto_detected" | "self_selected" | "admin_assigned"
  email: string | null
  fullName: string | null
}> {
  const authUser = await getAuthUser()
  if (!authUser) return { initialRole: null, roleSource: "pending", email: null, fullName: null }

  if (authUser.isNewUser || !authUser.clerkId) {
    // New Clerk user — no Convex record yet
    return { initialRole: null, roleSource: "pending", email: authUser.email, fullName: null }
  }

  // Look up existing Convex user
  const user = await fetchQuery(api.users.getUserByClerkId, { clerkId: authUser.clerkId })

  return {
    initialRole: user?.role === "teacher" || user?.role === "student" ? user.role : null,
    roleSource: user?.onboardingComplete ? "self_selected" : "pending",
    email: authUser.email,
    fullName: user?.fullName ?? null,
  }
}
