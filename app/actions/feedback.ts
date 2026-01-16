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
        // Exclude questions already in this assignment
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
  contentType: "generated_text" | "image_ocr"
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
    interface QuestionData {
      id: string
      questionLatex: string
      marks: number
      topic: string
      subTopic: string
      difficulty: string
      imageUrl: string | null
      contentType: string
    }

    const questions: QuestionData[] = (junctionQuestions || []).map((q: {
      question_id: string
      question_latex: string
      marks: number
      topic: string
      sub_topic: string
      difficulty: string
    }) => {
      const details = questionDetails[q.question_id]
      return {
        id: q.question_id,
        questionLatex: q.question_latex || "",
        marks: q.marks || 1,
        topic: q.topic || "General",
        subTopic: q.sub_topic || q.topic || "General",
        difficulty: details?.difficulty || q.difficulty || "Foundation",
        imageUrl: details?.image_url || null,
        contentType: details?.content_type || "generated_text",
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
    const assignmentQuestionIds = questions.map(q => q.id)

    for (const weak of weakSubTopics) {
      // Query for 1-2 NEW questions matching sub_topic and difficulty
      // Exclude questions already in the assignment
      const { data: revisionQs } = await supabase
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
        .not("id", "in", `(${assignmentQuestionIds.map(id => `"${id}"`).join(",")})`)
        .limit(2)

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
        const { data: topicQs } = await supabase
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
          .not("id", "in", `(${assignmentQuestionIds.map(id => `"${id}"`).join(",")})`)
          .limit(1)

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

    // Get enrolled classes
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select(`
        class_id,
        classes!inner(
          id,
          name,
          subject,
          teacher_id,
          profiles!classes_teacher_id_fkey(full_name, email)
        )
      `)
      .eq("student_id", user.id)

    const enrolledClasses: StudentDashboardData["enrolledClasses"] = []
    const classIds: string[] = []

    if (enrollments) {
      for (const e of enrollments) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cls = e.classes as any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const teacher = cls.profiles as any
        
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
          .select("assignment_id, score, status, grading_data, feedback_released")
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
              .select("id, marks, topic")
              .in("id", questionIds)

            if (questionData) {
              maxMarks = questionData.reduce((sum, q) => sum + (q.marks || 1), 0)

              // Update topic stats if graded
              if (submission?.status === "graded") {
                const gradingData = (submission.grading_data || {}) as Record<string, { score: number }>
                
                for (const q of questionData) {
                  const key = q.topic
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

          const percentage = submission?.score && maxMarks > 0 
            ? Math.round((submission.score / maxMarks) * 100) 
            : null

          assignments.push({
            id: a.id,
            title: a.title,
            className: cls.name,
            dueDate: a.due_date,
            status,
            score: submission?.score || null,
            maxMarks,
            percentage,
            feedbackReleased: submission?.feedback_released || false,
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
