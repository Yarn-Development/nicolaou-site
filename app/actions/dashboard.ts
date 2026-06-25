"use server"

import { getAuthUser } from "@/lib/auth"
import { fetchQuery, api, getConvexUserIdByClerkId } from "@/lib/convex/server"
import type { Id } from "@/convex/_generated/dataModel"

// =====================================================
// Types
// =====================================================

export interface DashboardStats {
  totalStudents: number
  activeStudents: number
  totalClasses: number
  pendingAssignments: number
  needsGrading: number
  averageScore: number
  // Comparison with previous period
  studentChange: number
  classChange: number
  scoreChange: number
}

export interface RecentActivityItem {
  id: string
  type: "submission" | "enrollment" | "assignment"
  studentName: string
  studentEmail: string
  description: string
  timestamp: string
  metadata?: {
    score?: number
    className?: string
    assignmentTitle?: string
  }
}

export interface ClassOverview {
  id: string
  name: string
  subject: string
  studentCount: number
  assignmentCount: number
  averageScore: number
  recentActivity: string | null
}

export interface DashboardData {
  stats: DashboardStats
  recentActivity: RecentActivityItem[]
  classOverview: ClassOverview[]
  hasData: boolean
}

// =====================================================
// Helpers
// =====================================================

/** Resolve the signed-in Clerk user to a Convex user id, or null. */
async function currentTeacherId(): Promise<Id<"users"> | null> {
  const authUser = await getAuthUser()
  if (!authUser?.clerkId) return null
  return getConvexUserIdByClerkId(authUser.clerkId)
}

const toIso = (ms: number | null | undefined): string | null =>
  ms == null ? null : new Date(ms).toISOString()

// =====================================================
// Main Dashboard Data Fetching
// =====================================================

/**
 * Fetches comprehensive dashboard data for the teacher
 * Returns real data if available, otherwise indicates no data
 */
export async function getDashboardData(): Promise<{
  success: boolean
  data?: DashboardData
  error?: string
}> {
  const teacherId = await currentTeacherId()
  if (!teacherId) {
    return {
      success: false,
      error: "You must be logged in to view dashboard",
    }
  }

  try {
    const payload = await fetchQuery(api.dashboard.getTeacherDashboard, {
      teacherId,
    })

    const { classes, enrollments, students, assignments, submissions } = payload

    // No classes = no data
    if (classes.length === 0) {
      return {
        success: true,
        data: {
          stats: {
            totalStudents: 0,
            activeStudents: 0,
            totalClasses: 0,
            pendingAssignments: 0,
            needsGrading: 0,
            averageScore: 0,
            studentChange: 0,
            classChange: 0,
            scoreChange: 0,
          },
          recentActivity: [],
          classOverview: [],
          hasData: false,
        },
      }
    }

    const totalClasses = classes.length

    // Student counts
    const uniqueStudentIds = [...new Set(enrollments.map((e) => e.studentId))]
    const totalStudents = uniqueStudentIds.length

    // Profile lookup map
    const profileMap = new Map(students.map((s) => [s.id, s]))

    // Pending assignments (published + not past due)
    const pendingAssignments = assignments.filter(
      (a) =>
        a.status === "published" &&
        (!a.dueDate || a.dueDate >= Date.now())
    ).length

    // Grading stats
    const needsGrading = submissions.filter(
      (s) => s.status === "submitted" && s.score === null
    ).length

    // Average score from graded submissions
    const gradedSubmissions = submissions.filter(
      (s) => s.status === "marked" && s.score !== null
    )
    const averageScore =
      gradedSubmissions.length > 0
        ? Math.round(
            gradedSubmissions.reduce((sum, s) => sum + (s.score || 0), 0) /
              gradedSubmissions.length
          )
        : 0

    // Active students (submitted in last 30 days)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    const activeStudents = new Set(
      submissions
        .filter((s) => s.submittedAt != null && s.submittedAt >= thirtyDaysAgo)
        .map((s) => s.studentId)
    ).size

    // =====================================================
    // Build recent activity
    // =====================================================
    const recentActivity: RecentActivityItem[] = []

    // Add recent submissions (submissions already sorted newest-first)
    const recentSubmissions = submissions.slice(0, 5)
    for (const sub of recentSubmissions) {
      const assignment = assignments.find((a) => a.id === sub.assignmentId)
      const student = profileMap.get(sub.studentId)

      if (student && assignment) {
        recentActivity.push({
          id: `submission-${sub.id}`,
          type: "submission",
          studentName: student.fullName || "Unknown Student",
          studentEmail: student.email,
          description:
            sub.status === "marked"
              ? `Graded: ${assignment.title}`
              : `Submitted: ${assignment.title}`,
          timestamp: toIso(sub.submittedAt) ?? new Date().toISOString(),
          metadata: {
            score: sub.score ?? undefined,
            assignmentTitle: assignment.title,
          },
        })
      }
    }

    // Add recent enrollments
    const recentEnrollments = [...enrollments]
      .sort((a, b) => b.joinedAt - a.joinedAt)
      .slice(0, 3)

    for (const enrollment of recentEnrollments) {
      const student = profileMap.get(enrollment.studentId)
      const classInfo = classes.find((c) => c.id === enrollment.classId)

      if (student && classInfo) {
        recentActivity.push({
          id: `enrollment-${enrollment.studentId}-${enrollment.classId}`,
          type: "enrollment",
          studentName: student.fullName || "Unknown Student",
          studentEmail: student.email,
          description: `Joined: ${classInfo.name}`,
          timestamp: toIso(enrollment.joinedAt) ?? new Date().toISOString(),
          metadata: {
            className: classInfo.name,
          },
        })
      }
    }

    // Sort by timestamp
    recentActivity.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    // =====================================================
    // Build class overview
    // =====================================================
    const classOverview: ClassOverview[] = classes.map((cls) => {
      const classEnrollments = enrollments.filter((e) => e.classId === cls.id)
      const classAssignments = assignments.filter((a) => a.classId === cls.id)
      const classAssignmentIds = classAssignments.map((a) => a.id)
      const classSubmissions = submissions.filter(
        (s) =>
          classAssignmentIds.includes(s.assignmentId) &&
          s.status === "marked" &&
          s.score !== null
      )

      const classAvgScore =
        classSubmissions.length > 0
          ? Math.round(
              classSubmissions.reduce((sum, s) => sum + (s.score || 0), 0) /
                classSubmissions.length
            )
          : 0

      // Find most recent activity for this class
      const lastActivity = submissions
        .filter((s) => classAssignmentIds.includes(s.assignmentId))
        .sort((a, b) => (b.submittedAt ?? 0) - (a.submittedAt ?? 0))[0]
        ?.submittedAt

      return {
        id: cls.id,
        name: cls.name,
        subject: cls.subject,
        studentCount: classEnrollments.length,
        assignmentCount: classAssignments.length,
        averageScore: classAvgScore,
        recentActivity: toIso(lastActivity),
      }
    })

    // =====================================================
    // Determine if we have meaningful data
    // =====================================================
    const hasData = totalStudents > 0 || totalClasses > 0

    return {
      success: true,
      data: {
        stats: {
          totalStudents,
          activeStudents,
          totalClasses,
          pendingAssignments,
          needsGrading,
          averageScore,
          studentChange: 0, // Would need historical data
          classChange: 0,
          scoreChange: 0,
        },
        recentActivity: recentActivity.slice(0, 10),
        classOverview,
        hasData,
      },
    }
  } catch (error) {
    console.error("Error in getDashboardData:", error)
    return {
      success: false,
      error: "An unexpected error occurred while fetching dashboard data",
    }
  }
}

/**
 * Quick stats only - lighter query for header/summary display
 */
export async function getDashboardStats(): Promise<{
  success: boolean
  data?: DashboardStats
  error?: string
}> {
  const result = await getDashboardData()

  if (!result.success || !result.data) {
    return {
      success: result.success,
      error: result.error,
    }
  }

  return {
    success: true,
    data: result.data.stats,
  }
}

// =====================================================
// Performance Chart Data
// =====================================================

export interface PerformanceDataPoint {
  week: string
  average: number
}

/**
 * Fetches weekly average scores for the performance chart
 * Groups submissions by week and calculates average score per week
 */
export async function getPerformanceData(): Promise<{
  success: boolean
  data?: PerformanceDataPoint[]
  error?: string
}> {
  const teacherId = await currentTeacherId()
  if (!teacherId) {
    return { success: false, error: "You must be logged in" }
  }

  try {
    const allSubmissions = await fetchQuery(
      api.dashboard.getPerformanceSubmissions,
      { teacherId }
    )

    // Filter to the last 6 weeks (matches previous gte graded_at behaviour)
    const sixWeeksAgo = Date.now() - 42 * 24 * 60 * 60 * 1000
    const submissions = allSubmissions.filter((s) => s.gradedAt >= sixWeeksAgo)

    if (submissions.length === 0) {
      return { success: true, data: [] }
    }

    // Group submissions by week
    const weeklyData = new Map<number, { total: number; count: number }>()

    for (const sub of submissions) {
      // Calculate week number (0-5 for last 6 weeks)
      const weeksDiff = Math.floor(
        (Date.now() - sub.gradedAt) / (7 * 24 * 60 * 60 * 1000)
      )
      const weekNum = Math.max(0, 5 - weeksDiff) // Reverse so week 0 is oldest

      const existing = weeklyData.get(weekNum) || { total: 0, count: 0 }
      weeklyData.set(weekNum, {
        total: existing.total + (sub.score || 0),
        count: existing.count + 1,
      })
    }

    // Convert to array format
    const performanceData: PerformanceDataPoint[] = []
    for (let i = 0; i <= 5; i++) {
      const weekData = weeklyData.get(i)
      performanceData.push({
        week: `Week ${i + 1}`,
        average: weekData ? Math.round(weekData.total / weekData.count) : 0,
      })
    }

    return { success: true, data: performanceData }
  } catch (error) {
    console.error("Error in getPerformanceData:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// =====================================================
// Recent Assignments Data
// =====================================================

export interface RecentAssignment {
  id: string
  title: string
  className: string
  dueDate: string | null
  status: "Active" | "Completed"
  submitted: number
  total: number
}

/**
 * Fetches recent assignments with submission progress
 */
export async function getRecentAssignments(): Promise<{
  success: boolean
  data?: RecentAssignment[]
  error?: string
}> {
  const teacherId = await currentTeacherId()
  if (!teacherId) {
    return { success: false, error: "You must be logged in" }
  }

  try {
    const assignments = await fetchQuery(
      api.dashboard.getPublishedAssignmentsWithCounts,
      { teacherId }
    )

    if (assignments.length === 0) {
      return { success: true, data: [] }
    }

    // Most recent 5 published assignments (already newest-first)
    const recent = assignments.slice(0, 5)

    const recentAssignments: RecentAssignment[] = recent.map((a) => {
      const totalStudents = a.enrollmentCount
      const submittedCount = a.submissions.length
      const isPastDue = a.dueDate != null && a.dueDate < Date.now()
      const isComplete = submittedCount >= totalStudents && totalStudents > 0

      return {
        id: a.id,
        title: a.title,
        className: a.className,
        dueDate: toIso(a.dueDate),
        status: isPastDue || isComplete ? "Completed" : "Active",
        submitted: submittedCount,
        total: totalStudents,
      }
    })

    return { success: true, data: recentAssignments }
  } catch (error) {
    console.error("Error in getRecentAssignments:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// =====================================================
// Upcoming Tasks Data
// =====================================================

export interface UpcomingTask {
  id: string
  title: string
  date: string
  time: string
  type: "Grading" | "Deadline" | "Meeting" | "Preparation"
}

/**
 * Fetches upcoming tasks including grading and deadlines
 */
export async function getUpcomingTasks(): Promise<{
  success: boolean
  data?: UpcomingTask[]
  error?: string
}> {
  const teacherId = await currentTeacherId()
  if (!teacherId) {
    return { success: false, error: "You must be logged in" }
  }

  try {
    const tasks: UpcomingTask[] = []

    const assignments = await fetchQuery(
      api.dashboard.getPublishedAssignmentsWithCounts,
      { teacherId }
    )

    if (assignments.length > 0) {
      // Collect submissions needing grading (status submitted, no score)
      const pendingSubmissions: { assignmentId: string; submittedAt: number }[] =
        []
      for (const a of assignments) {
        for (const s of a.submissions) {
          if (s.status === "submitted" && s.score === null) {
            pendingSubmissions.push({
              assignmentId: a.id,
              submittedAt: s.submittedAt ?? 0,
            })
          }
        }
      }
      pendingSubmissions.sort((x, y) => x.submittedAt - y.submittedAt)
      const limitedPending = pendingSubmissions.slice(0, 5)

      // Create grading tasks (group by assignment)
      const gradingByAssignment = new Map<string, number>()
      for (const sub of limitedPending) {
        gradingByAssignment.set(
          sub.assignmentId,
          (gradingByAssignment.get(sub.assignmentId) || 0) + 1
        )
      }

      for (const [assignmentId, count] of gradingByAssignment) {
        const assignment = assignments.find((a) => a.id === assignmentId)
        if (assignment) {
          tasks.push({
            id: `grading-${assignmentId}`,
            title: `Grade ${assignment.title} (${count} pending)`,
            date: "Today",
            time: "—",
            type: "Grading",
          })
        }
      }

      // Create deadline tasks (assignments due in next 7 days)
      const now = new Date()
      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)

      for (const assignment of assignments) {
        if (assignment.dueDate != null) {
          const dueDate = new Date(assignment.dueDate)
          if (dueDate >= now && dueDate <= nextWeek) {
            const isToday = dueDate.toDateString() === now.toDateString()
            const isTomorrow =
              dueDate.toDateString() ===
              new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString()

            let dateStr: string
            if (isToday) {
              dateStr = "Today"
            } else if (isTomorrow) {
              dateStr = "Tomorrow"
            } else {
              dateStr = dueDate.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })
            }

            tasks.push({
              id: `deadline-${assignment.id}`,
              title: `${assignment.title} due`,
              date: dateStr,
              time: dueDate.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              }),
              type: "Deadline",
            })
          }
        }
      }
    }

    // Sort tasks: Today first, then by type (Grading > Deadline)
    tasks.sort((a, b) => {
      if (a.date === "Today" && b.date !== "Today") return -1
      if (b.date === "Today" && a.date !== "Today") return 1
      if (a.date === "Tomorrow" && b.date !== "Tomorrow" && b.date !== "Today")
        return -1
      if (b.date === "Tomorrow" && a.date !== "Tomorrow" && a.date !== "Today")
        return 1
      if (a.type === "Grading" && b.type !== "Grading") return -1
      if (b.type === "Grading" && a.type !== "Grading") return 1
      return 0
    })

    return { success: true, data: tasks.slice(0, 5) }
  } catch (error) {
    console.error("Error in getUpcomingTasks:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// =====================================================
// Assignments Requiring Attention (Action Queue)
// =====================================================

export interface AssignmentAction {
  id: string
  title: string
  className: string
  submissionCount: number
  gradedCount: number
  needsGrading: number
  feedbackReleased: boolean
  status: "needs_grading" | "ready_for_feedback" | "complete"
}

/**
 * Fetches published assignments that have submissions and need attention
 * Either grading or feedback release
 */
export async function getAssignmentsNeedingAttention(): Promise<{
  success: boolean
  data?: AssignmentAction[]
  error?: string
}> {
  const teacherId = await currentTeacherId()
  if (!teacherId) {
    return { success: false, error: "You must be logged in" }
  }

  try {
    const assignments = await fetchQuery(
      api.dashboard.getPublishedAssignmentsWithCounts,
      { teacherId }
    )

    if (assignments.length === 0) {
      return { success: true, data: [] }
    }

    // Build assignment action data
    const actionQueue: AssignmentAction[] = []

    for (const assignment of assignments) {
      const assignmentSubmissions = assignment.submissions

      if (assignmentSubmissions.length === 0) {
        continue // Skip assignments with no submissions
      }

      const gradedCount = assignmentSubmissions.filter(
        (s) => s.status === "marked" && s.score !== null
      ).length
      const needsGrading = assignmentSubmissions.length - gradedCount
      const allFeedbackReleased = assignmentSubmissions.every(
        (s) => s.feedbackReleased === true
      )

      // Determine status
      let status: AssignmentAction["status"] = "complete"
      if (needsGrading > 0) {
        status = "needs_grading"
      } else if (!allFeedbackReleased && gradedCount > 0) {
        status = "ready_for_feedback"
      }

      // Only include if needs attention
      if (status !== "complete") {
        actionQueue.push({
          id: assignment.id,
          title: assignment.title,
          className: assignment.className,
          submissionCount: assignmentSubmissions.length,
          gradedCount,
          needsGrading,
          feedbackReleased: allFeedbackReleased,
          status,
        })
      }
    }

    // Sort: needs_grading first, then ready_for_feedback
    actionQueue.sort((a, b) => {
      if (a.status === "needs_grading" && b.status !== "needs_grading") return -1
      if (b.status === "needs_grading" && a.status !== "needs_grading") return 1
      return b.submissionCount - a.submissionCount
    })

    return { success: true, data: actionQueue.slice(0, 5) }
  } catch (error) {
    console.error("Error in getAssignmentsNeedingAttention:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// =====================================================
// Recent Assignments for Activity Feed
// =====================================================

export interface RecentAssignmentActivity {
  id: string
  title: string
  className: string
  status: "draft" | "published" | "graded"
  submissionCount: number
  createdAt: string
  updatedAt: string
}

/**
 * Fetches last 5 assignments created or modified for activity feed
 */
export async function getRecentAssignmentActivity(): Promise<{
  success: boolean
  data?: RecentAssignmentActivity[]
  error?: string
}> {
  const teacherId = await currentTeacherId()
  if (!teacherId) {
    return { success: false, error: "You must be logged in" }
  }

  try {
    const assignments = await fetchQuery(
      api.dashboard.getRecentAssignmentActivity,
      { teacherId }
    )

    if (assignments.length === 0) {
      return { success: true, data: [] }
    }

    // Build activity data
    const activityData: RecentAssignmentActivity[] = assignments.map((a) => {
      const subCount = a.submissionCount
      const gradedCount = a.gradedCount

      // Determine display status
      let displayStatus: "draft" | "published" | "graded" =
        a.status as "draft" | "published"
      if (a.status === "published" && subCount > 0 && gradedCount === subCount) {
        displayStatus = "graded"
      }

      return {
        id: a.id,
        title: a.title,
        className: a.className,
        status: displayStatus,
        submissionCount: subCount,
        createdAt: toIso(a.createdAt) ?? new Date().toISOString(),
        updatedAt: toIso(a.updatedAt) ?? new Date().toISOString(),
      }
    })

    return { success: true, data: activityData }
  } catch (error) {
    console.error("Error in getRecentAssignmentActivity:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
