"use server"

import { revalidatePath } from "next/cache"
import { Resend } from "resend"
import { getAuthUser } from "@/lib/auth"
import { fetchMutation, api, getConvexUserIdByClerkId } from "@/lib/convex/server"
import type { Id } from "@/convex/_generated/dataModel"

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Nicolaou's Maths <onboarding@resend.dev>"

export interface InviteRow {
  name: string
  email: string
}

export interface BulkInviteResult {
  enrolled: number
  invited: number
  already_enrolled: number
  errors: { email: string; reason: string }[]
}

export async function bulkInviteStudents(
  classId: string,
  students: InviteRow[]
): Promise<{ success: boolean; data?: BulkInviteResult; error?: string }> {
  const authUser = await getAuthUser()
  if (!authUser?.clerkId) return { success: false, error: "Not authenticated" }
  const teacherId = await getConvexUserIdByClerkId(authUser.clerkId)
  if (!teacherId) return { success: false, error: "Not authenticated" }

  try {
    const res = await fetchMutation(api.classInvites.bulkInvite, {
      teacherId,
      classId: classId as Id<"classes">,
      students: students.map((s) => ({ name: s.name, email: s.email })),
    })

    if ("error" in res) {
      return { success: false, error: "Class not found or access denied" }
    }

    const result: BulkInviteResult = {
      enrolled: res.enrolled,
      invited: res.invited,
      already_enrolled: res.alreadyEnrolled,
      errors: res.errors,
    }

    // Send invite emails for students who didn't already have a profile.
    if (process.env.RESEND_API_KEY) {
      for (const target of res.toEmail) {
        try {
          await resend.emails.send({
            from: FROM_EMAIL,
            to: target.email,
            subject: `You've been added to ${res.className} on Nicolaou's Maths`,
            html: buildInviteEmailHtml({
              studentName: target.name,
              className: res.className,
              joinCode: res.joinCode,
            }),
          })
        } catch (err) {
          result.errors.push({ email: target.email, reason: String(err) })
        }
      }
    }

    revalidatePath("/dashboard/students")
    return { success: true, data: result }
  } catch (err) {
    console.error("Error in bulkInviteStudents:", err)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// Called during onboarding / sign-in to auto-enroll students who were invited
export async function acceptPendingInvites(): Promise<void> {
  const authUser = await getAuthUser()
  if (!authUser?.clerkId || !authUser.email) return
  const studentId = await getConvexUserIdByClerkId(authUser.clerkId)
  if (!studentId) return

  try {
    await fetchMutation(api.classInvites.acceptPending, {
      studentId,
      email: authUser.email,
    })
  } catch (err) {
    console.error("Error in acceptPendingInvites:", err)
  }
}

function buildInviteEmailHtml({
  studentName,
  className,
  joinCode,
}: {
  studentName: string
  className: string
  joinCode: string
}): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nicolaou-site.vercel.app"
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Class Invite</title></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
  <div style="border-bottom: 3px solid #1a1a1a; padding-bottom: 16px; margin-bottom: 24px;">
    <h1 style="font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; margin: 0;">
      NICOLAOU'S MATHS
    </h1>
  </div>

  <p style="font-size: 16px;">Hi ${studentName},</p>
  <p>Your teacher has added you to <strong>${className}</strong> on Nicolaou's Maths.</p>

  <div style="border: 2px solid #1a1a1a; padding: 20px; margin: 24px 0; text-align: center;">
    <p style="font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 8px;">
      YOUR JOIN CODE
    </p>
    <p style="font-size: 36px; font-weight: 900; letter-spacing: 0.2em; margin: 0;">${joinCode}</p>
  </div>

  <p>Sign in at <a href="${appUrl}/login" style="color: #e53e3e;">${appUrl}/login</a> with your Google account, then enter the join code above.</p>
  <p>If you already have an account, you may have been enrolled automatically.</p>

  <div style="border-top: 1px solid #e2e8f0; margin-top: 32px; padding-top: 16px;">
    <p style="font-size: 12px; color: #718096; margin: 0;">Nicolaou's Maths — Winchmore Hill School</p>
  </div>
</body>
</html>
  `.trim()
}
