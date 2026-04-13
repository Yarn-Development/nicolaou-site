"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { repairLatex } from "@/lib/latex-utils"

// =====================================================
// Types
// =====================================================

export interface AuditQuestion {
  id: string
  question_latex: string | null
  image_url: string | null
  content_type: string
  topic: string | null
  topic_name: string | null
  sub_topic_name: string | null
  difficulty: string | null
  marks: number | null
  question_type: string | null
  calculator_allowed: boolean | null
  answer_key: Record<string, unknown> | null
  is_verified: boolean
  created_at: string
  created_by: string | null
  is_suspect: boolean // client-computed flag
}

export interface AuditFilters {
  showSuspectFirst: boolean
  contentType: string // "all" | specific type
  verifiedStatus: string // "all" | "verified" | "unverified"
  search: string
  limit: number
  offset: number
}

// =====================================================
// Fetch questions for audit (paginated)
// =====================================================

export async function getAuditQuestions(
  filters: AuditFilters
): Promise<{ success: boolean; data?: AuditQuestion[]; total?: number; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: "You must be logged in" }
  }

  try {
    let query = supabase
      .from("questions")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(filters.offset, filters.offset + filters.limit - 1)

    // Content type filter
    if (filters.contentType !== "all") {
      query = query.eq("content_type", filters.contentType)
    }

    // Verified status filter
    if (filters.verifiedStatus === "verified") {
      query = query.eq("is_verified", true)
    } else if (filters.verifiedStatus === "unverified") {
      query = query.eq("is_verified", false)
    }

    // Search filter
    if (filters.search) {
      query = query.or(
        `question_latex.ilike.%${filters.search}%,topic.ilike.%${filters.search}%,topic_name.ilike.%${filters.search}%`
      )
    }

    const { data: questions, error, count } = await query

    if (error) {
      console.error("Error fetching audit questions:", error)
      return { success: false, error: "Failed to fetch questions" }
    }

    // Tag each question with is_suspect flag
    const tagged: AuditQuestion[] = (questions || []).map((q) => ({
      ...q,
      is_suspect: detectSuspect(q.question_latex),
    }))

    // If showSuspectFirst, sort suspects to the top (within this page)
    if (filters.showSuspectFirst) {
      tagged.sort((a, b) => {
        if (a.is_suspect && !b.is_suspect) return -1
        if (!a.is_suspect && b.is_suspect) return 1
        return 0
      })
    }

    return { success: true, data: tagged, total: count ?? 0 }
  } catch (error) {
    console.error("Error in getAuditQuestions:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// =====================================================
// Suspect detection heuristic
// =====================================================

/**
 * Detects "suspected bad" questions — those with LaTeX-like backslash
 * commands outside of $ delimiters, markdown artifacts, or other signs
 * of broken rendering.
 */
function detectSuspect(latex: string | null): boolean {
  if (!latex) return false

  // 1. Has markdown code fences
  if (/```/.test(latex)) return true

  // 2. Has \[ or \] (should have been converted to $$)
  if (/\\\[|\\\]/.test(latex)) return true

  // 3. Has \( or \) (should have been converted to $)
  if (/\\\(|\\\)/.test(latex)) return true

  // 4. Has **bold** markdown syntax
  if (/\*\*[^*]+\*\*/.test(latex)) return true

  // 5. Starts with conversational filler
  if (/^(?:Here\s+is|Solution:|Explanation:)/i.test(latex)) return true

  // 6. Has backslash commands outside of $ delimiters
  //    Strip all $...$ and $$...$$ content, then check for remaining \commands
  const stripped = latex
    .replace(/\$\$[\s\S]*?\$\$/g, "") // remove display math
    .replace(/\$[^$]*?\$/g, "") // remove inline math
  if (/\\[a-zA-Z]{2,}/.test(stripped)) return true

  // 7. Unbalanced $ signs (odd count of single $)
  const withoutDD = latex.replace(/\$\$/g, "")
  const dollarCount = (withoutDD.match(/\$/g) || []).length
  if (dollarCount % 2 !== 0) return true

  return false
}

// =====================================================
// Update question (admin edit — latex + answer_key)
// =====================================================

export async function auditUpdateQuestion(
  id: string,
  questionLatex: string,
  answerKey?: { answer: string; explanation: string }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: "You must be logged in" }
  }

  const payload: Record<string, unknown> = {
    question_latex: repairLatex(questionLatex),
  }
  if (answerKey) {
    payload.answer_key = {
      answer: repairLatex(answerKey.answer),
      explanation: repairLatex(answerKey.explanation),
    }
  }

  const { error } = await supabase
    .from("questions")
    .update(payload)
    .eq("id", id)

  if (error) {
    console.error("Error updating question:", error)
    return { success: false, error: "Failed to update question" }
  }

  revalidatePath("/dashboard/admin/audit")
  return { success: true }
}

// =====================================================
// Delete question (admin)
// =====================================================

export async function auditDeleteQuestion(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: "You must be logged in" }
  }

  const { error } = await supabase.from("questions").delete().eq("id", id)

  if (error) {
    console.error("Error deleting question:", error)
    return { success: false, error: "Failed to delete question" }
  }

  revalidatePath("/dashboard/admin/audit")
  return { success: true }
}

// =====================================================
// Verify / unverify question
// =====================================================

export async function auditToggleVerified(
  id: string,
  isVerified: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: "You must be logged in" }
  }

  const { error } = await supabase
    .from("questions")
    .update({ is_verified: isVerified })
    .eq("id", id)

  if (error) {
    console.error("Error toggling verification:", error)
    return { success: false, error: "Failed to update verification" }
  }

  revalidatePath("/dashboard/admin/audit")
  return { success: true }
}

// =====================================================
// Fix LaTeX formatting only (keep same maths content)
// =====================================================

export async function auditFixFormatting(
  id: string
): Promise<{ success: boolean; newLatex?: string; newAnswerKey?: { answer: string; explanation: string }; error?: string }> {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { success: false, error: "You must be logged in" }

  const { data: question, error: fetchError } = await supabase
    .from("questions")
    .select("*")
    .eq("id", id)
    .single()

  if (fetchError || !question) return { success: false, error: "Question not found" }

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return { success: false, error: "AI service not configured" }

  const currentAnswer = (question.answer_key as Record<string, string> | null)?.answer || ""
  const currentExplanation = (question.answer_key as Record<string, string> | null)?.explanation || ""

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": "Nicolaou Maths - Question Auditor",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a UK GCSE Mathematics LaTeX editor. Fix the formatting of the question and answer — do NOT change the maths content, numbers, or difficulty.

RULES:
- Use $...$ for inline math and $$...$$ for display/block math
- Use correct LaTeX: \\frac{a}{b}, \\sqrt{x}, \\times, \\div, etc.
- Ensure all { } braces are balanced (e.g. \\frac{3}{4} not \\frac{3}{4)
- Remove markdown artifacts (\`\`\`, **, etc.) and conversational filler
- Preserve all mathematical values exactly as-is

Respond with JSON only:
{
  "question_latex": "...",
  "answer": "...",
  "explanation": "..."
}`,
          },
          {
            role: "user",
            content: `Fix the LaTeX formatting of this question and answer.\n\nQuestion:\n${question.question_latex || "[No content]"}\n\nAnswer: ${currentAnswer}\n\nExplanation: ${currentExplanation}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) return { success: false, error: "AI service request failed" }

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content?.trim()
    if (!raw) return { success: false, error: "AI returned empty response" }

    let parsed: { question_latex?: string; answer?: string; explanation?: string }
    try {
      parsed = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim())
    } catch {
      return { success: false, error: "AI returned invalid JSON" }
    }

    const newLatex = repairLatex(parsed.question_latex || question.question_latex)
    const newAnswerKey = {
      answer: repairLatex(parsed.answer || currentAnswer),
      explanation: repairLatex(parsed.explanation || currentExplanation),
    }

    const { error: updateError } = await supabase
      .from("questions")
      .update({ question_latex: newLatex, answer_key: newAnswerKey })
      .eq("id", id)

    if (updateError) return { success: false, error: "Failed to save fixed question" }

    revalidatePath("/dashboard/admin/audit")
    return { success: true, newLatex, newAnswerKey }
  } catch (error) {
    console.error("Error fixing formatting:", error)
    return { success: false, error: "AI formatting fix failed" }
  }
}

// =====================================================
// Fully regenerate — brand new question, same metadata
// =====================================================

export async function auditFullyRegenerateQuestion(
  id: string
): Promise<{ success: boolean; newLatex?: string; newAnswerKey?: { answer: string; explanation: string }; error?: string }> {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { success: false, error: "You must be logged in" }

  const { data: question, error: fetchError } = await supabase
    .from("questions")
    .select("*")
    .eq("id", id)
    .single()

  if (fetchError || !question) return { success: false, error: "Question not found" }

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return { success: false, error: "AI service not configured" }

  const level = question.curriculum_level || question.difficulty || "GCSE Higher"
  const subTopic = question.sub_topic_name || question.topic_name || question.topic || "General"
  const marks = question.marks || 3
  const questionType = question.question_type || "Fluency"
  const calcAllowed = question.calculator_allowed ?? true

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": "Nicolaou Maths - Question Auditor Regenerate",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert UK mathematics exam question writer. Generate a single, original question in valid JSON. Use proper LaTeX: $...$ for inline math, $$...$$ for display math, \\frac{a}{b}, \\sqrt{x}, \\times, \\div etc. Respond with JSON only — no markdown.`,
          },
          {
            role: "user",
            content: `Generate a NEW ${level} maths question on the topic "${subTopic}".

Requirements:
- Type: ${questionType}
- Marks: ${marks}
- Calculator: ${calcAllowed ? "allowed" : "NOT allowed — use integers or simple fractions"}
- Different numbers and context from any standard textbook question
- All LaTeX must be syntactically correct with balanced braces

JSON format:
{
  "question_latex": "Question text with LaTeX",
  "answer": "The final answer",
  "explanation": "Step-by-step working"
}`,
          },
        ],
        temperature: 0.85,
        max_tokens: 1500,
      }),
    })

    if (!response.ok) return { success: false, error: "AI service request failed" }

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content?.trim()
    if (!raw) return { success: false, error: "AI returned empty response" }

    let parsed: { question_latex?: string; answer?: string; explanation?: string }
    try {
      parsed = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim())
    } catch {
      return { success: false, error: "AI returned invalid JSON" }
    }

    if (!parsed.question_latex || !parsed.answer) {
      return { success: false, error: "AI response missing required fields" }
    }

    const newLatex = repairLatex(parsed.question_latex)
    const newAnswerKey = {
      answer: repairLatex(parsed.answer),
      explanation: repairLatex(parsed.explanation || ""),
    }

    const { error: updateError } = await supabase
      .from("questions")
      .update({
        question_latex: newLatex,
        answer_key: newAnswerKey,
        is_verified: false, // new content needs re-verification
      })
      .eq("id", id)

    if (updateError) return { success: false, error: "Failed to save regenerated question" }

    revalidatePath("/dashboard/admin/audit")
    return { success: true, newLatex, newAnswerKey }
  } catch (error) {
    console.error("Error regenerating question:", error)
    return { success: false, error: "AI regeneration failed" }
  }
}

// Keep old name as alias for backwards compatibility
export const auditRegenerateQuestion = auditFixFormatting
