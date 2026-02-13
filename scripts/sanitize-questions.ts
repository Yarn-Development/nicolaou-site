#!/usr/bin/env tsx

/**
 * Database Sanitizer — Question Content Cleanup
 *
 * Fetches all questions from the `questions` table and applies regex-based
 * sanitization rules to strip AI-generated artifacts from:
 *   - question_latex (column)
 *   - answer_key.answer (JSONB field)
 *   - answer_key.explanation (JSONB field)
 *
 * Usage:
 *   npx tsx scripts/sanitize-questions.ts [--dry-run] [--limit=N] [--batch-size=N]
 *
 * Options:
 *   --dry-run       Preview changes without writing to the database
 *   --limit=N       Maximum number of questions to process (default: all)
 *   --batch-size=N  Number of questions per fetch batch (default: 100)
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

// =====================================================
// CONFIGURATION
// =====================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase environment variables!')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// =====================================================
// TYPES
// =====================================================

interface ParsedArgs {
  dryRun: boolean
  limit: number | null
  batchSize: number
}

interface AnswerKey {
  answer?: string
  explanation?: string
  [key: string]: unknown
}

interface QuestionRow {
  id: string
  question_latex: string | null
  answer_key: AnswerKey | null
}

interface SanitizeResult {
  cleaned: string
  changes: string[]
}

// =====================================================
// SANITIZATION RULES
// =====================================================

/**
 * Rule 1: Strip Markdown code-block wrappers
 * Removes ```latex, ```math, ``` tags that AI models wrap content in.
 */
function stripMarkdownWrappers(text: string): SanitizeResult {
  const cleaned = text
    .replace(/```(?:latex|math|)\s*\n?/g, '')
    .replace(/```\s*$/gm, '')
  return {
    cleaned,
    changes: cleaned !== text ? ['Removed Markdown wrappers'] : [],
  }
}

/**
 * Rule 2: Fix block math delimiters
 * Replaces \[ and \] with $$ for proper LaTeX block math.
 */
function fixBlockMath(text: string): SanitizeResult {
  const cleaned = text
    .replace(/\\\[/g, '$$')
    .replace(/\\\]/g, '$$')
  return {
    cleaned,
    changes: cleaned !== text ? ['Fixed block math delimiters'] : [],
  }
}

/**
 * Rule 3: Fix inline math delimiters
 * Replaces \( and \) with $ for proper LaTeX inline math.
 */
function fixInlineMath(text: string): SanitizeResult {
  const cleaned = text
    .replace(/\\\(/g, '$')
    .replace(/\\\)/g, '$')
  return {
    cleaned,
    changes: cleaned !== text ? ['Fixed inline math delimiters'] : [],
  }
}

/**
 * Rule 4: Remove conversational filler at the start of content
 * Strips AI preamble like "Here is the answer:", "Solution:", etc.
 */
function removeConversationalFiller(text: string): SanitizeResult {
  const pattern = /^(?:Here\s+is\s+(?:the\s+|a\s+)?(?:answer|question|solution|explanation|problem|result)\s*[:.\-]\s*\n?)/i
  const cleaned = text.replace(pattern, '').trimStart()
  return {
    cleaned,
    changes: cleaned !== text ? ['Removed conversational filler'] : [],
  }
}

/**
 * Rule 5: Standardize bold from Markdown to LaTeX
 * Converts **text** to \textbf{text}.
 */
function standardizeBold(text: string): SanitizeResult {
  const cleaned = text.replace(/\*\*([^*]+)\*\*/g, '\\textbf{$1}')
  return {
    cleaned,
    changes: cleaned !== text ? ['Standardized bold to LaTeX'] : [],
  }
}

/**
 * Rule 6: Fix escaped newlines
 * Replaces literal two-character \n sequences with real newline characters.
 * Careful not to touch \\n (an actual backslash followed by n in LaTeX).
 */
function fixNewlines(text: string): SanitizeResult {
  // Match \n but NOT \\n (which is a LaTeX double-backslash + n)
  const cleaned = text.replace(/(?<!\\)\\n/g, '\n')
  return {
    cleaned,
    changes: cleaned !== text ? ['Fixed escaped newlines'] : [],
  }
}

// =====================================================
// MASTER SANITIZER
// =====================================================

const RULES = [
  stripMarkdownWrappers,
  fixBlockMath,
  fixInlineMath,
  removeConversationalFiller,
  standardizeBold,
  fixNewlines,
]

/**
 * Applies all sanitization rules in order to a string.
 * Returns the cleaned text and a list of rule names that fired.
 */
function sanitize(text: string): SanitizeResult {
  let current = text
  const allChanges: string[] = []

  for (const rule of RULES) {
    const result = rule(current)
    if (result.changes.length > 0) {
      current = result.cleaned
      allChanges.push(...result.changes)
    }
  }

  return { cleaned: current, changes: allChanges }
}

// =====================================================
// CLI ARGUMENT PARSING
// =====================================================

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2)
  const result: ParsedArgs = {
    dryRun: false,
    limit: null,
    batchSize: 100,
  }

  for (const arg of args) {
    if (arg === '--dry-run') {
      result.dryRun = true
    } else if (arg.startsWith('--limit=')) {
      result.limit = parseInt(arg.split('=')[1], 10) || null
    } else if (arg.startsWith('--batch-size=')) {
      result.batchSize = parseInt(arg.split('=')[1], 10) || 100
    }
  }

  return result
}

// =====================================================
// MAIN EXECUTION
// =====================================================

async function main(): Promise<void> {
  const args = parseArgs()

  console.log('═══════════════════════════════════════════════════════════')
  console.log('    DATABASE SANITIZER - Question Content Cleanup')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(`   Mode: ${args.dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`   Batch Size: ${args.batchSize}`)
  console.log(`   Limit: ${args.limit ?? 'All questions'}`)
  console.log('═══════════════════════════════════════════════════════════\n')

  let totalFetched = 0
  let totalModified = 0
  let totalSkipped = 0
  let totalErrors = 0
  let offset = 0
  let keepGoing = true

  while (keepGoing) {
    const rangeEnd = offset + args.batchSize - 1
    const batchNumber = Math.floor(offset / args.batchSize) + 1

    console.log(`   Processing batch ${batchNumber} (${offset}-${rangeEnd})...`)

    // Fetch a batch of questions
    const { data: questions, error: fetchError } = await supabase
      .from('questions')
      .select('id, question_latex, answer_key')
      .range(offset, rangeEnd)
      .order('created_at', { ascending: true })

    if (fetchError) {
      console.error(`   Failed to fetch batch: ${fetchError.message}`)
      totalErrors++
      break
    }

    if (!questions || questions.length === 0) {
      console.log('   No more questions to process.')
      break
    }

    totalFetched += questions.length

    // Process each question in the batch
    for (const row of questions as QuestionRow[]) {
      // Check limit
      if (args.limit !== null && (totalModified + totalSkipped) >= args.limit) {
        keepGoing = false
        break
      }

      const allChanges: string[] = []
      let questionLatexCleaned = row.question_latex
      let answerKeyCleaned: AnswerKey | null = row.answer_key
        ? { ...row.answer_key }
        : null

      // Sanitize question_latex
      if (row.question_latex) {
        const result = sanitize(row.question_latex)
        if (result.changes.length > 0) {
          questionLatexCleaned = result.cleaned
          allChanges.push(...result.changes)
        }
      }

      // Sanitize answer_key.answer
      if (answerKeyCleaned?.answer && typeof answerKeyCleaned.answer === 'string') {
        const result = sanitize(answerKeyCleaned.answer)
        if (result.changes.length > 0) {
          answerKeyCleaned.answer = result.cleaned
          allChanges.push(...result.changes.map(c => `answer_key.answer: ${c}`))
        }
      }

      // Sanitize answer_key.explanation
      if (answerKeyCleaned?.explanation && typeof answerKeyCleaned.explanation === 'string') {
        const result = sanitize(answerKeyCleaned.explanation)
        if (result.changes.length > 0) {
          answerKeyCleaned.explanation = result.cleaned
          allChanges.push(...result.changes.map(c => `answer_key.explanation: ${c}`))
        }
      }

      // Skip if nothing changed
      if (allChanges.length === 0) {
        totalSkipped++
        continue
      }

      // Build update payload
      const updatePayload: Record<string, unknown> = {}
      if (questionLatexCleaned !== row.question_latex) {
        updatePayload.question_latex = questionLatexCleaned
      }
      if (answerKeyCleaned && JSON.stringify(answerKeyCleaned) !== JSON.stringify(row.answer_key)) {
        updatePayload.answer_key = answerKeyCleaned
      }

      // Deduplicate change labels for logging
      const uniqueChanges = [...new Set(allChanges)]

      if (args.dryRun) {
        console.log(`   [DRY RUN] Would fix Question ID ${row.id}: ${uniqueChanges.join(', ')}`)
        totalModified++
        continue
      }

      // Write update
      const { error: updateError } = await supabase
        .from('questions')
        .update(updatePayload)
        .eq('id', row.id)

      if (updateError) {
        console.error(`   Failed to update Question ID ${row.id}: ${updateError.message}`)
        totalErrors++
      } else {
        console.log(`   Fixed Question ID ${row.id}: ${uniqueChanges.join(', ')}`)
        totalModified++
      }
    }

    // Check if we've hit the limit or exhausted results
    if (questions.length < args.batchSize) {
      keepGoing = false
    }

    offset += args.batchSize
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('    SANITIZATION COMPLETE')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(`   Total Fetched: ${totalFetched}`)
  console.log(`   Modified: ${totalModified}`)
  console.log(`   Skipped: ${totalSkipped}`)
  console.log(`   Errors: ${totalErrors}`)
  console.log('═══════════════════════════════════════════════════════════\n')
}

// Run
main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
