import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

/** Create an assignment */
export const createAssignment = mutation({
  args: {
    classId: v.id("classes"),
    teacherId: v.id("users"),
    title: v.string(),
    mode: v.optional(v.union(v.literal("paper"), v.literal("online"), v.literal("practice"))),
    dueDate: v.optional(v.number()),
    totalMarks: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("assignments", {
      ...args,
      status: "draft",
    })
  },
})

/** Get all assignments for a class */
export const getClassAssignments = query({
  args: { classId: v.id("classes") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("assignments")
      .withIndex("by_class", q => q.eq("classId", args.classId))
      .order("desc")
      .collect()
  },
})

/** Get all assignments for a teacher (across all classes) */
export const getTeacherAssignments = query({
  args: { teacherId: v.id("users") },
  handler: async (ctx, args) => {
    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_teacher", q => q.eq("teacherId", args.teacherId))
      .order("desc")
      .collect()

    return await Promise.all(
      assignments.map(async a => {
        const cls = await ctx.db.get(a.classId)
        return { ...a, className: cls?.name }
      })
    )
  },
})

/** Get questions on an assignment */
export const getAssignmentQuestions = query({
  args: { assignmentId: v.id("assignments") },
  handler: async (ctx, args) => {
    const aqRows = await ctx.db
      .query("assignmentQuestions")
      .withIndex("by_assignment", q => q.eq("assignmentId", args.assignmentId))
      .collect()

    return aqRows.sort((a, b) => a.order - b.order)
  },
})

/** Add a question to an assignment */
export const addQuestionToAssignment = mutation({
  args: {
    assignmentId: v.id("assignments"),
    questionId: v.id("questions"),
    order: v.number(),
    marks: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("assignmentQuestions", args)
  },
})

/** Publish an assignment */
export const publishAssignment = mutation({
  args: { assignmentId: v.id("assignments"), teacherId: v.id("users") },
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId)
    if (!assignment || assignment.teacherId !== args.teacherId) throw new Error("Not found or access denied")
    await ctx.db.patch(args.assignmentId, { status: "published" })
  },
})

/** Get student's active assignments */
export const getStudentAssignments = query({
  args: { studentId: v.id("users") },
  handler: async (ctx, args) => {
    // Get enrolled classes
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_student", q => q.eq("studentId", args.studentId))
      .collect()

    const classIds = enrollments.map(e => e.classId)

    const allAssignments = await Promise.all(
      classIds.map(classId =>
        ctx.db
          .query("assignments")
          .withIndex("by_class", q => q.eq("classId", classId))
          .collect()
      )
    )

    return allAssignments
      .flat()
      .filter(a => a.status === "published")
      .sort((a, b) => (b._creationTime || 0) - (a._creationTime || 0))
  },
})

/**
 * Create an assignment, optionally with linked questions (junction rows).
 * Verifies teacher ownership of the class. Stores the content blob in
 * `metadata` (which holds question_ids + description + feedback flags) and
 * writes one assignmentQuestions row per question id, preserving order.
 */
export const createAssignmentFull = mutation({
  args: {
    classId: v.id("classes"),
    teacherId: v.id("users"),
    title: v.string(),
    mode: v.optional(v.union(v.literal("paper"), v.literal("online"), v.literal("practice"))),
    dueDate: v.optional(v.number()),
    status: v.optional(v.union(v.literal("draft"), v.literal("published"), v.literal("closed"))),
    questionIds: v.optional(v.array(v.id("questions"))),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const cls = await ctx.db.get(args.classId)
    if (!cls) return { error: "not_found" as const }
    if (cls.teacherId !== args.teacherId) return { error: "forbidden" as const }

    const assignmentId = await ctx.db.insert("assignments", {
      classId: args.classId,
      teacherId: args.teacherId,
      title: args.title,
      mode: args.mode ?? "online",
      status: args.status ?? "draft",
      dueDate: args.dueDate,
      metadata: args.metadata,
    })

    const questionIds = args.questionIds ?? []
    for (let i = 0; i < questionIds.length; i++) {
      const q = await ctx.db.get(questionIds[i])
      await ctx.db.insert("assignmentQuestions", {
        assignmentId,
        questionId: questionIds[i],
        order: i,
        marks: q?.marks,
      })
    }

    return { assignmentId }
  },
})

/** Update an assignment (teacher ownership enforced). */
export const updateAssignment = mutation({
  args: {
    assignmentId: v.id("assignments"),
    teacherId: v.id("users"),
    title: v.optional(v.string()),
    dueDate: v.optional(v.union(v.number(), v.null())),
    status: v.optional(v.union(v.literal("draft"), v.literal("published"), v.literal("closed"))),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId)
    if (!assignment) return { error: "not_found" as const }
    if (assignment.teacherId !== args.teacherId) return { error: "forbidden" as const }

    const patch: Record<string, unknown> = {}
    if (args.title !== undefined) patch.title = args.title
    if (args.dueDate !== undefined) patch.dueDate = args.dueDate ?? undefined
    if (args.status !== undefined) patch.status = args.status
    if (args.metadata !== undefined) patch.metadata = args.metadata
    await ctx.db.patch(args.assignmentId, patch)

    return { assignment: await ctx.db.get(args.assignmentId) }
  },
})

/** Delete an assignment plus its question links and submissions (teacher ownership enforced). */
export const deleteAssignment = mutation({
  args: { assignmentId: v.id("assignments"), teacherId: v.id("users") },
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId)
    if (!assignment) return { error: "not_found" as const }
    if (assignment.teacherId !== args.teacherId) return { error: "forbidden" as const }

    const aqRows = await ctx.db
      .query("assignmentQuestions")
      .withIndex("by_assignment", q => q.eq("assignmentId", args.assignmentId))
      .collect()
    for (const aq of aqRows) await ctx.db.delete(aq._id)

    const subs = await ctx.db
      .query("submissions")
      .withIndex("by_assignment", q => q.eq("assignmentId", args.assignmentId))
      .collect()
    for (const s of subs) await ctx.db.delete(s._id)

    await ctx.db.delete(args.assignmentId)
    return { success: true }
  },
})

/** Replace the questions linked to an assignment (teacher ownership enforced). */
export const updateAssignmentQuestions = mutation({
  args: {
    assignmentId: v.id("assignments"),
    teacherId: v.id("users"),
    questionIds: v.array(v.id("questions")),
  },
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId)
    if (!assignment) return { error: "not_found" as const }
    if (assignment.teacherId !== args.teacherId) return { error: "forbidden" as const }

    const existing = await ctx.db
      .query("assignmentQuestions")
      .withIndex("by_assignment", q => q.eq("assignmentId", args.assignmentId))
      .collect()
    for (const aq of existing) await ctx.db.delete(aq._id)

    for (let i = 0; i < args.questionIds.length; i++) {
      const q = await ctx.db.get(args.questionIds[i])
      await ctx.db.insert("assignmentQuestions", {
        assignmentId: args.assignmentId,
        questionId: args.questionIds[i],
        order: i,
        marks: q?.marks,
      })
    }

    // Keep metadata.question_ids in sync for backward compatibility.
    const meta = (assignment.metadata as Record<string, unknown> | undefined) ?? {}
    await ctx.db.patch(args.assignmentId, {
      metadata: { ...meta, question_ids: args.questionIds },
    })

    return { success: true }
  },
})

/**
 * Full assignment payload for a teacher: class info plus ordered questions with
 * their full details (joins assignmentQuestions → questions).
 */
export const getAssignmentDetails = query({
  args: { assignmentId: v.id("assignments"), teacherId: v.id("users") },
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId)
    if (!assignment) return { error: "not_found" as const }

    const cls = await ctx.db.get(assignment.classId)
    if (!cls || cls.teacherId !== args.teacherId) return { error: "forbidden" as const }

    const aqRows = await ctx.db
      .query("assignmentQuestions")
      .withIndex("by_assignment", q => q.eq("assignmentId", args.assignmentId))
      .collect()
    aqRows.sort((a, b) => a.order - b.order)

    const questions = []
    for (const aq of aqRows) {
      const q = await ctx.db.get(aq.questionId)
      questions.push({
        questionId: aq.questionId,
        orderIndex: aq.order,
        marks: aq.marks ?? q?.marks ?? 1,
        questionLatex: aq.questionLatex ?? q?.questionLatex ?? "",
        topic: q?.topic ?? q?.topicName ?? "",
        subTopic: q?.subTopic ?? "",
        difficulty: q?.difficulty ?? "",
        questionType: q?.questionType ?? "Fluency",
        calculatorAllowed: q?.calculatorAllowed ?? false,
        answerKey: q?.answerKey ?? { answer: "", explanation: "" },
        imageUrl: aq.imageUrl ?? q?.imageUrl ?? null,
        contentType: q?.contentType ?? "generated_text",
      })
    }

    const metadata = (assignment.metadata as Record<string, unknown> | undefined) ?? {}
    return {
      id: assignment._id,
      title: assignment.title,
      classId: assignment.classId,
      className: cls.name,
      subject: cls.subject ?? "Maths",
      dueDate: assignment.dueDate ?? null,
      status: assignment.status,
      coverConfig: (metadata.coverConfig as unknown) ?? null,
      questions,
    }
  },
})

/** Persist the editable front-cover config on an assignment (teacher-owned). */
export const setCoverConfig = mutation({
  args: {
    assignmentId: v.id("assignments"),
    teacherId: v.id("users"),
    coverConfig: v.any(),
  },
  handler: async (ctx, { assignmentId, teacherId, coverConfig }) => {
    const assignment = await ctx.db.get(assignmentId)
    if (!assignment) return { error: "not_found" as const }
    if (assignment.teacherId !== teacherId) return { error: "forbidden" as const }
    const metadata = (assignment.metadata as Record<string, unknown> | undefined) ?? {}
    await ctx.db.patch(assignmentId, { metadata: { ...metadata, coverConfig } })
    return { success: true as const }
  },
})

/** All submissions for an assignment, with student profile (teacher ownership enforced). */
export const getAssignmentSubmissions = query({
  args: { assignmentId: v.id("assignments"), teacherId: v.id("users") },
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId)
    if (!assignment) return { error: "not_found" as const }
    if (assignment.teacherId !== args.teacherId) return { error: "forbidden" as const }

    const subs = await ctx.db
      .query("submissions")
      .withIndex("by_assignment", q => q.eq("assignmentId", args.assignmentId))
      .collect()
    subs.sort((a, b) => (a.submittedAt ?? a._creationTime) - (b.submittedAt ?? b._creationTime))

    const rows = []
    for (const s of subs) {
      const student = await ctx.db.get(s.studentId)
      rows.push({
        id: s._id,
        assignmentId: s.assignmentId,
        studentId: s.studentId,
        score: s.totalMarksAwarded ?? null,
        status: s.status,
        submittedAt: s.submittedAt ?? null,
        gradedAt: s.markedAt ?? null,
        student: student
          ? { id: student._id, email: student.email ?? "", fullName: student.fullName ?? null }
          : null,
      })
    }
    return { submissions: rows }
  },
})

/** Grade a submission: sets totalMarksAwarded, status 'marked', markedAt + markedBy. */
export const gradeSubmission = mutation({
  args: {
    submissionId: v.id("submissions"),
    teacherId: v.id("users"),
    score: v.number(),
  },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId)
    if (!submission) return { error: "not_found" as const }

    const assignment = await ctx.db.get(submission.assignmentId)
    if (!assignment || assignment.teacherId !== args.teacherId) {
      return { error: "forbidden" as const }
    }

    await ctx.db.patch(args.submissionId, {
      totalMarksAwarded: args.score,
      status: "marked",
      markedAt: Date.now(),
      markedBy: args.teacherId,
    })

    return { submission: await ctx.db.get(args.submissionId) }
  },
})

/**
 * Submit (or re-submit) an assignment for a student. Upserts the submissions
 * row, setting status 'submitted' and submittedAt. Answers are stored on the
 * submission metadata-free table; per-question answers are owned elsewhere
 * (student-work.ts), so here we only track submission state + timestamp.
 */
export const submitAssignment = mutation({
  args: {
    assignmentId: v.id("assignments"),
    studentId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("submissions")
      .withIndex("by_assignment_student", q =>
        q.eq("assignmentId", args.assignmentId).eq("studentId", args.studentId)
      )
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, { submittedAt: Date.now() })
      return { submission: await ctx.db.get(existing._id) }
    }

    const submissionId = await ctx.db.insert("submissions", {
      assignmentId: args.assignmentId,
      studentId: args.studentId,
      status: "submitted",
      submittedAt: Date.now(),
    })
    return { submission: await ctx.db.get(submissionId) }
  },
})

/** Submission counts per assignment for a set of assignment ids. */
export const getSubmissionCounts = query({
  args: { assignmentIds: v.array(v.id("assignments")) },
  handler: async (ctx, args) => {
    const counts: Record<string, number> = {}
    for (const id of args.assignmentIds) {
      const subs = await ctx.db
        .query("submissions")
        .withIndex("by_assignment", q => q.eq("assignmentId", id))
        .collect()
      counts[id] = subs.length
    }
    return counts
  },
})
