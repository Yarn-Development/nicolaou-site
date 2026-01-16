#!/usr/bin/env tsx

/**
 * Optimized Question Database Seeding Script (Hybrid Schema Compatible)
 * * Generates high-quality questions using AI to populate the questions table.
 * Aligned with the "Hybrid" schema (supports 'generated_text' vs 'official_past_paper').
 * * Features:
 * - Smart Budgeting: Limits total generation to a safe daily max (default: 950).
 * - Prioritized Sampling: Randomly selects high-value combinations.
 * - Resumable State: Saves progress to 'seed-state.json'.
 * - Rate Limiting: Enforces delays.
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

const DAILY_LIMIT = 950 
const MIN_DELAY_MS = 3500 // ~17 requests per minute
const STATE_FILE = path.join(process.cwd(), 'seed-state.json')

// Priority weights 
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
  completedCombinations: string[]
  lastRunDate: string
}

function loadState(): SeedState {
  if (fs.existsSync(STATE_FILE)) {
    try {
      const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'))
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

function pickWeighted(weights: Record<string, number>): string {
  let sum = 0
  const r = Math.random()
  for (const key in weights) {
    sum += weights[key]
    if (r <= sum) return key
  }
  return Object.keys(weights)[0]
}

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
  question_content: string // Updated to match DB Schema
  answer: string
  explanation: string
  marks: number
}

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
${questionType === 'Fluency' ? '- Focus on procedural skills.' : ''}
${questionType === 'Problem Solving' ? '- Include multi-step problem.' : ''}
${questionType === 'Reasoning/Proof' ? '- Require mathematical justification.' : ''}
${level.includes('A-Level') || level === 'GCSE Higher' ? '- Use advanced LaTeX notation.' : ''}

**Output Format (JSON):**
{
  "question_content": "Question text with LaTeX ($...$)",
  "answer": "Final answer",
  "explanation": "Step-by-step solution",
  "marks": ${marks}
}
`.trim()

  try {
    const response = await fetch(`${AI_API_ENDPOINT}/api/ai/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'text_gen', // Ensure your API route handles this
        system_prompt: systemPrompt,
        user_prompt: userPrompt,
        // Pass context for logging if needed
        level, topic, sub_topic: subTopic
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error(`   ❌ API Error: ${errorData.error || response.statusText}`)
      return null
    }

    const data = await response.json()
    // Handle case where API might wrap result in 'data' or return direct
    return data.data || data
  } catch (error) {
    console.error(`   ❌ Generation Error:`, error)
    return null
  }
}

/**
 * Inserts a question into the database (Hybrid Schema Compatible)
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

  // MAPPING TO NEW HYBRID SCHEMA
  const questionData = {
    // 1. Content Type & Core Content
    content_type: 'generated_text' as const,
    question_latex: generatedData.question_content, // Renamed from question_latex
    
    // 2. Curriculum Metadata
    curriculum_level: level,
    topic: topic,
    sub_topic: subTopic, // Renamed from sub_topic_name
    
    // 3. Pedagogical Tags
    difficulty: difficulty,
    marks: marks,
    question_type: questionType,
    calculator_allowed: calculatorAllowed,
    
    // 4. Answer Key
    answer_key: {
      answer: generatedData.answer,
      explanation: generatedData.explanation,
    },
    
    // 5. System Fields
    is_verified: true, // Seed questions are trusted
    created_by: null, // System-generated
    
    // 6. Explicit Nulls for Hybrid Compatibility (Official Papers)
    exam_board: null,
    paper_reference: null,
    question_number_ref: null,
    image_url: null 
  }

  if (dryRun) {
    console.log('   📋 [DRY RUN] Would insert:', {
      level, subTopic, type: questionType, marks
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

function buildCombinationList(): QuestionCombination[] {
  const allCombinations: QuestionCombination[] = []
  
  for (const level of Object.keys(SEED_CURRICULUM)) {
    for (const topic of Object.keys(SEED_CURRICULUM[level])) {
      for (const subTopic of SEED_CURRICULUM[level][topic]) {
        const questionType = pickWeighted(TYPE_WEIGHTS) as QuestionType
        const marks = parseInt(pickWeighted(MARK_WEIGHTS))
        const calculatorAllowed = Math.random() > 0.5
        
        const key = `${level}-${topic}-${subTopic}-${questionType}-${marks}m`
        
        allCombinations.push({
          level, topic, subTopic, questionType, marks, calculatorAllowed, key
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
  limit: number, dryRun: boolean, clearExisting: boolean 
}) {
  console.log('\n🌱 Starting Smart Seeding (Hybrid Schema)...\n')
  
  let state = loadState()
  const remainingBudget = options.limit - state.generatedCount

  if (remainingBudget <= 0) {
    console.log('⚠️  Daily limit reached. Run with --reset to start fresh.')
    return
  }

  // Clear existing (optional) - only clears AI-generated questions
  if (options.clearExisting && !options.dryRun) {
     const { error } = await supabase.from('questions').delete().eq('content_type', 'generated_text')
     if (!error) {
       console.log('✅ Cleared existing AI questions')
       // Reset completed combinations since we cleared the questions
       state.completedCombinations = []
       saveState(state)
     } else {
       console.error('❌ Failed to clear questions:', error.message)
     }
  }

  // Build & Shuffle
  const allCombinations = buildCombinationList()
  const todoList = allCombinations.filter(c => !state.completedCombinations.includes(c.key))
  shuffleArray(todoList)

  console.log(`🎯 Target: ${remainingBudget} questions`)
  console.log(`📋 Queue: ${todoList.length} combinations available\n`)

  let runCount = 0
  let successCount = 0

  for (const combo of todoList) {
    if (runCount >= remainingBudget) break

    console.log(`[${runCount + 1}/${remainingBudget}] ${combo.level} > ${combo.subTopic} (${combo.marks}m)`)

    if (!options.dryRun) {
      const generated = await generateQuestion(combo)
      
      if (generated) {
        const success = await insertQuestion({ 
          ...combo, generatedData: generated, dryRun: false 
        })
        
        if (success) {
          state.generatedCount++
          state.completedCombinations.push(combo.key)
          saveState(state)
          successCount++
          console.log('   ✅ Saved')
        }
      }

      // Rate Limit
      await new Promise(r => setTimeout(r, MIN_DELAY_MS))
    } else {
      console.log('   📋 [Dry Run] Skipped')
    }
    runCount++
  }

  console.log(`\n🎉 Complete! Added ${successCount} new questions.`)
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

  args.forEach((arg, i) => {
    if (arg === '--limit') limit = parseInt(args[i+1])
    if (arg === '--dry-run') dryRun = true
    if (arg === '--clear') clearExisting = true
    if (arg === '--reset') reset = true
  })

  return { limit, dryRun, clearExisting, reset }
}

async function main() {
  const options = parseArgs()
  if (options.reset) resetState()
  await seedQuestions(options)
}

main().catch(console.error)
