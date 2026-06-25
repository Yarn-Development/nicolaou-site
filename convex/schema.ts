import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  // =====================================================
  // Users / Profiles
  // =====================================================
  users: defineTable({
    clerkId: v.string(),        // Clerk user ID
    email: v.string(),
    fullName: v.optional(v.string()),
    role: v.union(v.literal("teacher"), v.literal("student"), v.literal("admin"), v.literal("parent")),
    schoolId: v.optional(v.id("schools")),
    onboardingComplete: v.optional(v.boolean()),
    parentEmail: v.optional(v.string()),   // parent email for student profiles
    avatarUrl: v.optional(v.string()),
    // SSO / domain provisioning
    ssoProvider: v.optional(v.string()),
    schoolDomain: v.optional(v.string()),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  // =====================================================
  // Schools
  // =====================================================
  schools: defineTable({
    name: v.string(),
    domain: v.optional(v.string()),
    examBoards: v.optional(v.array(v.string())),
  }),

  // School domains for SSO provisioning
  schoolDomains: defineTable({
    domain: v.string(),
    schoolId: v.id("schools"),
    defaultRole: v.optional(v.union(v.literal("teacher"), v.literal("student"))),
  }).index("by_domain", ["domain"]),

  // =====================================================
  // Classes
  // =====================================================
  classes: defineTable({
    teacherId: v.id("users"),
    name: v.string(),
    subject: v.optional(v.string()),
    examBoard: v.optional(v.string()),
    level: v.optional(v.string()),
    yearGroup: v.optional(v.string()),
    joinCode: v.optional(v.string()),
    schoolId: v.optional(v.id("schools")),
  })
    .index("by_teacher", ["teacherId"])
    .index("by_join_code", ["joinCode"]),

  // Class enrollments (many-to-many: classes ↔ users/students)
  enrollments: defineTable({
    classId: v.id("classes"),
    studentId: v.id("users"),
    joinedAt: v.optional(v.number()),
  })
    .index("by_class", ["classId"])
    .index("by_student", ["studentId"])
    .index("by_class_student", ["classId", "studentId"]),

  // =====================================================
  // Question Bank
  // =====================================================
  questions: defineTable({
    createdBy: v.id("users"),
    contentType: v.optional(v.string()),
    questionLatex: v.optional(v.string()),
    questionContent: v.optional(v.string()),
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
    questionType: v.optional(v.string()),
    isVerified: v.optional(v.boolean()),
    // Spec version for A Level / IYGB legacy questions
    sourceSpec: v.optional(v.union(
      v.literal("new-spec"),
      v.literal("legacy-modular"),
      v.literal("legacy-gcse"),
      v.null()
    )),
    answerKey: v.optional(v.any()),
    tags: v.optional(v.array(v.string())),
  })
    .index("by_created_by", ["createdBy"])
    .index("by_exam_board", ["examBoard"])
    .index("by_level", ["level"])
    .index("by_topic", ["topic"])
    .index("by_source_spec", ["sourceSpec"]),

  // Saved/starred questions per teacher
  savedQuestions: defineTable({
    userId: v.id("users"),
    questionId: v.id("questions"),
    savedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_question", ["userId", "questionId"]),

  // =====================================================
  // Assignments (exam papers / assessments)
  // =====================================================
  assignments: defineTable({
    classId: v.id("classes"),
    teacherId: v.id("users"),
    title: v.string(),
    mode: v.optional(v.union(v.literal("paper"), v.literal("online"), v.literal("practice"))),
    status: v.optional(v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("closed")
    )),
    dueDate: v.optional(v.number()),
    totalMarks: v.optional(v.number()),
    assignmentType: v.optional(v.string()),
    sourceType: v.optional(v.string()),
    metadata: v.optional(v.any()),
  })
    .index("by_class", ["classId"])
    .index("by_teacher", ["teacherId"]),

  // Questions on an assignment (ordered)
  assignmentQuestions: defineTable({
    assignmentId: v.id("assignments"),
    questionId: v.id("questions"),
    order: v.number(),
    marks: v.optional(v.number()),
    questionLatex: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    showSourceLabel: v.optional(v.boolean()),
    sourceQuestionNumber: v.optional(v.string()),
    sourceQuestionLatex: v.optional(v.string()),
  })
    .index("by_assignment", ["assignmentId"])
    .index("by_question", ["questionId"]),

  // =====================================================
  // Submissions (student attempts)
  // =====================================================
  submissions: defineTable({
    assignmentId: v.id("assignments"),
    studentId: v.id("users"),
    status: v.optional(v.union(
      v.literal("in_progress"),
      v.literal("submitted"),
      v.literal("marked")
    )),
    totalMarksAwarded: v.optional(v.number()),
    submittedAt: v.optional(v.number()),
    markedAt: v.optional(v.number()),
    markedBy: v.optional(v.id("users")),
  })
    .index("by_assignment", ["assignmentId"])
    .index("by_student", ["studentId"])
    .index("by_assignment_student", ["assignmentId", "studentId"]),

  // Per-question marks on a submission
  submissionAnswers: defineTable({
    submissionId: v.id("submissions"),
    assignmentQuestionId: v.id("assignmentQuestions"),
    answerText: v.optional(v.string()),
    marksAwarded: v.optional(v.number()),
    marksMax: v.optional(v.number()),
    teacherComment: v.optional(v.string()),
    isAutoMarked: v.optional(v.boolean()),
  })
    .index("by_submission", ["submissionId"]),

  // =====================================================
  // Feedback
  // =====================================================
  feedbackSheets: defineTable({
    submissionId: v.id("submissions"),
    studentId: v.id("users"),
    assignmentId: v.id("assignments"),
    score: v.optional(v.number()),
    maxScore: v.optional(v.number()),
    aiNarrative: v.optional(v.string()),
    topicBreakdown: v.optional(v.any()),
    isPublished: v.optional(v.boolean()),
    publishedAt: v.optional(v.number()),
  })
    .index("by_submission", ["submissionId"])
    .index("by_student", ["studentId"])
    .index("by_assignment", ["assignmentId"]),

  // =====================================================
  // Shadow Papers
  // =====================================================
  shadowPapers: defineTable({
    studentId: v.id("users"),
    assignmentId: v.id("assignments"),
    sourceMode: v.optional(v.union(v.literal("ai_only"), v.literal("bank_only"), v.literal("mixed"))),
    status: v.optional(v.string()),
    questions: v.optional(v.any()),
    pdfUrl: v.optional(v.string()),
    targetTopics: v.optional(v.array(v.string())),
  })
    .index("by_student", ["studentId"])
    .index("by_assignment", ["assignmentId"]),

  // =====================================================
  // Revision Lists
  // =====================================================
  revisionLists: defineTable({
    createdBy: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    level: v.optional(v.string()),
    topics: v.optional(v.array(v.string())),
    pdfUrl: v.optional(v.string()),
  })
    .index("by_created_by", ["createdBy"]),

  revisionListQuestions: defineTable({
    revisionListId: v.id("revisionLists"),
    questionId: v.id("questions"),
    order: v.optional(v.number()),
  })
    .index("by_revision_list", ["revisionListId"]),

  // =====================================================
  // Class Resources (teacher resource library)
  // =====================================================
  classResources: defineTable({
    classId: v.id("classes"),
    teacherId: v.id("users"),
    title: v.string(),
    resourceType: v.optional(v.string()),
    url: v.optional(v.string()),
    description: v.optional(v.string()),
    topicTags: v.optional(v.array(v.string())),
    fileSize: v.optional(v.number()),
    mimeType: v.optional(v.string()),
  })
    .index("by_class", ["classId"])
    .index("by_teacher", ["teacherId"]),

  // =====================================================
  // Class Invites (CSV bulk import)
  // =====================================================
  classInvites: defineTable({
    classId: v.id("classes"),
    teacherId: v.id("users"),
    email: v.string(),
    fullName: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("rejected")
    )),
    inviteToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  })
    .index("by_class", ["classId"])
    .index("by_email", ["email"])
    .index("by_token", ["inviteToken"]),

  // =====================================================
  // Parent Tokens (magic link portal)
  // =====================================================
  parentTokens: defineTable({
    token: v.string(),
    studentId: v.id("users"),
    createdBy: v.id("users"),
    expiresAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_student", ["studentId"]),

  // =====================================================
  // Booklet Jobs (unused question booklet generator)
  // =====================================================
  bookletJobs: defineTable({
    teacherId: v.id("users"),
    classId: v.id("classes"),
    bankFilter: v.any(),
    excludeAssignmentIds: v.optional(v.array(v.id("assignments"))),
    unusedCount: v.optional(v.number()),
    totalInScope: v.optional(v.number()),
    status: v.union(
      v.literal("pending"),
      v.literal("generating"),
      v.literal("done"),
      v.literal("failed")
    ),
    pdfUrl: v.optional(v.string()),
    errorLog: v.optional(v.string()),
    completedAt: v.optional(v.number()),
    expiresAt: v.number(),
  })
    .index("by_teacher", ["teacherId"])
    .index("by_class", ["classId"]),

  // =====================================================
  // Revision Allocations (per-student progress on a revision list)
  // =====================================================
  revisionAllocations: defineTable({
    revisionListId: v.id("revisionLists"),
    studentId: v.id("users"),
    classId: v.optional(v.id("classes")),
    status: v.optional(v.string()), // pending | in_progress | completed
    progress: v.optional(v.any()), // { [questionId]: { completed, completedAt } }
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    allocatedAt: v.optional(v.number()),
  })
    .index("by_student", ["studentId"])
    .index("by_revision_list", ["revisionListId"])
    .index("by_student_list", ["studentId", "revisionListId"]),
})
