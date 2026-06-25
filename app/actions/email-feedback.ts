"use server"

import { Resend } from "resend"
import { getAuthUser } from "@/lib/auth"
import { fetchQuery, fetchMutation, api, getConvexUserIdByClerkId } from "@/lib/convex/server"
import type { Id } from "@/convex/_generated/dataModel"
import { generateStudentFeedback, type StudentFeedbackData } from "./feedback"
import { generateFeedbackBuffer } from "@/lib/feedback-pdf"
import { getOrCreateParentToken } from "./parent-portal"

const resend = new Resend(process.env.RESEND_API_KEY)
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

/** Resolve the signed-in Clerk user to a Convex user id, or null. */
async function currentUserId(): Promise<Id<"users"> | null> {
  const authUser = await getAuthUser()
  if (!authUser?.clerkId) return null
  return getConvexUserIdByClerkId(authUser.clerkId)
}

async function generateFeedbackPDFBuffer(feedback: StudentFeedbackData): Promise<Buffer | null> {
  try {
    return await generateFeedbackBuffer(feedback)
  } catch (err) {
    console.error("PDF generation error:", err)
    return null
  }
}

// =====================================================
// Update parent email for a student profile
// =====================================================

export async function updateStudentParentEmail(studentId: string, parentEmail: string): Promise<{
  success: boolean
  error?: string
}> {
  const userId = await currentUserId()
  if (!userId) return { success: false, error: "Not authenticated" }

  const result = await fetchMutation(api.feedback.setStudentParentEmail, {
    studentId: studentId as Id<"users">,
    requesterId: userId,
    parentEmail,
  })

  if ("error" in result) {
    return { success: false, error: "Permission denied" }
  }

  return { success: true }
}

// =====================================================
// Build HTML email body for a feedback sheet
// =====================================================

function buildFeedbackEmailHtml(feedback: StudentFeedbackData, parentPortalUrl?: string): string {
  const ragColour = (pct: number) =>
    pct >= 70 ? "#16a34a" : pct >= 40 ? "#d97706" : "#dc2626"
  const ragLabel = (pct: number) =>
    pct >= 70 ? "Strong" : pct >= 40 ? "Developing" : "Needs Work"

  const topicRows = feedback.topicBreakdown
    .map(t => {
      const pct = Math.round(t.percentage)
      const colour = ragColour(pct)
      return `
        <tr>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:13px;">${t.subTopic || t.topic}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:center;">${t.score}/${t.total}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:center;">
            <span style="background:${colour};color:#fff;padding:2px 8px;border-radius:3px;font-size:12px;font-weight:700;">${ragLabel(pct)}</span>
          </td>
        </tr>`
    })
    .join("")

  const narrative = feedback.aiNarrative
    ? `<div style="background:#f9fafb;border-left:4px solid #111827;padding:14px 18px;margin:20px 0;font-size:14px;line-height:1.6;color:#374151;">
        <strong style="display:block;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#6b7280;margin-bottom:6px;">Teacher's Summary</strong>
        ${feedback.aiNarrative}
      </div>`
    : ""

  const overallPct = Math.round(feedback.percentage)
  const overallColour = ragColour(overallPct)

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border:2px solid #111827;">

    <!-- Header -->
    <div style="background:#111827;padding:24px 28px;">
      <p style="margin:0;color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;font-weight:700;">Nicolaou's Maths</p>
      <h1 style="margin:6px 0 0;color:#fff;font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:-0.02em;">Feedback Report</h1>
    </div>

    <!-- Student / Assignment info -->
    <div style="padding:20px 28px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;gap:16px;">
      <div>
        <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#6b7280;font-weight:700;">Student</p>
        <p style="margin:4px 0 0;font-size:17px;font-weight:900;color:#111827;">${feedback.studentName}</p>
      </div>
      <div>
        <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#6b7280;font-weight:700;">Assessment</p>
        <p style="margin:4px 0 0;font-size:15px;font-weight:700;color:#111827;">${feedback.assignmentTitle}</p>
        <p style="margin:2px 0 0;font-size:12px;color:#6b7280;">${feedback.className}</p>
      </div>
      <div style="text-align:right;">
        <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#6b7280;font-weight:700;">Score</p>
        <p style="margin:4px 0 0;font-size:28px;font-weight:900;color:${overallColour};">${overallPct}%</p>
        <p style="margin:2px 0 0;font-size:12px;color:#6b7280;">${feedback.totalScore} / ${feedback.maxMarks} marks</p>
      </div>
    </div>

    <!-- Narrative -->
    <div style="padding:0 28px;">
      ${narrative}
    </div>

    <!-- Topic breakdown -->
    <div style="padding:0 28px 24px;">
      <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#6b7280;font-weight:700;margin-bottom:10px;">Topic Breakdown</p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;border-bottom:2px solid #e5e7eb;">Topic</th>
            <th style="padding:8px 10px;text-align:center;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;border-bottom:2px solid #e5e7eb;">Marks</th>
            <th style="padding:8px 10px;text-align:center;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;border-bottom:2px solid #e5e7eb;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${topicRows}
        </tbody>
      </table>
    </div>

    <!-- Parent Portal CTA -->
    ${parentPortalUrl ? `
    <div style="padding:16px 28px;background:#eff6ff;border-top:1px solid #bfdbfe;">
      <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#1d4ed8;font-weight:700;">View Online</p>
      <a href="${parentPortalUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;font-size:13px;font-weight:700;text-decoration:none;text-transform:uppercase;letter-spacing:0.05em;">
        Open Full Feedback Report →
      </a>
      <p style="margin:8px 0 0;font-size:11px;color:#6b7280;">
        This link is private — do not share it with others. A PDF copy is also attached to this email.
      </p>
    </div>` : ""}

    <!-- Footer -->
    <div style="padding:16px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">
        Generated ${new Date(feedback.generatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} · Nicolaou&apos;s Maths
      </p>
    </div>
  </div>
</body>
</html>`
}

// =====================================================
// Email feedback to parent for a single student
// =====================================================

export async function emailFeedbackToParent(submissionId: string): Promise<{
  success: boolean
  error?: string
}> {
  const userId = await currentUserId()
  if (!userId) return { success: false, error: "Not authenticated" }

  // Generate feedback data
  const feedbackResult = await generateStudentFeedback(submissionId)
  if (!feedbackResult.success || !feedbackResult.data) {
    return { success: false, error: feedbackResult.error || "Could not generate feedback" }
  }
  const feedback = feedbackResult.data

  // Get parent email from profile
  const parentInfo = await fetchQuery(api.feedback.getStudentParentInfo, {
    studentId: feedback.studentId as Id<"users">,
  })

  if (!parentInfo?.parentEmail) {
    return { success: false, error: `No parent email set for ${feedback.studentName}` }
  }
  const parentEmail = parentInfo.parentEmail

  // Generate parent portal token
  const tokenResult = await getOrCreateParentToken(feedback.studentId)
  const parentPortalUrl = tokenResult.success && tokenResult.token
    ? `${siteUrl}/parent-portal/${tokenResult.token}`
    : undefined

  const html = buildFeedbackEmailHtml(feedback, parentPortalUrl)
  const pdfBuffer = await generateFeedbackPDFBuffer(feedback)

  const filename = `feedback-${feedback.studentName.replace(/\s+/g, "-").toLowerCase()}.pdf`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const emailPayload: any = {
    from: process.env.RESEND_FROM_EMAIL || "Nicolaou's Maths <onboarding@resend.dev>",
    to: parentEmail,
    subject: `${feedback.studentName}'s Feedback — ${feedback.assignmentTitle}`,
    html,
  }

  if (pdfBuffer) {
    emailPayload.attachments = [
      {
        filename,
        content: pdfBuffer,
      },
    ]
  }

  const { error: sendError } = await resend.emails.send(emailPayload)

  if (sendError) {
    console.error("Resend error:", sendError)
    return { success: false, error: "Failed to send email" }
  }

  return { success: true }
}

// =====================================================
// Bulk email feedback for all students in an assignment
// =====================================================

export async function emailFeedbackToAllParents(assignmentId: string): Promise<{
  success: boolean
  sent: number
  skipped: number
  failed: number
  errors: string[]
}> {
  const userId = await currentUserId()
  if (!userId) return { success: false, sent: 0, skipped: 0, failed: 0, errors: ["Not authenticated"] }

  // Verify teacher permission and fetch graded submissions with parent emails
  const result = await fetchQuery(api.feedback.getGradedSubmissionsWithParents, {
    assignmentId: assignmentId as Id<"assignments">,
    teacherId: userId,
  })

  if ("error" in result) {
    return { success: false, sent: 0, skipped: 0, failed: 0, errors: ["Permission denied"] }
  }

  const submissions = result.submissions

  if (!submissions.length) {
    return { success: false, sent: 0, skipped: 0, failed: 0, errors: ["No graded submissions found"] }
  }

  let sent = 0
  let skipped = 0
  let failed = 0
  const errors: string[] = []

  for (const submission of submissions) {
    const parentEmail = submission.parentEmail

    if (!parentEmail) {
      skipped++
      continue
    }

    // Generate feedback
    const feedbackResult = await generateStudentFeedback(submission.submissionId)
    if (!feedbackResult.success || !feedbackResult.data) {
      failed++
      errors.push(`Failed to generate feedback for submission ${submission.submissionId}`)
      continue
    }

    // Generate parent portal link for this student
    const tokenResult = await getOrCreateParentToken(feedbackResult.data.studentId)
    const parentPortalUrl = tokenResult.success && tokenResult.token
      ? `${siteUrl}/parent-portal/${tokenResult.token}`
      : undefined

    const html = buildFeedbackEmailHtml(feedbackResult.data, parentPortalUrl)
    const pdfBuffer = await generateFeedbackPDFBuffer(feedbackResult.data)
    const filename = `feedback-${feedbackResult.data.studentName.replace(/\s+/g, "-").toLowerCase()}.pdf`

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const emailPayload: any = {
      from: process.env.RESEND_FROM_EMAIL || "Nicolaou's Maths <onboarding@resend.dev>",
      to: parentEmail,
      subject: `${feedbackResult.data.studentName}'s Feedback — ${feedbackResult.data.assignmentTitle}`,
      html,
    }

    if (pdfBuffer) {
      emailPayload.attachments = [{ filename, content: pdfBuffer }]
    }

    const { error: sendError } = await resend.emails.send(emailPayload)

    if (sendError) {
      failed++
      errors.push(`Failed to send to ${parentEmail}: ${sendError.message}`)
    } else {
      sent++
    }
  }

  return { success: true, sent, skipped, failed, errors }
}
