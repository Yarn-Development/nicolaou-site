/**
 * Diagram Generation Utilities
 *
 * Shared helpers used by all three generation routes and the question creator wizard:
 *   - needsDiagram()             — deterministic topic-based gate
 *   - sanitizeSvg()              — security sanitizer before storage upload
 *   - buildDiagramSystemPrompt() — shared Edexcel-style SVG prompt
 *   - uploadSvgToStorage()       — uploads SVG string to Supabase Storage
 */

import type { SupabaseClient } from '@supabase/supabase-js'

// =====================================================
// Topic allowlists — determines when to generate a diagram
// =====================================================

/**
 * Topics where ALL sub-topics require a diagram.
 * The topic name must match the `name` field in CURRICULUM_DATA exactly.
 */
const ALWAYS_DIAGRAM_TOPICS = new Set([
  'Geometry & Measures',
  'Trigonometry',
  'Coordinate Geometry',
])

/**
 * Specific sub-topic names that always require a diagram, regardless of parent topic.
 * These match `SubTopic.name` values in CURRICULUM_DATA exactly.
 */
const SELECTIVE_DIAGRAM_SUBTOPICS = new Set([
  // Algebra / graphs
  'Straight Line Graphs',
  'Quadratic Graphs',
  'Graphical Solutions',
  'Transformations of Graphs',
  'Linear Graphs',
  // Vectors
  'Vectors (Basic)',
  'Vectors (Advanced)',
  'Vector addition',
  'Scalar multiplication',
  'Position vectors',
  'Finding midpoints',
  'Proving collinearity',
  // Stats / charts
  'Charts & Graphs',
  'Scatter Graphs & Correlation',
  'Cumulative Frequency',
  'Box Plots',
  'Histograms',
  'Time Series',
  // Probability diagrams
  'Tree Diagrams',
  'Venn Diagrams',
  'Probability Diagrams',
])

/**
 * Returns true if generating this topic/sub-topic combination should include an SVG diagram.
 * This is a pure, deterministic function — no AI or I/O involved.
 * It runs both client-side (to show "diagram will be generated" badge) and server-side
 * (to route the API call to the diagram generation branch).
 */
export function needsDiagram(topicName: string, subTopicName: string): boolean {
  if (ALWAYS_DIAGRAM_TOPICS.has(topicName)) return true
  if (SELECTIVE_DIAGRAM_SUBTOPICS.has(subTopicName)) return true
  return false
}

// =====================================================
// SVG Sanitizer
// =====================================================

export interface SanitizeSvgResult {
  svg: string
  valid: boolean
  errors: string[]
}

const NOT_ACCURATELY_DRAWN_LABEL = `<text x="390" y="395" text-anchor="end" font-style="italic" font-family="sans-serif" font-size="9" fill="black">Diagram NOT accurately drawn</text>`

/**
 * Sanitizes AI-generated SVG before uploading to Supabase Storage.
 *
 * Layers:
 * 1. Structural check — must have <svg ... > ... </svg>
 * 2. Length guard — 200 to 50,000 characters
 * 3. Security strip — removes scripts, event attrs, javascript: hrefs, data: URLs
 * 4. Root attribute enforcement — viewBox and xmlns always present
 * 5. Required label — appends "Diagram NOT accurately drawn" if missing
 *
 * Returns { valid: false } if the input is structurally unusable.
 * Returns { valid: true, svg: cleaned } otherwise — even if some security strips were applied.
 */
export function sanitizeSvg(rawSvg: string): SanitizeSvgResult {
  const errors: string[] = []

  if (!rawSvg || typeof rawSvg !== 'string') {
    return { svg: '', valid: false, errors: ['Input is empty or not a string'] }
  }

  // Layer 1 — structural check
  const hasSvgOpen = rawSvg.includes('<svg')
  const hasSvgClose = rawSvg.includes('</svg>')
  if (!hasSvgOpen || !hasSvgClose) {
    return { svg: rawSvg, valid: false, errors: ['Missing <svg> root element'] }
  }

  // Layer 2 — length guard
  if (rawSvg.length < 200) {
    return { svg: rawSvg, valid: false, errors: [`SVG too short (${rawSvg.length} chars) — likely empty`] }
  }
  if (rawSvg.length > 50000) {
    return { svg: rawSvg, valid: false, errors: [`SVG too large (${rawSvg.length} chars) — model went off-rails`] }
  }

  let svg = rawSvg

  // Layer 3 — security strip
  // Remove <script> blocks
  svg = svg.replace(/<script[\s\S]*?<\/script>/gi, '')
  // Remove <foreignObject> blocks
  svg = svg.replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
  // Remove on* event attributes (e.g., onerror="...", onclick="...")
  svg = svg.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '')
  // Remove javascript: protocol in href or xlink:href
  svg = svg.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"')
  // Remove data: URLs in src or href
  svg = svg.replace(/(href|src)\s*=\s*["']data:[^"']*["']/gi, '')

  if (svg !== rawSvg) {
    errors.push('Security: stripped forbidden elements or attributes')
  }

  // Layer 4 — enforce root element attributes
  // Ensure viewBox is set on the <svg> tag
  if (!svg.includes('viewBox')) {
    svg = svg.replace(/<svg(\s)/i, '<svg viewBox="0 0 400 400"$1')
    svg = svg.replace(/<svg>/i, '<svg viewBox="0 0 400 400">')
    errors.push('Auto-injected missing viewBox attribute')
  }
  // Ensure xmlns is set
  if (!svg.includes('xmlns')) {
    svg = svg.replace(/<svg(\s)/i, '<svg xmlns="http://www.w3.org/2000/svg"$1')
    errors.push('Auto-injected missing xmlns attribute')
  }

  // Layer 5 — required "Diagram NOT accurately drawn" label
  if (!svg.includes('Diagram NOT')) {
    svg = svg.replace('</svg>', `  ${NOT_ACCURATELY_DRAWN_LABEL}\n</svg>`)
    errors.push('Auto-appended "Diagram NOT accurately drawn" label')
  }

  return { svg, valid: true, errors }
}

// =====================================================
// Edexcel-style SVG system prompt
// =====================================================

/**
 * Returns the system prompt used for all diagram generation calls.
 * Shared by /api/ai/generate, /api/ai/generate-similar, and /api/ai/shadow-paper.
 */
export function buildDiagramSystemPrompt(): string {
  return `You are an expert UK GCSE and A-Level mathematics question writer AND diagram designer for Pearson Edexcel exam papers.

Your task is to generate a COMPLETE exam question WITH an accompanying SVG diagram in a SINGLE JSON response.
The SVG and question text MUST be consistent — every numerical value, label, and variable in the SVG must match exactly what appears in question_latex.

═══ SVG TECHNICAL SPECIFICATION ═══

Root element:
<svg viewBox="0 0 400 400" width="400" height="400" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="400" fill="white"/>
  ... diagram content ...
  <text x="390" y="395" text-anchor="end" font-style="italic" font-family="sans-serif" font-size="9" fill="black">Diagram NOT accurately drawn</text>
</svg>

COORDINATE SYSTEM:
- Use integer coordinates in the range 50–350 on both axes.
- This leaves a 50px margin on all sides for labels.
- For coordinate axes questions: place origin at (200, 200); x-axis runs left-right, y-axis runs up-down (SVG y increases downward).

LINES & SHAPES:
- All shape outlines: stroke="black" stroke-width="1" fill="none"
- NO colored strokes. NO fills (except fill="none" on shapes, fill="white" on background rect).
- NO thick lines (stroke-width must not exceed 1.5).
- Circles: <circle cx="..." cy="..." r="..." fill="none" stroke="black" stroke-width="1"/>

POINT LABELS (A, B, C...):
- <text x="..." y="..." font-style="italic" font-family="serif" font-size="14" fill="black" text-anchor="middle">A</text>
- Position OUTSIDE the shape, offset ~15px from the vertex.
- NO dots or circles at vertex positions.

MEASUREMENT LABELS (lengths like "5 cm", "12 m"):
- <text x="..." y="..." font-family="sans-serif" font-size="11" fill="black" text-anchor="middle">5 cm</text>

VARIABLE LABELS (unknowns like x, y, θ):
- <text x="..." y="..." font-style="italic" font-family="sans-serif" font-size="11" fill="black" text-anchor="middle">x</text>
- Or for Greek: <text ...>θ</text> (use the Unicode character directly)

RIGHT ANGLE MARKERS (small open square in the corner):
- Two perpendicular line segments, NOT a filled square:
  <line x1="X" y1="Y" x2="X+8" y2="Y" stroke="black" stroke-width="1"/>
  <line x1="X+8" y1="Y" x2="X+8" y2="Y+8" stroke="black" stroke-width="1"/>

ANGLE ARCS (small arc near vertex):
- Use <path> with SVG arc commands:
  <path d="M cx+r,cy A r,r 0 0,1 cx,cy-r" fill="none" stroke="black" stroke-width="1"/>
- Keep arc radius small relative to shape size (20–40px).

ARROWS (for vectors or axes):
- Use <line> with a marker-end, or simply draw the arrowhead as a small filled triangle using <polygon>.
- For coordinate axes, include arrowheads at the positive ends.

"DIAGRAM NOT ACCURATELY DRAWN" LABEL — MANDATORY:
- Must appear in the bottom-right corner of every diagram:
<text x="390" y="395" text-anchor="end" font-style="italic" font-family="sans-serif" font-size="9" fill="black">Diagram NOT accurately drawn</text>

THINGS TO ABSOLUTELY AVOID:
- No <script> tags
- No event attributes (onerror, onclick, etc.)
- No colored fills or colored strokes
- No grid lines or axis tick marks (unless the question is about coordinate axes)
- No dots/circles at vertex positions
- No matplotlib-style default blue
- stroke-width never > 1.5

═══ QUESTION REQUIREMENTS ═══

Language & Tone:
- Write in the precise, clinical style of Pearson Edexcel papers.
- British English (metres not meters, favourite not favorite).
- Every piece of information needed to solve the question must be stated explicitly.
- If asking for a missing length/angle, mark it as x (or θ) in BOTH the question text AND the SVG.

LaTeX Notation:
- Inline math: $...$ (e.g., $x = 5$)
- Display math: $$...$$ for equations on their own line
- Use \\frac{}{}, \\sqrt{}, \\times, \\div, \\sin, \\cos, \\tan

Mark Allocation:
- 1 mark: single step
- 2 marks: method + answer
- 3–4 marks: multi-step with method, substitution, and answer marks
- 5+ marks: extended response with communication marks

═══ OUTPUT FORMAT ═══

Return ONLY valid JSON — no markdown, no code blocks, no explanatory text:
{
  "question_latex": "The complete question text with LaTeX notation",
  "svg_markup": "<svg viewBox=\\"0 0 400 400\\" ...>...</svg>",
  "answer": "The final answer (concise, e.g. x = 7.4 cm)",
  "explanation": "Step-by-step mark scheme with method marks, substitution marks, and answer marks",
  "marks": 4,
  "diagram_description": "One sentence describing what the diagram shows (for accessibility)"
}`
}

// =====================================================
// SVG Upload to Supabase Storage
// =====================================================

/**
 * Uploads a sanitized SVG string to the question-images bucket.
 * Returns the public URL or null if the upload fails.
 *
 * Storage path: diagrams/{sanitizedTopic}/{userId}/{timestamp}.svg
 */
export async function uploadSvgToStorage(
  svgContent: string,
  topic: string,
  userId: string,
  // Accept any Supabase client — server or anon
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>
): Promise<string | null> {
  try {
    const sanitizedTopic = topic.toLowerCase().replace(/[^a-z0-9]/g, '-')
    const timestamp = Date.now()
    const filePath = `diagrams/${sanitizedTopic}/${userId}/${timestamp}.svg`

    const svgBuffer = Buffer.from(svgContent, 'utf-8')

    const { data, error } = await supabase.storage
      .from('question-images')
      .upload(filePath, svgBuffer, {
        contentType: 'image/svg+xml',
        upsert: false,
      })

    if (error || !data) {
      console.error('[diagram-utils] SVG upload error:', error?.message)
      return null
    }

    const { data: { publicUrl } } = supabase.storage
      .from('question-images')
      .getPublicUrl(data.path)

    return publicUrl
  } catch (err) {
    console.error('[diagram-utils] SVG upload exception:', err)
    return null
  }
}
