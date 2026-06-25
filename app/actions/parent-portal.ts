"use server"

import { getAuthUser } from "@/lib/auth"
import { fetchQuery, fetchMutation, api, getConvexUserIdByClerkId } from "@/lib/convex/server"
import type { Id } from "@/convex/_generated/dataModel"
import type { StudentFeedbackData } from "./feedback"

// =====================================================
// Get or create a parent access token for a student
// (teacher-facing — called when emailing feedback)
// =====================================================

export async function getOrCreateParentToken(studentId: string): Promise<{
  success: boolean
  token?: string
  error?: string
}> {
  const authUser = await getAuthUser()
  if (!authUser?.clerkId) return { success: false, error: "Not authenticated" }
  const teacherId = await getConvexUserIdByClerkId(authUser.clerkId)
  if (!teacherId) return { success: false, error: "Not authenticated" }

  try {
    const result = await fetchMutation(api.parentPortal.getOrCreateToken, {
      teacherId,
      studentId: studentId as Id<"users">,
    })
    if ("error" in result) {
      return { success: false, error: "Permission denied" }
    }
    return { success: true, token: result.token }
  } catch (error) {
    console.error("Error in getOrCreateParentToken:", error)
    return { success: false, error: "Failed to create token" }
  }
}

// =====================================================
// Resolve a parent token to student data
// (public — no auth required, token IS the credential)
// =====================================================

export async function resolveParentToken(token: string): Promise<{
  success: boolean
  studentId?: string
  studentName?: string
  error?: string
}> {
  try {
    const result = await fetchQuery(api.parentPortal.resolveToken, { token })
    if ("error" in result) {
      return { success: false, error: "Invalid or expired link" }
    }
    return { success: true, studentId: result.studentId, studentName: result.studentName }
  } catch (error) {
    console.error("Error in resolveParentToken:", error)
    return { success: false, error: "Invalid or expired link" }
  }
}

// =====================================================
// Get all published feedback sheets for a student
// (parent view — accessed via token)
// =====================================================

export interface ParentPortalData {
  studentName: string
  feedbackSheets: {
    submissionId: string
    assignmentTitle: string
    className: string
    totalScore: number
    maxMarks: number
    percentage: number
    generatedAt: string
    status: "green" | "amber" | "red"
  }[]
}

export async function getParentPortalData(token: string): Promise<{
  success: boolean
  data?: ParentPortalData
  error?: string
}> {
  try {
    const result = await fetchQuery(api.parentPortal.getPortalData, { token })
    if ("error" in result) {
      return { success: false, error: "Invalid token" }
    }

    return {
      success: true,
      data: {
        studentName: result.studentName,
        feedbackSheets: result.feedbackSheets.map((s) => ({
          submissionId: s.submissionId,
          assignmentTitle: s.assignmentTitle,
          className: s.className,
          totalScore: s.totalScore,
          maxMarks: s.maxMarks,
          percentage: s.percentage,
          generatedAt: new Date(s.generatedAt).toISOString(),
          status: s.status,
        })),
      },
    }
  } catch (error) {
    console.error("Error in getParentPortalData:", error)
    return { success: false, error: "Failed to fetch data" }
  }
}

// =====================================================
// Get full feedback for a specific submission (parent view)
// =====================================================

export async function getParentFeedbackDetail(
  token: string,
  submissionId: string
): Promise<{
  success: boolean
  data?: StudentFeedbackData
  error?: string
}> {
  try {
    const result = await fetchQuery(api.parentPortal.getFeedbackDetail, {
      token,
      submissionId: submissionId as Id<"submissions">,
    })

    if ("error" in result) {
      if (result.error === "invalid") return { success: false, error: "Invalid or expired link" }
      if (result.error === "not_available") return { success: false, error: "Feedback not available" }
      return { success: false, error: "Submission not found" }
    }

    return {
      success: true,
      data: {
        submissionId: result.submissionId,
        studentId: result.studentId,
        studentName: result.studentName,
        studentEmail: result.studentEmail,
        assignmentId: result.assignmentId,
        assignmentTitle: result.assignmentTitle,
        className: result.className,
        totalScore: result.totalScore,
        maxMarks: result.maxMarks,
        percentage: result.percentage,
        overallStatus: result.overallStatus,
        topicBreakdown: result.topicBreakdown,
        revisionPack: [],
        generatedAt: new Date().toISOString(),
      },
    }
  } catch (error) {
    console.error("Error in getParentFeedbackDetail:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
