import { v } from "convex/values"
import { query, mutation } from "./_generated/server"

/**
 * Revision-list functions. All take explicit Convex `users` ids resolved from
 * Clerk in the server action; none read ctx.auth.
 *
 * Schema notes (migrated from the legacy backend):
 * - revisionLists no longer carries an `assignmentId` column, and
 *   revisionListQuestions no longer carries `sourceQuestionNumber` /
 *   `sourceQuestionLatex` / `orderIndex` (only `order`). The server action
 *   maps any return-shape fields that have no Convex backing to null/defaults.
 */

// =====================================================
// Create a revision list with generated questions
// =====================================================

/**
 * Inserts ghost questions, creates the revision list, links the questions, and
 * auto-allocates to every student enrolled in the class. Replicates the
 * Rollback behaviour: on a failure after questions were inserted we
 * delete them again.
 */
export const createWithQuestions = mutation({
  args: {
    userId: v.id("users"),
    classId: v.id("classes"),
    title: v.string(),
    description: v.optional(v.string()),
    questions: v.array(
      v.object({
        questionLatex: v.string(),
        topic: v.string(),
        subTopic: v.optional(v.string()),
        difficulty: v.string(),
        marks: v.number(),
        calculatorAllowed: v.optional(v.boolean()),
        answerKey: v.optional(v.any()),
      }),
    ),
  },
  handler: async (ctx, { userId, classId, title, description, questions }) => {
    // Verify the teacher owns the class.
    const cls = await ctx.db.get(classId)
    if (!cls) return { error: "class_not_found" as const }
    if (cls.teacherId !== userId) return { error: "permission_denied" as const }

    if (questions.length === 0) return { error: "no_questions" as const }

    // 1. Insert ghost questions.
    const questionIds = []
    try {
      for (const q of questions) {
        const id = await ctx.db.insert("questions", {
          createdBy: userId,
          contentType: "revision_generated",
          questionLatex: q.questionLatex,
          topic: q.topic,
          topicName: q.topic,
          subTopic: q.subTopic,
          difficulty: q.difficulty,
          marks: q.marks,
          questionType: "Fluency",
          calculatorAllowed: q.calculatorAllowed ?? true,
          answerKey: q.answerKey,
          isVerified: false,
          level: q.difficulty === "Higher" ? "GCSE Higher" : "GCSE Foundation",
        })
        questionIds.push(id)
      }

      // 2. Create the revision list.
      const revisionListId = await ctx.db.insert("revisionLists", {
        createdBy: userId,
        title,
        description,
      })

      // 3. Link questions to the revision list (preserving order).
      for (let i = 0; i < questionIds.length; i++) {
        await ctx.db.insert("revisionListQuestions", {
          revisionListId,
          questionId: questionIds[i],
          order: i,
        })
      }

      // 4. Auto-allocate to every student enrolled in the class.
      const enrollments = await ctx.db
        .query("enrollments")
        .withIndex("by_class", (q) => q.eq("classId", classId))
        .collect()

      let studentsAllocated = 0
      for (const e of enrollments) {
        const existing = await ctx.db
          .query("revisionAllocations")
          .withIndex("by_student_list", (q) =>
            q.eq("studentId", e.studentId).eq("revisionListId", revisionListId),
          )
          .unique()
        if (existing) continue
        await ctx.db.insert("revisionAllocations", {
          revisionListId,
          studentId: e.studentId,
          classId,
          status: "pending",
          progress: {},
          allocatedAt: Date.now(),
        })
        studentsAllocated++
      }

      const created = await ctx.db.get(revisionListId)

      return {
        revisionListId,
        questionCount: questionIds.length,
        studentsAllocated,
        createdAt: created?._creationTime ?? Date.now(),
      }
    } catch (err) {
      // Rollback: delete any ghost questions we inserted.
      for (const id of questionIds) {
        await ctx.db.delete(id)
      }
      throw err
    }
  },
})

// =====================================================
// Auto-allocate an existing revision list to a class
// =====================================================

/**
 * Replaces the legacy `allocate_revision_list_to_class` RPC. Inserts one
 * pending allocation per enrolled student that doesn't already have one.
 */
export const allocateToClass = mutation({
  args: {
    revisionListId: v.id("revisionLists"),
    classId: v.id("classes"),
  },
  handler: async (ctx, { revisionListId, classId }) => {
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_class", (q) => q.eq("classId", classId))
      .collect()

    let allocated = 0
    for (const e of enrollments) {
      const existing = await ctx.db
        .query("revisionAllocations")
        .withIndex("by_student_list", (q) =>
          q.eq("studentId", e.studentId).eq("revisionListId", revisionListId),
        )
        .unique()
      if (existing) continue
      await ctx.db.insert("revisionAllocations", {
        revisionListId,
        studentId: e.studentId,
        classId,
        status: "pending",
        progress: {},
        allocatedAt: Date.now(),
      })
      allocated++
    }
    return { allocated }
  },
})

// =====================================================
// Get a student's revision lists
// =====================================================

/**
 * Replaces the legacy `get_student_revision_lists` RPC. Joins each allocation
 * to its revision list and computes total/completed question counts.
 */
export const getStudentRevisionLists = query({
  args: { studentId: v.id("users") },
  handler: async (ctx, { studentId }) => {
    const allocations = await ctx.db
      .query("revisionAllocations")
      .withIndex("by_student", (q) => q.eq("studentId", studentId))
      .collect()

    const rows = []
    for (const alloc of allocations) {
      const list = await ctx.db.get(alloc.revisionListId)
      if (!list) continue

      const links = await ctx.db
        .query("revisionListQuestions")
        .withIndex("by_revision_list", (q) =>
          q.eq("revisionListId", alloc.revisionListId),
        )
        .collect()

      const progress = (alloc.progress ?? {}) as Record<
        string,
        { completed?: boolean }
      >
      const completedQuestions = Object.values(progress).filter(
        (p) => p?.completed,
      ).length

      rows.push({
        revisionListId: alloc.revisionListId,
        title: list.title,
        description: list.description ?? null,
        status: alloc.status ?? "pending",
        allocatedAt: alloc.allocatedAt ?? alloc._creationTime,
        totalQuestions: links.length,
        completedQuestions,
        createdAt: list._creationTime,
      })
    }

    return rows.sort((a, b) => b.allocatedAt - a.allocatedAt)
  },
})

// =====================================================
// Get the questions in a revision list
// =====================================================

/**
 * Replaces the legacy `get_revision_list_questions` RPC. Joins each link row
 * (sorted by order) to its question.
 */
export const getRevisionListQuestions = query({
  args: { revisionListId: v.id("revisionLists") },
  handler: async (ctx, { revisionListId }) => {
    const links = await ctx.db
      .query("revisionListQuestions")
      .withIndex("by_revision_list", (q) =>
        q.eq("revisionListId", revisionListId),
      )
      .collect()

    links.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

    const rows = []
    for (let i = 0; i < links.length; i++) {
      const link = links[i]
      const q = await ctx.db.get(link.questionId)
      if (!q) continue
      rows.push({
        questionId: link.questionId,
        orderIndex: link.order ?? i,
        questionLatex: q.questionLatex ?? null,
        imageUrl: q.imageUrl ?? null,
        topic: q.topic ?? q.topicName ?? "",
        subTopic: q.subTopic ?? null,
        difficulty: q.difficulty ?? "",
        marks: q.marks ?? null,
        answerKey: q.answerKey ?? null,
        calculatorAllowed: q.calculatorAllowed ?? null,
      })
    }
    return rows
  },
})

// =====================================================
// Update a student's progress on a revision list
// =====================================================

/**
 * Loads the allocation via by_student_list, patches the progress map, and
 * recomputes status / startedAt / completedAt.
 */
export const updateProgress = mutation({
  args: {
    studentId: v.id("users"),
    revisionListId: v.id("revisionLists"),
    questionId: v.string(),
    completed: v.boolean(),
  },
  handler: async (ctx, { studentId, revisionListId, questionId, completed }) => {
    const alloc = await ctx.db
      .query("revisionAllocations")
      .withIndex("by_student_list", (q) =>
        q.eq("studentId", studentId).eq("revisionListId", revisionListId),
      )
      .unique()
    if (!alloc) return { error: "not_found" as const }

    const currentProgress = (alloc.progress ?? {}) as Record<
      string,
      { completed: boolean; completedAt: string | null }
    >
    const newProgress = {
      ...currentProgress,
      [questionId]: {
        completed,
        completedAt: completed ? new Date().toISOString() : null,
      },
    }

    const completedCount = Object.values(newProgress).filter(
      (p) => p.completed,
    ).length

    const links = await ctx.db
      .query("revisionListQuestions")
      .withIndex("by_revision_list", (q) =>
        q.eq("revisionListId", revisionListId),
      )
      .collect()
    const totalQuestions = links.length

    let newStatus: string
    if (completedCount === 0) newStatus = "pending"
    else if (completedCount === totalQuestions) newStatus = "completed"
    else newStatus = "in_progress"

    const patch: {
      progress: typeof newProgress
      status: string
      startedAt?: number
      completedAt?: number
    } = { progress: newProgress, status: newStatus }

    if ((alloc.status ?? "pending") === "pending" && newStatus === "in_progress") {
      patch.startedAt = Date.now()
    }
    if (newStatus === "completed") {
      patch.completedAt = Date.now()
    } else {
      patch.completedAt = undefined
    }

    await ctx.db.patch(alloc._id, patch)
    return { success: true as const }
  },
})

// =====================================================
// Teacher: revision list detail (questions + allocations)
// =====================================================

/**
 * Teacher view of a single revision list: questions + per-student allocation
 * progress. Verifies the requesting teacher owns the list.
 */
export const getDetail = query({
  args: {
    userId: v.id("users"),
    revisionListId: v.id("revisionLists"),
  },
  handler: async (ctx, { userId, revisionListId }) => {
    const list = await ctx.db.get(revisionListId)
    if (!list) return { error: "not_found" as const }
    if (list.createdBy !== userId) return { error: "permission_denied" as const }

    const links = await ctx.db
      .query("revisionListQuestions")
      .withIndex("by_revision_list", (q) =>
        q.eq("revisionListId", revisionListId),
      )
      .collect()
    links.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

    const questions = []
    for (let i = 0; i < links.length; i++) {
      const link = links[i]
      const q = await ctx.db.get(link.questionId)
      if (!q) continue
      questions.push({
        questionId: link.questionId,
        orderIndex: link.order ?? i,
        questionLatex: q.questionLatex ?? null,
        imageUrl: q.imageUrl ?? null,
        topic: q.topic ?? q.topicName ?? "",
        subTopic: q.subTopic ?? null,
        difficulty: q.difficulty ?? "",
        marks: q.marks ?? null,
        answerKey: q.answerKey ?? null,
        calculatorAllowed: q.calculatorAllowed ?? null,
      })
    }

    const totalQuestions = questions.length

    const allocs = await ctx.db
      .query("revisionAllocations")
      .withIndex("by_revision_list", (q) =>
        q.eq("revisionListId", revisionListId),
      )
      .collect()

    const allocations = []
    for (const a of allocs) {
      const student = await ctx.db.get(a.studentId)
      const progress = (a.progress ?? {}) as Record<
        string,
        { completed?: boolean }
      >
      const completedQuestions = Object.values(progress).filter(
        (p) => p?.completed,
      ).length
      allocations.push({
        studentId: a.studentId,
        studentName: student?.fullName ?? "Unknown",
        status: a.status ?? "pending",
        completedQuestions,
        totalQuestions,
      })
    }

    return {
      revisionList: {
        id: list._id,
        title: list.title,
        description: list.description ?? null,
        createdAt: list._creationTime,
      },
      questions,
      allocations,
    }
  },
})

// =====================================================
// Teacher: all revision lists (library)
// =====================================================

/** All revision lists created by a teacher, with question / student counts. */
export const getTeacherRevisionLists = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const lists = await ctx.db
      .query("revisionLists")
      .withIndex("by_created_by", (q) => q.eq("createdBy", userId))
      .collect()

    const rows = []
    for (const list of lists) {
      const links = await ctx.db
        .query("revisionListQuestions")
        .withIndex("by_revision_list", (q) =>
          q.eq("revisionListId", list._id),
        )
        .collect()
      const allocs = await ctx.db
        .query("revisionAllocations")
        .withIndex("by_revision_list", (q) =>
          q.eq("revisionListId", list._id),
        )
        .collect()
      rows.push({
        id: list._id,
        title: list.title,
        description: list.description ?? null,
        questionCount: links.length,
        studentCount: allocs.length,
        createdAt: list._creationTime,
      })
    }

    return rows.sort((a, b) => b.createdAt - a.createdAt)
  },
})

// =====================================================
// Delete a revision list
// =====================================================

/**
 * Deletes a revision list and its dependent link / allocation rows (Convex has
 * no cascade). Verifies ownership.
 */
export const remove = mutation({
  args: {
    userId: v.id("users"),
    revisionListId: v.id("revisionLists"),
  },
  handler: async (ctx, { userId, revisionListId }) => {
    const list = await ctx.db.get(revisionListId)
    if (!list) return { error: "not_found" as const }
    if (list.createdBy !== userId) return { error: "permission_denied" as const }

    const links = await ctx.db
      .query("revisionListQuestions")
      .withIndex("by_revision_list", (q) =>
        q.eq("revisionListId", revisionListId),
      )
      .collect()
    for (const link of links) {
      await ctx.db.delete(link._id)
    }

    const allocs = await ctx.db
      .query("revisionAllocations")
      .withIndex("by_revision_list", (q) =>
        q.eq("revisionListId", revisionListId),
      )
      .collect()
    for (const a of allocs) {
      await ctx.db.delete(a._id)
    }

    await ctx.db.delete(revisionListId)
    return { success: true as const }
  },
})
