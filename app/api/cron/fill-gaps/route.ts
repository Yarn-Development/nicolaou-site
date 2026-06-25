import { NextRequest, NextResponse } from 'next/server'
import { fetchQuery, fetchMutation, api } from '@/lib/convex/server'

// ─────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────

export const maxDuration = 300

const CRON_SECRET          = process.env.CRON_SECRET
const TARGET_PER_SUBTOPIC  = 10
const MAX_PER_RUN          = 15 // cap so we stay within maxDuration

// Base URL for internal API calls — Vercel sets VERCEL_URL automatically
const BASE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

// ─────────────────────────────────────────────
// Curriculum map — the full set of subtopics we want to maintain
// ─────────────────────────────────────────────

type CurriculumMap = Record<string, Record<string, string[]>>

const CURRICULUM: CurriculumMap = {
  'GCSE Foundation': {
    'Number': [
      'Place Value & Ordering', 'Four Operations', 'Fractions, Decimals & Percentages',
      'Ratio & Proportion', 'Percentages', 'Powers & Roots', 'Standard Form',
      'Factors, Multiples & Primes',
    ],
    'Algebra': [
      'Algebraic Expressions', 'Expanding Brackets', 'Factorising',
      'Solving Linear Equations', 'Solving Inequalities', 'Sequences',
      'Using Formulae', 'Coordinates & Straight Line Graphs',
    ],
    'Geometry and Measures': [
      'Angles & Lines', 'Triangles & Quadrilaterals', 'Circles', 'Area & Perimeter',
      'Volume & Surface Area', 'Transformations', 'Pythagoras Theorem',
      'Trigonometry – Right-Angled Triangles',
    ],
    'Statistics': [
      'Data Collection & Sampling', 'Averages & Spread', 'Bar Charts & Pie Charts',
      'Scatter Diagrams & Correlation', 'Frequency Tables & Histograms',
    ],
    'Probability': [
      'Basic Probability', 'Combined Events', 'Tree Diagrams',
    ],
  },
  'GCSE Higher': {
    'Number': [
      'Surds', 'Indices & Standard Form', 'Bounds & Truncation',
      'Fractions, Decimals & Percentages', 'Ratio & Proportion',
    ],
    'Algebra': [
      'Expanding & Factorising Quadratics', 'Solving Quadratic Equations',
      'Completing the Square', 'Simultaneous Equations',
      'Algebraic Fractions', 'Functions', 'Sequences & nth Term',
      'Straight Line Graphs', 'Quadratic & Cubic Graphs',
      'Inequalities – Graphical', 'Direct & Inverse Proportion',
    ],
    'Geometry and Measures': [
      'Circle Theorems', 'Vectors', 'Trigonometry – Non-Right-Angled Triangles',
      'Similarity & Congruence', 'Volume & Surface Area', 'Transformations',
    ],
    'Statistics': [
      'Cumulative Frequency & Box Plots', 'Histograms', 'Sampling Methods',
    ],
    'Probability': [
      'Conditional Probability', 'Venn Diagrams', 'Tree Diagrams',
    ],
  },
  'A-Level Pure': {
    'Algebra': [
      'Algebraic Manipulation', 'Quadratics', 'Simultaneous Equations',
      'Inequalities', 'Polynomials & Factor Theorem', 'Partial Fractions',
    ],
    'Calculus': [
      'Differentiation – Polynomials', 'Differentiation – Chain Rule',
      'Differentiation – Product & Quotient Rules', 'Integration – Polynomials',
      'Integration – Substitution', 'Integration – Parts', 'Differential Equations',
    ],
    'Trigonometry': [
      'Radians & Arc Length', 'Trigonometric Identities', 'Inverse Trig Functions',
      'Small Angle Approximations', 'Addition Formulae',
    ],
    'Logarithms and Exponentials': [
      'Laws of Logarithms', 'Natural Logarithm', 'Exponential Growth & Decay',
    ],
    'Vectors': [
      '2D Vectors', '3D Vectors', 'Scalar Product',
    ],
    'Coordinate Geometry': [
      'Straight Lines', 'Circles', 'Parametric Equations',
    ],
    'Sequences and Series': [
      'Arithmetic Sequences', 'Geometric Sequences', 'Binomial Expansion',
    ],
  },
  'A-Level Statistics': {
    'Statistics': [
      'Probability Distributions', 'Normal Distribution', 'Binomial Distribution',
      'Hypothesis Testing', 'Regression & Correlation', 'Sampling',
    ],
  },
  'A-Level Mechanics': {
    'Mechanics': [
      'Kinematics – SUVAT', 'Forces & Newton\'s Laws', 'Moments', 'Projectiles',
      'Connected Particles', 'Friction', 'Variable Acceleration',
    ],
  },
}

// Flat lookup: sub_topic → { curriculum_level, topic_name }
const SUBTOPIC_PARENT: Record<string, { curriculum_level: string; topic_name: string }> = {}
for (const [level, topics] of Object.entries(CURRICULUM)) {
  for (const [topic, subtopics] of Object.entries(topics)) {
    for (const st of subtopics) {
      SUBTOPIC_PARENT[`${level}||${st}`] = { curriculum_level: level, topic_name: topic }
    }
  }
}

// ─────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sets Authorization header automatically when CRON_SECRET is configured)
  if (CRON_SECRET) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const startTime = Date.now()
  const results: Array<{ level: string; subtopic: string; status: 'ok' | 'error'; detail?: string }> = []

  try {
    // 1. Get current counts per (level, subTopic) for generated_text only
    let counts: Array<{ level: string; subTopic: string }>
    try {
      counts = await fetchQuery(api.questions.getGeneratedTextSubtopicCounts, {})
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Failed to load coverage counts' },
        { status: 500 }
      )
    }

    // Build count map: "level||subtopic" → count
    const countMap: Record<string, number> = {}
    for (const row of counts) {
      const key = `${row.level}||${row.subTopic}`
      countMap[key] = (countMap[key] || 0) + 1
    }

    // 2. Build gap list: all subtopics below TARGET, sorted by count (ascending)
    const gaps: Array<{ curriculum_level: string; topic_name: string; sub_topic: string; count: number }> = []
    for (const [level, topics] of Object.entries(CURRICULUM)) {
      for (const [topic, subtopics] of Object.entries(topics)) {
        for (const st of subtopics) {
          const key = `${level}||${st}`
          const current = countMap[key] || 0
          if (current < TARGET_PER_SUBTOPIC) {
            gaps.push({ curriculum_level: level, topic_name: topic, sub_topic: st, count: current })
          }
        }
      }
    }

    // Sort: fewest questions first (biggest gaps first)
    gaps.sort((a, b) => a.count - b.count)

    // Cap to MAX_PER_RUN
    const targets = gaps.slice(0, MAX_PER_RUN)

    if (targets.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All subtopics are at or above target coverage',
        generated: 0,
        elapsed_ms: Date.now() - startTime,
      })
    }

    // 3. Generate one question per gap target
    for (const target of targets) {
      const questionType = pickQuestionType()
      const marks = pickMarks(target.curriculum_level)

      try {
        // Call the generate route
        const genResponse = await fetch(`${BASE_URL}/api/ai/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'text_gen',
            level: target.curriculum_level,
            topic_name: target.topic_name,
            sub_topic: target.sub_topic,
            question_type: questionType,
            marks,
            exam_board: 'Edexcel',
          }),
        })

        if (!genResponse.ok) {
          const err = await genResponse.json().catch(() => ({}))
          results.push({
            level: target.curriculum_level,
            subtopic: target.sub_topic,
            status: 'error',
            detail: (err as { error?: string }).error || `HTTP ${genResponse.status}`,
          })
          continue
        }

        const genJson = await genResponse.json()
        const gen = genJson.data ?? genJson  // generate route wraps payload in .data

        // Insert the generated question into Convex
        const difficulty = target.curriculum_level.toLowerCase().includes('foundation')
          ? 'Foundation'
          : 'Higher'

        const insertResult = await fetchMutation(api.questions.insertGeneratedQuestion, {
          questionLatex: gen.question_latex,
          level: target.curriculum_level,
          topicName: target.topic_name,
          topic: target.topic_name,
          subTopic: target.sub_topic,
          difficulty,
          marks: gen.marks ?? marks,
          questionType,
          calculatorAllowed: false,
          answerKey: {
            answer: gen.answer,
            explanation: gen.mark_scheme_latex ?? '',
            mark_scheme: gen.mark_scheme_latex,
            command_word: gen.command_word,
            verification_expression: gen.verification_expression,
            type: 'generated',
            source: {
              exam_board: 'Edexcel',
              level: target.curriculum_level,
              is_calculator: false,
            },
          },
          imageUrl: gen.svg_markup
            ? `data:image/svg+xml;utf8,${encodeURIComponent(gen.svg_markup)}`
            : undefined,
        })

        if (insertResult && 'error' in insertResult) {
          results.push({
            level: target.curriculum_level,
            subtopic: target.sub_topic,
            status: 'error',
            detail: 'No eligible question creator found',
          })
        } else {
          results.push({
            level: target.curriculum_level,
            subtopic: target.sub_topic,
            status: 'ok',
          })
        }
      } catch (err) {
        results.push({
          level: target.curriculum_level,
          subtopic: target.sub_topic,
          status: 'error',
          detail: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    const generated = results.filter(r => r.status === 'ok').length
    const failed    = results.filter(r => r.status === 'error').length

    console.log(`[fill-gaps] generated=${generated} failed=${failed} gaps_found=${gaps.length} elapsed=${Date.now() - startTime}ms`)

    return NextResponse.json({
      success: true,
      generated,
      failed,
      gaps_found: gaps.length,
      results,
      elapsed_ms: Date.now() - startTime,
    })
  } catch (error) {
    console.error('[fill-gaps] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Unexpected error', detail: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function pickQuestionType(): 'Fluency' | 'Problem Solving' | 'Reasoning/Proof' {
  const r = Math.random()
  if (r < 0.4) return 'Fluency'
  if (r < 0.8) return 'Problem Solving'
  return 'Reasoning/Proof'
}

function pickMarks(level: string): number {
  const isALevel = level.startsWith('A-Level')
  const r = Math.random()
  if (isALevel) {
    // A-Level: weighted toward 4-6 marks
    if (r < 0.2) return 3
    if (r < 0.5) return 4
    if (r < 0.8) return 5
    return 6
  } else {
    // GCSE: weighted toward 2-4 marks
    if (r < 0.3) return 2
    if (r < 0.7) return 3
    if (r < 0.9) return 4
    return 5
  }
}
