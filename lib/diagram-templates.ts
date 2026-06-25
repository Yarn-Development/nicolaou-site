/**
 * Parameterised SVG diagram templates for Edexcel-style questions.
 * Each template takes typed params and returns a complete, sanitizer-safe SVG string.
 *
 * All templates:
 * - Use viewBox="0 0 400 400"
 * - Black strokes only (no fills except white bg)
 * - Include the mandatory "Diagram NOT accurately drawn" label
 * - Keep content within 50–350px margins
 */

// ─────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────

const f = (n: number) => (+n.toFixed(1)).toString()

function svgWrap(content: string): string {
  return `<svg viewBox="0 0 400 400" width="400" height="400" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="400" fill="white"/>
${content}
  <text x="390" y="395" text-anchor="end" font-style="italic" font-family="sans-serif" font-size="9" fill="black">Diagram NOT accurately drawn</text>
</svg>`
}

function seg(x1: number, y1: number, x2: number, y2: number): string {
  return `  <line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="black" stroke-width="1"/>`
}

function ptLabel(label: string, x: number, y: number, anchor = 'middle'): string {
  return `  <text x="${f(x)}" y="${f(y)}" text-anchor="${anchor}" font-style="italic" font-family="serif" font-size="14" fill="black">${label}</text>`
}

function sideLabel(label: string, x: number, y: number, anchor = 'middle'): string {
  return `  <text x="${f(x)}" y="${f(y)}" text-anchor="${anchor}" font-family="sans-serif" font-size="11" fill="black">${label}</text>`
}

function smallLabel(label: string, x: number, y: number, anchor = 'middle'): string {
  return `  <text x="${f(x)}" y="${f(y)}" text-anchor="${anchor}" font-family="sans-serif" font-size="10" fill="black">${label}</text>`
}

/** Midpoint of two SVG points — exported for external callers if needed */
export function mid(p1: [number, number], p2: [number, number]): [number, number] {
  return [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2]
}

/**
 * Returns a point offset `d` pixels perpendicular (left-hand side) from the midpoint
 * of segment p1→p2. Negative d = right-hand side.
 */
function perp(p1: [number, number], p2: [number, number], d: number): [number, number] {
  const dx = p2[0] - p1[0]
  const dy = p2[1] - p1[1]
  const len = Math.sqrt(dx * dx + dy * dy)
  const mx = (p1[0] + p2[0]) / 2
  const my = (p1[1] + p2[1]) / 2
  return [mx + (-dy / len) * d, my + (dx / len) * d]
}

/** Right-angle square marker at vertex v, between sides toward p1 and p2. */
function rightAngleMark(v: [number, number], p1: [number, number], p2: [number, number], size = 10): string {
  const d1x = p1[0] - v[0], d1y = p1[1] - v[1]
  const l1 = Math.sqrt(d1x * d1x + d1y * d1y)
  const u1x = (d1x / l1) * size, u1y = (d1y / l1) * size

  const d2x = p2[0] - v[0], d2y = p2[1] - v[1]
  const l2 = Math.sqrt(d2x * d2x + d2y * d2y)
  const u2x = (d2x / l2) * size, u2y = (d2y / l2) * size

  const q1 = [v[0] + u1x, v[1] + u1y]
  const q2 = [v[0] + u1x + u2x, v[1] + u1y + u2y]
  const q3 = [v[0] + u2x, v[1] + u2y]
  return [seg(q1[0], q1[1], q2[0], q2[1]), seg(q2[0], q2[1], q3[0], q3[1])].join('\n')
}

/** Small arc at vertex v between the two adjacent sides, for marking an angle. */
function angleArc(v: [number, number], p1: [number, number], p2: [number, number], r = 22): string {
  const a1 = Math.atan2(p1[1] - v[1], p1[0] - v[0])
  const a2 = Math.atan2(p2[1] - v[1], p2[0] - v[0])
  const sx = v[0] + r * Math.cos(a1)
  const sy = v[1] + r * Math.sin(a1)
  const ex = v[0] + r * Math.cos(a2)
  const ey = v[1] + r * Math.sin(a2)

  let diff = a2 - a1
  while (diff > Math.PI) diff -= 2 * Math.PI
  while (diff < -Math.PI) diff += 2 * Math.PI
  const sweep = diff > 0 ? 1 : 0

  return `  <path d="M ${f(sx)},${f(sy)} A ${r},${r} 0 0,${sweep} ${f(ex)},${f(ey)}" fill="none" stroke="black" stroke-width="1"/>`
}

/** Returns the bisector direction point for placing the angle label text. */
function angleLabelPos(v: [number, number], p1: [number, number], p2: [number, number], r: number): [number, number] {
  const a1 = Math.atan2(p1[1] - v[1], p1[0] - v[0])
  const a2 = Math.atan2(p2[1] - v[1], p2[0] - v[0])
  let diff = a2 - a1
  while (diff > Math.PI) diff -= 2 * Math.PI
  while (diff < -Math.PI) diff += 2 * Math.PI
  const bisect = a1 + diff / 2
  return [v[0] + r * Math.cos(bisect), v[1] + r * Math.sin(bisect)]
}

/** Draws coordinate axes with optional arrowheads and axis labels. */
function coordAxes(opts: {
  ox: number; oy: number
  xMin: number; xMax: number; yMin: number; yMax: number
  scaleX: number; scaleY: number
  xLabel?: string; yLabel?: string
}): string {
  const { ox, oy, xMin, xMax, yMin, yMax, scaleX, scaleY } = opts
  const parts: string[] = []

  const axLeft  = ox + xMin * scaleX
  const axRight = ox + xMax * scaleX
  const ayTop   = oy - yMax * scaleY
  const ayBot   = oy - yMin * scaleY

  // x-axis
  parts.push(seg(axLeft, oy, axRight, oy))
  parts.push(`  <polygon points="${f(axRight)},${f(oy)} ${f(axRight - 8)},${f(oy - 4)} ${f(axRight - 8)},${f(oy + 4)}" fill="black"/>`)
  if (opts.xLabel) parts.push(sideLabel(opts.xLabel, axRight + 12, oy + 4, 'start'))

  // y-axis
  parts.push(seg(ox, ayBot, ox, ayTop))
  parts.push(`  <polygon points="${f(ox)},${f(ayTop)} ${f(ox - 4)},${f(ayTop + 8)} ${f(ox + 4)},${f(ayTop + 8)}" fill="black"/>`)
  if (opts.yLabel) parts.push(sideLabel(opts.yLabel, ox - 6, ayTop - 6, 'end'))

  // Origin 'O' label
  parts.push(smallLabel('O', ox - 10, oy + 12, 'end'))

  return parts.join('\n')
}

// ─────────────────────────────────────────────
// Template param interfaces
// ─────────────────────────────────────────────

export interface RightTriangleParams {
  label_a?: string; label_b?: string; label_c?: string
  side_ab?: string; side_bc?: string; side_ac?: string
  angle_a?: string; angle_c?: string
}

export interface GeneralTriangleParams {
  style?: 'acute' | 'obtuse' | 'isosceles'
  label_a?: string; label_b?: string; label_c?: string
  side_ab?: string; side_bc?: string; side_ac?: string
  angle_a?: string; angle_b?: string; angle_c?: string
}

export interface QuadraticCurveParams {
  a: number; b?: number; c?: number
  roots?: [number, number]
  x_range?: [number, number]
  shade_region?: [number, number]
  x_label?: string; y_label?: string
  curve_label?: string
}

export interface StraightLineParams {
  m: number; c?: number
  label?: string
  second_line?: { m: number; c?: number; label?: string }
  x_range?: [number, number]
  show_intercepts?: boolean
}

export interface CircleParams {
  radius_label?: string
  center_label?: string
  chord?: boolean; chord_label?: string
  tangent?: boolean; tangent_label?: string
  point_labels?: string[]
  diameter?: boolean
}

export interface SectorParams {
  angle_degrees: number
  radius_label?: string; arc_label?: string
  angle_label?: string; center_label?: string
}

export interface HistogramParams {
  bars: Array<{ x_start: number; x_end: number; freq_density: number; label?: string }>
  x_label?: string; y_label?: string
}

export interface BoxPlotParams {
  min: number; q1: number; median: number; q3: number; max: number
  unit?: string; scale_label?: string
}

export interface CumulativeFrequencyParams {
  points: Array<[number, number]>
  x_label?: string; y_label?: string
  max_freq?: number
}

export interface Venn2Params {
  set_a_label?: string; set_b_label?: string
  region_a?: string; region_ab?: string; region_b?: string
  region_outside?: string
  universal?: boolean; universal_label?: string
}

export interface TreeDiagramParams {
  branches: Array<{
    label: string; prob?: string
    children: Array<{ label: string; prob?: string }>
  }>
  first_label?: string; second_label?: string
}

export interface NumberLineParams {
  min: number; max: number
  points?: Array<{ value: number; label?: string; filled?: boolean }>
  arrow?: 'left' | 'right' | 'both' | 'none'
}

export interface VectorParallelogramParams {
  vec_a_label?: string; vec_b_label?: string
  point_labels?: string[]
  show_diagonal?: boolean; diagonal_label?: string
  style?: 'parallelogram' | 'triangle'
}

export interface ScatterPlotParams {
  points: Array<[number, number]>
  x_label?: string; y_label?: string
  x_range?: [number, number]; y_range?: [number, number]
  line_of_best_fit?: boolean
}

export interface BarChartParams {
  bars: Array<{ label: string; value: number }>
  y_label?: string; x_label?: string
}

export type DiagramType =
  | 'right_triangle' | 'general_triangle'
  | 'quadratic_curve' | 'straight_line'
  | 'circle' | 'sector'
  | 'histogram' | 'box_plot' | 'cumulative_frequency'
  | 'venn_2' | 'tree_diagram'
  | 'number_line' | 'vector_parallelogram'
  | 'scatter_plot' | 'bar_chart'

export type DiagramParams =
  | RightTriangleParams | GeneralTriangleParams
  | QuadraticCurveParams | StraightLineParams
  | CircleParams | SectorParams
  | HistogramParams | BoxPlotParams | CumulativeFrequencyParams
  | Venn2Params | TreeDiagramParams
  | NumberLineParams | VectorParallelogramParams
  | ScatterPlotParams | BarChartParams

// ─────────────────────────────────────────────
// Template renderers
// ─────────────────────────────────────────────

function renderRightTriangle(p: RightTriangleParams): string {
  const A: [number, number] = [130, 100]
  const B: [number, number] = [130, 300]
  const C: [number, number] = [320, 300]
  const parts: string[] = []

  parts.push(seg(A[0], A[1], B[0], B[1]))  // AB vertical
  parts.push(seg(B[0], B[1], C[0], C[1]))  // BC horizontal
  parts.push(seg(A[0], A[1], C[0], C[1]))  // AC hypotenuse
  parts.push(rightAngleMark(B, A, C))

  if (p.angle_a) {
    parts.push(angleArc(A, B, C))
    const lp = angleLabelPos(A, B, C, 42)
    parts.push(sideLabel(p.angle_a, lp[0], lp[1]))
  }
  if (p.angle_c) {
    parts.push(angleArc(C, B, A))
    const lp = angleLabelPos(C, B, A, 42)
    parts.push(sideLabel(p.angle_c, lp[0], lp[1]))
  }

  parts.push(ptLabel(p.label_a ?? 'A', A[0] - 14, A[1] - 10))
  parts.push(ptLabel(p.label_b ?? 'B', B[0] - 18, B[1] + 18))
  parts.push(ptLabel(p.label_c ?? 'C', C[0] + 14, C[1] + 18))

  if (p.side_ab) {
    const lp = perp(A, B, -18)
    parts.push(sideLabel(p.side_ab, lp[0], lp[1]))
  }
  if (p.side_bc) {
    const lp = perp(B, C, 18)
    parts.push(sideLabel(p.side_bc, lp[0], lp[1]))
  }
  if (p.side_ac) {
    const lp = perp(A, C, -22)
    parts.push(sideLabel(p.side_ac, lp[0], lp[1]))
  }

  return svgWrap(parts.join('\n'))
}

function renderGeneralTriangle(p: GeneralTriangleParams): string {
  let A: [number, number], B: [number, number], C: [number, number]

  switch (p.style) {
    case 'obtuse':
      A = [260, 90]; B = [80, 310]; C = [340, 310]
      break
    case 'isosceles':
      A = [200, 80]; B = [100, 310]; C = [300, 310]
      break
    default: // acute
      A = [200, 80]; B = [90, 310]; C = [330, 310]
  }

  const parts: string[] = []
  parts.push(seg(A[0], A[1], B[0], B[1]))
  parts.push(seg(B[0], B[1], C[0], C[1]))
  parts.push(seg(A[0], A[1], C[0], C[1]))

  if (p.angle_a) {
    parts.push(angleArc(A, B, C))
    const lp = angleLabelPos(A, B, C, 42)
    parts.push(sideLabel(p.angle_a, lp[0], lp[1]))
  }
  if (p.angle_b) {
    parts.push(angleArc(B, A, C))
    const lp = angleLabelPos(B, A, C, 42)
    parts.push(sideLabel(p.angle_b, lp[0], lp[1]))
  }
  if (p.angle_c) {
    parts.push(angleArc(C, A, B))
    const lp = angleLabelPos(C, A, B, 42)
    parts.push(sideLabel(p.angle_c, lp[0], lp[1]))
  }

  parts.push(ptLabel(p.label_a ?? 'A', A[0], A[1] - 16))
  parts.push(ptLabel(p.label_b ?? 'B', B[0] - 18, B[1] + 18))
  parts.push(ptLabel(p.label_c ?? 'C', C[0] + 18, C[1] + 18))

  if (p.side_ab) {
    const lp = perp(A, B, -20)
    parts.push(sideLabel(p.side_ab, lp[0], lp[1]))
  }
  if (p.side_bc) {
    const lp = perp(B, C, 20)
    parts.push(sideLabel(p.side_bc, lp[0], lp[1]))
  }
  if (p.side_ac) {
    const lp = perp(A, C, 20)
    parts.push(sideLabel(p.side_ac, lp[0], lp[1]))
  }

  return svgWrap(parts.join('\n'))
}

function renderQuadraticCurve(p: QuadraticCurveParams): string {
  const a = p.a, b = p.b ?? 0, c = p.c ?? 0
  const fn = (x: number) => a * x * x + b * x + c

  // Compute vertex x (vy is available for future use but currently unused in rendering)
  const vx = -b / (2 * a)
  void fn(vx) // vertex y — computed for potential future vertex-label feature

  // Auto x range: at least 1 unit past roots (or vertex ±3)
  let xMin: number, xMax: number
  if (p.x_range) {
    [xMin, xMax] = p.x_range
  } else if (p.roots) {
    xMin = p.roots[0] - 1
    xMax = p.roots[1] + 1
  } else {
    xMin = vx - 3; xMax = vx + 3
  }

  // Sample the curve to find y range
  const STEPS = 80
  const xs = Array.from({ length: STEPS + 1 }, (_, i) => xMin + (xMax - xMin) * i / STEPS)
  const ys = xs.map(fn)
  const yMin = Math.min(...ys)
  const yMax = Math.max(...ys)
  const yPad = (yMax - yMin) * 0.15 || 1

  // SVG mapping — axes origin at a reasonable position
  const svgLeft = 70, svgRight = 360, svgTop = 55, svgBottom = 340
  const svgW = svgRight - svgLeft
  const svgH = svgBottom - svgTop
  const xRange = xMax - xMin
  const yRange = (yMax - yMin) + 2 * yPad

  const toSvgX = (x: number) => svgLeft + ((x - xMin) / xRange) * svgW
  const toSvgY = (y: number) => svgBottom - ((y - (yMin - yPad)) / yRange) * svgH

  // Axes
  const ox = toSvgX(0)
  const oy = toSvgY(0)
  const parts: string[] = []

  // x-axis (only if 0 is in y range)
  if (oy >= svgTop && oy <= svgBottom) {
    parts.push(seg(svgLeft - 10, oy, svgRight + 10, oy))
    parts.push(`  <polygon points="${f(svgRight + 10)},${f(oy)} ${f(svgRight + 2)},${f(oy - 4)} ${f(svgRight + 2)},${f(oy + 4)}" fill="black"/>`)
    parts.push(sideLabel(p.x_label ?? 'x', svgRight + 20, oy + 4, 'start'))
  }

  // y-axis (only if 0 is in x range)
  if (ox >= svgLeft && ox <= svgRight) {
    parts.push(seg(ox, svgBottom + 10, ox, svgTop - 10))
    parts.push(`  <polygon points="${f(ox)},${f(svgTop - 10)} ${f(ox - 4)},${f(svgTop - 2)} ${f(ox + 4)},${f(svgTop - 2)}" fill="black"/>`)
    parts.push(sideLabel(p.y_label ?? 'y', ox - 8, svgTop - 14, 'end'))
  }

  // Shading region (under curve, above x-axis)
  if (p.shade_region) {
    const [sx, ex] = p.shade_region
    const shadeXs = Array.from({ length: 40 }, (_, i) => sx + (ex - sx) * i / 39)
    const polyPts = [
      `${f(toSvgX(sx))},${f(oy)}`,
      ...shadeXs.map(x => `${f(toSvgX(x))},${f(toSvgY(fn(x)))}`),
      `${f(toSvgX(ex))},${f(oy)}`,
    ].join(' ')
    parts.push(`  <polygon points="${polyPts}" fill="none" stroke="none" opacity="0.3"/>`)
    // Draw hatching lines instead (Edexcel style)
    for (let x = sx; x <= ex; x += (ex - sx) / 8) {
      const svgXv = toSvgX(x)
      const svgYcurve = toSvgY(fn(x))
      if (svgYcurve <= oy) parts.push(seg(svgXv, svgYcurve, svgXv, oy))
    }
  }

  // Curve as polyline
  const curvePts = xs.map(x => `${f(toSvgX(x))},${f(toSvgY(fn(x)))}`).join(' ')
  parts.push(`  <polyline points="${curvePts}" fill="none" stroke="black" stroke-width="1.5"/>`)

  // Root markers
  if (p.roots) {
    for (const root of p.roots) {
      const rx = toSvgX(root)
      const ry = toSvgY(0)
      parts.push(smallLabel(f(root), rx, ry + 14))
    }
  }

  // Curve label
  if (p.curve_label) {
    const labelX = toSvgX(xMax - (xMax - xMin) * 0.1)
    const labelY = toSvgY(fn(xMax - (xMax - xMin) * 0.1)) - 10
    parts.push(sideLabel(p.curve_label, labelX, labelY))
  }

  return svgWrap(parts.join('\n'))
}

function renderStraightLine(p: StraightLineParams): string {
  const xRange = p.x_range ?? [-4, 4]
  const [xMin, xMax] = xRange
  const c1 = p.c ?? 0

  const fn1 = (x: number) => p.m * x + c1
  const y1min = fn1(xMin), y1max = fn1(xMax)

  let yMin = Math.min(y1min, y1max)
  let yMax = Math.max(y1min, y1max)

  if (p.second_line) {
    const c2 = p.second_line.c ?? 0
    const fn2 = (x: number) => p.second_line!.m * x + c2
    yMin = Math.min(yMin, fn2(xMin), fn2(xMax))
    yMax = Math.max(yMax, fn2(xMin), fn2(xMax))
  }

  const yPad = Math.max((yMax - yMin) * 0.2, 1)
  yMin -= yPad; yMax += yPad

  const ox = 200, oy = 200
  const scaleX = 30, scaleY = 30

  const svgX = (x: number) => ox + x * scaleX
  const svgY = (y: number) => oy - y * scaleY

  const parts: string[] = []
  parts.push(coordAxes({ ox, oy, xMin: xMin - 0.5, xMax: xMax + 0.5, yMin: yMin - 0.5, yMax: yMax + 0.5, scaleX, scaleY, xLabel: 'x', yLabel: 'y' }))

  // Line 1
  parts.push(seg(svgX(xMin), svgY(fn1(xMin)), svgX(xMax), svgY(fn1(xMax))))
  if (p.label) {
    const labelX = svgX(xMax) + 6
    const labelY = svgY(fn1(xMax))
    parts.push(sideLabel(p.label, labelX, labelY, 'start'))
  }

  // Line 2
  if (p.second_line) {
    const c2 = p.second_line.c ?? 0
    const fn2 = (x: number) => p.second_line!.m * x + c2
    parts.push(seg(svgX(xMin), svgY(fn2(xMin)), svgX(xMax), svgY(fn2(xMax))))
    if (p.second_line.label) {
      parts.push(sideLabel(p.second_line.label, svgX(xMax) + 6, svgY(fn2(xMax)), 'start'))
    }
  }

  // Intercepts
  if (p.show_intercepts) {
    const yint = c1
    if (yint !== 0) {
      parts.push(smallLabel(f(yint), svgX(0) - 12, svgY(yint) + 4, 'end'))
    }
    if (p.m !== 0) {
      const xint = -c1 / p.m
      parts.push(smallLabel(f(xint), svgX(xint), svgY(0) + 14))
    }
  }

  return svgWrap(parts.join('\n'))
}

function renderCircle(p: CircleParams): string {
  const cx = 200, cy = 200, r = 120
  const parts: string[] = []

  parts.push(`  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="black" stroke-width="1"/>`)

  // Centre label
  const centerLbl = p.center_label ?? 'O'
  parts.push(`  <circle cx="${cx}" cy="${cy}" r="2" fill="black"/>`)
  parts.push(ptLabel(centerLbl, cx - 12, cy + 6, 'end'))

  // Radius line + label
  if (p.radius_label) {
    const rx = cx + r * 0.707, ry = cy - r * 0.707
    parts.push(seg(cx, cy, rx, ry))
    const lp = perp([cx, cy], [rx, ry], 12)
    parts.push(sideLabel(p.radius_label, lp[0], lp[1]))
  }

  // Diameter
  if (p.diameter) {
    parts.push(seg(cx - r, cy, cx + r, cy))
    parts.push(`  <circle cx="${cx - r}" cy="${cy}" r="2.5" fill="black"/>`)
    parts.push(`  <circle cx="${cx + r}" cy="${cy}" r="2.5" fill="black"/>`)
  }

  // Chord
  if (p.chord) {
    const chx1 = cx - r * 0.6, chy1 = cy - r * 0.8
    const chx2 = cx + r * 0.8, chy2 = cy + r * 0.3
    parts.push(seg(chx1, chy1, chx2, chy2))
    if (p.chord_label) {
      const lp = perp([chx1, chy1], [chx2, chy2], -14)
      parts.push(sideLabel(p.chord_label, lp[0], lp[1]))
    }
  }

  // Tangent at rightmost point
  if (p.tangent) {
    const tx = cx + r, ty = cy
    parts.push(seg(tx, ty - 80, tx, ty + 80))
    parts.push(seg(cx, cy, tx, ty))  // radius to tangent point
    parts.push(rightAngleMark([tx, ty], [cx, cy], [tx, ty + 80]))
    if (p.tangent_label) {
      parts.push(sideLabel(p.tangent_label, tx + 16, ty, 'start'))
    }
  }

  // Point labels on circumference
  if (p.point_labels) {
    const angles = [270, 210, 330, 90, 150, 30]
    p.point_labels.slice(0, 6).forEach((lbl, i) => {
      const angle = (angles[i] ?? i * 60) * Math.PI / 180
      const px = cx + r * Math.cos(angle)
      const py = cy + r * Math.sin(angle)
      const offsetX = 14 * Math.cos(angle)
      const offsetY = 14 * Math.sin(angle)
      parts.push(`  <circle cx="${f(px)}" cy="${f(py)}" r="2.5" fill="black"/>`)
      parts.push(ptLabel(lbl, px + offsetX, py + offsetY))
    })
  }

  return svgWrap(parts.join('\n'))
}

function renderSector(p: SectorParams): string {
  const cx = 200, cy = 240, r = 150
  const angleDeg = Math.max(10, Math.min(350, p.angle_degrees))
  const angleRad = angleDeg * Math.PI / 180

  // Sector drawn from the bottom, symmetric
  const startAngle = Math.PI + (Math.PI - angleRad) / 2
  const endAngle = startAngle + angleRad

  const sx = cx + r * Math.cos(startAngle)
  const sy = cy + r * Math.sin(startAngle)
  const ex = cx + r * Math.cos(endAngle)
  const ey = cy + r * Math.sin(endAngle)

  const large = angleDeg > 180 ? 1 : 0

  const parts: string[] = []
  parts.push(`  <path d="M ${f(cx)},${f(cy)} L ${f(sx)},${f(sy)} A ${r},${r} 0 ${large},1 ${f(ex)},${f(ey)} Z" fill="none" stroke="black" stroke-width="1"/>`)

  // Centre label
  parts.push(`  <circle cx="${cx}" cy="${cy}" r="2" fill="black"/>`)
  parts.push(ptLabel(p.center_label ?? 'O', cx - 12, cy + 6, 'end'))

  // Radius labels (on both radii)
  if (p.radius_label) {
    const mid1 = perp([cx, cy], [sx, sy], 14)
    parts.push(sideLabel(p.radius_label, mid1[0], mid1[1]))
  }

  // Arc label (at midpoint of arc)
  if (p.arc_label) {
    const midAngle = startAngle + angleRad / 2
    const ax = cx + (r + 18) * Math.cos(midAngle)
    const ay = cy + (r + 18) * Math.sin(midAngle)
    parts.push(sideLabel(p.arc_label, ax, ay))
  }

  // Angle label
  if (p.angle_label) {
    const midAngle = startAngle + angleRad / 2
    const labelR = 35
    const ax = cx + labelR * Math.cos(midAngle)
    const ay = cy + labelR * Math.sin(midAngle)
    // Angle arc
    parts.push(`  <path d="M ${f(cx + 25 * Math.cos(startAngle))},${f(cy + 25 * Math.sin(startAngle))} A 25,25 0 ${large},1 ${f(cx + 25 * Math.cos(endAngle))},${f(cy + 25 * Math.sin(endAngle))}" fill="none" stroke="black" stroke-width="1"/>`)
    parts.push(sideLabel(p.angle_label, ax, ay))
  }

  return svgWrap(parts.join('\n'))
}

function renderHistogram(p: HistogramParams): string {
  const bars = p.bars
  if (!bars.length) return svgWrap('')

  const allXStart = bars.map(b => b.x_start)
  const allXEnd   = bars.map(b => b.x_end)
  const allFD     = bars.map(b => b.freq_density)
  const dataXMin  = Math.min(...allXStart)
  const dataXMax  = Math.max(...allXEnd)
  const dataFDMax = Math.max(...allFD)

  const svgLeft = 70, svgRight = 360, svgTop = 50, svgBottom = 320
  const svgW = svgRight - svgLeft, svgH = svgBottom - svgTop

  const toSvgX = (x: number) => svgLeft + ((x - dataXMin) / (dataXMax - dataXMin)) * svgW
  const toSvgY = (fd: number) => svgBottom - (fd / (dataFDMax * 1.15)) * svgH

  const parts: string[] = []

  // Axes
  parts.push(seg(svgLeft, svgBottom, svgRight + 10, svgBottom))
  parts.push(seg(svgLeft, svgBottom, svgLeft, svgTop - 10))
  parts.push(`  <polygon points="${f(svgRight + 10)},${f(svgBottom)} ${f(svgRight + 2)},${f(svgBottom - 4)} ${f(svgRight + 2)},${f(svgBottom + 4)}" fill="black"/>`)
  parts.push(`  <polygon points="${f(svgLeft)},${f(svgTop - 10)} ${f(svgLeft - 4)},${f(svgTop - 2)} ${f(svgLeft + 4)},${f(svgTop - 2)}" fill="black"/>`)

  // Axis labels
  parts.push(sideLabel(p.x_label ?? '', (svgLeft + svgRight) / 2, svgBottom + 30))
  parts.push(sideLabel(p.y_label ?? 'Frequency density', svgLeft - 50, (svgTop + svgBottom) / 2))

  // Bars
  for (const bar of bars) {
    const bx1 = toSvgX(bar.x_start)
    const bx2 = toSvgX(bar.x_end)
    const by  = toSvgY(bar.freq_density)
    parts.push(`  <rect x="${f(bx1)}" y="${f(by)}" width="${f(bx2 - bx1)}" height="${f(svgBottom - by)}" fill="none" stroke="black" stroke-width="1"/>`)
    // x-axis tick labels
    parts.push(smallLabel(f(bar.x_start), bx1, svgBottom + 12))
  }
  // Last tick
  parts.push(smallLabel(f(bars[bars.length - 1].x_end), toSvgX(bars[bars.length - 1].x_end), svgBottom + 12))

  // FD axis ticks
  const fdTicks = 4
  for (let i = 1; i <= fdTicks; i++) {
    const fd = (dataFDMax * 1.15) * i / fdTicks
    const ty = toSvgY(fd)
    parts.push(seg(svgLeft - 4, ty, svgLeft, ty))
    parts.push(smallLabel(f(fd), svgLeft - 8, ty + 3, 'end'))
  }

  return svgWrap(parts.join('\n'))
}

function renderBoxPlot(p: BoxPlotParams): string {
  const { min, q1, median, q3, max } = p
  const pad = (max - min) * 0.15 || 1
  const dataMin = min - pad, dataMax = max + pad

  const svgLeft = 70, svgRight = 360, svgMid = 200
  const scale = (svgRight - svgLeft) / (dataMax - dataMin)
  const toX = (v: number) => svgLeft + (v - dataMin) * scale

  const boxTop = svgMid - 35, boxBot = svgMid + 35
  const parts: string[] = []

  // Box
  parts.push(`  <rect x="${f(toX(q1))}" y="${f(boxTop)}" width="${f(toX(q3) - toX(q1))}" height="70" fill="none" stroke="black" stroke-width="1"/>`)

  // Median line
  parts.push(seg(toX(median), boxTop, toX(median), boxBot))

  // Whiskers
  parts.push(seg(toX(min), svgMid, toX(q1), svgMid))
  parts.push(seg(toX(q3), svgMid, toX(max), svgMid))

  // Whisker end caps
  parts.push(seg(toX(min), boxTop, toX(min), boxBot))
  parts.push(seg(toX(max), boxTop, toX(max), boxBot))

  // Axis line
  parts.push(seg(svgLeft - 10, svgMid + 50, svgRight + 10, svgMid + 50))

  // Key value labels
  for (const [val] of [[min, 'Min'], [q1, 'Q₁'], [median, 'Median'], [q3, 'Q₃'], [max, 'Max']] as const) {
    const x = toX(val as number)
    parts.push(smallLabel(f(val as number) + (p.unit ? ` ${p.unit}` : ''), x, svgMid + 65))
    parts.push(seg(x, svgMid + 50, x, svgMid + 54))
  }

  if (p.scale_label) {
    parts.push(sideLabel(p.scale_label, (svgLeft + svgRight) / 2, svgMid + 84))
  }

  return svgWrap(parts.join('\n'))
}

function renderCumulativeFrequency(p: CumulativeFrequencyParams): string {
  const pts = p.points
  if (pts.length < 2) return svgWrap('')

  const xVals = pts.map(pt => pt[0])
  const yVals = pts.map(pt => pt[1])
  const xMin = Math.min(...xVals)
  const xMax = Math.max(...xVals)
  const yMax = p.max_freq ?? Math.max(...yVals)

  const svgLeft = 70, svgRight = 360, svgTop = 50, svgBottom = 320
  const toSvgX = (x: number) => svgLeft + ((x - xMin) / (xMax - xMin)) * (svgRight - svgLeft)
  const toSvgY = (y: number) => svgBottom - (y / yMax) * (svgBottom - svgTop)

  const parts: string[] = []

  // Axes
  parts.push(seg(svgLeft, svgBottom, svgRight + 10, svgBottom))
  parts.push(seg(svgLeft, svgBottom, svgLeft, svgTop - 10))
  parts.push(sideLabel(p.x_label ?? '', (svgLeft + svgRight) / 2, svgBottom + 28))
  parts.push(sideLabel(p.y_label ?? 'Cumulative frequency', svgLeft - 52, (svgTop + svgBottom) / 2))

  // Tick marks
  const xTicks = 5
  for (let i = 0; i <= xTicks; i++) {
    const xVal = xMin + (xMax - xMin) * i / xTicks
    const sx = toSvgX(xVal)
    parts.push(seg(sx, svgBottom, sx, svgBottom + 4))
    parts.push(smallLabel(f(xVal), sx, svgBottom + 14))
  }
  const yTicks = 5
  for (let i = 1; i <= yTicks; i++) {
    const yVal = yMax * i / yTicks
    const sy = toSvgY(yVal)
    parts.push(seg(svgLeft - 4, sy, svgLeft, sy))
    parts.push(smallLabel(f(yVal), svgLeft - 8, sy + 3, 'end'))
  }

  // Curve (join points with straight lines — Edexcel cumulative frequency uses straight lines)
  const curvePts = pts.map(([x, y]) => `${f(toSvgX(x))},${f(toSvgY(y))}`).join(' ')
  parts.push(`  <polyline points="${curvePts}" fill="none" stroke="black" stroke-width="1.5"/>`)

  // Data points
  for (const [x, y] of pts) {
    parts.push(`  <circle cx="${f(toSvgX(x))}" cy="${f(toSvgY(y))}" r="3" fill="black"/>`)
  }

  return svgWrap(parts.join('\n'))
}

function renderVenn2(p: Venn2Params): string {
  const cx1 = 165, cx2 = 235, cy = 200, r = 100
  const parts: string[] = []

  // Universal set rectangle
  if (p.universal) {
    parts.push(`  <rect x="50" y="80" width="300" height="240" fill="none" stroke="black" stroke-width="1"/>`)
    parts.push(ptLabel(p.universal_label ?? 'ξ', 60, 100, 'start'))
  }

  // Two overlapping circles
  parts.push(`  <circle cx="${cx1}" cy="${cy}" r="${r}" fill="none" stroke="black" stroke-width="1"/>`)
  parts.push(`  <circle cx="${cx2}" cy="${cy}" r="${r}" fill="none" stroke="black" stroke-width="1"/>`)

  // Set labels (above circles)
  parts.push(ptLabel(p.set_a_label ?? 'A', cx1, cy - r - 12))
  parts.push(ptLabel(p.set_b_label ?? 'B', cx2, cy - r - 12))

  // Region labels
  if (p.region_a)        parts.push(sideLabel(p.region_a, cx1 - 50, cy + 4))
  if (p.region_ab)       parts.push(sideLabel(p.region_ab, (cx1 + cx2) / 2, cy + 4))
  if (p.region_b)        parts.push(sideLabel(p.region_b, cx2 + 50, cy + 4))
  if (p.region_outside)  parts.push(sideLabel(p.region_outside, 85, 110))

  return svgWrap(parts.join('\n'))
}

function renderTreeDiagram(p: TreeDiagramParams): string {
  const branches = p.branches
  const parts: string[] = []

  const startX = 80
  const firstLevelX = 200
  const secondLevelX = 330
  const totalBranches = branches.reduce((s, b) => s + b.children.length, 0)
  const svgHeight = Math.max(300, totalBranches * 60 + 40)
  const rowH = (svgHeight - 40) / totalBranches

  let rowIdx = 0
  const firstYs: number[] = []

  for (let i = 0; i < branches.length; i++) {
    const b = branches[i]
    const childCount = b.children.length
    const childStartRow = rowIdx
    const childEndRow = rowIdx + childCount - 1
    const fy = 40 + (childStartRow + childEndRow) / 2 * rowH + rowH / 2
    firstYs.push(fy)

    // Draw first-level branch
    parts.push(seg(startX, 200, firstLevelX, fy))
    parts.push(sideLabel(b.label, firstLevelX + 8, fy - 6, 'start'))
    if (b.prob) {
      const lp = perp([startX, 200], [firstLevelX, fy], -12)
      parts.push(smallLabel(b.prob, lp[0], lp[1]))
    }

    // Second-level branches
    for (let j = 0; j < b.children.length; j++) {
      const ch = b.children[j]
      const sy = 40 + rowIdx * rowH + rowH / 2
      rowIdx++

      parts.push(seg(firstLevelX, fy, secondLevelX, sy))
      parts.push(sideLabel(ch.label, secondLevelX + 8, sy - 6, 'start'))
      if (ch.prob) {
        const lp = perp([firstLevelX, fy], [secondLevelX, sy], -12)
        parts.push(smallLabel(ch.prob, lp[0], lp[1]))
      }
    }
  }

  // Column headers
  if (p.first_label)  parts.push(smallLabel(p.first_label, firstLevelX,  30))
  if (p.second_label) parts.push(smallLabel(p.second_label, secondLevelX, 30))

  return svgWrap(parts.join('\n'))
}

function renderNumberLine(p: NumberLineParams): string {
  const { min, max } = p
  const range = max - min
  const svgLeft = 70, svgRight = 350, svgMid = 200
  const toX = (v: number) => svgLeft + ((v - min) / range) * (svgRight - svgLeft)

  const parts: string[] = []

  // Main line
  parts.push(seg(svgLeft - 10, svgMid, svgRight + 10, svgMid))
  parts.push(`  <polygon points="${f(svgRight + 10)},${f(svgMid)} ${f(svgRight + 2)},${f(svgMid - 4)} ${f(svgRight + 2)},${f(svgMid + 4)}" fill="black"/>`)

  // Ticks for integers or reasonable intervals
  const steps = Math.min(range, 10)
  const step = range / steps
  for (let i = 0; i <= steps; i++) {
    const val = min + i * step
    const x = toX(val)
    parts.push(seg(x, svgMid - 6, x, svgMid + 6))
    parts.push(smallLabel(Number.isInteger(val) ? val.toString() : f(val), x, svgMid + 20))
  }

  // Marked points
  if (p.points) {
    for (const pt of p.points) {
      const x = toX(pt.value)
      if (pt.filled) {
        parts.push(`  <circle cx="${f(x)}" cy="${f(svgMid)}" r="6" fill="black" stroke="black" stroke-width="1"/>`)
      } else {
        parts.push(`  <circle cx="${f(x)}" cy="${f(svgMid)}" r="6" fill="white" stroke="black" stroke-width="1.5"/>`)
      }
      if (pt.label) parts.push(sideLabel(pt.label, x, svgMid - 16))
    }
  }

  // Arrow
  if (p.arrow === 'left') {
    parts.push(`  <polygon points="${f(svgLeft - 10)},${f(svgMid)} ${f(svgLeft - 2)},${f(svgMid - 4)} ${f(svgLeft - 2)},${f(svgMid + 4)}" fill="black"/>`)
  }
  if (p.arrow === 'both') {
    parts.push(`  <polygon points="${f(svgLeft - 10)},${f(svgMid)} ${f(svgLeft - 2)},${f(svgMid - 4)} ${f(svgLeft - 2)},${f(svgMid + 4)}" fill="black"/>`)
  }

  return svgWrap(parts.join('\n'))
}

function renderVectorParallelogram(p: VectorParallelogramParams): string {
  const style = p.style ?? 'parallelogram'
  const lbls = p.point_labels ?? ['O', 'A', 'B', 'C']

  // O at bottom-left, A at bottom-right, C at top-left, B at top-right
  const O: [number, number] = [110, 300]
  const A: [number, number] = [290, 300]
  const C: [number, number] = [160, 130]
  const B: [number, number] = [340, 130]

  const parts: string[] = []

  if (style === 'triangle') {
    parts.push(seg(O[0], O[1], A[0], A[1]))  // OA
    parts.push(seg(O[0], O[1], C[0], C[1]))  // OC
    parts.push(seg(A[0], A[1], C[0], C[1]))  // AC
    // Vector labels
    const vaMid = perp(O, A, -14)
    const vcMid = perp(O, C, 14)
    if (p.vec_a_label) parts.push(sideLabel(p.vec_a_label, vaMid[0], vaMid[1]))
    if (p.vec_b_label) parts.push(sideLabel(p.vec_b_label, vcMid[0], vcMid[1]))
  } else {
    // Parallelogram OA B C
    parts.push(seg(O[0], O[1], A[0], A[1]))  // OA (bottom)
    parts.push(seg(O[0], O[1], C[0], C[1]))  // OC (left)
    parts.push(seg(A[0], A[1], B[0], B[1]))  // AB (right)
    parts.push(seg(C[0], C[1], B[0], B[1]))  // CB (top)

    const vaMid = perp(O, A, -14)
    const vcMid = perp(O, C, 14)
    if (p.vec_a_label) parts.push(sideLabel(p.vec_a_label, vaMid[0], vaMid[1]))
    if (p.vec_b_label) parts.push(sideLabel(p.vec_b_label, vcMid[0], vcMid[1]))
  }

  // Diagonal
  if (p.show_diagonal) {
    parts.push(seg(O[0], O[1], B[0], B[1]))
    if (p.diagonal_label) {
      const lp = perp(O, B, 16)
      parts.push(sideLabel(p.diagonal_label, lp[0], lp[1]))
    }
  }

  // Vector arrows (small arrowhead at midpoint of each side)
  const arrowAt = (from: [number, number], to: [number, number]) => {
    const mx = (from[0] + to[0]) / 2, my = (from[1] + to[1]) / 2
    const dx = to[0] - from[0], dy = to[1] - from[1]
    const len = Math.sqrt(dx * dx + dy * dy)
    const ux = (dx / len) * 8, uy = (dy / len) * 8
    const px = (-dy / len) * 4, py = (dx / len) * 4
    return `  <polygon points="${f(mx + ux)},${f(my + uy)} ${f(mx - ux + px)},${f(my - uy + py)} ${f(mx - ux - px)},${f(my - uy - py)}" fill="black"/>`
  }
  parts.push(arrowAt(O, A))
  parts.push(arrowAt(O, C))

  // Point labels
  const vertices = style === 'triangle' ? [O, A, C] : [O, A, C, B]
  const offsets: Array<[number, number]> = [[-18, 18], [14, 18], [-18, -10], [14, -10]]
  vertices.forEach((v, i) => {
    if (lbls[i]) parts.push(ptLabel(lbls[i], v[0] + (offsets[i]?.[0] ?? 0), v[1] + (offsets[i]?.[1] ?? 0)))
  })

  return svgWrap(parts.join('\n'))
}

function renderScatterPlot(p: ScatterPlotParams): string {
  const pts = p.points
  if (!pts.length) return svgWrap('')

  const xVals = pts.map(pt => pt[0])
  const yVals = pts.map(pt => pt[1])
  const xMin = p.x_range?.[0] ?? Math.min(...xVals)
  const xMax = p.x_range?.[1] ?? Math.max(...xVals)
  const yMin = p.y_range?.[0] ?? Math.min(...yVals)
  const yMax = p.y_range?.[1] ?? Math.max(...yVals)

  const xPad = (xMax - xMin) * 0.1 || 1
  const yPad = (yMax - yMin) * 0.1 || 1
  const effectiveXMin = xMin - xPad, effectiveXMax = xMax + xPad
  const effectiveYMin = yMin - yPad, effectiveYMax = yMax + yPad

  const svgLeft = 70, svgRight = 360, svgTop = 60, svgBottom = 330
  const toSvgX = (x: number) => svgLeft + ((x - effectiveXMin) / (effectiveXMax - effectiveXMin)) * (svgRight - svgLeft)
  const toSvgY = (y: number) => svgBottom - ((y - effectiveYMin) / (effectiveYMax - effectiveYMin)) * (svgBottom - svgTop)

  const parts: string[] = []
  parts.push(seg(svgLeft, svgBottom, svgRight + 10, svgBottom))
  parts.push(seg(svgLeft, svgBottom, svgLeft, svgTop - 10))
  parts.push(sideLabel(p.x_label ?? '', (svgLeft + svgRight) / 2, svgBottom + 28))
  parts.push(sideLabel(p.y_label ?? '', svgLeft - 50, (svgTop + svgBottom) / 2))

  for (const [x, y] of pts) {
    const sx = toSvgX(x), sy = toSvgY(y)
    parts.push(`  <line x1="${f(sx - 4)}" y1="${f(sy)}" x2="${f(sx + 4)}" y2="${f(sy)}" stroke="black" stroke-width="1.5"/>`)
    parts.push(`  <line x1="${f(sx)}" y1="${f(sy - 4)}" x2="${f(sx)}" y2="${f(sy + 4)}" stroke="black" stroke-width="1.5"/>`)
  }

  if (p.line_of_best_fit && pts.length > 1) {
    // Simple least squares
    const n = pts.length
    const sumX = pts.reduce((s, [x]) => s + x, 0)
    const sumY = pts.reduce((s, [, y]) => s + y, 0)
    const sumXY = pts.reduce((s, [x, y]) => s + x * y, 0)
    const sumX2 = pts.reduce((s, [x]) => s + x * x, 0)
    const m = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    const c = (sumY - m * sumX) / n
    const lbfFn = (x: number) => m * x + c
    parts.push(seg(toSvgX(effectiveXMin), toSvgY(lbfFn(effectiveXMin)), toSvgX(effectiveXMax), toSvgY(lbfFn(effectiveXMax))))
  }

  return svgWrap(parts.join('\n'))
}

function renderBarChart(p: BarChartParams): string {
  const bars = p.bars
  if (!bars.length) return svgWrap('')

  const maxVal = Math.max(...bars.map(b => b.value))
  const svgLeft = 70, svgRight = 360, svgTop = 60, svgBottom = 320
  const barW = (svgRight - svgLeft) / bars.length - 4
  const toSvgY = (v: number) => svgBottom - (v / (maxVal * 1.15)) * (svgBottom - svgTop)

  const parts: string[] = []
  parts.push(seg(svgLeft, svgBottom, svgRight + 10, svgBottom))
  parts.push(seg(svgLeft, svgBottom, svgLeft, svgTop - 10))
  parts.push(sideLabel(p.y_label ?? '', svgLeft - 50, (svgTop + svgBottom) / 2))
  parts.push(sideLabel(p.x_label ?? '', (svgLeft + svgRight) / 2, svgBottom + 30))

  bars.forEach((bar, i) => {
    const bx = svgLeft + i * ((svgRight - svgLeft) / bars.length) + 2
    const by = toSvgY(bar.value)
    parts.push(`  <rect x="${f(bx)}" y="${f(by)}" width="${f(barW)}" height="${f(svgBottom - by)}" fill="none" stroke="black" stroke-width="1"/>`)
    parts.push(smallLabel(bar.label, bx + barW / 2, svgBottom + 14))
  })

  // Y-axis ticks
  for (let i = 1; i <= 5; i++) {
    const v = (maxVal * 1.15) * i / 5
    const ty = toSvgY(v)
    parts.push(seg(svgLeft - 4, ty, svgLeft, ty))
    parts.push(smallLabel(f(v), svgLeft - 8, ty + 3, 'end'))
  }

  return svgWrap(parts.join('\n'))
}

// ─────────────────────────────────────────────
// Dispatcher
// ─────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cast = <T>(v: unknown): T => v as any as T

export function renderDiagram(type: string, params: unknown): string {
  switch (type as DiagramType) {
    case 'right_triangle':          return renderRightTriangle(cast<RightTriangleParams>(params))
    case 'general_triangle':        return renderGeneralTriangle(cast<GeneralTriangleParams>(params))
    case 'quadratic_curve':         return renderQuadraticCurve(cast<QuadraticCurveParams>(params))
    case 'straight_line':           return renderStraightLine(cast<StraightLineParams>(params))
    case 'circle':                  return renderCircle(cast<CircleParams>(params))
    case 'sector':                  return renderSector(cast<SectorParams>(params))
    case 'histogram':               return renderHistogram(cast<HistogramParams>(params))
    case 'box_plot':                return renderBoxPlot(cast<BoxPlotParams>(params))
    case 'cumulative_frequency':    return renderCumulativeFrequency(cast<CumulativeFrequencyParams>(params))
    case 'venn_2':                  return renderVenn2(cast<Venn2Params>(params))
    case 'tree_diagram':            return renderTreeDiagram(cast<TreeDiagramParams>(params))
    case 'number_line':             return renderNumberLine(cast<NumberLineParams>(params))
    case 'vector_parallelogram':    return renderVectorParallelogram(cast<VectorParallelogramParams>(params))
    case 'scatter_plot':            return renderScatterPlot(cast<ScatterPlotParams>(params))
    case 'bar_chart':               return renderBarChart(cast<BarChartParams>(params))
    default:
      throw new Error(`Unknown diagram type: "${type}"`)
  }
}

// ─────────────────────────────────────────────
// Sub-topic → template mapping
// ─────────────────────────────────────────────

const SUBTOPIC_TEMPLATE: Record<string, DiagramType> = {
  // Geometry & Trigonometry
  "Pythagoras' Theorem": 'right_triangle',
  'Pythagoras Theorem': 'right_triangle',
  'Trigonometry in Right-Angled Triangles': 'right_triangle',
  'Right-angled trigonometry': 'right_triangle',
  'Sine Rule': 'general_triangle',
  'Cosine Rule': 'general_triangle',
  'Area of a Triangle': 'general_triangle',
  'Circle Theorems': 'circle',
  'Arc Length and Sector Area': 'sector',
  'Sectors and Arc Length': 'sector',
  // Coordinate Geometry / Algebra
  'Quadratic Graphs': 'quadratic_curve',
  'Graph Sketching': 'quadratic_curve',
  'Transformations of Graphs': 'quadratic_curve',
  'Straight Line Graphs': 'straight_line',
  'Linear Graphs': 'straight_line',
  'Graphical Solutions': 'straight_line',
  // Vectors
  'Vectors (Basic)': 'vector_parallelogram',
  'Vectors (Advanced)': 'vector_parallelogram',
  'Vector addition': 'vector_parallelogram',
  'Position vectors': 'vector_parallelogram',
  // Statistics
  'Histograms': 'histogram',
  'Box Plots': 'box_plot',
  'Cumulative Frequency': 'cumulative_frequency',
  'Scatter Graphs & Correlation': 'scatter_plot',
  'Scatter Graphs': 'scatter_plot',
  'Bar Charts': 'bar_chart',
  // Probability
  'Venn Diagrams': 'venn_2',
  'Tree Diagrams': 'tree_diagram',
}

/** Returns the preferred diagram template type for a given sub-topic, or null if no mapping. */
export function getTemplateForSubtopic(subTopicName: string): DiagramType | null {
  return SUBTOPIC_TEMPLATE[subTopicName] ?? null
}

// ─────────────────────────────────────────────
// System prompt fragment describing templates
// (embedded by the generation route)
// ─────────────────────────────────────────────

export const DIAGRAM_TEMPLATE_SPEC = `DIAGRAM GENERATION — use the "diagram" JSON field:
{
  "diagram": {
    "type": "<template_name>",
    "params": { ... }
  }
}

Available templates and their params (all fields optional unless marked *required):

right_triangle: { label_a, label_b, label_c, side_ab, side_bc, side_ac, angle_a, angle_c }
  — right angle is always at B (bottom-left). Use side_ac for hypotenuse label.

general_triangle: { style("acute"|"obtuse"|"isosceles"), label_a, label_b, label_c, side_ab, side_bc, side_ac, angle_a, angle_b, angle_c }

quadratic_curve: { a* (required, number), b, c, roots([x1,x2]), x_range([min,max]), shade_region([x1,x2]), x_label, y_label, curve_label }

straight_line: { m* (required, gradient), c(y-intercept), label, second_line({m,c,label}), x_range([min,max]), show_intercepts }

circle: { radius_label, center_label, chord(bool), chord_label, tangent(bool), tangent_label, point_labels(["A","B",...]), diameter(bool) }

sector: { angle_degrees* (required), radius_label, arc_label, angle_label, center_label }

histogram: { bars* (required, [{x_start,x_end,freq_density},...]), x_label, y_label }

box_plot: { min*, q1*, median*, q3*, max* (all required, numbers), unit, scale_label }

cumulative_frequency: { points* (required, [[x,y],...]), x_label, y_label, max_freq }

venn_2: { set_a_label, set_b_label, region_a, region_ab, region_b, region_outside, universal(bool), universal_label }

tree_diagram: { branches* (required, [{label,prob,children:[{label,prob}]},...]), first_label, second_label }

number_line: { min*, max* (required), points([{value,label,filled(bool)},...]), arrow("left"|"right"|"both"|"none") }

vector_parallelogram: { vec_a_label, vec_b_label, point_labels(["O","A","B","C"]), show_diagonal(bool), diagonal_label, style("parallelogram"|"triangle") }

scatter_plot: { points* (required, [[x,y],...]), x_label, y_label, x_range, y_range, line_of_best_fit(bool) }

bar_chart: { bars* (required, [{label,value},...]), y_label, x_label }`
