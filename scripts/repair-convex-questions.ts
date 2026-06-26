#!/usr/bin/env tsx

/**
 * Repair Convex question LaTeX with the same quality gate used at generation.
 *
 * Dry-run by default. No database writes happen unless --apply is passed.
 * Deletion is even stricter: unsaveable rows are only deleted when BOTH
 * --apply and --delete-unsaveable are passed.
 *
 * Usage:
 *   npx tsx scripts/repair-convex-questions.ts --dry-run --limit=100
 *   npx tsx scripts/repair-convex-questions.ts --apply --ai --limit=100
 *   npx tsx scripts/repair-convex-questions.ts --apply --ai --delete-unsaveable --limit=100
 *   npx tsx scripts/repair-convex-questions.ts --dry-run --quiet --limit=100000
 *
 * Defaults:
 *   - processes generated_text, synthetic_image, and revision_generated only
 *   - skips official_past_paper and image_ocr unless --include-image-backed is set
 *   - uses deterministic repair first
 *   - uses AI repair only with --ai
 *   - does not delete records unless explicitly requested
 */

import * as dotenv from "dotenv"
import { ConvexHttpClient } from "convex/browser"
import { api } from "../convex/_generated/api"
import type { Id } from "../convex/_generated/dataModel"
import {
  lintQuestion,
  qualityGateQuestion,
  safeParseJSON,
  type GeneratedQuestionDraft,
} from "../lib/ai-question-quality"
import { repairLatex } from "../lib/latex-utils"
import { sanitizeQuestionFields } from "../lib/question-sanitizer"

dotenv.config({ path: ".env.local" })

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY

if (!CONVEX_URL) {
  console.error("Missing NEXT_PUBLIC_CONVEX_URL")
  process.exit(1)
}

const convex = new ConvexHttpClient(CONVEX_URL)

type AnswerKey = {
  answer?: string
  explanation?: string
  [key: string]: unknown
}

type RepairRow = {
  id: string
  questionLatex: string | null
  imageUrl: string | null
  contentType: string
  topic: string | null
  topicName: string | null
  subTopicName: string | null
  difficulty: string | null
  marks: number | null
  questionType: string | null
  calculatorAllowed: boolean | null
  answerKey: AnswerKey | null
  isVerified: boolean
  createdAt: number
  createdBy: string | null
}

type Args = {
  apply: boolean
  ai: boolean
  deleteUnsaveable: boolean
  includeImageBacked: boolean
  mathValidate: boolean
  quiet: boolean
  limit: number
  batchSize: number
  contentType: string
}

type Outcome = "clean" | "repaired" | "ai_repaired" | "unsaveable" | "deleted" | "skipped"

const TEXT_REPAIR_CONTENT_TYPES = new Set(["generated_text", "synthetic_image", "revision_generated"])
const IMAGE_BACKED_CONTENT_TYPES = new Set(["image_ocr", "official_past_paper"])
const AI_TIMEOUT_MS = 90_000

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt === attempts) break
      console.warn(`${label} failed on attempt ${attempt}/${attempts}; retrying...`)
      await sleep(750 * attempt)
    }
  }
  throw lastError
}

function parseArgs(): Args {
  const argv = process.argv.slice(2)
  const argValue = (name: string, fallback: string) =>
    argv.find((arg) => arg.startsWith(`${name}=`))?.split("=")[1] ?? fallback

  return {
    apply: argv.includes("--apply"),
    ai: argv.includes("--ai"),
    deleteUnsaveable: argv.includes("--delete-unsaveable"),
    includeImageBacked: argv.includes("--include-image-backed"),
    mathValidate: argv.includes("--math-validate"),
    quiet: argv.includes("--quiet"),
    limit: Number(argValue("--limit", "200")),
    batchSize: Number(argValue("--batch-size", "50")),
    contentType: argValue("--content-type", "all"),
  }
}

function toDraft(row: RepairRow): GeneratedQuestionDraft {
  return {
    questionLatex: row.questionLatex ?? "",
    answer: typeof row.answerKey?.answer === "string" ? row.answerKey.answer : "",
    explanation: typeof row.answerKey?.explanation === "string" ? row.answerKey.explanation : "",
    marks: row.marks ?? undefined,
  }
}

function shouldProcess(row: RepairRow, args: Args): boolean {
  if (args.contentType !== "all" && row.contentType !== args.contentType) return false
  if (TEXT_REPAIR_CONTENT_TYPES.has(row.contentType)) return true
  if (args.includeImageBacked && IMAGE_BACKED_CONTENT_TYPES.has(row.contentType)) return true
  return false
}

function deterministicRepair(row: RepairRow): GeneratedQuestionDraft {
  const sanitized = sanitizeQuestionFields({
    question_latex: row.questionLatex,
    answer_key: row.answerKey,
  })

  return {
    questionLatex: repairLatex(sanitized.question_latex ?? row.questionLatex ?? ""),
    answer: repairLatex(
      typeof sanitized.answer_key?.answer === "string"
        ? sanitized.answer_key.answer
        : typeof row.answerKey?.answer === "string"
          ? row.answerKey.answer
          : ""
    ),
    explanation: repairLatex(
      typeof sanitized.answer_key?.explanation === "string"
        ? sanitized.answer_key.explanation
        : typeof row.answerKey?.explanation === "string"
          ? row.answerKey.explanation
          : ""
    ),
    marks: row.marks ?? undefined,
  }
}

async function gate(row: RepairRow, draft: GeneratedQuestionDraft, args: Args) {
  return qualityGateQuestion(draft, {
    expectedMarks: row.marks ?? undefined,
    hasDiagram: Boolean(row.imageUrl),
    requireExplanation: row.contentType !== "image_ocr",
    runMathValidation: args.mathValidate,
    apiKey: OPENROUTER_KEY,
  })
}

async function repairWithAI(row: RepairRow, draft: GeneratedQuestionDraft, issues: string[]) {
  if (!OPENROUTER_KEY) return null

  const prompt = `You are a precise UK GCSE and A-Level mathematics exam editor.

Repair this question so it is suitable for an exam paper. Preserve the same mathematical intent, values, topic, marks, and answer. Do not make it easier or harder.

QUALITY ISSUES TO FIX:
${issues.map((issue) => `- ${issue}`).join("\n")}

RULES:
- Return valid JSON only.
- question_latex contains only the student-facing question.
- Use $...$ for inline maths and $$...$$ for display maths.
- Use correct LaTeX commands such as \\frac{}{}, \\sqrt{}, \\times, \\div.
- Remove markdown, answer sections, placeholders, metadata leaks, and conversational filler.
- If the question references a diagram, keep that reference only if a diagram is actually attached.
- Keep the answer and explanation consistent with the repaired question.
- Explanation must be an exam-style mark scheme using M1/A1/B1 labels where appropriate.

METADATA:
- Topic: ${row.subTopicName ?? row.topicName ?? row.topic ?? "Unknown"}
- Marks: ${row.marks ?? "unknown"}
- Type: ${row.questionType ?? "unknown"}
- Calculator: ${row.calculatorAllowed === false ? "not allowed" : "allowed/unknown"}
- Has diagram: ${Boolean(row.imageUrl)}

INPUT JSON:
${JSON.stringify(draft, null, 2)}

OUTPUT JSON:
{
  "question_latex": "...",
  "answer": "...",
  "explanation": "..."
}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS)
  let content: string | undefined

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${OPENROUTER_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": "Nicolaou Maths - Convex Question Repair",
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-4-6",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 1800,
      }),
    })

    if (!response.ok) return null
    const data = await response.json()
    content = data.choices?.[0]?.message?.content?.trim()
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }

  if (!content) return null

  const parsed = safeParseJSON<{ question_latex?: string; questionLatex?: string; answer?: string; explanation?: string }>(content)
  if (!parsed) return null

  return {
    questionLatex: parsed.question_latex ?? parsed.questionLatex ?? "",
    answer: parsed.answer ?? draft.answer,
    explanation: parsed.explanation ?? draft.explanation,
    marks: row.marks ?? undefined,
  } satisfies GeneratedQuestionDraft
}

function answerKeyWith(row: RepairRow, draft: GeneratedQuestionDraft): AnswerKey {
  return {
    ...(row.answerKey ?? {}),
    answer: draft.answer,
    explanation: draft.explanation,
    repair_meta: {
      repaired_at: new Date().toISOString(),
      repaired_by: "scripts/repair-convex-questions.ts",
    },
  }
}

async function saveRepair(row: RepairRow, draft: GeneratedQuestionDraft) {
  await withRetry(`Save ${row.id}`, () =>
    convex.mutation(api.audit.updateQuestion, {
      id: row.id as Id<"questions">,
      questionLatex: draft.questionLatex,
      answerKey: answerKeyWith(row, draft),
      isVerified: false,
    })
  )
}

async function deleteQuestion(row: RepairRow) {
  await withRetry(`Delete ${row.id}`, () => convex.mutation(api.audit.deleteQuestion, { id: row.id as Id<"questions"> }))
}

async function fetchBatch(args: Args, offset: number): Promise<{ rows: RepairRow[]; total: number }> {
  const result = await withRetry(`Fetch batch at offset ${offset}`, () =>
    convex.query(api.audit.listQuestions, {
      contentType: args.contentType,
      verifiedStatus: "all",
      search: undefined,
      limit: args.batchSize,
      offset,
    })
  )

  return {
    rows: result.questions as RepairRow[],
    total: result.total as number,
  }
}

async function processRow(row: RepairRow, args: Args): Promise<{ outcome: Outcome; issues: string[] }> {
  if (!shouldProcess(row, args)) {
    return { outcome: "skipped", issues: [`Skipped content type ${row.contentType}`] }
  }

  const original = toDraft(row)
  const originalIssues = lintQuestion(original, {
    expectedMarks: row.marks ?? undefined,
    hasDiagram: Boolean(row.imageUrl),
    requireExplanation: row.contentType !== "image_ocr",
  })

  if (originalIssues.length === 0) {
    const gated = await gate(row, original, args)
    if (gated.ok) return { outcome: "clean", issues: [] }
  }

  const deterministic = deterministicRepair(row)
  const deterministicGate = await gate(row, deterministic, args)
  if (deterministicGate.ok) {
    if (args.apply) await saveRepair(row, deterministicGate.question)
    return { outcome: "repaired", issues: deterministicGate.issues }
  }

  if (args.ai) {
    const aiDraft = await repairWithAI(row, deterministic, deterministicGate.issues)
    if (aiDraft) {
      const aiGate = await gate(row, aiDraft, args)
      if (aiGate.ok) {
        if (args.apply) await saveRepair(row, aiGate.question)
        return { outcome: "ai_repaired", issues: [] }
      }
      if (args.apply && args.deleteUnsaveable) {
        await deleteQuestion(row)
        return { outcome: "deleted", issues: aiGate.issues }
      }
      return { outcome: "unsaveable", issues: aiGate.issues }
    }

    const failedIssues = [...deterministicGate.issues, "AI repair did not return usable JSON"]
    if (args.apply && args.deleteUnsaveable) {
      await deleteQuestion(row)
      return { outcome: "deleted", issues: failedIssues }
    }
    return { outcome: "unsaveable", issues: failedIssues }
  }

  return { outcome: "unsaveable", issues: deterministicGate.issues }
}

function printHeader(args: Args) {
  console.log("\n" + "═".repeat(72))
  console.log("  Convex Question Repair")
  console.log("═".repeat(72))
  console.log(`  Mode:               ${args.apply ? "APPLY" : "DRY RUN"}`)
  console.log(`  AI repair:          ${args.ai ? "enabled" : "disabled"}`)
  console.log(`  Math validation:    ${args.mathValidate ? "enabled" : "disabled"}`)
  console.log(`  Delete unsaveable:  ${args.apply && args.deleteUnsaveable ? "enabled" : "disabled"}`)
  console.log(`  Include image rows: ${args.includeImageBacked ? "yes" : "no"}`)
  console.log(`  Content type:       ${args.contentType}`)
  console.log(`  Limit:              ${args.limit}`)
  console.log("═".repeat(72) + "\n")
}

async function main() {
  const args = parseArgs()
  printHeader(args)

  if (args.mathValidate && !OPENROUTER_KEY) {
    console.error("--math-validate requires OPENROUTER_API_KEY")
    process.exit(1)
  }
  if (args.ai && !OPENROUTER_KEY) {
    console.error("--ai requires OPENROUTER_API_KEY")
    process.exit(1)
  }
  if (args.deleteUnsaveable && !args.apply) {
    console.log("Deletion requested without --apply; running as dry-run.")
  }
  if (args.deleteUnsaveable && !args.ai) {
    console.error("--delete-unsaveable requires --ai so questions are not deleted before AI repair is attempted")
    process.exit(1)
  }

  const counts: Record<Outcome, number> = {
    clean: 0,
    repaired: 0,
    ai_repaired: 0,
    unsaveable: 0,
    deleted: 0,
    skipped: 0,
  }
  const unsaveable: Array<{ id: string; issues: string[] }> = []

  const rowsToProcess: RepairRow[] = []
  let total = 0
  let offset = 0

  while (rowsToProcess.length < args.limit) {
    const batch = await fetchBatch(args, offset)
    total = batch.total
    if (batch.rows.length === 0) break
    rowsToProcess.push(...batch.rows.slice(0, args.limit - rowsToProcess.length))
    offset += batch.rows.length
    if (batch.rows.length < args.batchSize) break
  }

  let processed = 0

  for (const row of rowsToProcess) {
    processed++

    let result: { outcome: Outcome; issues: string[] }
    try {
      result = await processRow(row, args)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      result = { outcome: "unsaveable", issues: [`Repair script error: ${message}`] }
    }
    counts[result.outcome]++

    const label = result.outcome.padEnd(12)
    const id = row.id.slice(0, 10)
    const topic = row.subTopicName ?? row.topicName ?? row.topic ?? "unknown"
    if (!args.quiet) {
      console.log(`[${label}] ${id} ${row.contentType} ${topic}`)
      if (result.outcome === "unsaveable" || result.outcome === "deleted") {
        const issues = result.issues.slice(0, 3)
        for (const issue of issues) console.log(`             - ${issue}`)
      }
    }
    if (result.outcome === "unsaveable") {
      unsaveable.push({ id: row.id, issues: result.issues })
    }
    if (args.quiet && processed % args.batchSize === 0) {
      console.log(`  Progress: ${processed}/${rowsToProcess.length}`)
    }
  }

  console.log("\n" + "═".repeat(72))
  console.log("  Summary")
  console.log("═".repeat(72))
  console.log(`  Processed:    ${processed}/${Math.min(total, args.limit)}`)
  console.log(`  Clean:        ${counts.clean}`)
  console.log(`  Repaired:     ${counts.repaired}`)
  console.log(`  AI repaired:  ${counts.ai_repaired}`)
  console.log(`  Unsaveable:   ${counts.unsaveable}`)
  console.log(`  Deleted:      ${counts.deleted}`)
  console.log(`  Skipped:      ${counts.skipped}`)

  if (unsaveable.length > 0) {
    console.log("\n  Unsaveable IDs:")
    for (const row of unsaveable.slice(0, 25)) {
      console.log(`  - ${row.id}: ${row.issues.slice(0, 2).join("; ")}`)
    }
    if (unsaveable.length > 25) console.log(`  ...and ${unsaveable.length - 25} more`)
  }

  console.log("═".repeat(72) + "\n")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
