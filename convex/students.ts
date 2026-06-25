import { v } from "convex/values"
import { query, mutation } from "./_generated/server"

/**
 * Student-facing read queries. All take a Convex `users` _id (resolved from the
 * Clerk id in the server action) and return shapes the student dashboard maps
 * onto its existing interfaces.
 */

/** Classes the student is enrolled in, with teacher details. */
export const getEnrolledClasses = query({
  args: { studentId: v.id("users") },
  handler: async (ctx, { studentId }) => {
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_student", (q) => q.eq("studentId", studentId))
      .collect()

    const rows = []
    for (const e of enrollments) {
      const cls = await ctx.db.get(e.classId)
      if (!cls) continue
      const teacher = await ctx.db.get(cls.teacherId)
      rows.push({
        classId: cls._id,
        className: cls.name,
        subject: cls.subject ?? "Mathematics",
        teacherName: teacher?.fullName ?? "Unknown Teacher",
        teacherEmail: teacher?.email ?? "",
        joinedAt: e.joinedAt ?? e._creationTime,
      })
    }
    return rows.sort((a, b) => b.joinedAt - a.joinedAt)
  },
})

/** Published assignments across the student's classes, with submission status. */
export const getAssignments = query({
  args: { studentId: v.id("users") },
  handler: async (ctx, { studentId }) => {
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_student", (q) => q.eq("studentId", studentId))
      .collect()

    const rows = []
    for (const e of enrollments) {
      const cls = await ctx.db.get(e.classId)
      if (!cls) continue

      const assignments = await ctx.db
        .query("assignments")
        .withIndex("by_class", (q) => q.eq("classId", e.classId))
        .collect()

      for (const a of assignments) {
        if (a.status !== "published") continue

        const submission = await ctx.db
          .query("submissions")
          .withIndex("by_assignment_student", (q) =>
            q.eq("assignmentId", a._id).eq("studentId", studentId),
          )
          .unique()

        const aqs = await ctx.db
          .query("assignmentQuestions")
          .withIndex("by_assignment", (q) => q.eq("assignmentId", a._id))
          .collect()
        let maxMarks = aqs.reduce((sum, aq) => sum + (aq.marks ?? 1), 0)
        if (maxMarks === 0 && a.totalMarks) maxMarks = a.totalMarks

        let feedbackReleased = false
        if (submission) {
          const sheet = await ctx.db
            .query("feedbackSheets")
            .withIndex("by_submission", (q) => q.eq("submissionId", submission._id))
            .first()
          feedbackReleased = !!sheet?.isPublished
        }

        const status: "todo" | "submitted" | "graded" = submission
          ? submission.status === "marked"
            ? "graded"
            : "submitted"
          : "todo"
        const score = submission?.totalMarksAwarded ?? null
        const percentage =
          score !== null && maxMarks > 0 ? Math.round((score / maxMarks) * 100) : null

        rows.push({
          id: a._id,
          title: a.title,
          classId: e.classId,
          className: cls.name,
          dueDate: a.dueDate ?? null,
          mode: a.mode === "paper" ? "paper" : "online",
          status,
          score,
          maxMarks,
          percentage,
          feedbackReleased,
          submittedAt: submission?.submittedAt ?? null,
          gradedAt: submission?.markedAt ?? null,
          submissionId: submission?._id ?? null,
        })
      }
    }

    // due date ascending, nulls last
    return rows.sort((a, b) => {
      if (a.dueDate == null && b.dueDate == null) return 0
      if (a.dueDate == null) return 1
      if (b.dueDate == null) return -1
      return a.dueDate - b.dueDate
    })
  },
})

/** Full assignment payload for a student to take (questions + existing answers). */
export const getAssignmentForTaking = query({
  args: { studentId: v.id("users"), assignmentId: v.id("assignments") },
  handler: async (ctx, { studentId, assignmentId }) => {
    const a = await ctx.db.get(assignmentId)
    if (!a || a.status !== "published") return { error: "not_found" as const }

    const enrollment = await ctx.db
      .query("enrollments")
      .withIndex("by_class_student", (q) =>
        q.eq("classId", a.classId).eq("studentId", studentId),
      )
      .unique()
    if (!enrollment) return { error: "not_enrolled" as const }

    const cls = await ctx.db.get(a.classId)

    const aqs = await ctx.db
      .query("assignmentQuestions")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", assignmentId))
      .collect()
    aqs.sort((x, y) => x.order - y.order)

    let totalMarks = 0
    const questions = []
    for (const aq of aqs) {
      const q = await ctx.db.get(aq.questionId)
      const marks = aq.marks ?? q?.marks ?? 1
      totalMarks += marks
      questions.push({
        id: aq.questionId,
        orderIndex: aq.order,
        marks,
        questionLatex: aq.questionLatex ?? q?.questionLatex ?? "",
        imageUrl: aq.imageUrl ?? q?.imageUrl ?? null,
        contentType: q?.contentType ?? "generated_text",
        topic: q?.topic ?? q?.topicName ?? "",
        subTopic: q?.subTopic ?? null,
        calculatorAllowed: q?.calculatorAllowed ?? false,
      })
    }

    const submission = await ctx.db
      .query("submissions")
      .withIndex("by_assignment_student", (q) =>
        q.eq("assignmentId", assignmentId).eq("studentId", studentId),
      )
      .unique()

    const answers: Record<string, string> = {}
    if (submission) {
      const aqToQuestion = new Map(aqs.map((aq) => [aq._id, aq.questionId as string]))
      const sa = await ctx.db
        .query("submissionAnswers")
        .withIndex("by_submission", (q) => q.eq("submissionId", submission._id))
        .collect()
      for (const ans of sa) {
        const qId = aqToQuestion.get(ans.assignmentQuestionId)
        if (qId && ans.answerText != null) answers[qId] = ans.answerText
      }
    }

    return {
      id: a._id,
      title: a.title,
      className: cls?.name ?? "",
      dueDate: a.dueDate ?? null,
      mode: a.mode === "paper" ? "paper" : "online",
      totalMarks,
      questions,
      existingSubmission: submission
        ? {
            id: submission._id,
            status: submission.status ?? "in_progress",
            answers,
            score: submission.totalMarksAwarded ?? null,
            submittedAt: submission.submittedAt ?? null,
            gradedAt: submission.markedAt ?? null,
          }
        : null,
    }
  },
})

/**
 * Aggregated dashboard payload: enrolled classes, assignments, topic mastery
 * (computed from graded submission answers), and overall stats.
 */
export const getDashboard = query({
  args: { studentId: v.id("users") },
  handler: async (ctx, { studentId }) => {
    const student = await ctx.db.get(studentId)

    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_student", (q) => q.eq("studentId", studentId))
      .collect()

    const enrolledClasses = []
    const assignments = []
    for (const e of enrollments) {
      const cls = await ctx.db.get(e.classId)
      if (!cls) continue
      const teacher = await ctx.db.get(cls.teacherId)
      enrolledClasses.push({
        id: cls._id,
        name: cls.name,
        subject: cls.subject ?? "Mathematics",
        teacherName: teacher?.fullName ?? teacher?.email ?? "Unknown",
      })

      const classAssignments = await ctx.db
        .query("assignments")
        .withIndex("by_class", (q) => q.eq("classId", e.classId))
        .collect()
      for (const a of classAssignments) {
        if (a.status !== "published") continue
        const submission = await ctx.db
          .query("submissions")
          .withIndex("by_assignment_student", (q) =>
            q.eq("assignmentId", a._id).eq("studentId", studentId),
          )
          .unique()
        const aqs = await ctx.db
          .query("assignmentQuestions")
          .withIndex("by_assignment", (q) => q.eq("assignmentId", a._id))
          .collect()
        let maxMarks = aqs.reduce((s, aq) => s + (aq.marks ?? 1), 0)
        if (maxMarks === 0 && a.totalMarks) maxMarks = a.totalMarks

        let feedbackReleased = false
        if (submission) {
          const sheet = await ctx.db
            .query("feedbackSheets")
            .withIndex("by_submission", (q) => q.eq("submissionId", submission._id))
            .first()
          feedbackReleased = !!sheet?.isPublished
        }
        const status: "pending" | "submitted" | "graded" = submission
          ? submission.status === "marked"
            ? "graded"
            : "submitted"
          : "pending"
        const score = submission?.totalMarksAwarded ?? null
        const percentage =
          score !== null && maxMarks > 0 ? Math.round((score / maxMarks) * 100) : null
        assignments.push({
          id: a._id,
          title: a.title,
          className: cls.name,
          dueDate: a.dueDate ?? null,
          status,
          score,
          maxMarks,
          percentage,
          feedbackReleased,
          submissionId: submission?._id ?? null,
        })
      }
    }

    // Topic mastery from graded submissions.
    const topicStats = new Map<string, { total: number; correct: number }>()
    const subs = await ctx.db
      .query("submissions")
      .withIndex("by_student", (q) => q.eq("studentId", studentId))
      .collect()
    for (const s of subs) {
      if (s.status !== "marked") continue
      const answers = await ctx.db
        .query("submissionAnswers")
        .withIndex("by_submission", (q) => q.eq("submissionId", s._id))
        .collect()
      for (const ans of answers) {
        const aq = await ctx.db.get(ans.assignmentQuestionId)
        if (!aq) continue
        const q = await ctx.db.get(aq.questionId)
        const topic = q?.topic ?? q?.topicName ?? "General"
        const max = ans.marksMax ?? aq.marks ?? q?.marks ?? 1
        const st = topicStats.get(topic) ?? { total: 0, correct: 0 }
        st.total += max
        st.correct += ans.marksAwarded ?? 0
        topicStats.set(topic, st)
      }
    }
    const topicMastery = [...topicStats.entries()].map(([topic, s]) => {
      const percentage = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0
      return {
        topic,
        totalQuestions: s.total,
        correctAnswers: s.correct,
        percentage,
        status:
          percentage >= 70 ? "strong" : percentage >= 40 ? "developing" : "weak",
      } as const
    })

    const graded = assignments.filter((a) => a.percentage !== null)
    const averageScore =
      graded.length > 0
        ? Math.round(graded.reduce((sum, a) => sum + (a.percentage ?? 0), 0) / graded.length)
        : 0
    const sortedTopics = [...topicMastery].sort((a, b) => b.percentage - a.percentage)

    return {
      studentId,
      studentName: student?.fullName ?? student?.email ?? "Student",
      enrolledClasses,
      assignments,
      topicMastery,
      overallStats: {
        completedAssignments: assignments.filter((a) => a.status !== "pending").length,
        totalAssignments: assignments.length,
        averageScore,
        bestTopic: sortedTopics[0]?.topic ?? null,
        weakestTopic: sortedTopics[sortedTopics.length - 1]?.topic ?? null,
      },
    }
  },
})

/**
 * Final submission: creates the submission, writes one submissionAnswers row
 * per answered question (mapping questionId → assignmentQuestionId), and marks
 * it submitted. Rejects if not enrolled, not published, or already submitted.
 */
export const submitStudentAssignment = mutation({
  args: {
    studentId: v.id("users"),
    assignmentId: v.id("assignments"),
    answers: v.record(v.string(), v.string()),
  },
  handler: async (ctx, { studentId, assignmentId, answers }) => {
    const a = await ctx.db.get(assignmentId)
    if (!a || a.status !== "published") return { error: "not_found" as const }

    const enrollment = await ctx.db
      .query("enrollments")
      .withIndex("by_class_student", (q) =>
        q.eq("classId", a.classId).eq("studentId", studentId),
      )
      .unique()
    if (!enrollment) return { error: "not_enrolled" as const }

    const existing = await ctx.db
      .query("submissions")
      .withIndex("by_assignment_student", (q) =>
        q.eq("assignmentId", assignmentId).eq("studentId", studentId),
      )
      .unique()
    if (existing) return { error: "already_submitted" as const }

    const submissionId = await ctx.db.insert("submissions", {
      assignmentId,
      studentId,
      status: "submitted",
      submittedAt: Date.now(),
    })

    // Map questionId → assignmentQuestionId for this assignment.
    const aqs = await ctx.db
      .query("assignmentQuestions")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", assignmentId))
      .collect()
    const questionToAq = new Map(aqs.map((aq) => [aq.questionId as string, aq._id]))

    for (const [questionId, answerText] of Object.entries(answers)) {
      const assignmentQuestionId = questionToAq.get(questionId)
      if (!assignmentQuestionId) continue
      await ctx.db.insert("submissionAnswers", {
        submissionId,
        assignmentQuestionId,
        answerText,
      })
    }

    return { submissionId }
  },
})
