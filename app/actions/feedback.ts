"use server"

import { createClient } from "@/lib/supabase/server"

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
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: "You must be logged in" }
  }

  try {
    // 1. Fetch assignment with class info
    const { data: assignment, error: assignmentError } = await supabase
      .from("assignments")
      .select(`
        id,
        title,
        class_id,
        content,
        classes!inner(
          id,
          name,
          teacher_id
        )
      `)
      .eq("id", assignmentId)
      .single()

    if (assignmentError || !assignment) {
      return { success: false, error: "Assignment not found" }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const classData = assignment.classes as any
    if (classData.teacher_id !== user.id) {
      return { success: false, error: "Permission denied" }
    }

    // 2. Get questions for this assignment
    const { data: junctionQuestions } = await supabase.rpc(
      "get_assignment_questions",
      { p_assignment_id: assignmentId }
    )

    let questions: {
      id: string
      question_latex: string
      marks: number
      topic: string
      sub_topic: string | null
      difficulty: string
      is_ghost?: boolean
    }[] = []

    if (junctionQuestions && junctionQuestions.length > 0) {
      // Now supports both bank questions and ghost questions (external papers)
      questions = junctionQuestions.map((q: {
        question_id: string
        question_latex: string
        marks: number
        topic: string
        sub_topic: string
        difficulty: string
        is_ghost?: boolean
      }) => ({
        id: q.question_id,
        question_latex: q.question_latex,
        marks: q.marks,
        topic: q.topic,
        sub_topic: q.sub_topic,
        difficulty: q.difficulty,
        is_ghost: q.is_ghost || false,
      }))
    } else {
      // Fallback to JSONB
      const questionIds = (assignment.content as { question_ids?: string[] })?.question_ids || []
      if (questionIds.length > 0) {
        const { data: questionsData } = await supabase
          .from("questions")
          .select("id, question_latex, marks, topic, sub_topic, difficulty")
          .in("id", questionIds)

        if (questionsData) {
          questions = questionsData.map(q => ({
            id: q.id,
            question_latex: q.question_latex || "",
            marks: q.marks || 1,
            topic: q.topic || "General",
            sub_topic: q.sub_topic || null,
            difficulty: q.difficulty || "Foundation",
          }))
        }
      }
    }

    // 3. Get all submissions with student profiles
    const { data: submissions } = await supabase
      .from("submissions")
      .select(`
        id,
        student_id,
        score,
        grading_data,
        status,
        profiles!inner(
          id,
          full_name,
          email
        )
      `)
      .eq("assignment_id", assignmentId)
      .eq("status", "graded")

    if (!submissions || submissions.length === 0) {
      return {
        success: true,
        data: {
          assignmentId,
          assignmentTitle: assignment.title,
          className: classData.name,
          totalStudents: 0,
          gradedStudents: 0,
          averageScore: 0,
          topicBreakdown: [],
          studentFeedback: [],
        },
      }
    }

    // 4. Calculate topic performance for each student
    const maxMarks = questions.reduce((sum, q) => sum + q.marks, 0)
    const studentFeedback: StudentFeedback[] = []
    const topicStats: Map<string, { total: number; earned: number; count: number }> = new Map()

    for (const submission of submissions) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const profile = submission.profiles as any
      const gradingData = (submission.grading_data || {}) as Record<string, { score: number }>

      // Calculate per-topic performance
      const topicPerf: Map<string, TopicPerformance> = new Map()

      for (const question of questions) {
        const key = question.topic
        const earned = gradingData[question.id]?.score || 0

        if (!topicPerf.has(key)) {
          topicPerf.set(key, {
            topic: question.topic,
            subTopic: question.sub_topic,
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
        
        // Get questions from question bank that match weak topics
        // Only exclude non-ghost questions (ghost questions use assignment_question IDs)
        const realQuestionIds = questions.filter(q => !q.is_ghost).map(q => q.id)
        
        let query = supabase
          .from("questions")
          .select("id, question_latex, image_url, marks, topic, sub_topic, difficulty")
          .in("topic", weakTopicNames)
          .limit(10)
        
        // Only add exclusion filter if there are real questions to exclude
        if (realQuestionIds.length > 0) {
          query = query.not("id", "in", `(${realQuestionIds.map(id => `"${id}"`).join(",")})`)
        }
        
        const { data: revisionQs } = await query

        if (revisionQs) {
          for (const q of revisionQs) {
            revisionQuestions.push({
              id: q.id,
              questionLatex: q.question_latex || "",
              imageUrl: q.image_url,
              marks: q.marks || 1,
              topic: q.topic,
              subTopic: q.sub_topic,
              difficulty: q.difficulty,
              targetedTopic: q.topic,
            })
          }
        }
      }

      const overallPercentage = maxMarks > 0 
        ? Math.round((submission.score || 0) / maxMarks * 100) 
        : 0

      studentFeedback.push({
        studentId: profile.id,
        studentName: profile.full_name || profile.email.split("@")[0],
        studentEmail: profile.email,
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
        className: classData.name,
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
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: "You must be logged in" }
  }

  // If no studentId provided, use current user
  const targetStudentId = studentId || user.id

  try {
    // Get assignment
    const { data: assignment } = await supabase
      .from("assignments")
      .select("id, title")
      .eq("id", assignmentId)
      .single()

    if (!assignment) {
      return { success: false, error: "Assignment not found" }
    }

    // Get submission
    const { data: submission } = await supabase
      .from("submissions")
      .select("*, profiles!inner(id, full_name, email)")
      .eq("assignment_id", assignmentId)
      .eq("student_id", targetStudentId)
      .single()

    if (!submission) {
      return { success: false, error: "No submission found" }
    }

    // Check if feedback is released (unless teacher is viewing)
    const isTeacher = studentId && studentId !== user.id
    if (!isTeacher && !submission.feedback_released) {
      return { success: false, error: "Feedback not yet released" }
    }

    // Get questions
    const { data: junctionQuestions } = await supabase.rpc(
      "get_assignment_questions",
      { p_assignment_id: assignmentId }
    )

    let questions: {
      id: string
      question_latex: string
      marks: number
      topic: string
      sub_topic: string | null
      difficulty: string
    }[] = []

    if (junctionQuestions && junctionQuestions.length > 0) {
      questions = junctionQuestions.map((q: {
        question_id: string
        question_latex: string
        marks: number
        topic: string
        sub_topic: string
        difficulty: string
      }) => ({
        id: q.question_id,
        question_latex: q.question_latex,
        marks: q.marks,
        topic: q.topic,
        sub_topic: q.sub_topic,
        difficulty: q.difficulty,
      }))
    }

    // Calculate topic performance
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profile = submission.profiles as any
    const gradingData = (submission.grading_data || {}) as Record<string, { score: number }>
    const maxMarks = questions.reduce((sum, q) => sum + q.marks, 0)

    const topicPerf: Map<string, TopicPerformance> = new Map()

    for (const question of questions) {
      const key = question.topic
      const earned = gradingData[question.id]?.score || 0

      if (!topicPerf.has(key)) {
        topicPerf.set(key, {
          topic: question.topic,
          subTopic: question.sub_topic,
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
      
      const { data: revisionQs } = await supabase
        .from("questions")
        .select("id, question_latex, image_url, marks, topic, sub_topic, difficulty")
        .in("topic", weakTopicNames)
        .not("id", "in", `(${questions.map(q => `"${q.id}"`).join(",")})`)
        .limit(10)

      if (revisionQs) {
        for (const q of revisionQs) {
          revisionQuestions.push({
            id: q.id,
            questionLatex: q.question_latex || "",
            imageUrl: q.image_url,
            marks: q.marks || 1,
            topic: q.topic,
            subTopic: q.sub_topic,
            difficulty: q.difficulty,
            targetedTopic: q.topic,
          })
        }
      }
    }

    const overallPercentage = maxMarks > 0 
      ? Math.round((submission.score || 0) / maxMarks * 100) 
      : 0

    return {
      success: true,
      data: {
        studentId: profile.id,
        studentName: profile.full_name || profile.email.split("@")[0],
        studentEmail: profile.email,
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
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: "You must be logged in" }
  }

  try {
    // =========================================================
    // STEP A: Fetch Data
    // =========================================================

    // A1: Get the submission with grading data
    const { data: submission, error: submissionError } = await supabase
      .from("submissions")
      .select(`
        id,
        assignment_id,
        student_id,
        score,
        grading_data,
        status
      `)
      .eq("id", submissionId)
      .single()

    if (submissionError || !submission) {
      console.error("Submission error:", submissionError)
      return { success: false, error: "Submission not found" }
    }

    // Check submission is graded
    if (submission.status !== "graded") {
      return { success: false, error: "Submission has not been graded yet" }
    }

    // A1b: Get the student profile separately
    const { data: studentProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", submission.student_id)
      .single()

    if (profileError || !studentProfile) {
      console.error("Profile error:", profileError)
      return { success: false, error: "Student profile not found" }
    }

    // A2: Get the assignment with class info
    const { data: assignment, error: assignmentError } = await supabase
      .from("assignments")
      .select(`
        id,
        title,
        class_id,
        classes!inner(
          id,
          name,
          teacher_id
        )
      `)
      .eq("id", submission.assignment_id)
      .single()

    if (assignmentError || !assignment) {
      return { success: false, error: "Assignment not found" }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const classData = assignment.classes as any

    // Permission check: user must be the teacher or the student
    const isTeacher = classData.teacher_id === user.id
    const isStudent = submission.student_id === user.id
    
    if (!isTeacher && !isStudent) {
      return { success: false, error: "Permission denied" }
    }

    // A3: Get questions for this assignment
    const { data: junctionQuestions, error: questionsError } = await supabase.rpc(
      "get_assignment_questions",
      { p_assignment_id: submission.assignment_id }
    )

    if (questionsError) {
      console.error("Questions error:", questionsError)
      return { success: false, error: "Failed to fetch questions" }
    }

    // Get full question details including image_url and content_type
    const questionIds = (junctionQuestions || []).map((q: { question_id: string }) => q.question_id)
    
    let questionDetails: Record<string, { 
      image_url: string | null
      content_type: string
      difficulty: string
    }> = {}

    if (questionIds.length > 0) {
      const { data: fullQuestions } = await supabase
        .from("questions")
        .select("id, image_url, content_type, difficulty")
        .in("id", questionIds)

      if (fullQuestions) {
        questionDetails = Object.fromEntries(
          fullQuestions.map((q) => [q.id, { 
            image_url: q.image_url, 
            content_type: q.content_type,
            difficulty: q.difficulty 
          }])
        )
      }
    }

    // Build questions array with all metadata
    // Now supports both bank questions and ghost questions (external papers)
    interface QuestionData {
      id: string
      questionLatex: string
      marks: number
      topic: string
      subTopic: string
      difficulty: string
      imageUrl: string | null
      contentType: string
      isGhost: boolean
      customQuestionNumber: string | null
    }

    const questions: QuestionData[] = (junctionQuestions || []).map((q: {
      question_id: string
      question_latex: string
      marks: number
      topic: string
      sub_topic: string
      difficulty: string
      is_ghost?: boolean
      custom_question_number?: string | null
    }) => {
      const isGhost = q.is_ghost || false
      const details = isGhost ? null : questionDetails[q.question_id]
      return {
        id: q.question_id,
        questionLatex: q.question_latex || "",
        marks: q.marks || 1,
        topic: q.topic || "General",
        subTopic: q.sub_topic || q.topic || "General",
        difficulty: details?.difficulty || q.difficulty || "Foundation",
        imageUrl: isGhost ? null : (details?.image_url || null),
        contentType: isGhost ? "ghost" : (details?.content_type || "generated_text"),
        isGhost,
        customQuestionNumber: q.custom_question_number || null,
      }
    })

    // =========================================================
    // STEP B: RAG Analysis - Group by sub_topic
    // =========================================================

    const gradingData = (submission.grading_data || {}) as Record<string, { score: number }>

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
      const earnedScore = gradingData[question.id]?.score || 0

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

      topicBreakdown.push({
        topic: entry.topic,
        subTopic: entry.subTopic,
        score: entry.score,
        total: entry.total,
        percentage,
        status,
        questionIds: entry.questionIds,
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
    // Only exclude real questions (not ghost questions) from revision pack
    // Ghost questions use assignment_question IDs, not real question IDs
    const assignmentQuestionIds = questions.filter(q => !q.isGhost).map(q => q.id)

    for (const weak of weakSubTopics) {
      // Query for 1-2 NEW questions matching sub_topic and difficulty
      // Exclude questions already in the assignment (only non-ghost ones)
      const excludeClause = assignmentQuestionIds.length > 0 
        ? `.not("id", "in", "(${assignmentQuestionIds.map(id => `"${id}"`).join(",")})")`
        : ""
      
      let query = supabase
        .from("questions")
        .select(`
          id,
          question_latex,
          image_url,
          content_type,
          marks,
          topic,
          sub_topic,
          difficulty,
          answer_key
        `)
        .eq("sub_topic", weak.subTopic)
        .eq("difficulty", weak.difficulty)
        .limit(2)
      
      // Only add exclusion filter if there are real questions to exclude
      if (assignmentQuestionIds.length > 0) {
        query = query.not("id", "in", `(${assignmentQuestionIds.map(id => `"${id}"`).join(",")})`)
      }
      
      const { data: revisionQs } = await query

      if (revisionQs && revisionQs.length > 0) {
        for (const q of revisionQs) {
          // Avoid duplicates in revision pack
          if (!revisionPack.find(rq => rq.id === q.id)) {
            revisionPack.push({
              id: q.id,
              questionLatex: q.question_latex || "",
              imageUrl: q.image_url,
              contentType: (q.content_type as "generated_text" | "image_ocr") || "generated_text",
              marks: q.marks || 1,
              topic: q.topic,
              subTopic: q.sub_topic,
              difficulty: q.difficulty,
              answerKey: q.answer_key as { answer?: string; explanation?: string } | null,
              targetedSubTopic: weak.subTopic,
            })
          }
        }
      }

      // If no exact sub_topic match, try topic-level match
      if (!revisionQs || revisionQs.length === 0) {
        let topicQuery = supabase
          .from("questions")
          .select(`
            id,
            question_latex,
            image_url,
            content_type,
            marks,
            topic,
            sub_topic,
            difficulty,
            answer_key
          `)
          .eq("topic", weak.topic)
          .eq("difficulty", weak.difficulty)
          .limit(1)
        
        // Only add exclusion filter if there are real questions to exclude
        if (assignmentQuestionIds.length > 0) {
          topicQuery = topicQuery.not("id", "in", `(${assignmentQuestionIds.map(id => `"${id}"`).join(",")})`)
        }
        
        const { data: topicQs } = await topicQuery

        if (topicQs && topicQs.length > 0) {
          for (const q of topicQs) {
            if (!revisionPack.find(rq => rq.id === q.id)) {
              revisionPack.push({
                id: q.id,
                questionLatex: q.question_latex || "",
                imageUrl: q.image_url,
                contentType: (q.content_type as "generated_text" | "image_ocr") || "generated_text",
                marks: q.marks || 1,
                topic: q.topic,
                subTopic: q.sub_topic,
                difficulty: q.difficulty,
                answerKey: q.answer_key as { answer?: string; explanation?: string } | null,
                targetedSubTopic: weak.subTopic,
              })
            }
          }
        }
      }
    }

    // =========================================================
    // STEP D: Return Payload
    // =========================================================

    const maxMarks = questions.reduce((sum, q) => sum + q.marks, 0)
    const totalScore = submission.score || 0
    const percentage = maxMarks > 0 ? Math.round((totalScore / maxMarks) * 100) : 0

    return {
      success: true,
      data: {
        submissionId: submission.id,
        studentId: studentProfile.id,
        studentName: studentProfile.full_name || studentProfile.email?.split("@")[0] || "Student",
        studentEmail: studentProfile.email || "",
        assignmentId: assignment.id,
        assignmentTitle: assignment.title,
        className: classData.name,
        totalScore,
        maxMarks,
        percentage,
        overallStatus: calculateRAGStatusHelper(percentage),
        topicBreakdown,
        revisionPack,
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
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: "You must be logged in" }
  }

  try {
    // Get student profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", user.id)
      .single()

    if (!profile) {
      return { success: false, error: "Profile not found" }
    }

    // Get enrolled classes (simpler query without nested profile join)
    const { data: enrollments, error: enrollError } = await supabase
      .from("enrollments")
      .select(`
        class_id,
        classes!inner(
          id,
          name,
          subject,
          teacher_id
        )
      `)
      .eq("student_id", user.id)

    if (enrollError) {
      console.error("Enrollment query error:", enrollError)
    }

    const enrolledClasses: StudentDashboardData["enrolledClasses"] = []
    const classIds: string[] = []

    if (enrollments && enrollments.length > 0) {
      // Get teacher IDs to fetch their profiles separately
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const teacherIds = [...new Set(enrollments.map((e: any) => e.classes.teacher_id))]
      
      // Fetch teacher profiles
      const { data: teachers } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", teacherIds)

      const teacherMap = new Map(
        (teachers || []).map(t => [t.id, t])
      )

      for (const e of enrollments) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cls = e.classes as any
        const teacher = teacherMap.get(cls.teacher_id)
        
        enrolledClasses.push({
          id: cls.id,
          name: cls.name,
          subject: cls.subject,
          teacherName: teacher?.full_name || teacher?.email || "Unknown",
        })
        classIds.push(cls.id)
      }
    }

    // Get assignments for enrolled classes
    const assignments: StudentDashboardData["assignments"] = []
    const topicStats: Map<string, { total: number; correct: number }> = new Map()

    if (classIds.length > 0) {
      const { data: classAssignments } = await supabase
        .from("assignments")
        .select(`
          id,
          title,
          class_id,
          due_date,
          status,
          content,
          classes!inner(name)
        `)
        .in("class_id", classIds)
        .eq("status", "published")
        .order("due_date", { ascending: true })

      if (classAssignments) {
        // Get submissions for these assignments
        const assignmentIds = classAssignments.map(a => a.id)
        const { data: submissions } = await supabase
          .from("submissions")
          .select("id, assignment_id, score, status, grading_data, feedback_released")
          .eq("student_id", user.id)
          .in("assignment_id", assignmentIds)

        const submissionMap = new Map(
          (submissions || []).map(s => [s.assignment_id, s])
        )

        for (const a of classAssignments) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const cls = a.classes as any
          const submission = submissionMap.get(a.id)
          
          // Get max marks from questions
          let maxMarks = 0
          const questionIds = (a.content as { question_ids?: string[] })?.question_ids || []
          
          if (questionIds.length > 0) {
            const { data: questionData } = await supabase
              .from("questions")
              .select("id, marks, topic, sub_topic")
              .in("id", questionIds)

            if (questionData) {
              maxMarks = questionData.reduce((sum, q) => sum + (q.marks || 1), 0)

              // Update topic stats if graded
              if (submission?.status === "graded") {
                const gradingData = (submission.grading_data || {}) as Record<string, { score: number }>
                
                for (const q of questionData) {
                  // Use sub_topic for more granular tracking, fallback to topic
                  const key = q.sub_topic || q.topic || "General"
                  if (!key) continue // Skip if no topic info
                  
                  const earned = gradingData[q.id]?.score || 0
                  const total = q.marks || 1

                  if (!topicStats.has(key)) {
                    topicStats.set(key, { total: 0, correct: 0 })
                  }
                  const stat = topicStats.get(key)!
                  stat.total += total
                  stat.correct += earned
                }
              }
            }
          }

          const status: "pending" | "submitted" | "graded" = !submission 
            ? "pending" 
            : submission.status === "graded" 
              ? "graded" 
              : "submitted"

          // Calculate percentage - handle 0 scores correctly (not falsy)
          const percentage = submission?.score !== undefined && submission?.score !== null && maxMarks > 0 
            ? Math.round((submission.score / maxMarks) * 100) 
            : null

          assignments.push({
            id: a.id,
            title: a.title,
            className: cls.name,
            dueDate: a.due_date,
            status,
            score: submission?.score ?? null,
            maxMarks,
            percentage,
            feedbackReleased: submission?.feedback_released || false,
            submissionId: submission?.id || null,
          })
        }
      }
    }

    // Build topic mastery
    const topicMastery: StudentDashboardData["topicMastery"] = []
    let bestTopic: string | null = null
    let bestPercentage = 0
    let weakestTopic: string | null = null
    let weakestPercentage = 100

    for (const [topic, stats] of topicStats) {
      const percentage = stats.total > 0 
        ? Math.round((stats.correct / stats.total) * 100) 
        : 0
      
      let status: "weak" | "developing" | "strong" = "strong"
      if (percentage < 40) status = "weak"
      else if (percentage < 70) status = "developing"

      topicMastery.push({
        topic,
        totalQuestions: stats.total,
        correctAnswers: stats.correct,
        percentage,
        status,
      })

      if (percentage > bestPercentage) {
        bestPercentage = percentage
        bestTopic = topic
      }
      if (percentage < weakestPercentage) {
        weakestPercentage = percentage
        weakestTopic = topic
      }
    }

    // Sort by percentage (worst first)
    topicMastery.sort((a, b) => a.percentage - b.percentage)

    // Calculate overall stats
    const completedAssignments = assignments.filter(a => a.status === "graded").length
    const totalAssignments = assignments.length
    const gradedAssignments = assignments.filter(a => a.percentage !== null)
    const averageScore = gradedAssignments.length > 0
      ? Math.round(gradedAssignments.reduce((sum, a) => sum + (a.percentage || 0), 0) / gradedAssignments.length)
      : 0

    return {
      success: true,
      data: {
        studentId: profile.id,
        studentName: profile.full_name || profile.email.split("@")[0],
        enrolledClasses,
        assignments,
        topicMastery,
        overallStats: {
          completedAssignments,
          totalAssignments,
          averageScore,
          bestTopic,
          weakestTopic,
        },
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
 * 1. Update assignment status to 'graded'
 * 2. Set feedback_released = true for all submissions
 * 3. Generate StudentFeedbackData for each graded submission
 * 4. Return all feedback data for bulk printing
 */
export async function releaseFeedbackAndGeneratePacks(assignmentId: string): Promise<{
  success: boolean
  data?: BulkFeedbackResult
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
    // 1. Fetch assignment and verify teacher permission
    const { data: assignment, error: assignmentError } = await supabase
      .from("assignments")
      .select(`
        id,
        title,
        class_id,
        status,
        classes!inner(
          id,
          name,
          teacher_id
        )
      `)
      .eq("id", assignmentId)
      .single()

    if (assignmentError || !assignment) {
      return { success: false, error: "Assignment not found" }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const classData = assignment.classes as any
    if (classData.teacher_id !== user.id) {
      return { success: false, error: "Permission denied" }
    }

    // 2. Update assignment status to 'graded' if not already
    if (assignment.status !== "graded") {
      const { error: updateAssignmentError } = await supabase
        .from("assignments")
        .update({ status: "graded" })
        .eq("id", assignmentId)

      if (updateAssignmentError) {
        console.error("Failed to update assignment status:", updateAssignmentError)
        return { success: false, error: "Failed to update assignment status" }
      }
    }

    // 3. Get all graded submissions for this assignment
    const { data: submissions, error: submissionsError } = await supabase
      .from("submissions")
      .select("id, student_id, status")
      .eq("assignment_id", assignmentId)
      .eq("status", "graded")

    if (submissionsError) {
      console.error("Failed to fetch submissions:", submissionsError)
      return { success: false, error: "Failed to fetch submissions" }
    }

    if (!submissions || submissions.length === 0) {
      return { 
        success: false, 
        error: "No graded submissions found. Please grade students first." 
      }
    }

    // 4. Release feedback for all submissions
    const { error: releaseError } = await supabase
      .from("submissions")
      .update({ feedback_released: true })
      .eq("assignment_id", assignmentId)
      .eq("status", "graded")

    if (releaseError) {
      console.error("Failed to release feedback:", releaseError)
      return { success: false, error: "Failed to release feedback" }
    }

    // 5. Generate feedback for each student
    const studentFeedback: StudentFeedbackData[] = []
    let successCount = 0
    let failedCount = 0

    for (const submission of submissions) {
      const result = await generateStudentFeedback(submission.id)
      
      if (result.success && result.data) {
        studentFeedback.push(result.data)
        successCount++
      } else {
        console.error(`Failed to generate feedback for submission ${submission.id}:`, result.error)
        failedCount++
      }
    }

    return {
      success: true,
      data: {
        assignmentId,
        assignmentTitle: assignment.title,
        className: classData.name,
        totalStudents: submissions.length,
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
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: "You must be logged in" }
  }

  try {
    // Fetch assignment and verify teacher permission
    const { data: assignment, error: assignmentError } = await supabase
      .from("assignments")
      .select(`
        id,
        title,
        class_id,
        classes!inner(
          id,
          name,
          teacher_id
        )
      `)
      .eq("id", assignmentId)
      .single()

    if (assignmentError || !assignment) {
      return { success: false, error: "Assignment not found" }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const classData = assignment.classes as any
    if (classData.teacher_id !== user.id) {
      return { success: false, error: "Permission denied" }
    }

    // Get all graded submissions with feedback released
    const { data: submissions, error: submissionsError } = await supabase
      .from("submissions")
      .select("id")
      .eq("assignment_id", assignmentId)
      .eq("status", "graded")
      .eq("feedback_released", true)

    if (submissionsError) {
      return { success: false, error: "Failed to fetch submissions" }
    }

    if (!submissions || submissions.length === 0) {
      return { 
        success: false, 
        error: "No feedback available. Please release feedback first." 
      }
    }

    // Generate feedback for each student
    const studentFeedback: StudentFeedbackData[] = []

    for (const submission of submissions) {
      const result = await generateStudentFeedback(submission.id)
      if (result.success && result.data) {
        studentFeedback.push(result.data)
      }
    }

    // Sort by student name for consistent ordering
    studentFeedback.sort((a, b) => a.studentName.localeCompare(b.studentName))

    return {
      success: true,
      data: {
        assignmentTitle: assignment.title,
        className: classData.name,
        studentFeedback,
      },
    }
  } catch (error) {
    console.error("Error in getAssignmentFeedbackForPrint:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
