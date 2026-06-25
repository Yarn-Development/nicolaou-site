import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

/** Get all classes for a teacher */
export const getTeacherClasses = query({
  args: { teacherId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("classes")
      .withIndex("by_teacher", q => q.eq("teacherId", args.teacherId))
      .collect()
  },
})

/** Create a new class */
export const createClass = mutation({
  args: {
    teacherId: v.id("users"),
    name: v.string(),
    subject: v.optional(v.string()),
    examBoard: v.optional(v.string()),
    level: v.optional(v.string()),
    yearGroup: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    return await ctx.db.insert("classes", {
      ...args,
      joinCode,
    })
  },
})

/** Get class by ID (with teacher ownership check) */
export const getClass = query({
  args: { classId: v.id("classes"), teacherId: v.id("users") },
  handler: async (ctx, args) => {
    const cls = await ctx.db.get(args.classId)
    if (!cls || cls.teacherId !== args.teacherId) return null
    return cls
  },
})

/** Get students enrolled in a class */
export const getClassStudents = query({
  args: { classId: v.id("classes") },
  handler: async (ctx, args) => {
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_class", q => q.eq("classId", args.classId))
      .collect()

    const students = await Promise.all(enrollments.map(e => ctx.db.get(e.studentId)))
    return students.filter(Boolean)
  },
})

/** Enroll a student in a class */
export const enrollStudent = mutation({
  args: { classId: v.id("classes"), studentId: v.id("users") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("enrollments")
      .withIndex("by_class_student", q =>
        q.eq("classId", args.classId).eq("studentId", args.studentId)
      )
      .unique()

    if (existing) return existing._id

    return await ctx.db.insert("enrollments", {
      classId: args.classId,
      studentId: args.studentId,
      joinedAt: Date.now(),
    })
  },
})

/** Get classes a student is enrolled in */
export const getStudentClasses = query({
  args: { studentId: v.id("users") },
  handler: async (ctx, args) => {
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_student", q => q.eq("studentId", args.studentId))
      .collect()

    const classes = await Promise.all(enrollments.map(e => ctx.db.get(e.classId)))
    return classes.filter(Boolean)
  },
})

/** Remove a student's enrollment from a class (student leaves). */
export const unenrollStudent = mutation({
  args: { classId: v.id("classes"), studentId: v.id("users") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("enrollments")
      .withIndex("by_class_student", q =>
        q.eq("classId", args.classId).eq("studentId", args.studentId)
      )
      .unique()
    if (existing) await ctx.db.delete(existing._id)
    return { success: true }
  },
})

/** Get teacher classes with their enrolled-student counts. */
export const getTeacherClassesWithCounts = query({
  args: { teacherId: v.id("users") },
  handler: async (ctx, args) => {
    const classes = await ctx.db
      .query("classes")
      .withIndex("by_teacher", q => q.eq("teacherId", args.teacherId))
      .order("desc")
      .collect()

    return await Promise.all(
      classes.map(async cls => {
        const enrollments = await ctx.db
          .query("enrollments")
          .withIndex("by_class", q => q.eq("classId", cls._id))
          .collect()
        return { ...cls, studentCount: enrollments.length }
      })
    )
  },
})

/** Get students enrolled in a class with profile + joined timestamp (teacher-checked). */
export const getClassStudentsDetailed = query({
  args: { classId: v.id("classes"), teacherId: v.id("users") },
  handler: async (ctx, args) => {
    const cls = await ctx.db.get(args.classId)
    if (!cls) return { error: "not_found" as const }
    if (cls.teacherId !== args.teacherId) return { error: "forbidden" as const }

    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_class", q => q.eq("classId", args.classId))
      .collect()
    enrollments.sort((a, b) => (a.joinedAt ?? a._creationTime) - (b.joinedAt ?? b._creationTime))

    const students = []
    for (const e of enrollments) {
      const student = await ctx.db.get(e.studentId)
      if (!student) continue
      students.push({
        id: student._id,
        email: student.email ?? "",
        fullName: student.fullName ?? null,
        joinedAt: e.joinedAt ?? e._creationTime,
      })
    }
    return { students }
  },
})

/** Look up a class by its join code (replaces the lookup_class_by_join_code RPC). */
export const getClassByJoinCode = query({
  args: { joinCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("classes")
      .withIndex("by_join_code", q => q.eq("joinCode", args.joinCode))
      .unique()
  },
})

/** Delete a class (teacher ownership enforced). */
export const deleteClass = mutation({
  args: { classId: v.id("classes"), teacherId: v.id("users") },
  handler: async (ctx, args) => {
    const cls = await ctx.db.get(args.classId)
    if (!cls || cls.teacherId !== args.teacherId) {
      return { error: "forbidden" as const }
    }
    await ctx.db.delete(args.classId)
    return { success: true }
  },
})

/** Remove a student from a class (teacher ownership enforced). */
export const removeStudentFromClass = mutation({
  args: { classId: v.id("classes"), studentId: v.id("users"), teacherId: v.id("users") },
  handler: async (ctx, args) => {
    const cls = await ctx.db.get(args.classId)
    if (!cls || cls.teacherId !== args.teacherId) {
      return { error: "forbidden" as const }
    }
    const existing = await ctx.db
      .query("enrollments")
      .withIndex("by_class_student", q =>
        q.eq("classId", args.classId).eq("studentId", args.studentId)
      )
      .unique()
    if (existing) await ctx.db.delete(existing._id)
    return { success: true }
  },
})

/** Enrolled classes for a student, with joined timestamp + teacher (for joinClass return + listing). */
export const getStudentClassesDetailed = query({
  args: { studentId: v.id("users") },
  handler: async (ctx, args) => {
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_student", q => q.eq("studentId", args.studentId))
      .collect()
    enrollments.sort((a, b) => (b.joinedAt ?? b._creationTime) - (a.joinedAt ?? a._creationTime))

    const rows = []
    for (const e of enrollments) {
      const cls = await ctx.db.get(e.classId)
      if (!cls) continue
      rows.push({
        id: cls._id,
        name: cls.name,
        subject: cls.subject ?? "Maths",
        teacherId: cls.teacherId,
        joinedAt: e.joinedAt ?? e._creationTime,
      })
    }
    return rows
  },
})
