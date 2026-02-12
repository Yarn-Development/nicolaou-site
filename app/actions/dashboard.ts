"use server"

import { createClient } from "@/lib/supabase/server"

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
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      error: "You must be logged in to view dashboard",
    }
  }

  try {
    // =====================================================
    // 1. Get teacher's classes with enrollment counts
    // =====================================================
    const { data: classes, error: classesError } = await supabase
      .from("classes")
      .select(
        `
        id,
        name,
        subject,
        created_at,
        enrollments(count)
      `
      )
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false })

    if (classesError) {
      console.error("Error fetching classes:", classesError)
      return { success: false, error: "Failed to fetch classes" }
    }

    // No classes = no data
    if (!classes || classes.length === 0) {
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

    const classIds = classes.map((c) => c.id)
    const totalClasses = classes.length

    // =====================================================
    // 2. Get all enrollments for student counts
    // =====================================================
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from("enrollments")
      .select("student_id, class_id, joined_at")
      .in("class_id", classIds)

    if (enrollmentsError) {
      console.error("Error fetching enrollments:", enrollmentsError)
    }

    // Get unique student IDs to fetch their profiles
    const uniqueStudentIds = [...new Set(enrollments?.map((e) => e.student_id) || [])]
    const totalStudents = uniqueStudentIds.length

    // Fetch student profiles separately
    let studentProfiles: { id: string; email: string; full_name: string | null }[] = []
    if (uniqueStudentIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", uniqueStudentIds)

      if (profilesError) {
        console.error("Error fetching student profiles:", profilesError)
      } else {
        studentProfiles = profiles || []
      }
    }

    // Create a map for quick profile lookup
    const profileMap = new Map(studentProfiles.map(p => [p.id, p]))

    // =====================================================
    // 3. Get all assignments for these classes
    // =====================================================
    const { data: assignments, error: assignmentsError } = await supabase
      .from("assignments")
      .select(
        `
        id,
        class_id,
        title,
        status,
        due_date,
        created_at
      `
      )
      .in("class_id", classIds)
      .order("created_at", { ascending: false })

    if (assignmentsError) {
      console.error("Error fetching assignments:", assignmentsError)
    }

    const assignmentIds = assignments?.map((a) => a.id) || []
    const pendingAssignments =
      assignments?.filter(
        (a) =>
          a.status === "published" &&
          (!a.due_date || new Date(a.due_date) >= new Date())
      ).length || 0

    // =====================================================
    // 4. Get all submissions for grading stats
    // =====================================================
    const { data: submissions, error: submissionsError } = await supabase
      .from("submissions")
      .select(
        `
        id,
        assignment_id,
        student_id,
        score,
        status,
        submitted_at,
        graded_at
      `
      )
      .in("assignment_id", assignmentIds)
      .order("submitted_at", { ascending: false })

    if (submissionsError) {
      console.error("Error fetching submissions:", submissionsError)
    }

    // Calculate grading stats
    const needsGrading =
      submissions?.filter((s) => s.status === "submitted" && s.score === null)
        .length || 0

    // Calculate average score from graded submissions
    const gradedSubmissions =
      submissions?.filter((s) => s.status === "graded" && s.score !== null) ||
      []
    const averageScore =
      gradedSubmissions.length > 0
        ? Math.round(
            gradedSubmissions.reduce((sum, s) => sum + (s.score || 0), 0) /
              gradedSubmissions.length
          )
        : 0

    // Active students (submitted in last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const activeStudents = new Set(
      submissions
        ?.filter((s) => new Date(s.submitted_at) >= thirtyDaysAgo)
        .map((s) => s.student_id) || []
    ).size

    // =====================================================
    // 5. Build recent activity
    // =====================================================
    const recentActivity: RecentActivityItem[] = []

    // Add recent submissions
    const recentSubmissions = submissions?.slice(0, 5) || []
    for (const sub of recentSubmissions) {
      const assignment = assignments?.find((a) => a.id === sub.assignment_id)
      const student = profileMap.get(sub.student_id)

      if (student && assignment) {
        recentActivity.push({
          id: `submission-${sub.id}`,
          type: "submission",
          studentName: student.full_name || "Unknown Student",
          studentEmail: student.email,
          description:
            sub.status === "graded"
              ? `Graded: ${assignment.title}`
              : `Submitted: ${assignment.title}`,
          timestamp: sub.submitted_at,
          metadata: {
            score: sub.score ?? undefined,
            assignmentTitle: assignment.title,
          },
        })
      }
    }

    // Add recent enrollments
    const recentEnrollments =
      enrollments
        ?.sort(
          (a, b) =>
            new Date(b.joined_at).getTime() -
            new Date(a.joined_at).getTime()
        )
        .slice(0, 3) || []

    for (const enrollment of recentEnrollments) {
      const student = profileMap.get(enrollment.student_id)
      const classInfo = classes.find((c) => c.id === enrollment.class_id)

      if (student && classInfo) {
        recentActivity.push({
          id: `enrollment-${enrollment.student_id}-${enrollment.class_id}`,
          type: "enrollment",
          studentName: student.full_name || "Unknown Student",
          studentEmail: student.email,
          description: `Joined: ${classInfo.name}`,
          timestamp: enrollment.joined_at,
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
    // 6. Build class overview
    // =====================================================
    const classOverview: ClassOverview[] = classes.map((cls) => {
      const classEnrollments =
        enrollments?.filter((e) => e.class_id === cls.id) || []
      const classAssignments =
        assignments?.filter((a) => a.class_id === cls.id) || []
      const classAssignmentIds = classAssignments.map((a) => a.id)
      const classSubmissions =
        submissions?.filter(
          (s) =>
            classAssignmentIds.includes(s.assignment_id) &&
            s.status === "graded" &&
            s.score !== null
        ) || []

      const classAvgScore =
        classSubmissions.length > 0
          ? Math.round(
              classSubmissions.reduce((sum, s) => sum + (s.score || 0), 0) /
                classSubmissions.length
            )
          : 0

      // Find most recent activity for this class
      const lastActivity = submissions
        ?.filter((s) => classAssignmentIds.includes(s.assignment_id))
        .sort(
          (a, b) =>
            new Date(b.submitted_at).getTime() -
            new Date(a.submitted_at).getTime()
        )[0]?.submitted_at

      return {
        id: cls.id,
        name: cls.name,
        subject: cls.subject,
        studentCount: classEnrollments.length,
        assignmentCount: classAssignments.length,
        averageScore: classAvgScore,
        recentActivity: lastActivity || null,
      }
    })

    // =====================================================
    // 7. Determine if we have meaningful data
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
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: "You must be logged in" }
  }

  try {
    // Get teacher's class IDs
    const { data: classes } = await supabase
      .from("classes")
      .select("id")
      .eq("teacher_id", user.id)

    if (!classes || classes.length === 0) {
      return { success: true, data: [] }
    }

    const classIds = classes.map((c) => c.id)

    // Get assignment IDs for these classes
    const { data: assignments } = await supabase
      .from("assignments")
      .select("id")
      .in("class_id", classIds)

    if (!assignments || assignments.length === 0) {
      return { success: true, data: [] }
    }

    const assignmentIds = assignments.map((a) => a.id)

    // Get graded submissions from the last 6 weeks
    const sixWeeksAgo = new Date()
    sixWeeksAgo.setDate(sixWeeksAgo.getDate() - 42)

    const { data: submissions, error: submissionsError } = await supabase
      .from("submissions")
      .select("score, graded_at")
      .in("assignment_id", assignmentIds)
      .eq("status", "graded")
      .not("score", "is", null)
      .gte("graded_at", sixWeeksAgo.toISOString())
      .order("graded_at", { ascending: true })

    if (submissionsError) {
      console.error("Error fetching submissions:", submissionsError)
      return { success: false, error: "Failed to fetch performance data" }
    }

    if (!submissions || submissions.length === 0) {
      return { success: true, data: [] }
    }

    // Group submissions by week
    const weeklyData = new Map<number, { total: number; count: number }>()

    for (const sub of submissions) {
      const gradedDate = new Date(sub.graded_at)
      // Calculate week number (0-5 for last 6 weeks)
      const weeksDiff = Math.floor(
        (Date.now() - gradedDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
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
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: "You must be logged in" }
  }

  try {
    // Get teacher's classes with enrollments count
    const { data: classes } = await supabase
      .from("classes")
      .select("id, name")
      .eq("teacher_id", user.id)

    if (!classes || classes.length === 0) {
      return { success: true, data: [] }
    }

    const classIds = classes.map((c) => c.id)
    const classMap = new Map(classes.map((c) => [c.id, c.name]))

    // Get enrollment counts per class
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("class_id")
      .in("class_id", classIds)

    const enrollmentCounts = new Map<string, number>()
    for (const e of enrollments || []) {
      enrollmentCounts.set(e.class_id, (enrollmentCounts.get(e.class_id) || 0) + 1)
    }

    // Get recent published assignments
    const { data: assignments, error: assignmentsError } = await supabase
      .from("assignments")
      .select("id, title, class_id, due_date, status")
      .in("class_id", classIds)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(5)

    if (assignmentsError) {
      console.error("Error fetching assignments:", assignmentsError)
      return { success: false, error: "Failed to fetch assignments" }
    }

    if (!assignments || assignments.length === 0) {
      return { success: true, data: [] }
    }

    // Get submission counts per assignment
    const assignmentIds = assignments.map((a) => a.id)
    const { data: submissions } = await supabase
      .from("submissions")
      .select("assignment_id")
      .in("assignment_id", assignmentIds)

    const submissionCounts = new Map<string, number>()
    for (const s of submissions || []) {
      submissionCounts.set(
        s.assignment_id,
        (submissionCounts.get(s.assignment_id) || 0) + 1
      )
    }

    // Build recent assignments data
    const recentAssignments: RecentAssignment[] = assignments.map((a) => {
      const totalStudents = enrollmentCounts.get(a.class_id) || 0
      const submittedCount = submissionCounts.get(a.id) || 0
      const isPastDue = a.due_date && new Date(a.due_date) < new Date()
      const isComplete = submittedCount >= totalStudents && totalStudents > 0

      return {
        id: a.id,
        title: a.title,
        className: classMap.get(a.class_id) || "Unknown Class",
        dueDate: a.due_date,
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
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: "You must be logged in" }
  }

  try {
    const tasks: UpcomingTask[] = []

    // Get teacher's classes
    const { data: classes } = await supabase
      .from("classes")
      .select("id, name")
      .eq("teacher_id", user.id)

    if (!classes || classes.length === 0) {
      return { success: true, data: [] }
    }

    const classIds = classes.map((c) => c.id)

    // Get assignments for grading tasks and upcoming deadlines
    const { data: assignments } = await supabase
      .from("assignments")
      .select("id, title, class_id, due_date, status")
      .in("class_id", classIds)
      .eq("status", "published")

    if (assignments && assignments.length > 0) {
      const assignmentIds = assignments.map((a) => a.id)

      // Get submissions needing grading
      const { data: pendingSubmissions } = await supabase
        .from("submissions")
        .select("id, assignment_id, submitted_at")
        .in("assignment_id", assignmentIds)
        .eq("status", "submitted")
        .is("score", null)
        .order("submitted_at", { ascending: true })
        .limit(5)

      // Create grading tasks (group by assignment)
      const gradingByAssignment = new Map<string, number>()
      for (const sub of pendingSubmissions || []) {
        gradingByAssignment.set(
          sub.assignment_id,
          (gradingByAssignment.get(sub.assignment_id) || 0) + 1
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
        if (assignment.due_date) {
          const dueDate = new Date(assignment.due_date)
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
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: "You must be logged in" }
  }

  try {
    // Get teacher's classes
    const { data: classes } = await supabase
      .from("classes")
      .select("id, name")
      .eq("teacher_id", user.id)

    if (!classes || classes.length === 0) {
      return { success: true, data: [] }
    }

    const classIds = classes.map((c) => c.id)
    const classMap = new Map(classes.map((c) => [c.id, c.name]))

    // Get published assignments with submissions
    const { data: assignments, error: assignmentsError } = await supabase
      .from("assignments")
      .select("id, title, class_id, status")
      .in("class_id", classIds)
      .eq("status", "published")
      .order("created_at", { ascending: false })

    if (assignmentsError) {
      console.error("Error fetching assignments:", assignmentsError)
      return { success: false, error: "Failed to fetch assignments" }
    }

    if (!assignments || assignments.length === 0) {
      return { success: true, data: [] }
    }

    const assignmentIds = assignments.map((a) => a.id)

    // Get submissions for these assignments
    const { data: submissions } = await supabase
      .from("submissions")
      .select("id, assignment_id, status, score, feedback_released")
      .in("assignment_id", assignmentIds)

    // Build assignment action data
    const actionQueue: AssignmentAction[] = []

    for (const assignment of assignments) {
      const assignmentSubmissions = (submissions || []).filter(
        (s) => s.assignment_id === assignment.id
      )

      if (assignmentSubmissions.length === 0) {
        continue // Skip assignments with no submissions
      }

      const gradedCount = assignmentSubmissions.filter(
        (s) => s.status === "graded" && s.score !== null
      ).length
      const needsGrading = assignmentSubmissions.length - gradedCount
      const allFeedbackReleased = assignmentSubmissions.every(
        (s) => s.feedback_released === true
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
          className: classMap.get(assignment.class_id) || "Unknown Class",
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
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: "You must be logged in" }
  }

  try {
    // Get teacher's classes
    const { data: classes } = await supabase
      .from("classes")
      .select("id, name")
      .eq("teacher_id", user.id)

    if (!classes || classes.length === 0) {
      return { success: true, data: [] }
    }

    const classIds = classes.map((c) => c.id)
    const classMap = new Map(classes.map((c) => [c.id, c.name]))

    // Get recent assignments
    const { data: assignments, error: assignmentsError } = await supabase
      .from("assignments")
      .select("id, title, class_id, status, created_at, updated_at")
      .in("class_id", classIds)
      .order("updated_at", { ascending: false })
      .limit(5)

    if (assignmentsError) {
      console.error("Error fetching assignments:", assignmentsError)
      return { success: false, error: "Failed to fetch assignments" }
    }

    if (!assignments || assignments.length === 0) {
      return { success: true, data: [] }
    }

    const assignmentIds = assignments.map((a) => a.id)

    // Get submission counts
    const { data: submissions } = await supabase
      .from("submissions")
      .select("assignment_id, status")
      .in("assignment_id", assignmentIds)

    const submissionCounts = new Map<string, number>()
    const gradedCounts = new Map<string, number>()
    for (const s of submissions || []) {
      submissionCounts.set(
        s.assignment_id,
        (submissionCounts.get(s.assignment_id) || 0) + 1
      )
      if (s.status === "graded") {
        gradedCounts.set(
          s.assignment_id,
          (gradedCounts.get(s.assignment_id) || 0) + 1
        )
      }
    }

    // Build activity data
    const activityData: RecentAssignmentActivity[] = assignments.map((a) => {
      const subCount = submissionCounts.get(a.id) || 0
      const gradedCount = gradedCounts.get(a.id) || 0
      
      // Determine display status
      let displayStatus: "draft" | "published" | "graded" = a.status as "draft" | "published"
      if (a.status === "published" && subCount > 0 && gradedCount === subCount) {
        displayStatus = "graded"
      }

      return {
        id: a.id,
        title: a.title,
        className: classMap.get(a.class_id) || "Unknown Class",
        status: displayStatus,
        submissionCount: subCount,
        createdAt: a.created_at,
        updatedAt: a.updated_at,
      }
    })

    return { success: true, data: activityData }
  } catch (error) {
    console.error("Error in getRecentAssignmentActivity:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
