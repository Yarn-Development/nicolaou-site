"use server"

import { getLearningObjective } from "@/lib/topic-taxonomy"
import { getAuthUser } from "@/lib/auth"
import { fetchQuery, fetchMutation, api, getConvexUserIdByClerkId } from "@/lib/convex/server"
import type { Id } from "@/convex/_generated/dataModel"

// =====================================================
// Types
// =====================================================

export interface TopicPerformance {
  topic: string
  subTopic: string | null
  questionsCount: number
  totalMarks: number
  earnedMarks: number
  percentage: number
  status: "weak" | "developing" | "strong"
}

export interface StudentFeedback {
  studentId: string
  studentName: string
  studentEmail: string
  assignmentId: string
  assignmentTitle: string
  submissionId: string
  overallScore: number
  overallPercentage: number
  maxMarks: number
  topicPerformance: TopicPerformance[]
  weakTopics: TopicPerformance[]
  revisionQuestions: RevisionQuestion[]
  generatedAt: string
}

export interface RevisionQuestion {
  id: string
  questionLatex: string
  imageUrl: string | null
  marks: number
  topic: string
  subTopic: string | null
  difficulty: string
  targetedTopic: string // The weak topic this question addresses
}

export interface AssignmentFeedbackSummary {
  assignmentId: string
  assignmentTitle: string
  className: string
  totalStudents: number
  gradedStudents: number
  averageScore: number
  topicBreakdown: {
    topic: string
    averagePercentage: number
    studentsStruggling: number
  }[]
  studentFeedback: StudentFeedback[]
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
// Generate Feedback for an Assignment
// =====================================================

/**
 * Generates targeted feedback and revision questions for all students in an assignment
 */
export async function generateFeedback(assignmentId: string): Promise<{
  success: boolean
  data?: AssignmentFeedbackSummary
  error?: string
}> {
  const userId = await currentUserId()
  if (!userId) return { success: false, error: "You must be logged in" }

  try {
    const result = await fetchQuery(api.feedback.getAssignmentFeedback, {
      assignmentId: assignmentId as Id<"assignments">,
      teacherId: userId,
    })

    if ("error" in result) {
      if (result.error === "forbidden") return { success: false, error: "Permission denied" }
      return { success: false, error: "Assignment not found" }
    }

    const { assignment, className, questions, submissions } = result

    // No graded submissions — return empty summary.
    if (submissions.length === 0) {
      return {
        success: true,
        data: {
          assignmentId,
          assignmentTitle: assignment.title,
          className,
          totalStudents: 0,
          gradedStudents: 0,
          averageScore: 0,
          topicBreakdown: [],
          studentFeedback: [],
        },
      }
    }

    const maxMarks = questions.reduce((sum, q) => sum + q.marks, 0)
    const studentFeedback: StudentFeedback[] = []
    const topicStats: Map<string, { total: number; earned: number; count: number }> = new Map()

    for (const submission of submissions) {
      const earnedMap = submission.earnedByAssignmentQuestionId as Record<string, number>

      // Calculate per-topic performance
      const topicPerf: Map<string, TopicPerformance> = new Map()

      for (const question of questions) {
        const key = question.topic
        const earned = earnedMap[question.assignmentQuestionId] || 0

        if (!topicPerf.has(key)) {
          topicPerf.set(key, {
            topic: question.topic,
            subTopic: question.subTopic,
            questionsCount: 0,
            totalMarks: 0,
            earnedMarks: 0,
            percentage: 0,
            status: "strong",
          })
        }

        const perf = topicPerf.get(key)!
        perf.questionsCount++
        perf.totalMarks += question.marks
        perf.earnedMarks += earned

        // Update class-wide topic stats
        if (!topicStats.has(key)) {
          topicStats.set(key, { total: 0, earned: 0, count: 0 })
        }
        const stat = topicStats.get(key)!
        stat.total += question.marks
        stat.earned += earned
        stat.count++
      }

      // Calculate percentages and status
      const topicPerformance: TopicPerformance[] = []
      const weakTopics: TopicPerformance[] = []

      for (const perf of topicPerf.values()) {
        perf.percentage = perf.totalMarks > 0
          ? Math.round((perf.earnedMarks / perf.totalMarks) * 100)
          : 0

        if (perf.percentage < 40) {
          perf.status = "weak"
          weakTopics.push(perf)
        } else if (perf.percentage < 70) {
          perf.status = "developing"
        } else {
          perf.status = "strong"
        }

        topicPerformance.push(perf)
      }

      // 5. Fetch revision questions for weak topics
      const revisionQuestions: RevisionQuestion[] = []

      if (weakTopics.length > 0) {
        const weakTopicNames = weakTopics.map(t => t.topic)
        const excludeIds = questions.map(q => q.id as Id<"questions">)

        const revisionQs = await fetchQuery(api.feedback.getRevisionByTopics, {
          topics: weakTopicNames,
          excludeIds,
          limit: 10,
        })

        for (const q of revisionQs) {
          revisionQuestions.push({
            id: q.id,
            questionLatex: q.questionLatex || "",
            imageUrl: q.imageUrl,
            marks: q.marks || 1,
            topic: q.topic,
            subTopic: q.subTopic,
            difficulty: q.difficulty,
            targetedTopic: q.topic,
          })
        }
      }

      const overallPercentage = maxMarks > 0
        ? Math.round((submission.score || 0) / maxMarks * 100)
        : 0

      studentFeedback.push({
        studentId: submission.studentId,
        studentName: submission.studentName || submission.studentEmail.split("@")[0],
        studentEmail: submission.studentEmail,
        assignmentId,
        assignmentTitle: assignment.title,
        submissionId: submission.id,
        overallScore: submission.score || 0,
        overallPercentage,
        maxMarks,
        topicPerformance,
        weakTopics,
        revisionQuestions,
        generatedAt: new Date().toISOString(),
      })
    }

    // 6. Calculate class-wide topic breakdown
    const topicBreakdown: AssignmentFeedbackSummary["topicBreakdown"] = []
    for (const [topic, stats] of topicStats) {
      const avgPercentage = stats.total > 0
        ? Math.round((stats.earned / stats.total) * 100)
        : 0

      // Count students struggling (< 50% on this topic)
      const studentsStruggling = studentFeedback.filter(s => {
        const topicPerf = s.topicPerformance.find(t => t.topic === topic)
        return topicPerf && topicPerf.percentage < 50
      }).length

      topicBreakdown.push({
        topic,
        averagePercentage: avgPercentage,
        studentsStruggling,
      })
    }

    // Sort by average (worst first)
    topicBreakdown.sort((a, b) => a.averagePercentage - b.averagePercentage)

    const averageScore = studentFeedback.length > 0
      ? Math.round(studentFeedback.reduce((sum, s) => sum + s.overallPercentage, 0) / studentFeedback.length)
      : 0

    return {
      success: true,
      data: {
        assignmentId,
        assignmentTitle: assignment.title,
        className,
        totalStudents: studentFeedback.length,
        gradedStudents: studentFeedback.length,
        averageScore,
        topicBreakdown,
        studentFeedback,
      },
    }
  } catch (error) {
    console.error("Error in generateFeedback:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// =====================================================
// Get Student Feedback (for student view)
// =====================================================

/**
 * Gets feedback for a specific student on a specific assignment
 */
export async function getStudentAssignmentFeedback(
  assignmentId: string,
  studentId?: string
): Promise<{
  success: boolean
  data?: StudentFeedback
  error?: string
}> {
  const userId = await currentUserId()
  if (!userId) return { success: false, error: "You must be logged in" }

  // If no studentId provided, use current user
  const targetStudentId = (studentId as Id<"users">) || userId

  try {
    const result = await fetchQuery(api.feedback.getStudentAssignmentFeedback, {
      assignmentId: assignmentId as Id<"assignments">,
      studentId: targetStudentId,
      requesterId: userId,
    })

    if ("error" in result) {
      switch (result.error) {
        case "not_found":
          return { success: false, error: "Assignment not found" }
        case "no_submission":
          return { success: false, error: "No submission found" }
        case "no_profile":
          return { success: false, error: "No submission found" }
        case "not_released":
          return { success: false, error: "Feedback not yet released" }
        default:
          return { success: false, error: "An unexpected error occurred" }
      }
    }

    const { assignment, submission, student, questions } = result
    const maxMarks = questions.reduce((sum, q) => sum + q.marks, 0)

    const topicPerf: Map<string, TopicPerformance> = new Map()

    for (const question of questions) {
      const key = question.topic
      const earned = question.earned || 0

      if (!topicPerf.has(key)) {
        topicPerf.set(key, {
          topic: question.topic,
          subTopic: question.subTopic,
          questionsCount: 0,
          totalMarks: 0,
          earnedMarks: 0,
          percentage: 0,
          status: "strong",
        })
      }

      const perf = topicPerf.get(key)!
      perf.questionsCount++
      perf.totalMarks += question.marks
      perf.earnedMarks += earned
    }

    const topicPerformance: TopicPerformance[] = []
    const weakTopics: TopicPerformance[] = []

    for (const perf of topicPerf.values()) {
      perf.percentage = perf.totalMarks > 0
        ? Math.round((perf.earnedMarks / perf.totalMarks) * 100)
        : 0

      if (perf.percentage < 40) {
        perf.status = "weak"
        weakTopics.push(perf)
      } else if (perf.percentage < 70) {
        perf.status = "developing"
      }

      topicPerformance.push(perf)
    }

    // Get revision questions
    const revisionQuestions: RevisionQuestion[] = []

    if (weakTopics.length > 0) {
      const weakTopicNames = weakTopics.map(t => t.topic)
      const excludeIds = questions.map(q => q.id as Id<"questions">)

      const revisionQs = await fetchQuery(api.feedback.getRevisionByTopics, {
        topics: weakTopicNames,
        excludeIds,
        limit: 10,
      })

      for (const q of revisionQs) {
        revisionQuestions.push({
          id: q.id,
          questionLatex: q.questionLatex || "",
          imageUrl: q.imageUrl,
          marks: q.marks || 1,
          topic: q.topic,
          subTopic: q.subTopic,
          difficulty: q.difficulty,
          targetedTopic: q.topic,
        })
      }
    }

    const overallPercentage = maxMarks > 0
      ? Math.round((submission.score || 0) / maxMarks * 100)
      : 0

    return {
      success: true,
      data: {
        studentId: student.id,
        studentName: student.fullName || student.email.split("@")[0],
        studentEmail: student.email,
        assignmentId,
        assignmentTitle: assignment.title,
        submissionId: submission.id,
        overallScore: submission.score || 0,
        overallPercentage,
        maxMarks,
        topicPerformance,
        weakTopics,
        revisionQuestions,
        generatedAt: new Date().toISOString(),
      },
    }
  } catch (error) {
    console.error("Error in getStudentAssignmentFeedback:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// =====================================================
// Generate Student Feedback by Submission ID
// =====================================================

/**
 * RAG Status thresholds for the new feedback system:
 * - Green: > 80% (Secure)
 * - Amber: 50% - 80% (Developing)
 * - Red: < 50% (Needs Focus)
 */
export type RAGStatus = "green" | "amber" | "red"

// Helper functions (not exported from server action file)
function calculateRAGStatusHelper(percentage: number): RAGStatus {
  if (percentage > 80) return "green"
  if (percentage >= 50) return "amber"
  return "red"
}

export interface SubTopicBreakdown {
  topic: string
  subTopic: string
  score: number
  total: number
  percentage: number
  status: RAGStatus
  questionIds: string[]
  learningObjective?: string
}

export interface RevisionQuestionData {
  id: string
  questionLatex: string
  imageUrl: string | null
  contentType: "generated_text" | "image_ocr" | "synthetic_image" | "official_past_paper"
  marks: number
  topic: string
  subTopic: string
  difficulty: string
  answerKey: {
    answer?: string
    explanation?: string
  } | null
  targetedSubTopic: string
}

export interface StudentFeedbackData {
  submissionId: string
  studentId: string
  studentName: string
  studentEmail: string
  assignmentId: string
  assignmentTitle: string
  className: string
  totalScore: number
  maxMarks: number
  percentage: number
  overallStatus: RAGStatus
  topicBreakdown: SubTopicBreakdown[]
  revisionPack: RevisionQuestionData[]
  /** Harder stretch questions for sub-topics the student is strong in. */
  extensionPack: RevisionQuestionData[]
  aiNarrative?: string
  generatedAt: string
}

/**
 * Generates targeted feedback and revision questions for a specific submission
 *
 * Step A: Fetch submission, assignment, and questions
 * Step B: RAG Analysis - group by sub_topic and calculate percentages
 * Step C: Revision Generator - find new questions for weak areas
 * Step D: Return structured payload
 */
export async function generateStudentFeedback(submissionId: string): Promise<{
  success: boolean
  data?: StudentFeedbackData
  error?: string
}> {
  const userId = await currentUserId()
  if (!userId) return { success: false, error: "You must be logged in" }

  try {
    // =========================================================
    // STEP A: Fetch Data
    // =========================================================
    const result = await fetchQuery(api.feedback.getSubmissionFeedback, {
      submissionId: submissionId as Id<"submissions">,
      requesterId: userId,
    })

    if ("error" in result) {
      switch (result.error) {
        case "not_found":
          return { success: false, error: "Submission not found" }
        case "not_graded":
          return { success: false, error: "Submission has not been graded yet" }
        case "no_profile":
          return { success: false, error: "Student profile not found" }
        case "forbidden":
          return { success: false, error: "Permission denied" }
        default:
          return { success: false, error: "An unexpected error occurred" }
      }
    }

    const { submission, student, assignment, className, questions } = result

    // =========================================================
    // STEP B: RAG Analysis - Group by sub_topic
    // =========================================================

    // Group questions by sub_topic
    const subTopicMap = new Map<string, {
      topic: string
      subTopic: string
      score: number
      total: number
      questionIds: string[]
      difficulty: string
    }>()

    for (const question of questions) {
      const key = `${question.topic}::${question.subTopic}`
      const earnedScore = question.earned || 0

      if (!subTopicMap.has(key)) {
        subTopicMap.set(key, {
          topic: question.topic,
          subTopic: question.subTopic,
          score: 0,
          total: 0,
          questionIds: [],
          difficulty: question.difficulty,
        })
      }

      const entry = subTopicMap.get(key)!
      entry.score += earnedScore
      entry.total += question.marks
      entry.questionIds.push(question.id)
    }

    // Calculate percentages and assign RAG status
    const topicBreakdown: SubTopicBreakdown[] = []
    const weakSubTopics: { subTopic: string; topic: string; difficulty: string }[] = []

    for (const [, entry] of subTopicMap) {
      const percentage = entry.total > 0
        ? Math.round((entry.score / entry.total) * 100)
        : 0

      const status = calculateRAGStatusHelper(percentage)
      const learningObjective = getLearningObjective(entry.subTopic, entry.topic) || undefined

      topicBreakdown.push({
        topic: entry.topic,
        subTopic: entry.subTopic,
        score: entry.score,
        total: entry.total,
        percentage,
        status,
        questionIds: entry.questionIds,
        learningObjective,
      })

      // Track weak (red and amber) sub-topics for revision
      if (status === "red" || status === "amber") {
        weakSubTopics.push({
          subTopic: entry.subTopic,
          topic: entry.topic,
          difficulty: entry.difficulty,
        })
      }
    }

    // Sort by percentage (weakest first)
    topicBreakdown.sort((a, b) => a.percentage - b.percentage)

    // =========================================================
    // STEP C: Revision Generator
    // =========================================================

    const revisionPack: RevisionQuestionData[] = []
    // Exclude questions already in the assignment from revision pack.
    const assignmentQuestionIds = questions.map(q => q.id as Id<"questions">)

    for (const weak of weakSubTopics) {
      // Query for 1-2 NEW questions matching sub_topic and difficulty,
      // falling back to topic-level. Excludes questions already in the assignment.
      const revisionQs = await fetchQuery(api.feedback.getRevisionForSubTopic, {
        topic: weak.topic,
        subTopic: weak.subTopic,
        difficulty: weak.difficulty,
        excludeIds: assignmentQuestionIds,
        limit: 2,
      })

      for (const q of revisionQs) {
        // Avoid duplicates in revision pack
        if (!revisionPack.find(rq => rq.id === q.id)) {
          revisionPack.push({
            id: q.id,
            questionLatex: q.questionLatex || "",
            imageUrl: q.imageUrl,
            contentType: (q.contentType as "generated_text" | "image_ocr") || "generated_text",
            marks: q.marks || 1,
            topic: q.topic,
            subTopic: q.subTopic,
            difficulty: q.difficulty,
            answerKey: q.answerKey as { answer?: string; explanation?: string } | null,
            targetedSubTopic: weak.subTopic,
          })
        }
      }
    }

    // =========================================================
    // STEP C2: Extension Generator — stretch work for strong (green) areas
    // =========================================================
    const extensionPack: RevisionQuestionData[] = []
    const strongSubTopics = topicBreakdown.filter((t) => t.status === "green")
    const usedExtIds = new Set<string>([
      ...assignmentQuestionIds.map((id) => id as string),
      ...revisionPack.map((r) => r.id),
    ])
    for (const strong of strongSubTopics) {
      if (extensionPack.length >= 3) break
      const exts = await fetchQuery(api.feedback.getExtensionForSubTopic, {
        topic: strong.topic,
        subTopic: strong.subTopic,
        excludeIds: [...usedExtIds].map((s) => s as Id<"questions">),
        limit: 1,
      })
      for (const q of exts) {
        if (usedExtIds.has(q.id)) continue
        usedExtIds.add(q.id)
        extensionPack.push({
          id: q.id,
          questionLatex: q.questionLatex || "",
          imageUrl: q.imageUrl,
          contentType: (q.contentType as RevisionQuestionData["contentType"]) || "generated_text",
          marks: q.marks || 1,
          topic: q.topic,
          subTopic: q.subTopic,
          difficulty: q.difficulty,
          answerKey: q.answerKey as { answer?: string; explanation?: string } | null,
          targetedSubTopic: strong.subTopic,
        })
      }
    }

    // =========================================================
    // STEP D: Return Payload
    // =========================================================

    const maxMarks = questions.reduce((sum, q) => sum + q.marks, 0)
    const totalScore = submission.score || 0
    const percentage = maxMarks > 0 ? Math.round((totalScore / maxMarks) * 100) : 0
    const studentName = student.fullName || student.email?.split("@")[0] || "Student"

    // =========================================================
    // STEP E: AI Narrative (PRD §5.4.1)
    // =========================================================
    let aiNarrative: string | undefined
    try {
      const strongTopics = topicBreakdown.filter(t => t.status === "green").map(t => t.subTopic)
      const weakTopics = topicBreakdown.filter(t => t.status === "red" || t.status === "amber").map(t => t.subTopic)
      const openRouterKey = process.env.OPENROUTER_API_KEY
      if (openRouterKey) {
        const narrativePrompt = `Write a 2-3 sentence plain English summary of this maths student's assessment performance.
Student: ${studentName}
Assessment: ${assignment.title}
Score: ${totalScore}/${maxMarks} (${percentage}%)
Strong areas: ${strongTopics.length > 0 ? strongTopics.join(", ") : "none identified"}
Needs improvement: ${weakTopics.length > 0 ? weakTopics.join(", ") : "none — excellent performance"}

Rules: encouraging tone, mention specific topics, no markdown, suitable for sharing with parents, end with one concrete next step.`
        const aiResp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openRouterKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
            "X-Title": "Nicolaou Maths - Feedback Narrative",
          },
          body: JSON.stringify({
            model: "anthropic/claude-sonnet-4-6",
            messages: [{ role: "user", content: narrativePrompt }],
            temperature: 0.7,
            max_tokens: 200,
          }),
        })
        if (aiResp.ok) {
          const aiJson = await aiResp.json()
          aiNarrative = aiJson.choices?.[0]?.message?.content?.trim()
        }
      }
    } catch {
      // Narrative is optional — failure is non-fatal
    }

    return {
      success: true,
      data: {
        submissionId: submission.id,
        studentId: student.id,
        studentName,
        studentEmail: student.email || "",
        assignmentId: assignment.id,
        assignmentTitle: assignment.title,
        className,
        totalScore,
        maxMarks,
        percentage,
        overallStatus: calculateRAGStatusHelper(percentage),
        topicBreakdown,
        revisionPack,
        extensionPack,
        aiNarrative,
        generatedAt: new Date().toISOString(),
      },
    }
  } catch (error) {
    console.error("Error in generateStudentFeedback:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// =====================================================
// Get Student Dashboard Data
// =====================================================

export interface StudentDashboardData {
  studentId: string
  studentName: string
  enrolledClasses: {
    id: string
    name: string
    subject: string
    teacherName: string
  }[]
  assignments: {
    id: string
    title: string
    className: string
    dueDate: string | null
    status: "pending" | "submitted" | "graded"
    score: number | null
    maxMarks: number
    percentage: number | null
    feedbackReleased: boolean
    submissionId: string | null
  }[]
  topicMastery: {
    topic: string
    totalQuestions: number
    correctAnswers: number
    percentage: number
    status: "weak" | "developing" | "strong"
  }[]
  overallStats: {
    completedAssignments: number
    totalAssignments: number
    averageScore: number
    bestTopic: string | null
    weakestTopic: string | null
  }
}

/**
 * Gets comprehensive dashboard data for a student
 */
export async function getStudentDashboardData(): Promise<{
  success: boolean
  data?: StudentDashboardData
  error?: string
}> {
  const authUser = await getAuthUser()
  if (!authUser?.clerkId) {
    return { success: false, error: "You must be logged in" }
  }
  const studentId = await getConvexUserIdByClerkId(authUser.clerkId)
  if (!studentId) {
    return { success: false, error: "Profile not found" }
  }

  try {
    const d = await fetchQuery(api.students.getDashboard, { studentId })

    const assignments: StudentDashboardData["assignments"] = d.assignments.map((a) => ({
      id: a.id,
      title: a.title,
      className: a.className,
      dueDate: a.dueDate == null ? null : new Date(a.dueDate).toISOString(),
      status: a.status,
      score: a.score,
      maxMarks: a.maxMarks,
      percentage: a.percentage,
      feedbackReleased: a.feedbackReleased,
      submissionId: a.submissionId,
    }))

    // weakest topics first (matches previous display ordering)
    const topicMastery = [...d.topicMastery].sort((a, b) => a.percentage - b.percentage)

    return {
      success: true,
      data: {
        studentId: d.studentId,
        studentName: d.studentName,
        enrolledClasses: d.enrolledClasses,
        assignments,
        topicMastery,
        overallStats: d.overallStats,
      },
    }
  } catch (error) {
    console.error("Error in getStudentDashboardData:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// =====================================================
// Release Feedback & Generate Packs for All Students
// =====================================================

export interface BulkFeedbackResult {
  assignmentId: string
  assignmentTitle: string
  className: string
  totalStudents: number
  successCount: number
  failedCount: number
  studentFeedback: StudentFeedbackData[]
}

/**
 * Releases feedback and generates personalized feedback packs for all graded students
 * in an assignment. This is the main action called from the marking grid.
 *
 * Steps:
 * 1. Update assignment status to closed (the marked/released state)
 * 2. Publish feedbackSheets for all graded submissions (feedback_released = true)
 * 3. Generate StudentFeedbackData for each graded submission
 * 4. Return all feedback data for bulk printing
 */
export async function releaseFeedbackAndGeneratePacks(assignmentId: string): Promise<{
  success: boolean
  data?: BulkFeedbackResult
  error?: string
}> {
  const userId = await currentUserId()
  if (!userId) return { success: false, error: "You must be logged in" }

  try {
    const result = await fetchMutation(api.feedback.releaseFeedback, {
      assignmentId: assignmentId as Id<"assignments">,
      teacherId: userId,
    })

    if ("error" in result) {
      switch (result.error) {
        case "forbidden":
          return { success: false, error: "Permission denied" }
        case "no_graded":
          return { success: false, error: "No graded submissions found. Please grade students first." }
        default:
          return { success: false, error: "Assignment not found" }
      }
    }

    const { assignment, className, submissionIds } = result

    // Generate feedback for each student
    const studentFeedback: StudentFeedbackData[] = []
    let successCount = 0
    let failedCount = 0

    for (const sid of submissionIds) {
      const fb = await generateStudentFeedback(sid)

      if (fb.success && fb.data) {
        studentFeedback.push(fb.data)
        successCount++
      } else {
        console.error(`Failed to generate feedback for submission ${sid}:`, fb.error)
        failedCount++
      }
    }

    // Persist a revision list linked to this assignment (union of the targeted
    // revision questions across students) so it appears in the library/assignment.
    const revisionQuestionIds = [
      ...new Set(studentFeedback.flatMap((s) => s.revisionPack.map((q) => q.id))),
    ] as Id<"questions">[]
    if (revisionQuestionIds.length > 0) {
      await fetchMutation(api.revisionLists.createForAssignment, {
        teacherId: userId,
        assignmentId: assignmentId as Id<"assignments">,
        title: `Revision: ${assignment.title}`,
        questionIds: revisionQuestionIds,
      }).catch((e) => console.error("Failed to persist revision list:", e))
    }

    return {
      success: true,
      data: {
        assignmentId,
        assignmentTitle: assignment.title,
        className,
        totalStudents: submissionIds.length,
        successCount,
        failedCount,
        studentFeedback,
      },
    }
  } catch (error) {
    console.error("Error in releaseFeedbackAndGeneratePacks:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// =====================================================
// Get All Student Feedback for Bulk Print
// =====================================================

/**
 * Fetches all student feedback data for an assignment (for bulk printing)
 * This is used by the print-batch page to render all feedback sheets
 */
export async function getAssignmentFeedbackForPrint(assignmentId: string): Promise<{
  success: boolean
  data?: {
    assignmentTitle: string
    className: string
    studentFeedback: StudentFeedbackData[]
  }
  error?: string
}> {
  const userId = await currentUserId()
  if (!userId) return { success: false, error: "You must be logged in" }

  try {
    const result = await fetchQuery(api.feedback.getReleasedSubmissions, {
      assignmentId: assignmentId as Id<"assignments">,
      teacherId: userId,
    })

    if ("error" in result) {
      if (result.error === "forbidden") return { success: false, error: "Permission denied" }
      return { success: false, error: "Assignment not found" }
    }

    const { assignment, className, submissionIds } = result

    if (submissionIds.length === 0) {
      return {
        success: false,
        error: "No feedback available. Please release feedback first.",
      }
    }

    // Generate feedback for each student
    const studentFeedback: StudentFeedbackData[] = []

    for (const sid of submissionIds) {
      const fb = await generateStudentFeedback(sid)
      if (fb.success && fb.data) {
        studentFeedback.push(fb.data)
      }
    }

    // Sort by student name for consistent ordering
    studentFeedback.sort((a, b) => a.studentName.localeCompare(b.studentName))

    return {
      success: true,
      data: {
        assignmentTitle: assignment.title,
        className,
        studentFeedback,
      },
    }
  } catch (error) {
    console.error("Error in getAssignmentFeedbackForPrint:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
