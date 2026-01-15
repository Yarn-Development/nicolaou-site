#!/usr/bin/env tsx

/**
 * Optimized Question Database Seeding Script
 * 
 * Generates high-quality questions using AI to populate the questions table.
 * Respects strict API rate limits (1000/day) and ensures broad curriculum coverage.
 * 
 * Features:
 * - Smart Budgeting: Limits total generation to a safe daily max (default: 950).
 * - Prioritized Sampling: Randomly selects high-value combinations to ensure variety.
 * - Resumable State: Saves progress to 'seed-state.json' to handle interruptions.
 * - Rate Limiting: Enforces delays between requests.
 * 
 * Usage:
 * npm run seed:questions              # Seed with default budget (950)
 * npm run seed:questions -- --limit 50 # Specific limit for testing
 * npm run seed:questions -- --dry-run  # Preview plan without calling API
 * npm run seed:questions -- --reset    # Reset state file and start fresh
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: '.env.local' })

// =====================================================
// CONFIGURATION
// =====================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const AI_API_ENDPOINT = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables!')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// =====================================================
// OPTIMIZED CONFIGURATION
// =====================================================

const DAILY_LIMIT = 950 // Safe buffer below 1000
const MIN_DELAY_MS = 3500 // ~17 requests per minute (safe below 20/min limit)
const STATE_FILE = path.join(process.cwd(), 'seed-state.json')

// Priority weights for random sampling (higher = more likely to be picked)
const TYPE_WEIGHTS: Record<string, number> = { 
  "Fluency": 0.4, 
  "Problem Solving": 0.4, 
  "Reasoning/Proof": 0.2 
}

const MARK_WEIGHTS: Record<string, number> = { 
  "2": 0.3, 
  "3": 0.4, 
  "4": 0.2, 
  "6": 0.1 
}

// =====================================================
// SEED CURRICULUM DATA
// =====================================================

const SEED_CURRICULUM: Record<string, Record<string, string[]>> = {
  "KS3": {
    "Number": [
      "Place Value & Ordering",
      "Four Operations",
      "Fractions, Decimals & Percentages",
      "Ratio & Proportion",
      "Powers & Roots",
      "Factors, Multiples & Primes"
    ],
    "Algebra": [
      "Algebraic Expressions",
      "Solving Equations",
      "Sequences",
      "Using Formulae",
      "Inequalities",
      "Linear Graphs"
    ],
    "Geometry & Measures": [
      "Angles",
      "Properties of Shapes",
      "Perimeter & Area",
      "Transformations",
      "Constructions",
      "Pythagoras' Theorem"
    ],
    "Statistics": [
      "Data Collection",
      "Averages & Range",
      "Charts & Graphs",
      "Introduction to Probability"
    ]
  },
  "GCSE Foundation": {
    "Number": [
      "Calculations & Estimation",
      "Fractions, Decimals & Percentages",
      "Ratio & Proportion",
      "Percentage Change",
      "Standard Form",
      "Surds & Indices (Basic)"
    ],
    "Algebra": [
      "Expanding & Factorising",
      "Solving Linear Equations",
      "Sequences & nth Term",
      "Simultaneous Equations (Linear)",
      "Inequalities",
      "Straight Line Graphs",
      "Quadratic Graphs"
    ],
    "Geometry & Measures": [
      "Angles & Properties of Shapes",
      "Perimeter, Area & Volume",
      "Pythagoras' Theorem",
      "Basic Trigonometry (SOH CAH TOA)",
      "Transformations",
      "Constructions & Loci",
      "Vectors (Basic)"
    ],
    "Probability": [
      "Probability Basics",
      "Listing Outcomes",
      "Probability Diagrams",
      "Relative Frequency"
    ],
    "Statistics": [
      "Averages & Range",
      "Charts & Graphs",
      "Scatter Graphs & Correlation",
      "Time Series"
    ]
  },
  "GCSE Higher": {
    "Number": [
      "Calculations & Bounds",
      "Surds",
      "Laws of Indices",
      "Standard Form Calculations",
      "Fractional & Negative Indices",
      "Recurring Decimals to Fractions"
    ],
    "Algebra": [
      "Expanding & Factorising (Advanced)",
      "Solving Quadratic Equations",
      "Completing the Square",
      "Quadratic Formula",
      "Simultaneous Equations (Linear/Quadratic)",
      "Quadratic Inequalities",
      "Algebraic Proof",
      "Functions",
      "Iteration",
      "Graphical Solutions",
      "Algebraic Fractions"
    ],
    "Geometry & Measures": [
      "Circle Theorems",
      "Pythagoras in 3D",
      "Advanced Trigonometry",
      "Sine & Cosine Rules",
      "Vectors (Advanced)",
      "Combined Transformations",
      "Similar Shapes & Enlargement",
      "Congruence & Proofs"
    ],
    "Probability": [
      "Tree Diagrams",
      "Conditional Probability",
      "Venn Diagrams",
      "Set Notation"
    ],
    "Statistics": [
      "Cumulative Frequency",
      "Box Plots",
      "Histograms",
      "Sampling Methods"
    ],
    "Ratio & Proportion": [
      "Direct Proportion",
      "Inverse Proportion",
      "Compound Measures",
      "Exponential Growth & Decay"
    ]
  },
  "A-Level Pure": {
    "Algebra & Functions": [
      "Algebraic Division",
      "Factor Theorem",
      "Partial Fractions",
      "Composite & Inverse Functions",
      "Modulus Functions",
      "Transformations of Graphs",
      "Advanced Inequalities"
    ],
    "Coordinate Geometry": [
      "Straight Lines",
      "Circles",
      "Parametric Equations",
      "3D Coordinate Geometry"
    ],
    "Sequences & Series": [
      "Arithmetic Sequences",
      "Geometric Sequences",
      "Binomial Expansion",
      "Sigma Notation",
      "Recurrence Relations"
    ],
    "Trigonometry": [
      "Trigonometric Identities",
      "Solving Trigonometric Equations",
      "Addition Formulae",
      "Double Angle Formulae",
      "R-Alpha (a cos θ + b sin θ) Form",
      "Small Angle Approximations"
    ],
    "Exponentials & Logarithms": [
      "Exponential Functions",
      "Logarithms & Laws",
      "Exponential Modelling",
      "Natural Logarithms"
    ],
    "Differentiation": [
      "Basic Differentiation",
      "Chain Rule",
      "Product Rule",
      "Quotient Rule",
      "Implicit Differentiation",
      "Parametric Differentiation",
      "Rates of Change",
      "Second Derivatives"
    ],
    "Integration": [
      "Basic Integration",
      "Integration by Substitution",
      "Integration by Parts",
      "Partial Fractions in Integration",
      "Definite Integration",
      "Area Under a Curve",
      "Trapezium Rule",
      "Differential Equations"
    ],
    "Vectors": [
      "Vector Basics (2D & 3D)",
      "Scalar (Dot) Product",
      "Vector Equations of Lines",
      "Intersecting Lines",
      "Vector Proofs"
    ]
  },
  "A-Level Statistics": {
    "Statistical Sampling": [
      "Sampling Methods",
      "Population & Sample",
      "Bias in Sampling"
    ],
    "Data Representation": [
      "Histograms (Advanced)",
      "Box Plots & Outliers",
      "Cumulative Frequency",
      "Cleaning Data"
    ],
    "Measures of Location & Spread": [
      "Mean, Median, Mode",
      "Standard Deviation & Variance",
      "Quartiles & Percentiles",
      "Coding (Linear Transformations)"
    ],
    "Correlation & Regression": [
      "Scatter Diagrams",
      "Product Moment Correlation Coefficient",
      "Regression Lines",
      "Residuals"
    ],
    "Probability": [
      "Venn Diagrams (Advanced)",
      "Tree Diagrams",
      "Conditional Probability",
      "Probability Distributions"
    ],
    "Statistical Distributions": [
      "Binomial Distribution",
      "Normal Distribution",
      "Hypothesis Testing",
      "Correlation Testing"
    ]
  },
  "A-Level Mechanics": {
    "Kinematics": [
      "Displacement, Velocity & Acceleration",
      "SUVAT Equations",
      "Vertical Motion Under Gravity",
      "Projectile Motion",
      "Variable Acceleration"
    ],
    "Forces & Newton's Laws": [
      "Newton's Laws of Motion",
      "Resolving Forces",
      "Friction",
      "Connected Particles",
      "Static Equilibrium"
    ],
    "Momentum & Impulse": [
      "Conservation of Momentum",
      "Impulse",
      "Collisions",
      "Coefficient of Restitution"
    ],
    "Moments": [
      "Moments of Forces",
      "Centre of Mass",
      "Rigid Bodies in Equilibrium",
      "Toppling & Sliding"
    ]
  }
}

type QuestionType = "Fluency" | "Problem Solving" | "Reasoning/Proof"
type Difficulty = "Foundation" | "Higher"

// =====================================================
// STATE MANAGEMENT
// =====================================================

interface SeedState {
  generatedCount: number
  completedCombinations: string[] // unique keys like "KS3-Algebra-Equations-Fluency-3m"
  lastRunDate: string
}

function loadState(): SeedState {
  if (fs.existsSync(STATE_FILE)) {
    try {
      const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'))
      
      // Reset count if it's a new day
      const today = new Date().toISOString().split('T')[0]
      if (state.lastRunDate !== today) {
        console.log('📅 New day detected - resetting daily count')
        return { 
          generatedCount: 0, 
          completedCombinations: state.completedCombinations || [],
          lastRunDate: today 
        }
      }
      
      return state
    } catch {
      console.log('⚠️ Could not parse state file, starting fresh')
    }
  }
  return { 
    generatedCount: 0, 
    completedCombinations: [],
    lastRunDate: new Date().toISOString().split('T')[0]
  }
}

function saveState(state: SeedState) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
}

function resetState() {
  if (fs.existsSync(STATE_FILE)) {
    fs.unlinkSync(STATE_FILE)
    console.log('🗑️  State file deleted')
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Weighted random picker
 */
function pickWeighted(weights: Record<string, number>): string {
  let sum = 0
  const r = Math.random()
  for (const key in weights) {
    sum += weights[key]
    if (r <= sum) return key
  }
  return Object.keys(weights)[0]
}

/**
 * Fisher-Yates shuffle
 */
function shuffleArray<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]
  }
}

// =====================================================
// AI GENERATION LOGIC
// =====================================================

interface GeneratedQuestion {
  question_latex: string
  answer: string
  explanation: string
  marks: number
}

/**
 * Generates a single question using the AI API
 */
async function generateQuestion(params: {
  level: string
  topic: string
  subTopic: string
  questionType: QuestionType
  marks: number
  calculatorAllowed: boolean
}): Promise<GeneratedQuestion | null> {
  const { level, topic, subTopic, questionType, marks, calculatorAllowed } = params

  const systemPrompt = `You are an expert UK mathematics exam question writer. Create a ${marks}-mark ${level} question.`
  
  const userPrompt = `
**Curriculum Context:**
- Level: ${level}
- Topic: ${topic}
- Sub-Topic: ${subTopic}

**Question Requirements:**
- Type: ${questionType}
- Marks: ${marks}
- Calculator: ${calculatorAllowed ? 'Calculator Allowed' : 'Non-Calculator'}

**Instructions:**
${questionType === 'Fluency' ? '- Focus on procedural skills and standard techniques' : ''}
${questionType === 'Problem Solving' ? '- Include multi-step problem requiring application of knowledge' : ''}
${questionType === 'Reasoning/Proof' ? '- Require mathematical justification, proof, or explanation' : ''}
${level.includes('A-Level') || level === 'GCSE Higher' ? '- Use advanced LaTeX notation (\\\\frac, \\\\sqrt, \\\\int, etc.)' : ''}
${!calculatorAllowed ? '- Ensure the question can be solved without a calculator' : ''}

**Output Format (JSON):**
{
  "question_latex": "Question text with LaTeX notation using $ for inline math and $$ for display math",
  "answer": "Final answer",
  "explanation": "Step-by-step solution",
  "marks": ${marks}
}

Generate ONE unique, exam-style question now.
`.trim()

  try {
    const response = await fetch(`${AI_API_ENDPOINT}/api/ai/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'text_gen',
        system_prompt: systemPrompt,
        user_prompt: userPrompt,
        level,
        topic,
        sub_topic: subTopic,
        question_type: questionType,
        marks,
        calculator_allowed: calculatorAllowed,
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error(`   ❌ API Error: ${errorData.error || response.statusText}`)
      return null
    }

    const data = await response.json()
    return data.data
  } catch (error) {
    console.error(`   ❌ Generation Error:`, error)
    return null
  }
}

/**
 * Inserts a question into the database
 */
async function insertQuestion(params: {
  level: string
  topic: string
  subTopic: string
  questionType: QuestionType
  marks: number
  calculatorAllowed: boolean
  generatedData: GeneratedQuestion
  dryRun: boolean
}): Promise<boolean> {
  const { level, topic, subTopic, questionType, marks, calculatorAllowed, generatedData, dryRun } = params

  const difficulty: Difficulty = level.includes('Foundation') ? 'Foundation' : 'Higher'

  const questionData = {
    content_type: 'generated_text' as const,
    question_latex: generatedData.question_latex,
    curriculum_level: level,
    topic: topic,
    topic_name: topic,
    sub_topic_name: subTopic,
    difficulty: difficulty,
    marks: marks,
    question_type: questionType,
    calculator_allowed: calculatorAllowed,
    answer_key: {
      answer: generatedData.answer,
      explanation: generatedData.explanation,
    },
    is_verified: true, // Seed questions are pre-verified
    created_by: null, // System-generated
  }

  if (dryRun) {
    console.log('   📋 [DRY RUN] Would insert:', {
      level,
      topic,
      subTopic,
      type: questionType,
      marks,
      calc: calculatorAllowed ? 'YES' : 'NO',
    })
    return true
  }

  try {
    const { error } = await supabase
      .from('questions')
      .insert(questionData)

    if (error) {
      console.error(`   ❌ Insert Error:`, error.message)
      return false
    }

    return true
  } catch (error) {
    console.error(`   ❌ Insert Exception:`, error)
    return false
  }
}

// =====================================================
// COMBINATION GENERATION
// =====================================================

interface QuestionCombination {
  level: string
  topic: string
  subTopic: string
  questionType: QuestionType
  marks: number
  calculatorAllowed: boolean
  key: string
}

/**
 * Builds a list of all possible question combinations
 * Uses weighted random selection for type and marks to ensure variety
 */
function buildCombinationList(): QuestionCombination[] {
  const allCombinations: QuestionCombination[] = []
  
  for (const level of Object.keys(SEED_CURRICULUM)) {
    for (const topic of Object.keys(SEED_CURRICULUM[level])) {
      for (const subTopic of SEED_CURRICULUM[level][topic]) {
        // Use weighted random selection for variety
        const questionType = pickWeighted(TYPE_WEIGHTS) as QuestionType
        const marks = parseInt(pickWeighted(MARK_WEIGHTS))
        const calculatorAllowed = Math.random() > 0.5
        
        const key = `${level}-${topic}-${subTopic}-${questionType}-${marks}m`
        
        allCombinations.push({
          level,
          topic,
          subTopic,
          questionType,
          marks,
          calculatorAllowed,
          key,
        })
      }
    }
  }
  
  return allCombinations
}

// =====================================================
// MAIN SEEDING LOGIC
// =====================================================

async function seedQuestions(options: { 
  limit: number
  dryRun: boolean
  clearExisting: boolean 
}) {
  console.log('\n🌱 Starting Smart Seeding...\n')
  console.log('═'.repeat(60))
  
  // Load state
  let state = loadState()
  console.log(`📊 State loaded:`)
  console.log(`   • Previously generated today: ${state.generatedCount}`)
  console.log(`   • Completed combinations: ${state.completedCombinations.length}`)
  console.log(`   • Daily limit: ${options.limit}`)
  console.log(`   • Dry run: ${options.dryRun ? 'YES' : 'NO'}`)
  console.log('═'.repeat(60))

  // Clear existing questions if requested
  if (options.clearExisting && !options.dryRun) {
    console.log('\n🗑️  Clearing existing questions...')
    const { error } = await supabase.from('questions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    
    if (error) {
      console.error('❌ Failed to clear questions:', error.message)
      return
    }
    
    console.log('✅ Existing questions cleared')
    // Also reset completed combinations since we're starting fresh
    state.completedCombinations = []
    saveState(state)
  }

  // Calculate remaining budget
  const remainingBudget = options.limit - state.generatedCount
  if (remainingBudget <= 0) {
    console.log('\n⚠️  Daily limit reached based on state file.')
    console.log('   Run with --reset to clear state and start fresh.')
    return
  }
  console.log(`\n🎯 Target for this run: ${remainingBudget} questions\n`)

  // 1. Build a flat list of ALL possible combinations
  const allCombinations = buildCombinationList()
  console.log(`📈 Total unique combinations in curriculum: ${allCombinations.length}`)

  // 2. Filter out already completed combinations
  const todoList = allCombinations.filter(c => !state.completedCombinations.includes(c.key))
  console.log(`📋 Remaining combinations to process: ${todoList.length}`)

  if (todoList.length === 0) {
    console.log('\n✅ All combinations have been completed!')
    console.log('   Run with --reset to regenerate with new random selections.')
    return
  }

  // 3. Shuffle for variety across levels/topics
  shuffleArray(todoList)

  // 4. Process the list until budget is exhausted
  let runCount = 0
  let successCount = 0
  let failureCount = 0
  const startTime = Date.now()

  console.log('\n' + '─'.repeat(60))
  console.log('Starting generation...')
  console.log('─'.repeat(60) + '\n')

  for (const combo of todoList) {
    if (runCount >= remainingBudget) {
      console.log('\n⚠️  Budget exhausted for this run')
      break
    }

    const progress = ((runCount + 1) / Math.min(remainingBudget, todoList.length) * 100).toFixed(1)
    console.log(`\n[${runCount + 1}/${remainingBudget}] (${progress}%)`)
    console.log(`   📚 ${combo.level} > ${combo.topic} > ${combo.subTopic}`)
    console.log(`   📝 ${combo.questionType} | ${combo.marks}m | ${combo.calculatorAllowed ? 'Calc' : 'NoCalc'}`)

    if (!options.dryRun) {
      const generated = await generateQuestion(combo)
      
      if (generated) {
        const success = await insertQuestion({ 
          ...combo, 
          generatedData: generated, 
          dryRun: false 
        })
        
        if (success) {
          console.log('   ✅ Saved to database')
          state.generatedCount++
          state.completedCombinations.push(combo.key)
          saveState(state) // Checkpoint after each success
          successCount++
          runCount++
        } else {
          console.log('   ❌ Failed to save')
          failureCount++
        }
      } else {
        console.log('   ❌ Failed to generate')
        failureCount++
      }

      // Respect rate limit
      if (runCount < remainingBudget && todoList.indexOf(combo) < todoList.length - 1) {
        console.log(`   ⏳ Rate limiting (${MIN_DELAY_MS / 1000}s delay)...`)
        await new Promise(r => setTimeout(r, MIN_DELAY_MS))
      }
    } else {
      console.log('   📋 [DRY RUN] Skipped')
      runCount++
      successCount++
    }
  }

  // Summary
  const endTime = Date.now()
  const duration = ((endTime - startTime) / 1000).toFixed(1)

  console.log('\n')
  console.log('═'.repeat(60))
  console.log('🎉 Batch Complete!')
  console.log('═'.repeat(60))
  console.log(`✅ Success: ${successCount}`)
  console.log(`❌ Failures: ${failureCount}`)
  console.log(`⏱️  Duration: ${duration}s`)
  console.log(`📊 Total generated today: ${state.generatedCount}`)
  console.log(`📋 Total combinations completed: ${state.completedCombinations.length}`)
  console.log('═'.repeat(60))
  console.log()
}

// =====================================================
// CLI ARGUMENT PARSING
// =====================================================

function parseArgs() {
  const args = process.argv.slice(2)
  
  let limit = DAILY_LIMIT
  let dryRun = false
  let clearExisting = false
  let reset = false

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if ((arg === '--limit' || arg === '-l') && args[i + 1]) {
      limit = parseInt(args[i + 1], 10)
      if (isNaN(limit) || limit <= 0) {
        console.error('❌ Invalid limit value')
        process.exit(1)
      }
      i++
    } else if (arg === '--dry-run') {
      dryRun = true
    } else if (arg === '--clear') {
      clearExisting = true
    } else if (arg === '--reset') {
      reset = true
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Optimized Question Database Seeding Script

Usage:
  npm run seed:questions [options]

Options:
  --limit <n>, -l    Maximum questions to generate this run (default: ${DAILY_LIMIT})
  --dry-run          Preview without inserting into database or calling API
  --clear            Clear all existing questions before seeding
  --reset            Reset state file (clears daily count and completion tracking)
  --help, -h         Show this help message

Features:
  • Smart Budgeting: Respects API rate limits (${DAILY_LIMIT}/day default)
  • Resumable: Saves progress to seed-state.json
  • Rate Limiting: ${MIN_DELAY_MS}ms delay between requests
  • Variety: Randomly samples question types and mark values

Examples:
  npm run seed:questions                    # Seed with default budget
  npm run seed:questions -- --limit 50      # Generate only 50 questions
  npm run seed:questions -- --dry-run       # Preview without API calls
  npm run seed:questions -- --reset         # Clear state and start fresh
  npm run seed:questions -- --clear --limit 100  # Clear DB and seed 100
      `)
      process.exit(0)
    }
  }

  return { limit, dryRun, clearExisting, reset }
}

// =====================================================
// RUN SCRIPT
// =====================================================

async function main() {
  const options = parseArgs()
  
  if (options.reset) {
    resetState()
    console.log('✅ State reset complete')
    if (!options.dryRun && options.limit > 0) {
      // Continue with seeding after reset
    } else {
      return
    }
  }
  
  await seedQuestions(options)
}

main().catch(error => {
  console.error('\n❌ Fatal Error:', error)
  process.exit(1)
})
