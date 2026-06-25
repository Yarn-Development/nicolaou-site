import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

/**
 * Teacher-facing marking queries/mutations. All take explicit Convex `users`
 * _ids (resolved from the Clerk id in the server action) rather than reading
 * from ctx.auth.
 *
 * Notes on schema mapping vs the legacy shape:
 * - `profiles` -> `users`
 * - submission "score" -> `submissions.totalMarksAwarded`
 * - status 'graded' -> 'marked'; `graded_at` -> `markedAt`
 * - Per-question marks are rows in `submissionAnswers` (keyed by
 *   assignmentQuestionId), NOT a `grading_data` JSON blob. The client keys its
 *   grading data by questionId, so we translate questionId <-> assignmentQuestionId
 *   here.
 * - `feedback_released` lives on `feedbackSheets.isPublished` (no column on the
 *   submission itself).
 */

/** Full payload for the marking interface. */
export const getMarkingData = query({
  args: {
    teacherId: v.id("users"),
    assignmentId: v.id("assignments"),
  },
  handler: async (ctx, { teacherId, assignmentId }) => {
    const assignment = await ctx.db.get(assignmentId)
    if (!assignment) return { error: "not_found" as const }

    const cls = await ctx.db.get(assignment.classId)
    if (!cls) return { error: "not_found" as const }

    // Verify the teacher owns the class this assignment belongs to.
    if (cls.teacherId !== teacherId) return { error: "forbidden" as const }

    // --- Questions (ordered) ---
    const aqs = await ctx.db
      .query("assignmentQuestions")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", assignmentId))
      .collect()
    aqs.sort((a, b) => a.order - b.order)

    const questions = []
    for (const aq of aqs) {
      const q = await ctx.db.get(aq.questionId)
      const marks = aq.marks ?? q?.marks ?? 0
      // A "ghost" question (external upload) is one that carries an explicit
      // source question number / latex on the junction row.
      const customQuestionNumber = aq.sourceQuestionNumber ?? null
      const isGhost = !!aq.sourceQuestionNumber || !!aq.sourceQuestionLatex
      questions.push({
        // Keyed by questionId to match the rest of the app + the client's
        // grading data keys.
        id: aq.questionId as string,
        questionLatex: aq.questionLatex ?? q?.questionLatex ?? "",
        marks,
        topic: q?.topic ?? q?.topicName ?? "",
        subTopic: q?.subTopic ?? "",
        difficulty: q?.difficulty ?? "",
        isGhost,
        customQuestionNumber,
      })
    }

    // --- Enrolled students ---
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_class", (q) => q.eq("classId", assignment.classId))
      .collect()

    // --- Submissions for this assignment ---
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", assignmentId))
      .collect()
    const submissionByStudent = new Map(
      submissions.map((s) => [s.studentId as string, s]),
    )

    // Map assignmentQuestionId -> questionId so per-question marks can be keyed
    // by questionId on the way out.
    const aqToQuestion = new Map(aqs.map((aq) => [aq._id as string, aq.questionId as string]))

    const students = []
    for (const e of enrollments) {
      const user = await ctx.db.get(e.studentId)
      if (!user) continue
      const submission = submissionByStudent.get(e.studentId as string)

      let gradingData: Record<string, { score: number }> | null = null
      let feedbackReleased = false

      if (submission) {
        const answers = await ctx.db
          .query("submissionAnswers")
          .withIndex("by_submission", (q) => q.eq("submissionId", submission._id))
          .collect()
        const built: Record<string, { score: number }> = {}
        for (const ans of answers) {
          const qId = aqToQuestion.get(ans.assignmentQuestionId as string)
          if (qId) built[qId] = { score: ans.marksAwarded ?? 0 }
        }
        if (Object.keys(built).length > 0) gradingData = built

        const sheet = await ctx.db
          .query("feedbackSheets")
          .withIndex("by_submission", (q) => q.eq("submissionId", submission._id))
          .first()
        feedbackReleased = !!sheet?.isPublished
      }

      const status: "not_submitted" | "submitted" | "graded" = submission
        ? submission.status === "marked"
          ? "graded"
          : "submitted"
        : "not_submitted"

      students.push({
        id: user._id as string,
        email: user.email,
        fullName: user.fullName ?? null,
        submissionId: submission?._id ?? null,
        gradingData,
        totalScore: submission?.totalMarksAwarded ?? null,
        status,
        feedbackReleased,
      })
    }

    const maxTotalMarks = questions.reduce((sum, q) => sum + q.marks, 0)

    return {
      assignment: {
        id: assignment._id as string,
        title: assignment.title,
        classId: assignment.classId as string,
        className: cls.name,
        subject: cls.subject ?? "Mathematics",
        dueDate: assignment.dueDate ?? null,
        status: assignment.status ?? "draft",
        mode: assignment.mode === "paper" ? "paper" : "online",
        sourceType:
          assignment.sourceType === "external_upload"
            ? "external_upload"
            : "bank_builder",
        resourceUrl:
          (assignment.metadata as { resource_url?: string } | undefined)?.resource_url ??
          null,
      },
      questions,
      students,
      maxTotalMarks,
    }
  },
})

/**
 * Save a full marking pass for a single student. `gradingData` is keyed by
 * questionId (as the client supplies it). For each question we upsert a
 * `submissionAnswers` row (keyed by assignmentQuestionId), then patch the
 * submission total/status. Creates the submission if it does not exist.
 */
export const saveMarks = mutation({
  args: {
    teacherId: v.id("users"),
    assignmentId: v.id("assignments"),
    studentId: v.id("users"),
    gradingData: v.record(v.string(), v.object({ score: v.number() })),
  },
  handler: async (ctx, { teacherId, assignmentId, studentId, gradingData }) => {
    // Map questionId -> assignmentQuestionId (and remember marks max) for this
    // assignment.
    const aqs = await ctx.db
      .query("assignmentQuestions")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", assignmentId))
      .collect()
    const questionToAq = new Map(
      aqs.map((aq) => [aq.questionId as string, { id: aq._id, marks: aq.marks }]),
    )

    // Find or create the submission.
    const existingSubmission = await ctx.db
      .query("submissions")
      .withIndex("by_assignment_student", (q) =>
        q.eq("assignmentId", assignmentId).eq("studentId", studentId),
      )
      .unique()

    const submissionId = existingSubmission
      ? existingSubmission._id
      : await ctx.db.insert("submissions", {
          assignmentId,
          studentId,
          status: "in_progress",
        })

    // Upsert one submissionAnswers row per graded question.
    const existingAnswers = await ctx.db
      .query("submissionAnswers")
      .withIndex("by_submission", (q) => q.eq("submissionId", submissionId))
      .collect()
    const answerByAq = new Map(
      existingAnswers.map((a) => [a.assignmentQuestionId as string, a]),
    )

    for (const [questionId, { score }] of Object.entries(gradingData)) {
      const aq = questionToAq.get(questionId)
      if (!aq) continue
      const existing = answerByAq.get(aq.id as string)
      if (existing) {
        await ctx.db.patch(existing._id, {
          marksAwarded: score,
          marksMax: aq.marks ?? existing.marksMax,
        })
      } else {
        await ctx.db.insert("submissionAnswers", {
          submissionId,
          assignmentQuestionId: aq.id,
          marksAwarded: score,
          marksMax: aq.marks,
        })
      }
    }

    const totalScore = Object.values(gradingData).reduce(
      (sum, d) => sum + (d.score || 0),
      0,
    )

    await ctx.db.patch(submissionId, {
      totalMarksAwarded: totalScore,
      status: "marked",
      markedAt: Date.now(),
      markedBy: teacherId,
    })

    return { submissionId, totalScore }
  },
})

/**
 * Toggle feedback release for every submission in an assignment. Feedback
 * release is stored on `feedbackSheets.isPublished`; we upsert a sheet per
 * submission so the flag persists even before AI narratives exist.
 */
export const toggleFeedbackRelease = mutation({
  args: {
    teacherId: v.id("users"),
    assignmentId: v.id("assignments"),
    release: v.boolean(),
  },
  handler: async (ctx, { assignmentId, release }) => {
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", assignmentId))
      .collect()

    for (const s of submissions) {
      const sheet = await ctx.db
        .query("feedbackSheets")
        .withIndex("by_submission", (q) => q.eq("submissionId", s._id))
        .first()
      if (sheet) {
        await ctx.db.patch(sheet._id, {
          isPublished: release,
          publishedAt: release ? Date.now() : sheet.publishedAt,
        })
      } else {
        await ctx.db.insert("feedbackSheets", {
          submissionId: s._id,
          studentId: s.studentId,
          assignmentId,
          score: s.totalMarksAwarded,
          isPublished: release,
          publishedAt: release ? Date.now() : undefined,
        })
      }
    }

    return { success: true }
  },
})

/**
 * Assignments-for-marking list with submission stats, across all of a
 * teacher's classes.
 */
export const getAssignmentsForMarking = query({
  args: { teacherId: v.id("users") },
  handler: async (ctx, { teacherId }) => {
    const classes = await ctx.db
      .query("classes")
      .withIndex("by_teacher", (q) => q.eq("teacherId", teacherId))
      .collect()
    if (classes.length === 0) return []

    const classInfo = new Map(
      classes.map((c) => [
        c._id as string,
        { name: c.name, subject: c.subject ?? "Mathematics" },
      ]),
    )

    // Enrollment counts per class.
    const enrollmentCounts = new Map<string, number>()
    for (const c of classes) {
      const enrollments = await ctx.db
        .query("enrollments")
        .withIndex("by_class", (q) => q.eq("classId", c._id))
        .collect()
      enrollmentCounts.set(c._id as string, enrollments.length)
    }

    const rows = []
    for (const c of classes) {
      const assignments = await ctx.db
        .query("assignments")
        .withIndex("by_class", (q) => q.eq("classId", c._id))
        .collect()

      for (const a of assignments) {
        const submissions = await ctx.db
          .query("submissions")
          .withIndex("by_assignment", (q) => q.eq("assignmentId", a._id))
          .collect()
        let submitted = 0
        let graded = 0
        for (const s of submissions) {
          submitted++
          if (s.status === "marked") graded++
        }

        const info = classInfo.get(a.classId as string)
        rows.push({
          id: a._id as string,
          title: a.title,
          className: info?.name ?? "Unknown Class",
          subject: info?.subject ?? "Unknown",
          dueDate: a.dueDate ?? null,
          totalStudents: enrollmentCounts.get(a.classId as string) ?? 0,
          submittedCount: submitted,
          gradedCount: graded,
          needsGrading: submitted - graded,
          status: a.status === "published" ? "published" : "draft",
          createdAt: a._creationTime,
        })
      }
    }

    // created_at descending.
    return rows.sort((a, b) => b.createdAt - a.createdAt)
  },
})
