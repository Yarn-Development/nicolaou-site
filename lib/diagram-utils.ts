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

═══ SVG ROOT ELEMENT ═══

<svg viewBox="0 0 400 400" width="400" height="400" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="400" fill="white"/>
  ... diagram content ...
  <text x="390" y="395" text-anchor="end" font-style="italic" font-family="sans-serif" font-size="9" fill="black">Diagram NOT accurately drawn</text>
</svg>

═══ COORDINATE SYSTEM ═══

- SVG y-axis increases DOWNWARD (top of canvas = y=0, bottom = y=400).
- Safe drawing area: x from 50 to 350, y from 30 to 370 (50px margin for labels).
- For coordinate axes: place origin at (200, 250); x-axis goes left-right, y-axis goes up (decreasing y in SVG).

═══ LINE & SHAPE RULES ═══

- All outlines: stroke="black" stroke-width="1" fill="none"
- NO colors. NO fills except fill="none" on shapes, fill="white" on background.
- stroke-width NEVER exceeds 1.5.
- HIDDEN / BACK edges: stroke-dasharray="5,3" stroke="black" stroke-width="1" fill="none"
- Circles: <circle cx="..." cy="..." r="..." fill="none" stroke="black" stroke-width="1"/>

═══ 3D SOLID SHAPES (read carefully — these are the most common diagram errors) ═══

Use isometric-style projections. Circular cross-sections become ellipses with rx ≈ 3–4× ry.

CONE (apex UP, base DOWN):
  Base ellipse (solid, full): <ellipse cx="200" cy="310" rx="80" ry="20" fill="none" stroke="black" stroke-width="1"/>
  Left slant:  <line x1="120" y1="310" x2="200" y2="100" stroke="black" stroke-width="1"/>
  Right slant: <line x1="280" y1="310" x2="200" y2="100" stroke="black" stroke-width="1"/>
  — The back half of the base ellipse is shown dashed:
  Front arc (solid):  use <path> for the front half ellipse arc
  Back arc (dashed):  <path d="M 120,310 A 80,20 0 0,1 280,310" fill="none" stroke="black" stroke-width="1" stroke-dasharray="5,3"/>

CYLINDER:
  Top ellipse (solid):    <ellipse cx="200" cy="120" rx="80" ry="20" fill="none" stroke="black" stroke-width="1"/>
  Bottom ellipse front:   <path d="M 120,300 A 80,20 0 0,0 280,300" fill="none" stroke="black" stroke-width="1"/>
  Bottom ellipse back:    <path d="M 120,300 A 80,20 0 0,1 280,300" fill="none" stroke="black" stroke-width="1" stroke-dasharray="5,3"/>
  Left side:  <line x1="120" y1="120" x2="120" y2="300" stroke="black" stroke-width="1"/>
  Right side: <line x1="280" y1="120" x2="280" y2="300" stroke="black" stroke-width="1"/>

FRUSTUM (truncated cone — large base at bottom, smaller top):
  Large base ellipse (solid front): <path d="M 120,310 A 80,20 0 0,0 280,310" fill="none" stroke="black" stroke-width="1"/>
  Large base ellipse (dashed back): <path d="M 120,310 A 80,20 0 0,1 280,310" fill="none" stroke="black" stroke-width="1" stroke-dasharray="5,3"/>
  Small top ellipse (solid):        <ellipse cx="200" cy="160" rx="45" ry="11" fill="none" stroke="black" stroke-width="1"/>
  Left slant:  <line x1="120" y1="310" x2="155" y2="160" stroke="black" stroke-width="1"/>
  Right slant: <line x1="280" y1="310" x2="245" y2="160" stroke="black" stroke-width="1"/>
  Dashed lines showing original cone apex (above frustum):
    <line x1="155" y1="160" x2="200" y2="70" stroke="black" stroke-width="1" stroke-dasharray="5,3"/>
    <line x1="245" y1="160" x2="200" y2="70" stroke="black" stroke-width="1" stroke-dasharray="5,3"/>

CONE ON TOP OF CYLINDER (combined solid):
  Draw the cylinder first, then place the cone apex above the top ellipse of the cylinder.
  The cylinder top ellipse is ALSO the cone base — draw it once as solid.

SPHERE:
  Main circle: <circle cx="200" cy="200" r="100" fill="none" stroke="black" stroke-width="1"/>
  Equator (dashed back): <path d="M 100,200 A 100,25 0 0,1 300,200" fill="none" stroke="black" stroke-width="1" stroke-dasharray="5,3"/>
  Equator (solid front): <path d="M 100,200 A 100,25 0 0,0 300,200" fill="none" stroke="black" stroke-width="1"/>

PRISM / CUBOID:
  Draw visible faces as closed polygons. Use dashed lines for hidden back edges.

═══ SIDE-BY-SIDE DIAGRAMS ═══

When showing TWO related shapes (e.g., original cone alongside its frustum):
- Left shape: centred around x=120, using x range 50–190
- Right shape: centred around x=290, using x range 210–370
- Scale BOTH shapes identically so they look comparable.
- Label "Frustum" (or appropriate name) below the right shape.
- Do NOT draw any connecting lines between the two shapes.

═══ COORDINATE AXIS GRAPHS ═══

AXES:
  x-axis: <line x1="60" y1="250" x2="360" y2="250" stroke="black" stroke-width="1"/>
  y-axis: <line x1="200" y1="30"  x2="200" y2="370" stroke="black" stroke-width="1"/>
  Arrowheads at positive ends: small filled triangles using <polygon>.

TICK MARKS (for each labelled value):
  <line x1="X" y1="247" x2="X" y2="253" stroke="black" stroke-width="1"/>
  Label below: <text x="X" y="265" text-anchor="middle" font-family="sans-serif" font-size="11" fill="black">N</text>

TRIG GRAPHS (y = a sin(x – b)° + c):
  - x range typically –90 to 450. Map this to SVG x range 60–360.
  - x tick marks at –90, 0, 90, 180, 270, 360, 450.
  - y range: choose based on amplitude. Map y axis to SVG y range 370–30.
  - y tick marks at integers (or half-integers) that fit the amplitude.
  - Draw curve using <path> with smooth bezier control points.
  - Mark key points (maxima, minima, zero-crossings) where relevant.

QUADRATIC / POLYNOMIAL GRAPHS:
  - Draw coordinate axes first.
  - Use <path> with bezier curves for smooth shape.
  - Label the minimum/maximum with coordinates (x, y) using an ×-cross or small label.
  - Mark any x-intercepts with values.

═══ 2D SHAPE LABELS ═══

POINT LABELS (A, B, C):
  <text font-style="italic" font-family="serif" font-size="14" fill="black" text-anchor="middle">A</text>
  Position 15px OUTSIDE the shape vertex. NO dot at the vertex.

MEASUREMENT LABELS (5 cm, 12 m):
  <text font-family="sans-serif" font-size="11" fill="black" text-anchor="middle">5 cm</text>
  Place at the midpoint of the side, offset 12px away from the shape interior.

VARIABLE LABELS (x, θ, h, r):
  <text font-style="italic" font-family="sans-serif" font-size="11" fill="black" text-anchor="middle">x</text>
  Use Unicode directly for Greek: θ φ α β

DIMENSION ARROWS (for labeled lengths):
  Draw a thin line with small arrowheads at each end, parallel to the measured edge, offset ~15px.
  <line x1="X1" y1="Y" x2="X2" y2="Y" stroke="black" stroke-width="1"/>
  Small triangular arrowheads at X1 and X2.

RIGHT ANGLE MARKER:
  Two perpendicular lines (NOT a filled square):
  <line x1="X"   y1="Y"   x2="X+8" y2="Y"   stroke="black" stroke-width="1"/>
  <line x1="X+8" y1="Y"   x2="X+8" y2="Y+8" stroke="black" stroke-width="1"/>

ANGLE ARCS:
  <path d="M cx+r,cy A r,r 0 0,1 cx,cy-r" fill="none" stroke="black" stroke-width="1"/>
  Keep arc radius 20–35px.

═══ THINGS TO ABSOLUTELY AVOID ═══

- No <script> tags or event attributes (onerror, onclick, etc.)
- No colored strokes or fills (black only, except fill="white" on background rect)
- No grid lines unless the question explicitly involves a grid or graph paper
- No dots/circles at vertex positions
- stroke-width NEVER exceeds 1.5

═══ "DIAGRAM NOT ACCURATELY DRAWN" — MANDATORY ═══

Every single diagram must include this in the bottom-right corner:
<text x="390" y="395" text-anchor="end" font-style="italic" font-family="sans-serif" font-size="9" fill="black">Diagram NOT accurately drawn</text>

═══ QUESTION LANGUAGE ═══

- Pearson Edexcel style: precise, clinical, unambiguous British English.
- Command words only: Work out, Find, Calculate, Solve, Factorise, Expand, Simplify, Show that, Prove that, Explain why, Write down, Express, Give, Determine, Sketch, Draw, Hence.
- "Given that ..." for conditional information.
- "Hence, or otherwise, ..." for follow-on parts.
- Multi-part questions: label parts (a), (b), (c) and sub-parts (i), (ii). Add mark count in parentheses at the end of each part line, e.g. "(3)".
- NEVER start with "A student...", "You are...", or narrative framing unless it is a word problem requiring real-world context.
- Every value in the diagram must be stated in the question text, and vice versa.

STRICT PROHIBITIONS — never do any of these:
- NEVER include "Show your answer", "Show your working", "Answer:", blank answer lines, dotted lines, or any answer-box language in question_latex.
- NEVER use markdown tables (| col | col | --- |) anywhere in the JSON. For tabular data use a LaTeX array: $$\\begin{array}{|c|c|}\\hline ... \\hline\\end{array}$$
- NEVER use markdown formatting (**bold**, *italic*, ## headings, - bullets) inside question_latex or explanation.
- NEVER end question_latex with a colon followed by a blank line expecting the student to fill in.

LaTeX:
- Inline math: $...$ — e.g., $x^2 + 3x - 10 = 0$
- Display math: $$...$$ — for equations on their own line
- Use \\frac{}{}, \\sqrt{}, \\times, \\div, \\sin, \\cos, \\tan, \\pi
- Separate question parts with \\n in the JSON string — not markdown line breaks

Mark scheme in explanation:
- Label each mark: M1 (method), A1 (accuracy), B1 (independent mark), ft (follow-through).
- Write as plain prose steps separated by \\n — no markdown tables or bullet lists.

═══ OUTPUT FORMAT ═══

Return ONLY valid JSON — no markdown, no code blocks, no preamble:
{
  "question_latex": "The complete question text with LaTeX notation",
  "svg_markup": "<svg viewBox=\\"0 0 400 400\\" ...>...</svg>",
  "answer": "The final answer (concise, e.g. x = 7.4 cm)",
  "explanation": "Step-by-step mark scheme with M1/A1/B1 labels",
  "marks": 4,
  "diagram_description": "One sentence describing what the diagram shows"
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
