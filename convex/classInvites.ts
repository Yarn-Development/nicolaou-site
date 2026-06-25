import { v } from "convex/values"
import { mutation } from "./_generated/server"

/**
 * Class invite functions backing the teacher CSV bulk-import flow and the
 * auto-enroll-on-sign-in flow. All take explicit Convex ids resolved from the
 * Clerk id in the server action.
 */

/**
 * Bulk-invite students to a class. For each email:
 *  - if an existing student profile is found, enroll them directly (unless
 *    already enrolled);
 *  - otherwise upsert a pending invite by (classId, email).
 * Returns counts; the server action handles sending invite emails for the
 * `invited` cases (it needs the class name / join code + Resend).
 */
export const bulkInvite = mutation({
  args: {
    teacherId: v.id("users"),
    classId: v.id("classes"),
    students: v.array(
      v.object({
        name: v.string(),
        email: v.string(),
      }),
    ),
  },
  handler: async (ctx, { teacherId, classId, students }) => {
    const cls = await ctx.db.get(classId)
    if (!cls || cls.teacherId !== teacherId) {
      return { error: "not_found" as const }
    }

    let enrolled = 0
    let invited = 0
    let alreadyEnrolled = 0
    const errors: { email: string; reason: string }[] = []
    // Emails the action should send invites to (no profile yet).
    const toEmail: { email: string; name: string }[] = []

    for (const student of students) {
      const email = student.email.trim().toLowerCase()
      if (!email || !email.includes("@")) {
        errors.push({ email: student.email, reason: "Invalid email" })
        continue
      }

      try {
        const profile = await ctx.db
          .query("users")
          .withIndex("by_email", (q) => q.eq("email", email))
          .first()

        if (profile && profile.role === "student") {
          const existing = await ctx.db
            .query("enrollments")
            .withIndex("by_class_student", (q) =>
              q.eq("classId", classId).eq("studentId", profile._id),
            )
            .unique()

          if (existing) {
            alreadyEnrolled++
            continue
          }

          await ctx.db.insert("enrollments", {
            classId,
            studentId: profile._id,
            joinedAt: Date.now(),
          })
          enrolled++
        } else {
          // Upsert a pending invite by (classId, email).
          const existingInvite = await ctx.db
            .query("classInvites")
            .withIndex("by_email", (q) => q.eq("email", email))
            .collect()
          const match = existingInvite.find((i) => i.classId === classId)
          if (match) {
            await ctx.db.patch(match._id, {
              fullName: student.name || match.fullName,
              status: "pending",
            })
          } else {
            await ctx.db.insert("classInvites", {
              classId,
              teacherId,
              email,
              fullName: student.name || undefined,
              status: "pending",
            })
          }
          invited++
          toEmail.push({ email, name: student.name || email })
        }
      } catch (err) {
        errors.push({ email, reason: String(err) })
      }
    }

    return {
      enrolled,
      invited,
      alreadyEnrolled,
      errors,
      toEmail,
      className: cls.name,
      joinCode: cls.joinCode ?? "",
    }
  },
})

/**
 * Auto-enroll the signed-in student into any classes they were invited to.
 * Matches pending invites by email, creates enrollments (if not already
 * enrolled), and flips the invite status to accepted.
 */
export const acceptPending = mutation({
  args: {
    studentId: v.id("users"),
    email: v.string(),
  },
  handler: async (ctx, { studentId, email }) => {
    const normalized = email.trim().toLowerCase()
    const invites = await ctx.db
      .query("classInvites")
      .withIndex("by_email", (q) => q.eq("email", normalized))
      .collect()

    const pending = invites.filter((i) => (i.status ?? "pending") === "pending")
    if (pending.length === 0) return { accepted: 0 }

    let accepted = 0
    for (const invite of pending) {
      const existing = await ctx.db
        .query("enrollments")
        .withIndex("by_class_student", (q) =>
          q.eq("classId", invite.classId).eq("studentId", studentId),
        )
        .unique()

      if (!existing) {
        await ctx.db.insert("enrollments", {
          classId: invite.classId,
          studentId,
          joinedAt: Date.now(),
        })
      }

      await ctx.db.patch(invite._id, { status: "accepted" })
      accepted++
    }

    return { accepted }
  },
})
