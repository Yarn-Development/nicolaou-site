"use server"

import { revalidatePath } from "next/cache"
import { getAuthUser } from "@/lib/auth"
import { fetchQuery, fetchMutation, api, getConvexUserIdByClerkId } from "@/lib/convex/server"
import type { Id } from "@/convex/_generated/dataModel"

export type ResourceType = "video_link" | "pdf" | "note" | "link"

export interface ClassResource {
  id: string
  teacher_id: string
  class_id: string | null
  title: string
  type: ResourceType
  url: string | null
  description: string | null
  topic_tags: string[]
  created_at: string
}

export interface CreateResourceInput {
  class_id?: string
  title: string
  type: ResourceType
  url?: string
  description?: string
  topic_tags?: string[]
}

// =====================================================
// Create
// =====================================================

export async function createResource(input: CreateResourceInput): Promise<{
  success: boolean
  data?: ClassResource
  error?: string
}> {
  const authUser = await getAuthUser()
  if (!authUser?.clerkId) return { success: false, error: "Not authenticated" }
  const teacherId = await getConvexUserIdByClerkId(authUser.clerkId)
  if (!teacherId) return { success: false, error: "Not authenticated" }

  try {
    const result = await fetchMutation(api.resources.create, {
      teacherId,
      classId: input.class_id ? (input.class_id as Id<"classes">) : undefined,
      title: input.title,
      resourceType: input.type,
      url: input.url || undefined,
      description: input.description || undefined,
      topicTags: input.topic_tags || [],
    })

    if ("error" in result) {
      return {
        success: false,
        error:
          result.error === "class_required"
            ? "A class is required"
            : "Failed to create resource",
      }
    }

    revalidatePath("/dashboard/library")
    return {
      success: true,
      data: {
        id: result.id,
        teacher_id: result.teacherId,
        class_id: result.classId ?? null,
        title: result.title,
        type: result.resourceType as ResourceType,
        url: result.url,
        description: result.description,
        topic_tags: result.topicTags,
        created_at: new Date(result.createdAt).toISOString(),
      },
    }
  } catch (error) {
    console.error("Error in createResource:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// =====================================================
// Read
// =====================================================

export async function getTeacherResources(classId?: string): Promise<{
  success: boolean
  data?: ClassResource[]
  error?: string
}> {
  const authUser = await getAuthUser()
  if (!authUser?.clerkId) return { success: false, error: "Not authenticated" }
  const teacherId = await getConvexUserIdByClerkId(authUser.clerkId)
  if (!teacherId) return { success: false, error: "Not authenticated" }

  try {
    const rows = await fetchQuery(api.resources.getForTeacher, {
      teacherId,
      classId: classId ? (classId as Id<"classes">) : undefined,
    })
    const data: ClassResource[] = rows.map((r) => ({
      id: r.id,
      teacher_id: r.teacherId,
      class_id: r.classId ?? null,
      title: r.title,
      type: r.resourceType as ResourceType,
      url: r.url,
      description: r.description,
      topic_tags: r.topicTags,
      created_at: new Date(r.createdAt).toISOString(),
    }))
    return { success: true, data }
  } catch (error) {
    console.error("Error in getTeacherResources:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function getStudentResources(classIds: string[]): Promise<{
  success: boolean
  data?: ClassResource[]
  error?: string
}> {
  if (classIds.length === 0) return { success: true, data: [] }

  try {
    const rows = await fetchQuery(api.resources.getForClasses, {
      classIds: classIds as Id<"classes">[],
    })
    const data: ClassResource[] = rows.map((r) => ({
      id: r.id,
      teacher_id: r.teacherId,
      class_id: r.classId ?? null,
      title: r.title,
      type: r.resourceType as ResourceType,
      url: r.url,
      description: r.description,
      topic_tags: r.topicTags,
      created_at: new Date(r.createdAt).toISOString(),
    }))
    return { success: true, data }
  } catch (error) {
    console.error("Error fetching student resources:", error)
    return { success: false, error: "Failed to load resources" }
  }
}

// =====================================================
// Delete
// =====================================================

export async function deleteResource(resourceId: string): Promise<{
  success: boolean
  error?: string
}> {
  const authUser = await getAuthUser()
  if (!authUser?.clerkId) return { success: false, error: "Not authenticated" }
  const teacherId = await getConvexUserIdByClerkId(authUser.clerkId)
  if (!teacherId) return { success: false, error: "Not authenticated" }

  try {
    const result = await fetchMutation(api.resources.remove, {
      teacherId,
      resourceId: resourceId as Id<"classResources">,
    })
    if ("error" in result) {
      return { success: false, error: "Resource not found" }
    }
    revalidatePath("/dashboard/library")
    return { success: true }
  } catch (error) {
    console.error("Error in deleteResource:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
