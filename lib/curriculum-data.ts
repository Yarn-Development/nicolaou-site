/**
 * UK Mathematics Curriculum Taxonomy
 * Hierarchical structure: Level -> Topic -> Sub-Topic
 * Based on UK National Curriculum (KS3, GCSE, A-Level)
 */

export type CurriculumLevel = 
  | 'KS3'
  | 'GCSE Foundation'
  | 'GCSE Higher'
  | 'A-Level Pure'
  | 'A-Level Statistics'
  | 'A-Level Mechanics'

export type QuestionType = 'Fluency' | 'Problem Solving' | 'Reasoning/Proof'

export interface SubTopic {
  id: string
  name: string
  description?: string
}

export interface Topic {
  id: string
  name: string
  subTopics: SubTopic[]
}

export const CURRICULUM_DATA: Record<CurriculumLevel, Topic[]> = {
  'KS3': [
    {
      id: 'ks3-number',
      name: 'Number',
      subTopics: [
        { id: 'place-value', name: 'Place Value & Ordering' },
        { id: 'four-operations', name: 'Four Operations' },
        { id: 'fractions-decimals', name: 'Fractions, Decimals & Percentages' },
        { id: 'ratio-proportion', name: 'Ratio & Proportion' },
        { id: 'powers-roots', name: 'Powers & Roots' },
        { id: 'factors-multiples', name: 'Factors, Multiples & Primes' },
      ]
    },
    {
      id: 'ks3-algebra',
      name: 'Algebra',
      subTopics: [
        { id: 'expressions', name: 'Algebraic Expressions' },
        { id: 'equations', name: 'Solving Equations' },
        { id: 'sequences', name: 'Sequences' },
        { id: 'formulae', name: 'Using Formulae' },
        { id: 'inequalities', name: 'Inequalities' },
        { id: 'graphs', name: 'Linear Graphs' },
      ]
    },
    {
      id: 'ks3-geometry',
      name: 'Geometry & Measures',
      subTopics: [
        { id: 'angles', name: 'Angles' },
        { id: 'properties-shapes', name: 'Properties of Shapes' },
        { id: 'perimeter-area', name: 'Perimeter & Area' },
        { id: 'transformations', name: 'Transformations' },
        { id: 'constructions', name: 'Constructions' },
        { id: 'pythagoras', name: 'Pythagoras\' Theorem' },
      ]
    },
    {
      id: 'ks3-statistics',
      name: 'Statistics',
      subTopics: [
        { id: 'data-collection', name: 'Data Collection' },
        { id: 'averages', name: 'Averages & Range' },
        { id: 'charts-graphs', name: 'Charts & Graphs' },
        { id: 'probability-basics', name: 'Introduction to Probability' },
      ]
    },
  ],
  
  'GCSE Foundation': [
    {
      id: 'gcse-f-number',
      name: 'Number',
      subTopics: [
        { id: 'calculations', name: 'Calculations & Estimation' },
        { id: 'fractions-decimals-perc', name: 'Fractions, Decimals & Percentages' },
        { id: 'ratio-proportion', name: 'Ratio & Proportion' },
        { id: 'percentages-change', name: 'Percentage Change' },
        { id: 'standard-form', name: 'Standard Form' },
        { id: 'surds-indices', name: 'Surds & Indices (Basic)' },
      ]
    },
    {
      id: 'gcse-f-algebra',
      name: 'Algebra',
      subTopics: [
        { id: 'expand-factorise', name: 'Expanding & Factorising' },
        { id: 'linear-equations', name: 'Solving Linear Equations' },
        { id: 'sequences-nth-term', name: 'Sequences & nth Term' },
        { id: 'simultaneous-linear', name: 'Simultaneous Equations (Linear)' },
        { id: 'inequalities', name: 'Inequalities' },
        { id: 'straight-line-graphs', name: 'Straight Line Graphs' },
        { id: 'quadratic-graphs', name: 'Quadratic Graphs' },
      ]
    },
    {
      id: 'gcse-f-geometry',
      name: 'Geometry & Measures',
      subTopics: [
        { id: 'angles-properties', name: 'Angles & Properties of Shapes' },
        { id: 'perimeter-area-vol', name: 'Perimeter, Area & Volume' },
        { id: 'pythagoras', name: 'Pythagoras\' Theorem' },
        { id: 'trigonometry-basic', name: 'Basic Trigonometry (SOH CAH TOA)' },
        { id: 'transformations', name: 'Transformations' },
        { id: 'constructions-loci', name: 'Constructions & Loci' },
        { id: 'vectors-basic', name: 'Vectors (Basic)' },
      ]
    },
    {
      id: 'gcse-f-probability',
      name: 'Probability',
      subTopics: [
        { id: 'probability-basics', name: 'Probability Basics' },
        { id: 'listing-outcomes', name: 'Listing Outcomes' },
        { id: 'probability-diagrams', name: 'Probability Diagrams' },
        { id: 'relative-frequency', name: 'Relative Frequency' },
      ]
    },
    {
      id: 'gcse-f-statistics',
      name: 'Statistics',
      subTopics: [
        { id: 'averages-range', name: 'Averages & Range' },
        { id: 'charts-graphs', name: 'Charts & Graphs' },
        { id: 'scatter-graphs', name: 'Scatter Graphs & Correlation' },
        { id: 'time-series', name: 'Time Series' },
      ]
    },
  ],
  
  'GCSE Higher': [
    {
      id: 'gcse-h-number',
      name: 'Number',
      subTopics: [
        { id: 'calculations-bounds', name: 'Calculations & Bounds' },
        { id: 'surds', name: 'Surds' },
        { id: 'indices-laws', name: 'Laws of Indices' },
        { id: 'standard-form-calc', name: 'Standard Form Calculations' },
        { id: 'fractional-indices', name: 'Fractional & Negative Indices' },
        { id: 'recurring-decimals', name: 'Recurring Decimals to Fractions' },
      ]
    },
    {
      id: 'gcse-h-algebra',
      name: 'Algebra',
      subTopics: [
        { id: 'expand-factorise-adv', name: 'Expanding & Factorising (Advanced)' },
        { id: 'quadratic-equations', name: 'Solving Quadratic Equations' },
        { id: 'completing-square', name: 'Completing the Square' },
        { id: 'quadratic-formula', name: 'Quadratic Formula' },
        { id: 'simultaneous-equations', name: 'Simultaneous Equations (Linear/Quadratic)' },
        { id: 'inequalities-quadratic', name: 'Quadratic Inequalities' },
        { id: 'algebraic-proof', name: 'Algebraic Proof' },
        { id: 'functions', name: 'Functions' },
        { id: 'iteration', name: 'Iteration' },
        { id: 'graphical-solutions', name: 'Graphical Solutions' },
        { id: 'algebraic-fractions', name: 'Algebraic Fractions' },
      ]
    },
    {
      id: 'gcse-h-geometry',
      name: 'Geometry & Measures',
      subTopics: [
        { id: 'circle-theorems', name: 'Circle Theorems' },
        { id: 'pythagoras-3d', name: 'Pythagoras in 3D' },
        { id: 'trigonometry-adv', name: 'Advanced Trigonometry' },
        { id: 'sine-cosine-rules', name: 'Sine & Cosine Rules' },
        { id: 'vectors-advanced', name: 'Vectors (Advanced)' },
        { id: 'transformations-adv', name: 'Combined Transformations' },
        { id: 'similar-shapes', name: 'Similar Shapes & Enlargement' },
        { id: 'congruence', name: 'Congruence & Proofs' },
      ]
    },
    {
      id: 'gcse-h-probability',
      name: 'Probability',
      subTopics: [
        { id: 'tree-diagrams', name: 'Tree Diagrams' },
        { id: 'conditional-probability', name: 'Conditional Probability' },
        { id: 'venn-diagrams', name: 'Venn Diagrams' },
        { id: 'set-notation', name: 'Set Notation' },
      ]
    },
    {
      id: 'gcse-h-statistics',
      name: 'Statistics',
      subTopics: [
        { id: 'cumulative-frequency', name: 'Cumulative Frequency' },
        { id: 'box-plots', name: 'Box Plots' },
        { id: 'histograms', name: 'Histograms' },
        { id: 'sampling', name: 'Sampling Methods' },
      ]
    },
    {
      id: 'gcse-h-ratio-proportion',
      name: 'Ratio & Proportion',
      subTopics: [
        { id: 'direct-proportion', name: 'Direct Proportion' },
        { id: 'inverse-proportion', name: 'Inverse Proportion' },
        { id: 'compound-measures', name: 'Compound Measures' },
        { id: 'growth-decay', name: 'Exponential Growth & Decay' },
      ]
    },
  ],
  
  'A-Level Pure': [
    {
      id: 'alevel-p-algebra',
      name: 'Algebra & Functions',
      subTopics: [
        { id: 'algebraic-division', name: 'Algebraic Division' },
        { id: 'factor-theorem', name: 'Factor Theorem' },
        { id: 'partial-fractions', name: 'Partial Fractions' },
        { id: 'functions-composite', name: 'Composite & Inverse Functions' },
        { id: 'modulus-functions', name: 'Modulus Functions' },
        { id: 'transformations-graphs', name: 'Transformations of Graphs' },
        { id: 'inequalities-adv', name: 'Advanced Inequalities' },
      ]
    },
    {
      id: 'alevel-p-coordinate-geometry',
      name: 'Coordinate Geometry',
      subTopics: [
        { id: 'straight-lines', name: 'Straight Lines' },
        { id: 'circles', name: 'Circles' },
        { id: 'parametric-equations', name: 'Parametric Equations' },
        { id: 'coordinate-geometry-3d', name: '3D Coordinate Geometry' },
      ]
    },
    {
      id: 'alevel-p-sequences-series',
      name: 'Sequences & Series',
      subTopics: [
        { id: 'arithmetic-sequences', name: 'Arithmetic Sequences' },
        { id: 'geometric-sequences', name: 'Geometric Sequences' },
        { id: 'binomial-expansion', name: 'Binomial Expansion' },
        { id: 'sigma-notation', name: 'Sigma Notation' },
        { id: 'recurrence-relations', name: 'Recurrence Relations' },
      ]
    },
    {
      id: 'alevel-p-trigonometry',
      name: 'Trigonometry',
      subTopics: [
        { id: 'trig-identities', name: 'Trigonometric Identities' },
        { id: 'trig-equations', name: 'Solving Trigonometric Equations' },
        { id: 'addition-formulae', name: 'Addition Formulae' },
        { id: 'double-angle', name: 'Double Angle Formulae' },
        { id: 'r-alpha-form', name: 'R-Alpha (a cos θ + b sin θ) Form' },
        { id: 'small-angle-approx', name: 'Small Angle Approximations' },
      ]
    },
    {
      id: 'alevel-p-exponentials-logs',
      name: 'Exponentials & Logarithms',
      subTopics: [
        { id: 'exponential-functions', name: 'Exponential Functions' },
        { id: 'logarithms', name: 'Logarithms & Laws' },
        { id: 'exponential-modelling', name: 'Exponential Modelling' },
        { id: 'natural-log', name: 'Natural Logarithms' },
      ]
    },
    {
      id: 'alevel-p-differentiation',
      name: 'Differentiation',
      subTopics: [
        { id: 'basic-differentiation', name: 'Basic Differentiation' },
        { id: 'chain-rule', name: 'Chain Rule' },
        { id: 'product-rule', name: 'Product Rule' },
        { id: 'quotient-rule', name: 'Quotient Rule' },
        { id: 'implicit-differentiation', name: 'Implicit Differentiation' },
        { id: 'parametric-differentiation', name: 'Parametric Differentiation' },
        { id: 'rates-of-change', name: 'Rates of Change' },
        { id: 'second-derivatives', name: 'Second Derivatives' },
      ]
    },
    {
      id: 'alevel-p-integration',
      name: 'Integration',
      subTopics: [
        { id: 'basic-integration', name: 'Basic Integration' },
        { id: 'integration-substitution', name: 'Integration by Substitution' },
        { id: 'integration-parts', name: 'Integration by Parts' },
        { id: 'partial-fractions-integration', name: 'Partial Fractions in Integration' },
        { id: 'definite-integration', name: 'Definite Integration' },
        { id: 'area-under-curve', name: 'Area Under a Curve' },
        { id: 'trapezium-rule', name: 'Trapezium Rule' },
        { id: 'differential-equations', name: 'Differential Equations' },
      ]
    },
    {
      id: 'alevel-p-vectors',
      name: 'Vectors',
      subTopics: [
        { id: 'vector-basics', name: 'Vector Basics (2D & 3D)' },
        { id: 'scalar-product', name: 'Scalar (Dot) Product' },
        { id: 'vector-equations-lines', name: 'Vector Equations of Lines' },
        { id: 'intersecting-lines', name: 'Intersecting Lines' },
        { id: 'vector-proofs', name: 'Vector Proofs' },
      ]
    },
  ],
  
  'A-Level Statistics': [
    {
      id: 'alevel-s-data',
      name: 'Statistical Sampling',
      subTopics: [
        { id: 'sampling-methods', name: 'Sampling Methods' },
        { id: 'population-sample', name: 'Population & Sample' },
        { id: 'bias', name: 'Bias in Sampling' },
      ]
    },
    {
      id: 'alevel-s-representation',
      name: 'Data Representation',
      subTopics: [
        { id: 'histograms-adv', name: 'Histograms (Advanced)' },
        { id: 'box-plots-adv', name: 'Box Plots & Outliers' },
        { id: 'cumulative-frequency-adv', name: 'Cumulative Frequency' },
        { id: 'cleaning-data', name: 'Cleaning Data' },
      ]
    },
    {
      id: 'alevel-s-measures',
      name: 'Measures of Location & Spread',
      subTopics: [
        { id: 'mean-median-mode', name: 'Mean, Median, Mode' },
        { id: 'standard-deviation', name: 'Standard Deviation & Variance' },
        { id: 'quartiles-percentiles', name: 'Quartiles & Percentiles' },
        { id: 'coding', name: 'Coding (Linear Transformations)' },
      ]
    },
    {
      id: 'alevel-s-correlation',
      name: 'Correlation & Regression',
      subTopics: [
        { id: 'scatter-diagrams', name: 'Scatter Diagrams' },
        { id: 'correlation-coefficient', name: 'Product Moment Correlation Coefficient' },
        { id: 'regression-lines', name: 'Regression Lines' },
        { id: 'residuals', name: 'Residuals' },
      ]
    },
    {
      id: 'alevel-s-probability',
      name: 'Probability',
      subTopics: [
        { id: 'venn-diagrams-adv', name: 'Venn Diagrams (Advanced)' },
        { id: 'tree-diagrams-adv', name: 'Tree Diagrams' },
        { id: 'conditional-probability-adv', name: 'Conditional Probability' },
        { id: 'probability-distributions', name: 'Probability Distributions' },
      ]
    },
    {
      id: 'alevel-s-distributions',
      name: 'Statistical Distributions',
      subTopics: [
        { id: 'binomial-distribution', name: 'Binomial Distribution' },
        { id: 'normal-distribution', name: 'Normal Distribution' },
        { id: 'hypothesis-testing', name: 'Hypothesis Testing' },
        { id: 'correlation-testing', name: 'Correlation Testing' },
      ]
    },
  ],
  
  'A-Level Mechanics': [
    {
      id: 'alevel-m-kinematics',
      name: 'Kinematics',
      subTopics: [
        { id: 'displacement-velocity', name: 'Displacement, Velocity & Acceleration' },
        { id: 'suvat-equations', name: 'SUVAT Equations' },
        { id: 'vertical-motion', name: 'Vertical Motion Under Gravity' },
        { id: 'projectiles', name: 'Projectile Motion' },
        { id: 'variable-acceleration', name: 'Variable Acceleration' },
      ]
    },
    {
      id: 'alevel-m-forces',
      name: 'Forces & Newton\'s Laws',
      subTopics: [
        { id: 'newtons-laws', name: 'Newton\'s Laws of Motion' },
        { id: 'resolving-forces', name: 'Resolving Forces' },
        { id: 'friction', name: 'Friction' },
        { id: 'connected-particles', name: 'Connected Particles' },
        { id: 'equilibrium', name: 'Static Equilibrium' },
      ]
    },
    {
      id: 'alevel-m-momentum',
      name: 'Momentum & Impulse',
      subTopics: [
        { id: 'momentum-conservation', name: 'Conservation of Momentum' },
        { id: 'impulse', name: 'Impulse' },
        { id: 'collisions', name: 'Collisions' },
        { id: 'coefficient-restitution', name: 'Coefficient of Restitution' },
      ]
    },
    {
      id: 'alevel-m-moments',
      name: 'Moments',
      subTopics: [
        { id: 'moments-basics', name: 'Moments of Forces' },
        { id: 'centre-of-mass', name: 'Centre of Mass' },
        { id: 'rigid-bodies', name: 'Rigid Bodies in Equilibrium' },
        { id: 'toppling', name: 'Toppling & Sliding' },
      ]
    },
  ],
}

export const QUESTION_TYPES: QuestionType[] = ['Fluency', 'Problem Solving', 'Reasoning/Proof']

export const CALCULATOR_OPTIONS = [
  { value: 'allowed', label: 'Calculator Allowed' },
  { value: 'not-allowed', label: 'Non-Calculator' },
] as const

// Helper function to get topics for a level
export function getTopicsForLevel(level: CurriculumLevel): Topic[] {
  return CURRICULUM_DATA[level] || []
}

// Helper function to get sub-topics for a topic
export function getSubTopicsForTopic(level: CurriculumLevel, topicId: string): SubTopic[] {
  const topics = CURRICULUM_DATA[level]
  const topic = topics?.find(t => t.id === topicId)
  return topic?.subTopics || []
}

// Helper to get all levels
export function getAllLevels(): CurriculumLevel[] {
  return ['KS3', 'GCSE Foundation', 'GCSE Higher', 'A-Level Pure', 'A-Level Statistics', 'A-Level Mechanics']
}
