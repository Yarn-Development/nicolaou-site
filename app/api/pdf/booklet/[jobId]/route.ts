import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { fetchQuery, fetchMutation, api, getConvexUserIdByClerkId } from "@/lib/convex/server"
import type { Id } from "@/convex/_generated/dataModel"
import { generateBookletBuffer } from "@/lib/booklet-pdf"
import type { UnusedQuestion, BookletSpec } from "@/app/actions/booklet"

export const maxDuration = 60

function mapUnusedQuestion(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  q: any,
): UnusedQuestion {
  return {
    id: q._id,
    image_url: q.imageUrl ?? null,
    question_latex: q.questionLatex ?? null,
    marks: q.marks ?? 0,
    calculator_allowed: q.calculatorAllowed ?? false,
    topic: q.topic ?? q.topicName ?? "",
    sub_topic: q.subTopic ?? "",
    exam_board: q.examBoard ?? "",
    level: q.level ?? "",
    paper_reference: q.paperReference ?? "",
    question_number_ref: q.questionNumberRef ?? "",
    source_spec: (q.sourceSpec ?? null) as BookletSpec,
    answer_key: q.answerKey ?? null,
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params

  const { userId } = await auth()
  if (!userId) return new NextResponse("Unauthorized", { status: 401 })

  const teacherId = await getConvexUserIdByClerkId(userId)
  if (!teacherId) return new NextResponse("Unauthorized", { status: 401 })

  // Load the job (auth check: teacherId must match)
  const job = await fetchQuery(api.booklets.getBookletJob, {
    jobId: jobId as Id<"bookletJobs">,
  })

  if (!job || job.teacherId !== teacherId) {
    return new NextResponse("Job not found", { status: 404 })
  }

  // Mark as generating
  await fetchMutation(api.booklets.updateBookletJob, {
    jobId: jobId as Id<"bookletJobs">,
    status: "generating",
  })

  try {
    const filter = (job.bankFilter ?? {}) as Record<string, unknown>
    const questionIds = (filter._questionIds as string[]) || []

    if (questionIds.length === 0) {
      await fetchMutation(api.booklets.updateBookletJob, {
        jobId: jobId as Id<"bookletJobs">,
        status: "failed",
        errorLog: "No question IDs in job",
      })
      return new NextResponse("No questions to generate", { status: 400 })
    }

    // Fetch the actual question data
    const questions = await fetchQuery(api.questions.getQuestionsByIds, {
      ids: questionIds as Id<"questions">[],
    })

    // Preserve the order from questionIds
    const qMap = new Map(
      questions.filter(Boolean).map((q) => [q!._id as string, q!]),
    )
    const orderedQuestions: UnusedQuestion[] = questionIds
      .map((id) => qMap.get(id))
      .filter(Boolean)
      .map((q) => mapUnusedQuestion(q))

    if (orderedQuestions.length === 0) {
      await fetchMutation(api.booklets.updateBookletJob, {
        jobId: jobId as Id<"bookletJobs">,
        status: "failed",
        errorLog: "Failed to load questions",
      })
      return new NextResponse("Failed to load questions", { status: 500 })
    }

    // Build scope label
    const scopeLabel = buildScopeLabel(filter)
    const cls = await fetchQuery(api.classes.getClass, {
      classId: job.classId,
      teacherId,
    })
    const className = cls?.name || "Class"
    const now = new Date()
    const dateGenerated = now.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })

    const buffer = await generateBookletBuffer({
      className,
      scopeLabel,
      dateGenerated,
      questions: orderedQuestions,
      includeTopicTags: filter.includeTopicTags !== false,
      includeLegacyBadge: filter.includeLegacyBadge !== false,
    })

    const filename = `booklet-${className.replace(/\s+/g, "-").toLowerCase()}-${now.toISOString().slice(0, 10)}.pdf`

    // Mark job as done
    await fetchMutation(api.booklets.updateBookletJob, {
      jobId: jobId as Id<"bookletJobs">,
      status: "done",
      unusedCount: orderedQuestions.length,
    })

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
      },
    })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error"
    await fetchMutation(api.booklets.updateBookletJob, {
      jobId: jobId as Id<"bookletJobs">,
      status: "failed",
      errorLog: errMsg,
    })
    return new NextResponse("PDF generation failed: " + errMsg, { status: 500 })
  }
}

function buildScopeLabel(filter: Record<string, unknown>): string {
  const parts: string[] = []
  if (filter.board) parts.push(filter.board as string)
  if (filter.level) parts.push(filter.level as string)
  if (filter.spec === "legacy-modular") parts.push("Legacy Modular")
  else if (filter.spec === "new-spec") parts.push("New Spec")
  else if (filter.spec === "legacy-gcse") parts.push("Legacy GCSE")
  if (Array.isArray(filter.modules) && filter.modules.length > 0) {
    parts.push((filter.modules as string[]).join(", "))
  }
  return parts.join(" · ") || "All Questions"
}
