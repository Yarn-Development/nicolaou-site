"use server"

import { revalidatePath } from "next/cache"
import { getAuthUser } from "@/lib/auth"
import { fetchQuery, fetchMutation, api, getConvexUserIdByClerkId } from "@/lib/convex/server"
import type { Id } from "@/convex/_generated/dataModel"

// Types
export type Class = {
  id: string
  teacher_id: string
  name: string
  subject: string
  join_code: string
  created_at: string
  updated_at: string
  student_count?: number
}

export type ClassStudent = {
  id: string
  email: string
  full_name: string | null
  parent_email: string | null
  joined_at: string
}

export type Enrollment = {
  id: string
  class_id: string
  student_id: string
  joined_at: string
}

const toIso = (ms: number | null | undefined): string | null =>
  ms == null ? null : new Date(ms).toISOString()

// =====================================================
// Teacher Actions
// =====================================================

/**
 * Creates a new class for the logged-in teacher.
 */
export async function createClass(name: string, subject: string = "Maths") {
  const authUser = await getAuthUser()
  if (!authUser?.clerkId) {
    return { success: false, error: "You must be logged in to create a class" }
  }
  if (authUser.role !== "teacher") {
    return { success: false, error: "Only teachers can create classes" }
  }

  const teacherId = await getConvexUserIdByClerkId(authUser.clerkId)
  if (!teacherId) {
    return { success: false, error: "You must be logged in to create a class" }
  }

  try {
    const classId = await fetchMutation(api.classes.createClass, {
      teacherId,
      name: name.trim(),
      subject: subject.trim(),
    })

    const cls = await fetchQuery(api.classes.getClass, { classId, teacherId })

    revalidatePath("/dashboard")
    revalidatePath("/dashboard/students")

    const data: Class = {
      id: classId,
      teacher_id: teacherId,
      name: cls?.name ?? name.trim(),
      subject: cls?.subject ?? subject.trim(),
      join_code: cls?.joinCode ?? "",
      created_at: toIso(cls?._creationTime) ?? new Date().toISOString(),
      updated_at: toIso(cls?._creationTime) ?? new Date().toISOString(),
      student_count: 0,
    }
    return { success: true, data }
  } catch (error) {
    console.error("Error creating class:", error)
    return { success: false, error: "Failed to create class. Please try again." }
  }
}

/**
 * Gets all classes owned by the logged-in teacher.
 */
export async function getClassList() {
  const authUser = await getAuthUser()
  if (!authUser?.clerkId) {
    return { success: false, error: "You must be logged in" }
  }
  const teacherId = await getConvexUserIdByClerkId(authUser.clerkId)
  if (!teacherId) {
    return { success: false, error: "You must be logged in" }
  }

  try {
    const classes = await fetchQuery(api.classes.getTeacherClassesWithCounts, { teacherId })
    const mapped: Class[] = classes.map((cls) => ({
      id: cls._id,
      teacher_id: cls.teacherId,
      name: cls.name,
      subject: cls.subject ?? "Maths",
      join_code: cls.joinCode ?? "",
      created_at: toIso(cls._creationTime) ?? new Date().toISOString(),
      updated_at: toIso(cls._creationTime) ?? new Date().toISOString(),
      student_count: cls.studentCount ?? 0,
    }))
    return { success: true, data: mapped }
  } catch (error) {
    console.error("Error fetching classes:", error)
    return { success: false, error: "Failed to fetch classes" }
  }
}

/**
 * Gets the list of students enrolled in a specific class
 */
export async function getClassStudents(classId: string) {
  const authUser = await getAuthUser()
  if (!authUser?.clerkId) {
    return { success: false, error: "You must be logged in" }
  }
  const teacherId = await getConvexUserIdByClerkId(authUser.clerkId)
  if (!teacherId) {
    return { success: false, error: "You must be logged in" }
  }

  try {
    const result = await fetchQuery(api.classes.getClassStudentsDetailed, {
      classId: classId as Id<"classes">,
      teacherId,
    })

    if ("error" in result) {
      return {
        success: false,
        error:
          result.error === "forbidden"
            ? "You don't have permission to view this class"
            : "Class not found",
      }
    }

    const students: ClassStudent[] = result.students.map((s) => ({
      id: s.id,
      email: s.email,
      full_name: s.fullName,
      parent_email: null,
      joined_at: toIso(s.joinedAt) ?? new Date().toISOString(),
    }))

    return { success: true, data: students }
  } catch (error) {
    console.error("Error fetching students:", error)
    return { success: false, error: "Failed to fetch students" }
  }
}

/**
 * Deletes a class (only if owned by current teacher)
 */
export async function deleteClass(classId: string) {
  const authUser = await getAuthUser()
  if (!authUser?.clerkId) {
    return { success: false, error: "You must be logged in" }
  }
  const teacherId = await getConvexUserIdByClerkId(authUser.clerkId)
  if (!teacherId) {
    return { success: false, error: "You must be logged in" }
  }

  try {
    const result = await fetchMutation(api.classes.deleteClass, {
      classId: classId as Id<"classes">,
      teacherId,
    })
    if (result && "error" in result) {
      return { success: false, error: "Failed to delete class" }
    }
  } catch (error) {
    console.error("Error deleting class:", error)
    return { success: false, error: "Failed to delete class" }
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/students")

  return { success: true }
}

/**
 * Removes a student from a class
 */
export async function removeStudentFromClass(classId: string, studentId: string) {
  const authUser = await getAuthUser()
  if (!authUser?.clerkId) {
    return { success: false, error: "You must be logged in" }
  }
  const teacherId = await getConvexUserIdByClerkId(authUser.clerkId)
  if (!teacherId) {
    return { success: false, error: "You must be logged in" }
  }

  try {
    const result = await fetchMutation(api.classes.removeStudentFromClass, {
      classId: classId as Id<"classes">,
      studentId: studentId as Id<"users">,
      teacherId,
    })
    if (result && "error" in result) {
      return { success: false, error: "You don't have permission to modify this class" }
    }
  } catch (error) {
    console.error("Error removing student:", error)
    return { success: false, error: "Failed to remove student" }
  }

  revalidatePath("/dashboard/students")

  return { success: true }
}

// =====================================================
// Student Actions
// =====================================================

/**
 * Allows a student to join a class using a join code
 */
export async function joinClass(code: string) {
  const authUser = await getAuthUser()
  if (!authUser?.clerkId) {
    return { success: false, error: "You must be logged in to join a class" }
  }
  if (authUser.role !== "student") {
    return { success: false, error: "Only students can join classes" }
  }
  const studentId = await getConvexUserIdByClerkId(authUser.clerkId)
  if (!studentId) {
    return { success: false, error: "You must be logged in to join a class" }
  }

  const joinCode = code.trim().toUpperCase()

  try {
    const foundClass = await fetchQuery(api.classes.getClassByJoinCode, { joinCode })
    if (!foundClass) {
      return { success: false, error: "Invalid join code. Please check and try again." }
    }

    // Check if already enrolled
    const enrolled = await fetchQuery(api.classes.getStudentClassesDetailed, { studentId })
    if (enrolled.some((c) => c.id === foundClass._id)) {
      return { success: false, error: "You are already enrolled in this class" }
    }

    await fetchMutation(api.classes.enrollStudent, {
      classId: foundClass._id,
      studentId,
    })

    revalidatePath("/dashboard")

    return {
      success: true,
      data: {
        id: foundClass._id,
        name: foundClass.name,
        subject: foundClass.subject ?? "Maths",
        teacher_id: foundClass.teacherId,
      },
    }
  } catch (error) {
    console.error("Error joining class:", error)
    return { success: false, error: "Failed to join class. Please try again." }
  }
}

/**
 * Gets all classes the logged-in student is enrolled in
 */
export async function getEnrolledClasses() {
  const authUser = await getAuthUser()
  if (!authUser?.clerkId) {
    return { success: false, error: "You must be logged in" }
  }
  const studentId = await getConvexUserIdByClerkId(authUser.clerkId)
  if (!studentId) {
    return { success: false, error: "You must be logged in" }
  }

  try {
    const classes = await fetchQuery(api.classes.getStudentClassesDetailed, { studentId })
    const data = classes.map((c) => ({
      id: c.id,
      name: c.name,
      subject: c.subject,
      teacher_id: c.teacherId,
      joined_at: toIso(c.joinedAt) ?? new Date().toISOString(),
    }))
    return { success: true, data }
  } catch (error) {
    console.error("Error fetching enrolled classes:", error)
    return { success: false, error: "Failed to fetch classes" }
  }
}

/**
 * Allows a student to leave a class
 */
export async function leaveClass(classId: string) {
  const authUser = await getAuthUser()
  if (!authUser?.clerkId) {
    return { success: false, error: "You must be logged in" }
  }
  const studentId = await getConvexUserIdByClerkId(authUser.clerkId)
  if (!studentId) {
    return { success: false, error: "You must be logged in" }
  }

  try {
    await fetchMutation(api.classes.unenrollStudent, {
      classId: classId as Id<"classes">,
      studentId,
    })
  } catch (error) {
    console.error("Error leaving class:", error)
    return { success: false, error: "Failed to leave class" }
  }

  revalidatePath("/dashboard")
  revalidatePath("/student-dashboard")
  return { success: true }
}
