"use server"

import { getAuthUser } from "@/lib/auth"
import { fetchQuery, fetchMutation, api, getConvexUserIdByClerkId } from "@/lib/convex/server"
import { revalidatePath } from "next/cache"

// =====================================================
// Demo Data Seeding (Convex-backed)
// =====================================================

/**
 * Seeds demo data for the logged-in teacher: a demo class with 5 students, a
 * mock exam assignment, and graded submissions to showcase the workflow.
 */
export async function seedDemoData(): Promise<{
  success: boolean
  data?: {
    classId: string
    className: string
    assignmentId: string
    studentCount: number
  }
  error?: string
  alreadySeeded?: boolean
}> {
  const authUser = await getAuthUser()
  if (!authUser?.clerkId) {
    return { success: false, error: "You must be logged in to seed demo data" }
  }
  if (authUser.role !== "teacher") {
    return { success: false, error: "Only teachers can seed demo data" }
  }
  const teacherId = await getConvexUserIdByClerkId(authUser.clerkId)
  if (!teacherId) {
    return { success: false, error: "You must be logged in to seed demo data" }
  }

  try {
    const result = await fetchMutation(api.demoData.seed, { teacherId })

    if ("error" in result) {
      return {
        success: false,
        error: "No questions found in the question bank. Please add questions first.",
      }
    }

    if ("alreadySeeded" in result && result.alreadySeeded) {
      return {
        success: true,
        alreadySeeded: true,
        data: {
          classId: result.classId,
          className: result.className,
          assignmentId: "",
          studentCount: result.studentCount,
        },
        error: "Demo data has already been seeded. Check your 'Year 13 Demo' class.",
      }
    }

    revalidatePath("/dashboard")
    revalidatePath("/dashboard/students")
    revalidatePath("/dashboard/marking")
    revalidatePath("/dashboard/assignments")

    return {
      success: true,
      data: {
        classId: result.classId,
        className: result.className,
        assignmentId: String(result.assignmentId),
        studentCount: result.studentCount,
      },
    }
  } catch (error) {
    console.error("Error in seedDemoData:", error)
    return { success: false, error: "An unexpected error occurred while seeding demo data" }
  }
}

/**
 * Removes all demo data for the logged-in teacher.
 */
export async function removeDemoData(): Promise<{ success: boolean; error?: string }> {
  const authUser = await getAuthUser()
  if (!authUser?.clerkId) return { success: false, error: "You must be logged in" }
  const teacherId = await getConvexUserIdByClerkId(authUser.clerkId)
  if (!teacherId) return { success: false, error: "You must be logged in" }

  try {
    const result = await fetchMutation(api.demoData.remove, { teacherId })
    if ("error" in result) {
      return { success: false, error: "No demo data found to remove" }
    }
    revalidatePath("/dashboard")
    revalidatePath("/dashboard/students")
    revalidatePath("/dashboard/marking")
    return { success: true }
  } catch (error) {
    console.error("Error in removeDemoData:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

/**
 * Checks if demo data already exists for the logged-in teacher.
 */
export async function checkDemoDataExists(): Promise<{
  exists: boolean
  classId?: string
  assignmentId?: string
}> {
  const authUser = await getAuthUser()
  if (!authUser?.clerkId) return { exists: false }
  const teacherId = await getConvexUserIdByClerkId(authUser.clerkId)
  if (!teacherId) return { exists: false }

  const result = await fetchQuery(api.demoData.checkExists, { teacherId })
  if (!result.exists) return { exists: false }
  return {
    exists: true,
    classId: result.classId,
    assignmentId: result.assignmentId ? String(result.assignmentId) : undefined,
  }
}
