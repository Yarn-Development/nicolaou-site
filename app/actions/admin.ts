"use server"

import { getAuthUser } from "@/lib/auth"
import { fetchQuery, fetchMutation, api, getConvexUserIdByClerkId } from "@/lib/convex/server"
import type { Id } from "@/convex/_generated/dataModel"
import { revalidatePath } from "next/cache"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Nicolaou's Maths <onboarding@resend.dev>"

export interface AdminUser {
  id: string
  email: string
  full_name: string | null
  role: "student" | "teacher" | "admin"
  institution: string | null
  onboarding_completed: boolean
  created_at: string
}

/** Resolve the signed-in Clerk user to a Convex user id, or null. */
async function currentUserId(): Promise<Id<"users"> | null> {
  const authUser = await getAuthUser()
  if (!authUser?.clerkId) return null
  return getConvexUserIdByClerkId(authUser.clerkId)
}

export async function getAdminUsers(): Promise<{
  users: AdminUser[]
  error?: string
}> {
  const actorId = await currentUserId()
  if (!actorId) return { users: [], error: "Not authenticated" }

  try {
    const result = await fetchQuery(api.admin.listUsers, { actorId })
    if ("error" in result) {
      return { users: [], error: "Insufficient permissions" }
    }
    const users: AdminUser[] = result.users.map((u) => ({
      id: u.id,
      email: u.email,
      full_name: u.fullName,
      role: u.role as "student" | "teacher" | "admin",
      institution: u.institution,
      onboarding_completed: u.onboardingComplete,
      created_at: new Date(u.createdAt).toISOString(),
    }))
    return { users }
  } catch (error) {
    console.error("Error in getAdminUsers:", error)
    return { users: [], error: "An unexpected error occurred" }
  }
}

export async function updateUserRole(
  targetUserId: string,
  newRole: "student" | "teacher" | "admin"
): Promise<{ success: boolean; error?: string }> {
  const actorId = await currentUserId()
  if (!actorId) return { success: false, error: "Not authenticated" }

  try {
    const result = await fetchMutation(api.admin.setUserRole, {
      actorId,
      targetUserId: targetUserId as Id<"users">,
      newRole,
    })
    if ("error" in result) {
      if (result.error === "self") return { success: false, error: "Cannot change your own role" }
      return { success: false, error: "Only admins can change roles" }
    }
  } catch (error) {
    console.error("Error in updateUserRole:", error)
    return { success: false, error: "Failed to update role" }
  }

  revalidatePath("/dashboard/admin")
  return { success: true }
}

export async function removeUser(
  targetUserId: string
): Promise<{ success: boolean; error?: string }> {
  const actorId = await currentUserId()
  if (!actorId) return { success: false, error: "Not authenticated" }

  try {
    const result = await fetchMutation(api.admin.deleteUser, {
      actorId,
      targetUserId: targetUserId as Id<"users">,
    })
    if ("error" in result) {
      if (result.error === "self") return { success: false, error: "Cannot remove yourself" }
      return { success: false, error: "Only admins can remove users" }
    }
  } catch (error) {
    console.error("Error in removeUser:", error)
    return { success: false, error: "Failed to remove user" }
  }

  revalidatePath("/dashboard/admin")
  return { success: true }
}

export async function inviteUser(
  email: string,
  name: string,
  role: "student" | "teacher"
): Promise<{ success: boolean; error?: string }> {
  const actorId = await currentUserId()
  if (!actorId) return { success: false, error: "Not authenticated" }

  try {
    const result = await fetchMutation(api.admin.inviteUser, {
      actorId,
      email,
      fullName: name,
      role,
    })
    if ("error" in result) {
      if (result.error === "exists") {
        return { success: false, error: "A user with this email already exists" }
      }
      return { success: false, error: "Insufficient permissions" }
    }
  } catch (error) {
    console.error("Error in inviteUser:", error)
    return { success: false, error: "Failed to invite user" }
  }

  // Send invitation email
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "You've been invited to Nicolaou's Maths",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>You've been invited to Nicolaou's Maths</h2>
          <p>Hi ${name},</p>
          <p>You've been invited to join Nicolaou's Maths as a <strong>${role}</strong>.</p>
          <p>Sign in with your Google account at the link below to get started:</p>
          <p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://nicolaousmaths.vercel.app'}/sign-in"
               style="background: #0a0a0a; color: white; padding: 12px 24px; text-decoration: none; display: inline-block; margin: 16px 0;">
              Sign In to Nicolaou's Maths
            </a>
          </p>
          <p style="color: #666; font-size: 14px;">If you didn't expect this invitation, you can ignore this email.</p>
        </div>
      `,
    })
  } catch {
    // Email failure is non-fatal — profile was created
  }

  revalidatePath("/dashboard/admin")
  return { success: true }
}
