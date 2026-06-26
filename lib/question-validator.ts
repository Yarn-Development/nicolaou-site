/**
 * LLM-based answer validator for generated questions.
 *
 * Runs a second, focused model call after generation to check:
 * - Mathematical correctness of the stated answer
 * - Coherence between question, mark scheme, and answer
 * - Validity of proof structure (for "show that" / "prove" questions)
 *
 * Returns { valid: true } or { valid: false, issue: "<description>" }.
 * The issue string is fed back into the retry loop prompt on the next attempt.
 */

export interface ValidationResult {
  valid: boolean
  issue: string | null
}

const VALIDATOR_SYSTEM_PROMPT = `You are a strict UK A-Level and GCSE mathematics examiner checking a generated exam question for correctness.

Your job is to verify three things:
1. The stated ANSWER is mathematically correct for the QUESTION.
2. The MARK SCHEME steps lead correctly to that answer (no logical gaps or arithmetic errors).
3. For "show that" / "prove" / "hence" questions: the argument is logically valid.

IMPORTANT RULES:
- Focus ONLY on mathematical correctness. Do not comment on style, wording, or difficulty.
- If the answer is correct to the precision given (e.g. 3 s.f., 2 d.p.), accept it.
- If the mark scheme has a minor rounding at an intermediate step that doesn't affect the final answer, accept it.
- Only return valid: false if there is a clear mathematical error.

Return ONLY a raw JSON object — no markdown, no explanation:
{ "valid": true }
OR
{ "valid": false, "issue": "One sentence describing the specific error" }`

export async function validateQuestion(opts: {
  questionLatex: string
  markScheme: string
  answer: string
  commandWord: string
  verificationExpression: string | null
  apiKey: string
  /** If true, validator transport/parse failures reject the question instead of passing through. */
  failClosed?: boolean
}): Promise<ValidationResult> {
  const { questionLatex, markScheme, answer, commandWord, verificationExpression, apiKey, failClosed = false } = opts

  const userContent = `QUESTION:
${questionLatex}

COMMAND WORD: ${commandWord}

MARK SCHEME:
${markScheme}

STATED ANSWER: ${answer}
${verificationExpression ? `\nVERIFICATION EXPRESSION (the model claims this equals the answer): ${verificationExpression}` : ''}

Is this question mathematically correct? Return only JSON.`

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'Nicolaou Maths - Question Validator',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4-6',
        messages: [
          { role: 'system', content: VALIDATOR_SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        temperature: 0.1,
        max_tokens: 120,
      }),
    })

    if (!response.ok) {
      // Validation is non-blocking — if the validator call fails, pass through
      console.warn('[validator] Validator API call failed, passing question through:', response.status)
      return failClosed
        ? { valid: false, issue: `Validator API call failed with status ${response.status}` }
        : { valid: true, issue: null }
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content?.trim() ?? ''

    // Strip markdown code fences if present
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    let parsed: { valid: boolean; issue?: string }
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      console.warn('[validator] Could not parse validator response:', content)
      return failClosed
        ? { valid: false, issue: 'Could not parse validator response' }
        : { valid: true, issue: null }
    }

    return {
      valid: Boolean(parsed.valid),
      issue: parsed.valid ? null : (parsed.issue ?? 'Answer or mark scheme appears incorrect'),
    }
  } catch (err) {
    // Network or unexpected error — don't block generation
    console.warn('[validator] Validator error, passing through:', err)
    return failClosed
      ? { valid: false, issue: err instanceof Error ? err.message : 'Validator error' }
      : { valid: true, issue: null }
  }
}
