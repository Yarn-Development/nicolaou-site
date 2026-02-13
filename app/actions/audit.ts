"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

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
// Update question LaTeX (admin edit)
// =====================================================

export async function auditUpdateQuestion(
  id: string,
  questionLatex: string
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
    .update({ question_latex: questionLatex })
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
// Regenerate question via AI
// =====================================================

export async function auditRegenerateQuestion(
  id: string
): Promise<{ success: boolean; newLatex?: string; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: "You must be logged in" }
  }

  // Fetch the current question
  const { data: question, error: fetchError } = await supabase
    .from("questions")
    .select("*")
    .eq("id", id)
    .single()

  if (fetchError || !question) {
    return { success: false, error: "Question not found" }
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return { success: false, error: "AI service not configured" }
  }

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Nicolaou Maths - Question Auditor",
        },
        body: JSON.stringify({
          model: "anthropic/claude-sonnet-4",
          messages: [
            {
              role: "system",
              content: `You are a UK GCSE Mathematics question editor. You will be given a maths question that may have formatting issues. Your task is to rewrite it cleanly using proper LaTeX notation.

RULES:
- Use $...$ for inline math and $$...$$ for display/block math
- Use proper LaTeX commands: \\frac{}{}, \\sqrt{}, \\times, \\div, etc.
- Keep the mathematical content and difficulty IDENTICAL — do NOT change the question itself
- Remove any markdown artifacts (**, \`\`\`, etc.)
- Remove any conversational filler ("Here is...", "Solution:", etc.)
- Output ONLY the cleaned question text, nothing else — no JSON, no explanation
- Preserve line breaks where they make sense for readability`,
            },
            {
              role: "user",
              content: `Rewrite this question with clean LaTeX formatting. Topic: ${question.topic || "Unknown"}. Sub-topic: ${question.sub_topic_name || "Unknown"}.\n\nOriginal question:\n${question.question_latex || "[No content]"}`,
            },
          ],
          temperature: 0.2,
          max_tokens: 1500,
        }),
      }
    )

    if (!response.ok) {
      return { success: false, error: "AI service request failed" }
    }

    const data = await response.json()
    const newLatex = data.choices?.[0]?.message?.content?.trim()

    if (!newLatex) {
      return { success: false, error: "AI returned empty response" }
    }

    // Update the question in the database
    const { error: updateError } = await supabase
      .from("questions")
      .update({ question_latex: newLatex })
      .eq("id", id)

    if (updateError) {
      return { success: false, error: "Failed to save regenerated question" }
    }

    revalidatePath("/dashboard/admin/audit")
    return { success: true, newLatex }
  } catch (error) {
    console.error("Error regenerating question:", error)
    return { success: false, error: "AI regeneration failed" }
  }
}
