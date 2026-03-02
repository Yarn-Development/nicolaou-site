#!/usr/bin/env tsx

/**
 * Internal Geometry Factory
 * 
 * Generates original geometry questions with AI-created matplotlib diagrams.
 * 
 * Process:
 * 1. AI generates question + Python code for diagram
 * 2. Python script is executed to create temp_diagram.png
 * 3. Diagram is uploaded to Supabase Storage
 * 4. Question is inserted into the database with image_url
 * 
 * Usage:
 *   npx tsx scripts/seed-geometry.ts [--dry-run] [--limit=N] [--topic=TOPIC]
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Load environment variables
dotenv.config({ path: '.env.local' })

// =====================================================
// CONFIGURATION
// =====================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase environment variables!')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

if (!OPENROUTER_API_KEY) {
  console.error('❌ Missing OPENROUTER_API_KEY!')
  process.exit(1)
}

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Temp file paths
const TEMP_PYTHON_FILE = path.join(process.cwd(), 'temp_plot.py')
const TEMP_DIAGRAM_FILE = path.join(process.cwd(), 'temp_diagram.png')

// Rate limiting
const MIN_DELAY_MS = 4000 // ~15 requests per minute

// Edexcel-style rcParams boilerplate — prepended to every AI-generated script
// so the style is enforced even if the AI omits these settings
const RCPARAMS_BOILERPLATE = `
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np

# Pearson Edexcel exam paper style
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['font.sans-serif'] = ['Arial', 'Helvetica', 'DejaVu Sans']
plt.rcParams['lines.linewidth'] = 1.0
plt.rcParams['lines.color'] = 'black'
plt.rcParams['text.usetex'] = False
`

// =====================================================
// GEOMETRY TOPICS CONFIGURATION
// =====================================================

interface GeometryTopic {
  name: string
  level: 'GCSE Foundation' | 'GCSE Higher'
  subTopics: string[]
  description: string
}

const GEOMETRY_TOPICS: GeometryTopic[] = [
  {
    name: "Circle Theorems",
    level: "GCSE Higher",
    subTopics: [
      "Angle at centre vs circumference",
      "Angles in the same segment",
      "Angle in a semicircle",
      "Cyclic quadrilateral",
      "Tangent perpendicular to radius",
      "Alternate segment theorem"
    ],
    description: "Questions involving properties of circles, tangents, and inscribed angles"
  },
  {
    name: "Pythagoras' Theorem",
    level: "GCSE Foundation",
    subTopics: [
      "Finding the hypotenuse",
      "Finding a shorter side",
      "3D Pythagoras",
      "Pythagorean triples",
      "Distance between two points"
    ],
    description: "Right-angled triangle problems using a² + b² = c²"
  },
  {
    name: "Trigonometry (SOHCAHTOA)",
    level: "GCSE Foundation",
    subTopics: [
      "Finding a side using sine",
      "Finding a side using cosine",
      "Finding a side using tangent",
      "Finding an angle",
      "Angles of elevation and depression"
    ],
    description: "Right-angled triangle problems using sin, cos, tan"
  },
  {
    name: "Similar Shapes",
    level: "GCSE Higher",
    subTopics: [
      "Similar triangles - finding sides",
      "Similar triangles - finding angles",
      "Area scale factor",
      "Volume scale factor",
      "Proving similarity"
    ],
    description: "Questions about similar shapes and their properties"
  },
  {
    name: "Sine and Cosine Rules",
    level: "GCSE Higher",
    subTopics: [
      "Sine rule - finding a side",
      "Sine rule - finding an angle",
      "Cosine rule - finding a side",
      "Cosine rule - finding an angle",
      "Area of triangle using ½absinC"
    ],
    description: "Non-right-angled triangle problems"
  },
  {
    name: "Congruent Triangles",
    level: "GCSE Higher",
    subTopics: [
      "SSS congruence",
      "SAS congruence",
      "ASA congruence",
      "RHS congruence",
      "Proving congruence"
    ],
    description: "Identifying and proving triangle congruence"
  },
  {
    name: "Vectors",
    level: "GCSE Higher",
    subTopics: [
      "Vector addition",
      "Scalar multiplication",
      "Position vectors",
      "Finding midpoints",
      "Proving collinearity"
    ],
    description: "Geometric proofs and calculations using vectors"
  },
  {
    name: "Transformations",
    level: "GCSE Foundation",
    subTopics: [
      "Reflection in a line",
      "Rotation about a point",
      "Translation by a vector",
      "Enlargement with scale factor",
      "Combined transformations"
    ],
    description: "Geometric transformations of shapes"
  }
]

// =====================================================
// TYPES
// =====================================================

interface GeneratedGeometryQuestion {
  question_latex: string
  answer: string
  explanation: string
  marks: number
  python_code: string
}

interface ParsedArgs {
  dryRun: boolean
  limit: number
  topic: string | null
  retries: number
}

// =====================================================
// AI GENERATION
// =====================================================

const SYSTEM_PROMPT = `You are a Geometry Question Generator for UK GCSE Mathematics (Pearson Edexcel style).
Your task is to create exam-style geometry questions WITH accompanying Python matplotlib diagrams that look exactly like they came from a printed Pearson Edexcel GCSE exam paper.

IMPORTANT REQUIREMENTS:
1. Create a clear, well-structured geometry question appropriate for the specified topic and level.
2. Write a COMPLETE, STANDALONE Python script that draws the diagram for this question.
3. The diagram MUST replicate the Pearson Edexcel exam paper style precisely — monochrome, crisp, minimal.

PYTHON SCRIPT REQUIREMENTS:
- Import matplotlib.pyplot as plt, numpy as np, and matplotlib.patches as patches at the top
- Configure global rcParams at the start of the script:
    plt.rcParams['font.family'] = 'sans-serif'
    plt.rcParams['font.sans-serif'] = ['Arial', 'Helvetica', 'DejaVu Sans']
    plt.rcParams['lines.linewidth'] = 1.0
    plt.rcParams['lines.color'] = 'black'
    plt.rcParams['text.usetex'] = False
- Use plt.figure(figsize=(6, 6)) for tight, exam-sized diagrams
- Use plt.axis('equal') to maintain proportions
- Use plt.axis('off') to hide axes — NO axis ticks, borders, or grid lines
- Save using: plt.savefig('temp_diagram.png', dpi=200, bbox_inches='tight', facecolor='white', edgecolor='none')
- Call plt.close() at the end
- The script must be completely self-contained and runnable

EDEXCEL DIAGRAM STYLE — MANDATORY RULES:
1. LINES: All shape outlines must use linewidth=1.0, solid black. NO colored lines. NO dashed lines unless showing a genuine geometric extension or construction. NO matplotlib default blue.
2. VERTEX LABELS: Point labels (A, B, C, D...) must be rendered in italic serif style:
   plt.text(x, y, r'$A$', fontsize=14, fontstyle='italic', fontfamily='serif', ha='center', va='center')
   Position labels slightly OUTSIDE the shape, offset from the vertex.
3. MEASUREMENT LABELS: Lengths and angle values in sans-serif:
   plt.text(x, y, '5 cm', fontsize=11, fontfamily='sans-serif', ha='center', va='center')
   Use LaTeX mathtext for variables: r'$x$'
4. NO VERTEX DOTS: Do NOT draw large circular markers or dots at vertices. Edexcel diagrams show sharp corners formed by line intersections only.
5. ANGLES: Draw angle arcs using matplotlib.patches.Arc with small radius (0.4-0.6 units relative to shape size), thin linewidth=1.0. Do NOT use filled wedges or colored sectors.
6. RIGHT ANGLES: Draw small perpendicular square markers (two short perpendicular line segments forming an open square corner), NOT filled squares. Size ~0.3 units.
7. "NOT ACCURATELY DRAWN" LABEL: Every diagram MUST include this label in italic, small font:
   plt.text(x, y, 'Diagram NOT\\naccurately drawn', fontsize=8, fontstyle='italic', fontfamily='sans-serif', color='black', ha='right', va='top')
   Position it in the top-right or bottom-left corner area, away from the shape.
8. BACKGROUND: Pure white. No grid lines. No colored fills. No shading.
9. CIRCLES: Use matplotlib.patches.Circle with fill=False, edgecolor='black', linewidth=1.0

THINGS TO ABSOLUTELY AVOID:
- No grid lines or axis ticks
- No colored fills or shading
- No thick lines (linewidth > 1.5)
- No large circular markers at vertices (no plt.plot with 'o' marker)
- No matplotlib default blue color anywhere
- No red or blue dashed construction lines
- No FancyArrowPatch for angles (use Arc instead)

OUTPUT FORMAT (JSON only):
{
  "question_latex": "The question text with LaTeX notation ($...$)",
  "answer": "The final answer",
  "explanation": "Step-by-step solution with working",
  "marks": 4,
  "python_code": "Complete Python script as a single string"
}

Return ONLY valid JSON. No markdown, no code blocks, no additional text.`

async function generateGeometryQuestion(
  topic: GeometryTopic,
  subTopic: string
): Promise<GeneratedGeometryQuestion | null> {
  const userPrompt = `Create a ${topic.level} geometry question on: ${topic.name} - ${subTopic}

Topic Description: ${topic.description}

Requirements:
- Question should be worth 3-5 marks
- Include a clear diagram that students would see in a Pearson Edexcel GCSE exam paper
- The diagram should show all given information (lengths, angles) with proper Edexcel labeling conventions
- Mark any unknown values with variables like x, y, or θ using LaTeX mathtext (r'$x$')
- Point labels (A, B, C...) must be italic serif, measurement labels must be sans-serif
- NO vertex dots, NO colored lines, NO grid — monochrome black only
- Include "Diagram NOT accurately drawn" text in the corner
- Use linewidth=1.0, dpi=200, figsize=(6,6)
- Angle arcs via matplotlib.patches.Arc, right angles as small open square markers

Generate the question now as JSON.`

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Nicolaou Maths - Geometry Factory',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4', // Best for code generation
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 3000,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('   ❌ API Error:', errorData)
      return null
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      console.error('   ❌ No response content')
      return null
    }

    // Parse JSON response
    try {
      // Clean up response - remove markdown code blocks if present
      const cleanedContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()

      const parsed = JSON.parse(cleanedContent) as GeneratedGeometryQuestion

      // Validate required fields
      if (!parsed.question_latex || !parsed.python_code || !parsed.answer) {
        console.error('   ❌ Missing required fields in response')
        return null
      }

      return parsed
    } catch (parseError) {
      console.error('   ❌ Failed to parse JSON response', parseError)
      console.error('   Raw content:', content.substring(0, 500))
      return null
    }
  } catch (error) {
    console.error('   ❌ Generation error:', error)
    return null
  }
}

// =====================================================
// PYTHON EXECUTION
// =====================================================

async function executePythonCode(pythonCode: string): Promise<boolean> {
  // Clean up the python code - handle escaped newlines
  let cleanedCode = pythonCode
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\')

  // Strip duplicate import lines that the boilerplate already provides
  cleanedCode = cleanedCode
    .replace(/^import matplotlib\n?/gm, '')
    .replace(/^matplotlib\.use\([^)]+\)\n?/gm, '')
    .replace(/^import matplotlib\.pyplot as plt\n?/gm, '')
    .replace(/^import matplotlib\.patches as patches\n?/gm, '')
    .replace(/^from matplotlib import patches\n?/gm, '')
    .replace(/^import numpy as np\n?/gm, '')
    .replace(/^plt\.rcParams\[.*?\].*\n?/gm, '')

  // Prepend boilerplate to enforce Edexcel style rcParams
  const finalCode = RCPARAMS_BOILERPLATE + '\n' + cleanedCode

  // Write to temp file
  fs.writeFileSync(TEMP_PYTHON_FILE, finalCode, 'utf-8')

  try {
    // Execute Python script
    const { stderr } = await execAsync(`python "${TEMP_PYTHON_FILE}"`, {
      timeout: 30000, // 30 second timeout
    })

    if (stderr && !stderr.includes('Warning')) {
      console.error('   ⚠️ Python stderr:', stderr)
    }

    // Check if diagram was created
    if (!fs.existsSync(TEMP_DIAGRAM_FILE)) {
      console.error('   ❌ Diagram file not created')
      return false
    }

    const stats = fs.statSync(TEMP_DIAGRAM_FILE)
    if (stats.size < 1000) {
      console.error('   ❌ Diagram file too small (likely empty or corrupt)')
      return false
    }

    return true
  } catch (error: unknown) {
    const err = error as { message?: string; stderr?: string }
    console.error('   ❌ Python execution failed:', err.message || error)
    if (err.stderr) {
      console.error('   Python error:', err.stderr.substring(0, 500))
    }
    return false
  }
}

// =====================================================
// SUPABASE UPLOAD
// =====================================================

async function uploadDiagramToSupabase(
  topic: string,
  index: number
): Promise<string | null> {
  try {
    // Read the diagram file
    const fileBuffer = fs.readFileSync(TEMP_DIAGRAM_FILE)

    // Generate unique filename
    const timestamp = Date.now()
    const sanitizedTopic = topic.toLowerCase().replace(/[^a-z0-9]/g, '-')
    const fileName = `geometry/${sanitizedTopic}/${timestamp}-${index}.png`

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('question-images')
      .upload(fileName, fileBuffer, {
        contentType: 'image/png',
        upsert: false,
      })

    if (error) {
      console.error('   ❌ Upload error:', error.message)
      return null
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('question-images')
      .getPublicUrl(data.path)

    return publicUrl
  } catch (error) {
    console.error('   ❌ Upload failed:', error)
    return null
  }
}

// =====================================================
// DATABASE INSERT
// =====================================================

async function insertGeometryQuestion(params: {
  topic: GeometryTopic
  subTopic: string
  question: GeneratedGeometryQuestion
  imageUrl: string
  dryRun: boolean
}): Promise<boolean> {
  const { topic, subTopic, question, imageUrl, dryRun } = params

  const questionData = {
    // Content
    content_type: 'synthetic_image' as const,
    question_latex: question.question_latex,
    image_url: imageUrl,

    // Curriculum metadata
    curriculum_level: topic.level,
    topic: 'Geometry & Measures',
    sub_topic: `${topic.name} - ${subTopic}`,

    // Pedagogical tags
    difficulty: topic.level.includes('Higher') ? 'Higher' : 'Foundation',
    marks: question.marks || 4,
    question_type: 'Problem Solving',
    calculator_allowed: true,

    // Answer key
    answer_key: {
      answer: question.answer,
      explanation: question.explanation,
    },

    // System fields
    is_verified: false, // Needs manual review
    created_by: null,

    // Nulls for compatibility
    exam_board: null,
    paper_reference: null,
    question_number_ref: null,
  }

  if (dryRun) {
    console.log('   📋 [DRY RUN] Would insert:', {
      topic: topic.name,
      subTopic,
      marks: question.marks,
      imageUrl: imageUrl.substring(0, 60) + '...',
    })
    return true
  }

  try {
    const { error } = await supabase.from('questions').insert(questionData)

    if (error) {
      console.error('   ❌ Database insert error:', error.message)
      return false
    }

    return true
  } catch (error) {
    console.error('   ❌ Insert failed:', error)
    return false
  }
}

// =====================================================
// CLEANUP
// =====================================================

function cleanup(): void {
  try {
    if (fs.existsSync(TEMP_PYTHON_FILE)) {
      fs.unlinkSync(TEMP_PYTHON_FILE)
    }
    if (fs.existsSync(TEMP_DIAGRAM_FILE)) {
      fs.unlinkSync(TEMP_DIAGRAM_FILE)
    }
  } catch {
    // Ignore cleanup errors
  }
}

// =====================================================
// MAIN EXECUTION
// =====================================================

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2)
  const result: ParsedArgs = {
    dryRun: false,
    limit: 20,
    topic: null,
    retries: 3,
  }

  for (const arg of args) {
    if (arg === '--dry-run') {
      result.dryRun = true
    } else if (arg.startsWith('--limit=')) {
      result.limit = parseInt(arg.split('=')[1], 10) || 20
    } else if (arg.startsWith('--topic=')) {
      result.topic = arg.split('=')[1]
    } else if (arg.startsWith('--retries=')) {
      result.retries = parseInt(arg.split('=')[1], 10) || 3
    }
  }

  return result
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main(): Promise<void> {
  const args = parseArgs()

  console.log('═══════════════════════════════════════════════════════════')
  console.log('    🔺 GEOMETRY FACTORY - Synthetic Diagram Generator')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(`   Mode: ${args.dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`   Limit: ${args.limit} questions`)
  console.log(`   Topic Filter: ${args.topic || 'All topics'}`)
  console.log(`   Max Retries: ${args.retries}`)
  console.log('═══════════════════════════════════════════════════════════\n')

  // Filter topics if specified
  let topicsToProcess = GEOMETRY_TOPICS
  if (args.topic) {
    topicsToProcess = GEOMETRY_TOPICS.filter(t => 
      t.name.toLowerCase().includes(args.topic!.toLowerCase())
    )
    if (topicsToProcess.length === 0) {
      console.error(`❌ No topics found matching: ${args.topic}`)
      console.log('Available topics:')
      GEOMETRY_TOPICS.forEach(t => console.log(`  - ${t.name}`))
      process.exit(1)
    }
  }

  let successCount = 0
  let failCount = 0
  let questionIndex = 0

  // Process each topic
  for (const topic of topicsToProcess) {
    if (questionIndex >= args.limit) break

    console.log(`\n📐 TOPIC: ${topic.name} (${topic.level})`)
    console.log('─'.repeat(50))

    for (const subTopic of topic.subTopics) {
      if (questionIndex >= args.limit) break

      console.log(`\n   🎯 Sub-topic: ${subTopic}`)

      let success = false
      let attempts = 0

      while (!success && attempts < args.retries) {
        attempts++
        if (attempts > 1) {
          console.log(`   🔄 Retry attempt ${attempts}/${args.retries}`)
        }

        // Step 1: Generate question with AI
        console.log('   📝 Generating question...')
        const question = await generateGeometryQuestion(topic, subTopic)

        if (!question) {
          console.log('   ❌ Generation failed, retrying...')
          await delay(2000)
          continue
        }

        console.log('   ✅ Question generated')

        // Step 2: Execute Python to create diagram
        console.log('   🐍 Executing Python diagram code...')
        const pythonSuccess = await executePythonCode(question.python_code)

        if (!pythonSuccess) {
          console.log('   ❌ Python execution failed, retrying...')
          cleanup()
          await delay(2000)
          continue
        }

        console.log('   ✅ Diagram created')

        // Step 3: Upload to Supabase
        console.log('   ☁️  Uploading to Supabase...')
        const imageUrl = await uploadDiagramToSupabase(topic.name, questionIndex)

        if (!imageUrl) {
          console.log('   ❌ Upload failed, retrying...')
          cleanup()
          await delay(2000)
          continue
        }

        console.log('   ✅ Uploaded:', imageUrl.substring(0, 60) + '...')

        // Step 4: Insert into database
        console.log('   💾 Saving to database...')
        const insertSuccess = await insertGeometryQuestion({
          topic,
          subTopic,
          question,
          imageUrl,
          dryRun: args.dryRun,
        })

        if (insertSuccess) {
          console.log('   ✅ SAVED SUCCESSFULLY')
          successCount++
          success = true
        } else {
          console.log('   ❌ Database insert failed')
        }

        cleanup()
      }

      if (!success) {
        failCount++
        console.log(`   ⚠️ Failed after ${args.retries} attempts`)
      }

      questionIndex++

      // Rate limiting
      if (questionIndex < args.limit) {
        await delay(MIN_DELAY_MS)
      }
    }
  }

  // Final cleanup
  cleanup()

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('    📊 GENERATION COMPLETE')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(`   ✅ Successful: ${successCount}`)
  console.log(`   ❌ Failed: ${failCount}`)
  console.log(`   📈 Success Rate: ${((successCount / (successCount + failCount)) * 100).toFixed(1)}%`)
  console.log('═══════════════════════════════════════════════════════════\n')
}

// Run
main().catch(error => {
  console.error('Fatal error:', error)
  cleanup()
  process.exit(1)
})
