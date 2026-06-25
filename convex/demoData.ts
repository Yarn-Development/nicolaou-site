import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

const DEMO_CLASS_NAME = "Year 13 Demo"
const DEMO_ASSIGNMENT_TITLE = "Mock Exam - Demo"
const DEMO_STUDENTS = [
  "Alice Thompson",
  "Ben Carter",
  "Charlotte Lee",
  "David Patel",
  "Emma Wilson",
]

/** Does the teacher already have demo data? */
export const checkExists = query({
  args: { teacherId: v.id("users") },
  handler: async (ctx, { teacherId }) => {
    const classes = await ctx.db
      .query("classes")
      .withIndex("by_teacher", (q) => q.eq("teacherId", teacherId))
      .collect()
    const demoClass = classes.find((c) => c.name === DEMO_CLASS_NAME)
    if (!demoClass) return { exists: false as const }
    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_class", (q) => q.eq("classId", demoClass._id))
      .collect()
    const demoAssignment = assignments.find((a) => a.title === DEMO_ASSIGNMENT_TITLE)
    return { exists: true as const, classId: demoClass._id, assignmentId: demoAssignment?._id }
  },
})

/** Seed a demo class with 5 students, a mock exam, and graded submissions. */
export const seed = mutation({
  args: { teacherId: v.id("users") },
  handler: async (ctx, { teacherId }) => {
    const classes = await ctx.db
      .query("classes")
      .withIndex("by_teacher", (q) => q.eq("teacherId", teacherId))
      .collect()
    const existing = classes.find((c) => c.name === DEMO_CLASS_NAME)
    if (existing) {
      return {
        alreadySeeded: true as const,
        classId: existing._id,
        className: existing.name,
        assignmentId: "",
        studentCount: 5,
      }
    }

    // Prefer the teacher's own questions, else any bank questions.
    let questions = await ctx.db
      .query("questions")
      .withIndex("by_created_by", (q) => q.eq("createdBy", teacherId))
      .take(8)
    if (questions.length === 0) questions = await ctx.db.query("questions").take(8)
    if (questions.length === 0) return { error: "no_questions" as const }

    const joinCode = "DEMO" + Math.random().toString(36).substring(2, 6).toUpperCase()
    const classId = await ctx.db.insert("classes", {
      teacherId,
      name: DEMO_CLASS_NAME,
      subject: "Maths",
      joinCode,
    })

    const studentIds = []
    for (const name of DEMO_STUDENTS) {
      const rnd = Math.random().toString(36).slice(2, 10)
      const studentId = await ctx.db.insert("users", {
        clerkId: `demo:${rnd}`,
        email: `demo.${rnd}@demo.nicolaou.app`,
        fullName: name,
        role: "student",
        onboardingComplete: true,
      })
      studentIds.push(studentId)
      await ctx.db.insert("enrollments", { classId, studentId, joinedAt: Date.now() })
    }

    const totalMarks = questions.reduce((s, q) => s + (q.marks ?? 1), 0)
    const assignmentId = await ctx.db.insert("assignments", {
      classId,
      teacherId,
      title: DEMO_ASSIGNMENT_TITLE,
      mode: "paper",
      status: "published",
      dueDate: Date.now() + 7 * 24 * 60 * 60 * 1000,
      totalMarks,
      metadata: { description: "Demo mock exam to showcase the marking workflow" },
    })

    const aqs = []
    for (let i = 0; i < questions.length; i++) {
      const id = await ctx.db.insert("assignmentQuestions", {
        assignmentId,
        questionId: questions[i]._id,
        order: i,
        marks: questions[i].marks ?? 1,
      })
      aqs.push({ id, marks: questions[i].marks ?? 1 })
    }

    for (let i = 0; i < studentIds.length; i++) {
      const perf = 0.95 - i * 0.1
      const submissionId = await ctx.db.insert("submissions", {
        assignmentId,
        studentId: studentIds[i],
        status: "marked",
        submittedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
        markedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
        markedBy: teacherId,
      })
      let total = 0
      for (const { id, marks } of aqs) {
        const base = Math.floor(marks * perf)
        const score = Math.max(0, Math.min(marks, base + (Math.floor(Math.random() * 3) - 1)))
        total += score
        await ctx.db.insert("submissionAnswers", {
          submissionId,
          assignmentQuestionId: id,
          marksAwarded: score,
          marksMax: marks,
        })
      }
      await ctx.db.patch(submissionId, { totalMarksAwarded: total })
    }

    return {
      classId,
      className: DEMO_CLASS_NAME,
      assignmentId,
      studentCount: studentIds.length,
    }
  },
})

/** Remove the teacher's demo class and all associated demo data. */
export const remove = mutation({
  args: { teacherId: v.id("users") },
  handler: async (ctx, { teacherId }) => {
    const classes = await ctx.db
      .query("classes")
      .withIndex("by_teacher", (q) => q.eq("teacherId", teacherId))
      .collect()
    const demoClass = classes.find((c) => c.name === DEMO_CLASS_NAME)
    if (!demoClass) return { error: "not_found" as const }

    const deleteSubmission = async (submissionId: import("./_generated/dataModel").Id<"submissions">) => {
      const answers = await ctx.db
        .query("submissionAnswers")
        .withIndex("by_submission", (q) => q.eq("submissionId", submissionId))
        .collect()
      for (const a of answers) await ctx.db.delete(a._id)
      await ctx.db.delete(submissionId)
    }

    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_class", (q) => q.eq("classId", demoClass._id))
      .collect()
    for (const e of enrollments) {
      await ctx.db.delete(e._id)
      const student = await ctx.db.get(e.studentId)
      if (student?.clerkId?.startsWith("demo:")) {
        const subs = await ctx.db
          .query("submissions")
          .withIndex("by_student", (q) => q.eq("studentId", e.studentId))
          .collect()
        for (const s of subs) await deleteSubmission(s._id)
        await ctx.db.delete(e.studentId)
      }
    }

    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_class", (q) => q.eq("classId", demoClass._id))
      .collect()
    for (const a of assignments) {
      const aqs = await ctx.db
        .query("assignmentQuestions")
        .withIndex("by_assignment", (q) => q.eq("assignmentId", a._id))
        .collect()
      for (const aq of aqs) await ctx.db.delete(aq._id)
      const subs = await ctx.db
        .query("submissions")
        .withIndex("by_assignment", (q) => q.eq("assignmentId", a._id))
        .collect()
      for (const s of subs) await deleteSubmission(s._id)
      await ctx.db.delete(a._id)
    }

    await ctx.db.delete(demoClass._id)
    return { success: true as const }
  },
})
