import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

/** Create a new question */
export const createQuestion = mutation({
  args: {
    createdBy: v.id("users"),
    contentType: v.optional(v.string()),
    questionLatex: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    examBoard: v.optional(v.string()),
    level: v.optional(v.string()),
    paperReference: v.optional(v.string()),
    questionNumberRef: v.optional(v.string()),
    topic: v.optional(v.string()),
    topicName: v.optional(v.string()),
    subTopic: v.optional(v.string()),
    marks: v.optional(v.number()),
    calculatorAllowed: v.optional(v.boolean()),
    difficulty: v.optional(v.string()),
    sourceSpec: v.optional(v.union(
      v.literal("new-spec"),
      v.literal("legacy-modular"),
      v.literal("legacy-gcse"),
      v.null()
    )),
    answerKey: v.optional(v.any()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("questions", {
      ...args,
      isVerified: false,
      questionType: "Fluency",
    })
  },
})

/**
 * Create a question with the full field set used by the teacher question editor.
 * Unlike `createQuestion`, this accepts `questionType`, `contentType` and the
 * level alias and lets the caller set verification state.
 */
export const createQuestionFull = mutation({
  args: {
    createdBy: v.id("users"),
    contentType: v.optional(v.string()),
    questionLatex: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    level: v.optional(v.string()),
    topic: v.optional(v.string()),
    topicName: v.optional(v.string()),
    subTopic: v.optional(v.string()),
    marks: v.optional(v.number()),
    calculatorAllowed: v.optional(v.boolean()),
    difficulty: v.optional(v.string()),
    questionType: v.optional(v.string()),
    answerKey: v.optional(v.any()),
    isVerified: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { isVerified, questionType, ...rest } = args
    const id = await ctx.db.insert("questions", {
      ...rest,
      questionType: questionType ?? "Fluency",
      isVerified: isVerified ?? false,
    })
    return await ctx.db.get(id)
  },
})

/** Get a single question by id. */
export const getQuestionById = query({
  args: { questionId: v.id("questions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.questionId)
  },
})

/** Get all questions created by a user (newest first). */
export const getMyQuestions = query({
  args: { createdBy: v.id("users") },
  handler: async (ctx, args) => {
    const questions = await ctx.db
      .query("questions")
      .withIndex("by_created_by", q => q.eq("createdBy", args.createdBy))
      .collect()
    return questions.sort((a, b) => b._creationTime - a._creationTime)
  },
})

/** Get all questions with optional filters (shared bank, newest first). */
export const getAllQuestions = query({
  args: {
    level: v.optional(v.string()),
    topic: v.optional(v.string()),
    difficulty: v.optional(v.string()),
    verifiedOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let dbQuery = ctx.db.query("questions")
    if (args.level) {
      dbQuery = dbQuery.withIndex("by_level", q => q.eq("level", args.level!)) as typeof dbQuery
    } else if (args.topic) {
      dbQuery = dbQuery.withIndex("by_topic", q => q.eq("topic", args.topic!)) as typeof dbQuery
    }
    const all = await dbQuery.collect()
    const filtered = all.filter(q => {
      if (args.level && q.level !== args.level) return false
      if (args.topic && q.topic !== args.topic) return false
      if (args.difficulty && q.difficulty !== args.difficulty) return false
      if (args.verifiedOnly && !q.isVerified) return false
      return true
    })
    return filtered.sort((a, b) => b._creationTime - a._creationTime)
  },
})

/** Update a question (only the creator may update). */
export const updateQuestion = mutation({
  args: {
    questionId: v.id("questions"),
    createdBy: v.id("users"),
    contentType: v.optional(v.string()),
    questionLatex: v.optional(v.string()),
    imageUrl: v.optional(v.union(v.string(), v.null())),
    level: v.optional(v.string()),
    topic: v.optional(v.string()),
    topicName: v.optional(v.string()),
    subTopic: v.optional(v.string()),
    marks: v.optional(v.number()),
    calculatorAllowed: v.optional(v.boolean()),
    difficulty: v.optional(v.string()),
    questionType: v.optional(v.string()),
    answerKey: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.questionId)
    if (!existing) return { error: "not_found" as const }
    if (existing.createdBy !== args.createdBy) return { error: "forbidden" as const }

    const { questionId, createdBy, imageUrl, ...rest } = args
    const patch: Record<string, unknown> = {}
    for (const [k, val] of Object.entries(rest)) {
      if (val !== undefined) patch[k] = val
    }
    if (imageUrl !== undefined) patch.imageUrl = imageUrl ?? undefined
    await ctx.db.patch(questionId, patch)
    return { question: await ctx.db.get(questionId) }
  },
})

/** Delete a question (only the creator may delete). */
export const deleteQuestion = mutation({
  args: { questionId: v.id("questions"), createdBy: v.id("users") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.questionId)
    if (!existing) return { error: "not_found" as const }
    if (existing.createdBy !== args.createdBy) return { error: "forbidden" as const }
    await ctx.db.delete(args.questionId)
    return { success: true }
  },
})

/** Toggle verified status (only the creator may toggle). */
export const toggleQuestionVerification = mutation({
  args: { questionId: v.id("questions"), createdBy: v.id("users"), isVerified: v.boolean() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.questionId)
    if (!existing) return { error: "not_found" as const }
    if (existing.createdBy !== args.createdBy) return { error: "forbidden" as const }
    await ctx.db.patch(args.questionId, { isVerified: args.isVerified })
    return { question: await ctx.db.get(args.questionId) }
  },
})

/** Browse questions with filters — mirrors the legacy getQuestionBankQuestions */
export const browseQuestions = query({
  args: {
    examBoard: v.optional(v.string()),
    level: v.optional(v.string()),
    topic: v.optional(v.string()),
    subTopic: v.optional(v.string()),
    difficulty: v.optional(v.string()),
    calculatorAllowed: v.optional(v.boolean()),
    marksMin: v.optional(v.number()),
    marksMax: v.optional(v.number()),
    search: v.optional(v.string()),
    sourceSpec: v.optional(v.string()),
    contentType: v.optional(v.string()),
    isVerified: v.optional(v.boolean()),
    hasDiagram: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Use the most selective index available
    let dbQuery = ctx.db.query("questions")

    if (args.examBoard) {
      dbQuery = dbQuery.withIndex("by_exam_board", q => q.eq("examBoard", args.examBoard!)) as typeof dbQuery
    } else if (args.level) {
      dbQuery = dbQuery.withIndex("by_level", q => q.eq("level", args.level!)) as typeof dbQuery
    } else if (args.topic) {
      dbQuery = dbQuery.withIndex("by_topic", q => q.eq("topic", args.topic!)) as typeof dbQuery
    }

    const allResults = await dbQuery.collect()

    const searchLower = args.search?.toLowerCase()

    // Apply in-memory filters
    const filtered = allResults.filter(q => {
      if (args.examBoard && q.examBoard !== args.examBoard) return false
      if (args.level && q.level !== args.level) return false
      if (args.topic && q.topic !== args.topic) return false
      if (args.subTopic && q.subTopic !== args.subTopic) return false
      if (args.difficulty && q.difficulty !== args.difficulty) return false
      if (args.calculatorAllowed !== undefined && q.calculatorAllowed !== args.calculatorAllowed) return false
      if (args.marksMin !== undefined && (q.marks ?? 0) < args.marksMin) return false
      if (args.marksMax !== undefined && (q.marks ?? 0) > args.marksMax) return false
      if (args.sourceSpec !== undefined && args.sourceSpec !== "any") {
        if (args.sourceSpec === "none") {
          if (q.sourceSpec !== null && q.sourceSpec !== undefined) return false
        } else {
          if (q.sourceSpec !== args.sourceSpec) return false
        }
      }
      if (args.contentType && q.contentType !== args.contentType) return false
      if (args.isVerified !== undefined && q.isVerified !== args.isVerified) return false
      if (args.hasDiagram && !q.imageUrl) return false
      // Hide questions whose image lives on the retired Supabase storage (the
      // file is gone, so they render blank) — don't offer them in the builder.
      if (q.imageUrl && q.imageUrl.includes("supabase.co")) return false
      if (searchLower) {
        const hay = [q.questionLatex, q.topic, q.subTopic, q.examBoard, q.level].join(" ").toLowerCase()
        if (!hay.includes(searchLower)) return false
      }
      return true
    })

    const total = filtered.length
    const offset = args.offset ?? 0
    const limit = args.limit ?? 50
    const page = filtered.slice(offset, offset + limit)

    return { questions: page, total }
  },
})

/** Get questions by IDs */
export const getQuestionsByIds = query({
  args: { ids: v.array(v.id("questions")) },
  handler: async (ctx, args) => {
    return await Promise.all(args.ids.map(id => ctx.db.get(id)))
  },
})

/** Get question counts by exam board */
export const getQuestionStats = query({
  args: {},
  handler: async (ctx) => {
    const questions = await ctx.db.query("questions").collect()
    const byBoard: Record<string, number> = {}
    for (const q of questions) {
      if (q.examBoard) {
        byBoard[q.examBoard] = (byBoard[q.examBoard] || 0) + 1
      }
    }
    return { total: questions.length, byBoard }
  },
})

/** Get total question count (fast) */
export const getQuestionCount = query({
  args: {},
  handler: async (ctx) => {
    const questions = await ctx.db.query("questions").collect()
    return questions.length
  },
})

/**
 * Coverage counts for the gap-filling cron. Returns one row per generated_text
 * question with its level + subTopic so the caller can tally coverage per
 * (level, subTopic) bucket. Rows with no level or subTopic are omitted.
 */
export const getGeneratedTextSubtopicCounts = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("questions").collect()
    return rows
      .filter(q => q.contentType === "generated_text" && q.level && q.subTopic)
      .map(q => ({ level: q.level as string, subTopic: q.subTopic as string }))
  },
})

/**
 * Insert a question produced by the gap-filling cron. There is no signed-in
 * user, so the creator is resolved internally to the first admin (falling back
 * to the first teacher). Returns { error: "no_creator" } if no eligible user
 * exists yet.
 */
export const insertGeneratedQuestion = mutation({
  args: {
    questionLatex: v.optional(v.string()),
    level: v.optional(v.string()),
    topic: v.optional(v.string()),
    topicName: v.optional(v.string()),
    subTopic: v.optional(v.string()),
    difficulty: v.optional(v.string()),
    marks: v.optional(v.number()),
    questionType: v.optional(v.string()),
    calculatorAllowed: v.optional(v.boolean()),
    answerKey: v.optional(v.any()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").collect()
    const creator =
      users.find(u => u.role === "admin") ?? users.find(u => u.role === "teacher")
    if (!creator) return { error: "no_creator" as const }

    const id = await ctx.db.insert("questions", {
      createdBy: creator._id,
      contentType: "generated_text",
      questionLatex: args.questionLatex,
      level: args.level,
      topic: args.topic,
      topicName: args.topicName,
      subTopic: args.subTopic,
      difficulty: args.difficulty,
      marks: args.marks,
      questionType: args.questionType ?? "Fluency",
      calculatorAllowed: args.calculatorAllowed ?? false,
      answerKey: args.answerKey,
      imageUrl: args.imageUrl,
      isVerified: false,
    })
    return { id }
  },
})

/**
 * Bank questions matching extracted topics for the shadow-paper "bank"/"mixed"
 * source modes. Filters by `level` (the curriculum level), optional `topics`,
 * and excludes any question tagged "shadow_paper". Returns up to `limit` rows.
 */
export const getBankQuestionsForShadow = query({
  args: {
    level: v.string(),
    topics: v.optional(v.array(v.string())),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("questions")
      .withIndex("by_level", q => q.eq("level", args.level))
      .collect()

    const topicSet = args.topics && args.topics.length > 0 ? new Set(args.topics) : null

    const filtered = rows.filter(q => {
      if ((q.tags ?? []).includes("shadow_paper")) return false
      if (topicSet && !(q.topic && topicSet.has(q.topic))) return false
      return true
    })

    const limit = args.limit ?? filtered.length
    return filtered.slice(0, limit)
  },
})

/** Get questions unused by a class (for booklet generator) */
export const getUnusedQuestionsForClass = query({
  args: {
    classId: v.id("classes"),
    examBoard: v.optional(v.string()),
    level: v.optional(v.string()),
    sourceSpec: v.optional(v.union(
      v.literal("new-spec"),
      v.literal("legacy-modular"),
      v.literal("legacy-gcse"),
      v.null()
    )),
    marksTarget: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get all assignments for this class
    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_class", q => q.eq("classId", args.classId))
      .collect()

    // Get all question IDs used in those assignments
    const usedIds = new Set<string>()
    for (const assignment of assignments) {
      const aqRows = await ctx.db
        .query("assignmentQuestions")
        .withIndex("by_assignment", q => q.eq("assignmentId", assignment._id))
        .collect()
      for (const aq of aqRows) {
        usedIds.add(aq.questionId)
      }
    }

    // Get in-scope questions
    let qQuery = ctx.db.query("questions")
    if (args.examBoard) {
      qQuery = qQuery.withIndex("by_exam_board", q => q.eq("examBoard", args.examBoard!)) as typeof qQuery
    }
    const inScope = await qQuery.collect()

    // Filter and exclude used
    const filtered = inScope.filter(q => {
      if (usedIds.has(q._id)) return false
      if (args.level && q.level !== args.level) return false
      if (args.sourceSpec !== undefined && q.sourceSpec !== args.sourceSpec) return false
      return true
    })

    // Apply marks target
    if (args.marksTarget && args.marksTarget > 0) {
      let acc = 0
      const capped: typeof filtered = []
      for (const q of filtered) {
        if (acc >= args.marksTarget) break
        capped.push(q)
        acc += q.marks ?? 0
      }
      return capped
    }

    return filtered
  },
})
