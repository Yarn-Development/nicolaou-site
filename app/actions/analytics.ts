"use server"

import { getAuthUser } from "@/lib/auth"
import { fetchQuery, api, getConvexUserIdByClerkId } from "@/lib/convex/server"
import type { Id } from "@/convex/_generated/dataModel"

// =====================================================
// Types
// =====================================================

export interface TopicPerformance {
  topic: string
  average: number
  improvement: number
  students: number
}

export interface WeeklyProgress {
  week: string
  weekStart: string
  completion: number
  average: number
}

export interface OverallStats {
  totalStudents: number
  completionRate: number
  activeLearners: number
  averageScore: number
  // Comparison with previous period
  studentChange: number
  completionChange: number
  activeChange: number
  scoreChange: number
}

export interface AnalyticsData {
  topicPerformance: TopicPerformance[]
  weeklyProgress: WeeklyProgress[]
  overallStats: OverallStats
  hasData: boolean
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

/**
 * Safely calculate percentage, handling null/zero values
 */
function safePercentage(numerator: number | null, denominator: number | null): number {
  if (!numerator || !denominator || denominator === 0) return 0
  return Math.round((numerator / denominator) * 100)
}

/**
 * Get the start of a week (Monday) for a given date
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff))
}

/**
 * Format week label (e.g., "Week 1", "Week 2")
 */
function formatWeekLabel(weekStart: Date, referenceStart: Date): string {
  const diffTime = weekStart.getTime() - referenceStart.getTime()
  const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000)) + 1
  return `Week ${diffWeeks}`
}

// =====================================================
// Main Analytics Fetching
// =====================================================

/**
 * Fetches comprehensive analytics data for the teacher's classes
 * Returns real data if available, otherwise indicates no data
 */
export async function getAnalyticsData(
  timeRangeDays: number = 30,
  classId?: string
): Promise<{ success: boolean; data?: AnalyticsData; error?: string }> {
  const teacherId = await currentUserId()
  if (!teacherId) {
    return {
      success: false,
      error: "You must be logged in to view analytics",
    }
  }

  try {
    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - timeRangeDays)

    // Previous period for comparison
    const prevEndDate = new Date(startDate)
    const prevStartDate = new Date(startDate)
    prevStartDate.setDate(prevStartDate.getDate() - timeRangeDays)

    // =====================================================
    // 1-4. Gather the raw dataset from Convex
    // =====================================================
    const dataset = await fetchQuery(api.analytics.getAnalyticsDataset, {
      teacherId,
      classId: classId && classId !== "all" ? (classId as Id<"classes">) : undefined,
    })

    const { enrollments, assignments, submissions } = dataset

    if (assignments.length === 0 && enrollments.length === 0) {
      return {
        success: true,
        data: {
          topicPerformance: [],
          weeklyProgress: [],
          overallStats: {
            totalStudents: 0,
            completionRate: 0,
            activeLearners: 0,
            averageScore: 0,
            studentChange: 0,
            completionChange: 0,
            activeChange: 0,
            scoreChange: 0,
          },
          hasData: false,
        },
      }
    }

    const uniqueStudents = new Set(enrollments.map((e) => e.studentId))
    const totalStudents = uniqueStudents.size

    const assignmentIds = assignments.map((a) => a.id)

    // Filter submissions by date range (submittedAt is ms or null).
    const currentSubmissions = submissions.filter((s) => {
      if (s.submittedAt == null) return false
      const submittedDate = new Date(s.submittedAt)
      return submittedDate >= startDate && submittedDate <= endDate
    })

    const prevSubmissions = submissions.filter((s) => {
      if (s.submittedAt == null) return false
      const submittedDate = new Date(s.submittedAt)
      return submittedDate >= prevStartDate && submittedDate < prevEndDate
    })

    // =====================================================
    // 5. Calculate Topic Performance (Average Score per Topic)
    // =====================================================
    const topicScores: Record<string, { total: number; count: number; students: Set<string> }> = {}

    // Map assignment IDs to their topics (derived from question topics in Convex,
    // falling back to title extraction when none is present).
    const assignmentTopics: Record<string, string> = {}
    assignments.forEach((a) => {
      const topic = a.topic || extractTopicFromTitle(a.title)
      assignmentTopics[a.id] = topic
    })

    // Aggregate scores by topic
    currentSubmissions.forEach((sub) => {
      if (sub.score !== null && sub.status === "graded") {
        const topic = assignmentTopics[sub.assignmentId] || "General"

        if (!topicScores[topic]) {
          topicScores[topic] = { total: 0, count: 0, students: new Set() }
        }

        topicScores[topic].total += sub.score
        topicScores[topic].count += 1
        topicScores[topic].students.add(sub.studentId)
      }
    })

    // Calculate previous period topic scores for improvement
    const prevTopicScores: Record<string, { total: number; count: number }> = {}
    prevSubmissions.forEach((sub) => {
      if (sub.score !== null && sub.status === "graded") {
        const topic = assignmentTopics[sub.assignmentId] || "General"

        if (!prevTopicScores[topic]) {
          prevTopicScores[topic] = { total: 0, count: 0 }
        }

        prevTopicScores[topic].total += sub.score
        prevTopicScores[topic].count += 1
      }
    })

    const topicPerformance: TopicPerformance[] = Object.entries(topicScores).map(([topic, data]) => {
      const average = data.count > 0 ? Math.round(data.total / data.count) : 0
      const prevData = prevTopicScores[topic]
      const prevAverage = prevData && prevData.count > 0 ? Math.round(prevData.total / prevData.count) : average
      const improvement = average - prevAverage

      return {
        topic,
        average,
        improvement,
        students: data.students.size,
      }
    }).sort((a, b) => b.average - a.average)

    // =====================================================
    // 6. Calculate Weekly Progress
    // =====================================================
    const weeklyData: Record<string, { submissions: number; totalScore: number; gradedCount: number }> = {}
    const weekStartReference = getWeekStart(startDate)

    currentSubmissions.forEach((sub) => {
      const weekStart = getWeekStart(new Date(sub.submittedAt as number))
      const weekKey = weekStart.toISOString().split('T')[0]

      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = { submissions: 0, totalScore: 0, gradedCount: 0 }
      }

      weeklyData[weekKey].submissions += 1

      if (sub.score !== null && sub.status === "graded") {
        weeklyData[weekKey].totalScore += sub.score
        weeklyData[weekKey].gradedCount += 1
      }
    })

    // Calculate expected submissions per week (total students * assignments per week)
    const assignmentsInPeriod = assignments.filter((a) => {
      const createdDate = new Date(a.createdAt)
      return createdDate >= startDate && createdDate <= endDate
    }).length || 1

    const expectedSubmissionsPerWeek = totalStudents > 0
      ? Math.max(1, Math.ceil((totalStudents * assignmentsInPeriod) / Math.ceil(timeRangeDays / 7)))
      : 1

    const weeklyProgress: WeeklyProgress[] = Object.entries(weeklyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([weekStart, data]) => {
        const weekDate = new Date(weekStart)
        return {
          week: formatWeekLabel(weekDate, weekStartReference),
          weekStart,
          completion: safePercentage(data.submissions, expectedSubmissionsPerWeek),
          average: data.gradedCount > 0 ? Math.round(data.totalScore / data.gradedCount) : 0,
        }
      })

    // =====================================================
    // 7. Calculate Overall Stats
    // =====================================================

    // Completion rate: submissions / (assignments * enrolled students)
    const expectedTotal = (assignmentIds.length || 1) * totalStudents
    const currentCompletionRate = safePercentage(currentSubmissions.length, expectedTotal)
    const prevCompletionRate = safePercentage(prevSubmissions.length, expectedTotal)

    // Active learners: unique students who submitted in period
    const activeStudents = new Set(currentSubmissions.map((s) => s.studentId))
    const prevActiveStudents = new Set(prevSubmissions.map((s) => s.studentId))

    // Average score
    const gradedSubmissions = currentSubmissions.filter((s) => s.score !== null && s.status === "graded")
    const prevGradedSubmissions = prevSubmissions.filter((s) => s.score !== null && s.status === "graded")

    const avgScore = gradedSubmissions.length > 0
      ? Math.round(gradedSubmissions.reduce((sum, s) => sum + (s.score || 0), 0) / gradedSubmissions.length)
      : 0

    const prevAvgScore = prevGradedSubmissions.length > 0
      ? Math.round(prevGradedSubmissions.reduce((sum, s) => sum + (s.score || 0), 0) / prevGradedSubmissions.length)
      : 0

    const overallStats: OverallStats = {
      totalStudents,
      completionRate: currentCompletionRate,
      activeLearners: activeStudents.size,
      averageScore: avgScore,
      studentChange: 0, // Would need historical enrollment data
      completionChange: currentCompletionRate - prevCompletionRate,
      activeChange: activeStudents.size - prevActiveStudents.size,
      scoreChange: avgScore - prevAvgScore,
    }

    // =====================================================
    // 8. Determine if we have meaningful data
    // =====================================================
    const hasData = totalStudents > 0 &&
                   (currentSubmissions.length > 0 || topicPerformance.length > 0)

    return {
      success: true,
      data: {
        topicPerformance,
        weeklyProgress,
        overallStats,
        hasData,
      },
    }

  } catch (error) {
    console.error("Error in getAnalyticsData:", error)
    return {
      success: false,
      error: "An unexpected error occurred while fetching analytics",
    }
  }
}

/**
 * Extract topic from assignment title (fallback when no topic in content)
 */
function extractTopicFromTitle(title: string): string {
  // Common topic keywords
  const topics = [
    "Algebra", "Geometry", "Statistics", "Number", "Ratio",
    "Probability", "Trigonometry", "Calculus", "Fractions",
    "Decimals", "Percentages", "Equations", "Functions"
  ]

  for (const topic of topics) {
    if (title.toLowerCase().includes(topic.toLowerCase())) {
      return topic
    }
  }

  // Return first meaningful word from title
  const words = title.split(/\s+/).filter(w => w.length > 3)
  return words[0] || "General"
}

/**
 * Get list of classes for the dropdown filter
 */
export async function getTeacherClasses(): Promise<{
  success: boolean
  data?: Array<{ id: string; name: string; subject: string }>
  error?: string
}> {
  const teacherId = await currentUserId()
  if (!teacherId) {
    return { success: false, error: "You must be logged in" }
  }

  try {
    const classes = await fetchQuery(api.analytics.getTeacherClasses, { teacherId })
    return {
      success: true,
      data: classes.map((c) => ({ id: c.id, name: c.name, subject: c.subject })),
    }
  } catch (error) {
    console.error("Error fetching classes:", error)
    return { success: false, error: "Failed to fetch classes" }
  }
}
