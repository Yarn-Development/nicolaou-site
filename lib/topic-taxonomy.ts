/**
 * GCSE Mathematics Topic Taxonomy
 * 
 * This file contains the complete topic/sub-topic taxonomy used across the application.
 * It matches the Question Bank taxonomy and is used for:
 * - Question creation
 * - External paper mapping
 * - Filtering in question bank
 * - Feedback generation
 */

export type CurriculumLevel = "GCSE Foundation" | "GCSE Higher"

export interface SubTopic {
  name: string
  description?: string
}

export interface Topic {
  name: string
  subTopics: SubTopic[]
}

export interface Subject {
  name: string
  levels: CurriculumLevel[]
  topics: Topic[]
}

// =====================================================
// GCSE Mathematics Taxonomy
// =====================================================

export const gcseMathsTopics: Topic[] = [
  {
    name: "Number",
    subTopics: [
      { name: "Place Value", description: "Understanding place value in integers and decimals" },
      { name: "Ordering Numbers", description: "Comparing and ordering integers, decimals, fractions" },
      { name: "Factors and Multiples", description: "HCF, LCM, prime factorisation" },
      { name: "Negative Numbers", description: "Operations with negative numbers" },
      { name: "Powers and Roots", description: "Squares, cubes, square roots, cube roots" },
      { name: "Fractions", description: "Operations with fractions, mixed numbers" },
      { name: "Decimals", description: "Operations with decimals, rounding" },
      { name: "Percentages", description: "Percentage calculations, increase/decrease" },
      { name: "Ratio", description: "Simplifying ratios, sharing in a ratio" },
      { name: "Proportion", description: "Direct and inverse proportion" },
      { name: "Standard Form", description: "Standard form calculations" },
      { name: "Bounds", description: "Upper and lower bounds, error intervals" },
      { name: "Surds", description: "Simplifying and rationalising surds" },
      { name: "Indices", description: "Laws of indices, negative and fractional indices" },
    ],
  },
  {
    name: "Algebra",
    subTopics: [
      { name: "Expressions", description: "Simplifying algebraic expressions" },
      { name: "Substitution", description: "Substituting values into expressions" },
      { name: "Expanding Brackets", description: "Single and double brackets" },
      { name: "Factorising", description: "Factorising expressions, difference of squares" },
      { name: "Linear Equations", description: "Solving linear equations" },
      { name: "Linear Inequalities", description: "Solving and representing inequalities" },
      { name: "Formulae", description: "Rearranging and using formulae" },
      { name: "Sequences", description: "Arithmetic and geometric sequences, nth term" },
      { name: "Linear Graphs", description: "Plotting and interpreting linear graphs" },
      { name: "Coordinates", description: "Working with coordinates, midpoints, distance" },
      { name: "Quadratic Equations", description: "Solving quadratics by factorising, formula, completing the square" },
      { name: "Quadratic Graphs", description: "Plotting and interpreting parabolas" },
      { name: "Simultaneous Equations", description: "Linear and linear-quadratic simultaneous equations" },
      { name: "Algebraic Fractions", description: "Simplifying and operating with algebraic fractions" },
      { name: "Functions", description: "Function notation, composite and inverse functions" },
      { name: "Iteration", description: "Iterative methods for solving equations" },
      { name: "Proof", description: "Algebraic proof" },
    ],
  },
  {
    name: "Geometry & Measures",
    subTopics: [
      { name: "Angles", description: "Angle facts, parallel lines, polygons" },
      { name: "Properties of Shapes", description: "Properties of 2D shapes" },
      { name: "Perimeter", description: "Perimeter of 2D shapes" },
      { name: "Area", description: "Area of rectangles, triangles, parallelograms, trapeziums, circles" },
      { name: "Volume", description: "Volume of prisms, cylinders, cones, spheres" },
      { name: "Surface Area", description: "Surface area of 3D shapes" },
      { name: "Transformations", description: "Reflection, rotation, translation, enlargement" },
      { name: "Congruence", description: "Congruent triangles and shapes" },
      { name: "Similarity", description: "Similar shapes, scale factors, length/area/volume" },
      { name: "Pythagoras Theorem", description: "Finding sides in right-angled triangles" },
      { name: "Trigonometry", description: "SOHCAHTOA, sine/cosine rules" },
      { name: "Trigonometry Graphs", description: "Graphs of sin, cos, tan" },
      { name: "Bearings", description: "Three-figure bearings" },
      { name: "Constructions", description: "Compass and straightedge constructions" },
      { name: "Loci", description: "Locus problems" },
      { name: "Circle Theorems", description: "Angles in circles, tangent properties" },
      { name: "Vectors", description: "Vector notation, addition, scalar multiplication" },
      { name: "Units and Measures", description: "Converting units, compound measures" },
    ],
  },
  {
    name: "Statistics",
    subTopics: [
      { name: "Data Collection", description: "Sampling methods, questionnaires" },
      { name: "Representing Data", description: "Bar charts, pie charts, pictograms" },
      { name: "Averages", description: "Mean, median, mode, range" },
      { name: "Frequency Tables", description: "Grouped and ungrouped frequency tables" },
      { name: "Cumulative Frequency", description: "Cumulative frequency diagrams, box plots" },
      { name: "Histograms", description: "Drawing and interpreting histograms" },
      { name: "Scatter Graphs", description: "Correlation, lines of best fit" },
      { name: "Time Series", description: "Time series graphs, trends" },
      { name: "Comparing Distributions", description: "Comparing data sets using statistics" },
    ],
  },
  {
    name: "Probability",
    subTopics: [
      { name: "Basic Probability", description: "Probability scale, single events" },
      { name: "Experimental Probability", description: "Relative frequency, expected outcomes" },
      { name: "Sample Spaces", description: "Listing outcomes, sample space diagrams" },
      { name: "Probability Trees", description: "Tree diagrams for combined events" },
      { name: "Venn Diagrams", description: "Venn diagrams and set notation" },
      { name: "Conditional Probability", description: "Dependent events, conditional probability" },
    ],
  },
]

// =====================================================
// Subject definitions
// =====================================================

export const subjects: Subject[] = [
  {
    name: "Mathematics",
    levels: ["GCSE Foundation", "GCSE Higher"],
    topics: gcseMathsTopics,
  },
]

// =====================================================
// Helper functions for taxonomy
// =====================================================

/**
 * Get all topic names for a subject
 */
export function getTopicNames(subjectName: string = "Mathematics"): string[] {
  const subject = subjects.find((s) => s.name === subjectName)
  return subject?.topics.map((t) => t.name) || []
}

/**
 * Get sub-topics for a given topic
 */
export function getSubTopicsForTopic(topicName: string, subjectName: string = "Mathematics"): string[] {
  const subject = subjects.find((s) => s.name === subjectName)
  const topic = subject?.topics.find((t) => t.name === topicName)
  return topic?.subTopics.map((st) => st.name) || []
}

/**
 * Get full topic structure for a subject
 */
export function getTopicStructure(subjectName: string = "Mathematics"): Topic[] {
  const subject = subjects.find((s) => s.name === subjectName)
  return subject?.topics || []
}

/**
 * Validate that a topic/sub-topic combination is valid
 */
export function isValidTopicCombination(
  topic: string,
  subTopic: string,
  subjectName: string = "Mathematics"
): boolean {
  const subTopics = getSubTopicsForTopic(topic, subjectName)
  return subTopics.includes(subTopic)
}

/**
 * Get topic from sub-topic name (for when we only have sub-topic)
 */
export function getTopicFromSubTopic(subTopicName: string, subjectName: string = "Mathematics"): string | null {
  const subject = subjects.find((s) => s.name === subjectName)
  if (!subject) return null

  for (const topic of subject.topics) {
    if (topic.subTopics.some((st) => st.name === subTopicName)) {
      return topic.name
    }
  }
  return null
}

/**
 * Build cascading dropdown data structure
 */
export interface CascadingOption {
  value: string
  label: string
  children?: CascadingOption[]
}

export function getCascadingTopicOptions(subjectName: string = "Mathematics"): CascadingOption[] {
  const subject = subjects.find((s) => s.name === subjectName)
  if (!subject) return []

  return subject.topics.map((topic) => ({
    value: topic.name,
    label: topic.name,
    children: topic.subTopics.map((st) => ({
      value: st.name,
      label: st.name,
    })),
  }))
}

/**
 * Flat list of all sub-topics for search/filtering
 */
export interface FlatSubTopic {
  topic: string
  subTopic: string
  fullPath: string
}

export function getFlatSubTopicList(subjectName: string = "Mathematics"): FlatSubTopic[] {
  const subject = subjects.find((s) => s.name === subjectName)
  if (!subject) return []

  const result: FlatSubTopic[] = []
  for (const topic of subject.topics) {
    for (const st of topic.subTopics) {
      result.push({
        topic: topic.name,
        subTopic: st.name,
        fullPath: `${topic.name} > ${st.name}`,
      })
    }
  }
  return result
}
