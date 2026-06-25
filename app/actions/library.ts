"use server"

import { getAuthUser } from "@/lib/auth"
import { fetchQuery, api, getConvexUserIdByClerkId } from "@/lib/convex/server"
import type { Id } from "@/convex/_generated/dataModel"
import type { AssignmentType } from "./assignments"
import type { TeacherRevisionListItem } from "./revision-lists"
import { getTeacherRevisionLists } from "./revision-lists"

// =====================================================
// Types
// =====================================================

export type LibraryItemType = "exam" | "shadow_paper" | "revision_list"

export interface LibraryItem {
  id: string
  title: string
  type: LibraryItemType
  created_at: string
  class_name: string
  subject: string
  question_count: number
  total_marks: number
  status: string | null
  /** For revision lists — the parent assignment ID */
  assignment_id: string | null
  /** Source: bank_builder, external_upload, or null for revision lists */
  source_type: string | null
}

// =====================================================
// Helpers
// =====================================================

/** Resolve the signed-in Clerk user to a Convex user id, or null. */
async function currentUserId(): Promise<Id<"users"> | null> {
  const authUser = await getAuthUser()
  if (!authUser?.clerkId) return null
  return getConvexUserIdByClerkId(authUser.clerkId)
}

// =====================================================
// Get Teacher Library
// =====================================================

/**
 * Fetches all resources for the teacher's library.
 * Merges assignments (exams + shadow papers) with revision lists
 * into a unified LibraryItem array sorted by creation date.
 */
export async function getTeacherLibrary(): Promise<{
  success: boolean
  data?: LibraryItem[]
  error?: string
}> {
  const teacherId = await currentUserId()
  if (!teacherId) return { success: false, error: "You must be logged in" }

  try {
    // 1. Fetch assignments with class info and question counts
    const assignments = await fetchQuery(api.library.getTeacherAssignments, {
      teacherId,
    })

    // Transform assignments into library items
    const assignmentItems: LibraryItem[] = assignments.map((a) => ({
      id: a.id,
      title: a.title,
      type: (a.assignmentType as AssignmentType) || "exam",
      created_at: new Date(a.createdAt).toISOString(),
      class_name: a.className || "Unknown",
      subject: a.subject || "Unknown",
      question_count: a.questionCount,
      total_marks: 0, // Marks require a deeper join; we show question count instead
      status: a.status,
      assignment_id: null,
      source_type: a.sourceType || null,
    }))

    // 2. Fetch revision lists
    const revisionResult = await getTeacherRevisionLists()
    const revisionItems: LibraryItem[] = (
      (revisionResult.success ? revisionResult.data : []) as TeacherRevisionListItem[]
    ).map((rl) => ({
      id: rl.id,
      title: rl.title,
      type: "revision_list" as const,
      created_at: rl.created_at,
      class_name: rl.class_name,
      subject: rl.subject,
      question_count: rl.question_count,
      total_marks: 0,
      status: null,
      assignment_id: rl.assignment_id,
      source_type: null,
    }))

    // 3. Merge and sort by created_at descending
    const allItems = [...assignmentItems, ...revisionItems].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    return { success: true, data: allItems }
  } catch (error) {
    console.error("Error in getTeacherLibrary:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
