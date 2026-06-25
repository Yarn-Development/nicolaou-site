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

export type CurriculumLevel =
  | "GCSE Foundation"
  | "GCSE Higher"
  | "A Level"
  | "AS Level"
  | "IGCSE"
  | "IB SL"
  | "IB HL"

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
// A Level Mathematics Topics (Edexcel / AQA / OCR)
// =====================================================

export const aLevelMathsTopics: Topic[] = [
  {
    name: "Algebra and Functions",
    subTopics: [
      { name: "Algebraic Manipulation", description: "Expanding, factorising, completing the square" },
      { name: "Surds and Indices", description: "Laws of indices, surd form, rationalising" },
      { name: "Quadratic Functions", description: "Roots, discriminant, quadratic formula" },
      { name: "Simultaneous Equations", description: "Linear and quadratic simultaneous equations" },
      { name: "Inequalities", description: "Linear and quadratic inequalities, set notation" },
      { name: "Polynomials", description: "Factor theorem, remainder theorem, polynomial division" },
      { name: "Partial Fractions", description: "Decomposing rational expressions" },
      { name: "Functions and Mappings", description: "Domain, range, composite and inverse functions" },
      { name: "Modulus Function", description: "Graphs and equations involving |f(x)|" },
      { name: "Transformations of Graphs", description: "Translations, stretches, reflections of curves" },
    ],
  },
  {
    name: "Coordinate Geometry",
    subTopics: [
      { name: "Straight Lines", description: "Gradient, equations, parallel and perpendicular lines" },
      { name: "Circles", description: "Equation of a circle, tangent, chord bisector" },
      { name: "Parametric Equations", description: "Cartesian and parametric forms, sketching curves" },
    ],
  },
  {
    name: "Sequences and Series",
    subTopics: [
      { name: "Arithmetic Sequences", description: "nth term, sum of n terms (AP)" },
      { name: "Geometric Sequences", description: "Common ratio, sum to infinity (GP)" },
      { name: "Binomial Expansion", description: "Binomial theorem for positive integers and any n" },
      { name: "Sigma Notation", description: "Sigma notation and recurrence relations" },
    ],
  },
  {
    name: "Trigonometry",
    subTopics: [
      { name: "Trigonometric Ratios", description: "sin, cos, tan and exact values" },
      { name: "Graphs of Trigonometric Functions", description: "Sketching and transforming trig graphs" },
      { name: "Trigonometric Identities", description: "Pythagorean, double angle, compound angle formulae" },
      { name: "Solving Trigonometric Equations", description: "General solutions in radians and degrees" },
      { name: "Radians", description: "Arc length, sector area, small angle approximations" },
      { name: "Inverse Trigonometric Functions", description: "arcsin, arccos, arctan and their domains" },
    ],
  },
  {
    name: "Exponentials and Logarithms",
    subTopics: [
      { name: "Exponential Functions", description: "y = aˣ, y = eˣ and their graphs" },
      { name: "Logarithms", description: "Laws of logarithms, change of base" },
      { name: "Exponential Equations", description: "Solving equations using logs, modelling growth/decay" },
    ],
  },
  {
    name: "Differentiation",
    subTopics: [
      { name: "First Principles", description: "Definition of derivative as a limit" },
      { name: "Standard Derivatives", description: "Differentiating polynomials, eˣ, ln x, trig functions" },
      { name: "Chain Rule", description: "Differentiating composite functions" },
      { name: "Product and Quotient Rules", description: "Differentiating products and quotients" },
      { name: "Implicit Differentiation", description: "Differentiating implicit equations" },
      { name: "Parametric Differentiation", description: "dy/dx from parametric equations" },
      { name: "Applications of Differentiation", description: "Stationary points, optimization, rates of change" },
    ],
  },
  {
    name: "Integration",
    subTopics: [
      { name: "Standard Integrals", description: "Integrating polynomials, eˣ, trig functions" },
      { name: "Integration by Substitution", description: "Changing variable to simplify the integrand" },
      { name: "Integration by Parts", description: "Integrating products using the by-parts formula" },
      { name: "Partial Fractions in Integration", description: "Integrating rational functions via decomposition" },
      { name: "Definite Integrals", description: "Area under a curve, area between curves" },
      { name: "Differential Equations", description: "Separable variables, forming and solving DEs" },
      { name: "Trapezium Rule", description: "Numerical integration using the trapezium rule" },
    ],
  },
  {
    name: "Vectors",
    subTopics: [
      { name: "Vector Notation and Operations", description: "Column vectors, magnitude, addition, scalar multiplication" },
      { name: "Position Vectors", description: "Points as position vectors, displacement vectors" },
      { name: "3D Vectors", description: "Three-dimensional vector problems" },
    ],
  },
  {
    name: "Proof",
    subTopics: [
      { name: "Proof by Deduction", description: "Formal algebraic proof" },
      { name: "Proof by Contradiction", description: "Assuming negation and deriving contradiction" },
      { name: "Proof by Exhaustion", description: "Checking all cases" },
      { name: "Disproof by Counterexample", description: "Finding counterexamples" },
    ],
  },
  {
    name: "Statistics",
    subTopics: [
      { name: "Data Presentation and Interpretation", description: "Histograms, box plots, scatter diagrams, PMCC" },
      { name: "Statistical Distributions", description: "Binomial distribution, normal distribution" },
      { name: "Hypothesis Testing", description: "Null/alternative hypothesis, p-value, critical region" },
      { name: "Regression", description: "Regression lines, interpreting in context" },
      { name: "Probability", description: "Conditional probability, independence, tree diagrams" },
    ],
  },
  {
    name: "Mechanics",
    subTopics: [
      { name: "Kinematics", description: "Displacement, velocity, acceleration; SUVAT equations" },
      { name: "Forces and Newton's Laws", description: "Force diagrams, F=ma, connected particles" },
      { name: "Projectile Motion", description: "Horizontal and vertical components, trajectory" },
      { name: "Moments", description: "Turning effect, equilibrium of rigid bodies" },
      { name: "Friction", description: "Limiting equilibrium, coefficient of friction" },
      { name: "Variable Acceleration", description: "Using calculus with v(t) and s(t)" },
    ],
  },
]

// =====================================================
// IGCSE Mathematics Topics (Edexcel)
// =====================================================

export const igcseMathsTopics: Topic[] = [
  {
    name: "Number",
    subTopics: [
      { name: "Integers, Powers and Roots", description: "HCF, LCM, primes, powers, roots" },
      { name: "Fractions, Decimals and Percentages", description: "Conversions, recurring decimals, compound interest" },
      { name: "Standard Form", description: "Scientific notation, calculations in standard form" },
      { name: "Ratio and Proportion", description: "Direct and inverse proportion, currency conversion" },
      { name: "Set Language and Notation", description: "Union, intersection, Venn diagrams" },
    ],
  },
  {
    name: "Algebra",
    subTopics: [
      { name: "Algebraic Manipulation", description: "Expanding, factorising, simplifying expressions" },
      { name: "Equations and Inequalities", description: "Linear, quadratic, simultaneous and inequality" },
      { name: "Sequences", description: "Arithmetic and geometric sequences, nth term" },
      { name: "Functions", description: "Function notation, composite, inverse functions" },
      { name: "Quadratics and Polynomials", description: "Quadratic formula, factor theorem" },
    ],
  },
  {
    name: "Coordinate Geometry",
    subTopics: [
      { name: "Graphs of Functions", description: "Linear, quadratic, cubic, reciprocal, exponential" },
      { name: "Equation of a Straight Line", description: "Gradient-intercept form, parallel/perpendicular" },
      { name: "Transformations of Functions", description: "f(x)+a, af(x), f(x+a), f(ax)" },
    ],
  },
  {
    name: "Geometry",
    subTopics: [
      { name: "Properties of Shapes", description: "Angles in polygons, circles, parallel lines" },
      { name: "Constructions and Loci", description: "Compass constructions, loci" },
      { name: "Similarity and Congruence", description: "Similar triangles, congruence conditions" },
      { name: "Circle Theorems", description: "Angles in circles, tangent properties" },
      { name: "Trigonometry", description: "SOHCAHTOA, sine and cosine rules, 3D trig" },
      { name: "Vectors", description: "Vector addition, scalar multiplication, geometric proofs" },
    ],
  },
  {
    name: "Mensuration",
    subTopics: [
      { name: "Perimeter and Area", description: "Rectangles, triangles, circles, sectors" },
      { name: "Volume and Surface Area", description: "Prisms, cylinders, spheres, cones, pyramids" },
    ],
  },
  {
    name: "Statistics and Probability",
    subTopics: [
      { name: "Data Handling", description: "Mean, median, mode, range, cumulative frequency" },
      { name: "Probability", description: "Relative frequency, combined events, conditional probability" },
    ],
  },
]

// =====================================================
// IB Mathematics Topics (AA SL / AA HL)
// =====================================================

export const ibMathsTopics: Topic[] = [
  {
    name: "Number and Algebra",
    subTopics: [
      { name: "Sequences and Series", description: "Arithmetic/geometric sequences, sigma notation" },
      { name: "Exponents and Logarithms", description: "Laws, change of base, solving equations" },
      { name: "Binomial Theorem", description: "Binomial expansion, Pascal's triangle" },
      { name: "Complex Numbers", description: "Cartesian, polar and Euler forms (HL)" },
      { name: "Proof", description: "Mathematical induction, proof by contradiction" },
    ],
  },
  {
    name: "Functions",
    subTopics: [
      { name: "Concept of a Function", description: "Domain, range, inverse and composite functions" },
      { name: "Linear and Quadratic Functions", description: "Graphs, vertex form, discriminant" },
      { name: "Rational Functions", description: "Asymptotes, graphical analysis" },
      { name: "Exponential and Logarithmic Functions", description: "Growth and decay, transformations" },
    ],
  },
  {
    name: "Geometry and Trigonometry",
    subTopics: [
      { name: "Trigonometry", description: "Radians, exact values, identities, equations" },
      { name: "Trigonometric Graphs", description: "Transformations, amplitude and period" },
      { name: "Circle Geometry", description: "Arc length, sector area, tangent properties" },
      { name: "Vectors", description: "Scalar product, angle between vectors, lines in 3D" },
    ],
  },
  {
    name: "Statistics and Probability",
    subTopics: [
      { name: "Descriptive Statistics", description: "Mean, variance, interquartile range, outliers" },
      { name: "Probability", description: "Combined events, conditional, independence" },
      { name: "Discrete Distributions", description: "Binomial distribution, expected value" },
      { name: "Normal Distribution", description: "Standard normal, inverse normal, z-scores" },
      { name: "Correlation and Regression", description: "Pearson correlation, regression lines (HL)" },
    ],
  },
  {
    name: "Calculus",
    subTopics: [
      { name: "Differentiation", description: "Derivatives of standard functions, chain/product/quotient rules" },
      { name: "Applications of Differentiation", description: "Optimization, related rates, kinematics" },
      { name: "Integration", description: "Antiderivatives, definite integrals, area" },
      { name: "Differential Equations", description: "Separable variables, slope fields (HL)" },
      { name: "Maclaurin Series", description: "Infinite series representations (HL)" },
    ],
  },
]

// =====================================================
// Subject definitions
// =====================================================

// =====================================================
// Legacy A Level Mathematics — Modular Spec (Edexcel, pre-2017)
// Organised by module: C1, C2, C3, C4, M1, M2, S1, S2, FP1, FP2, D1, D2
// =====================================================

export const legacyALevelTopics: Topic[] = [
  // Core Mathematics
  {
    name: "C1: Algebra and Functions",
    subTopics: [
      { name: "C1: Indices and Surds", description: "Laws of indices, surd form, rationalising the denominator" },
      { name: "C1: Quadratic Equations", description: "Factorising, quadratic formula, completing the square, discriminant" },
      { name: "C1: Simultaneous Equations", description: "Linear and quadratic simultaneous equations" },
      { name: "C1: Inequalities", description: "Linear and quadratic inequalities in one variable" },
      { name: "C1: Polynomials", description: "Expanding, factorising, factor theorem, remainder theorem" },
    ],
  },
  {
    name: "C1: Coordinate Geometry",
    subTopics: [
      { name: "C1: Straight Lines", description: "Gradient, midpoint, distance, equations y = mx + c" },
      { name: "C1: Circles (C1 level)", description: "Equation of a circle, midpoint and radius" },
    ],
  },
  {
    name: "C1: Calculus",
    subTopics: [
      { name: "C1: Differentiation (Basic)", description: "Differentiating polynomials, finding tangents and normals" },
      { name: "C1: Integration (Basic)", description: "Integrating polynomials, finding areas" },
      { name: "C1: Stationary Points", description: "Finding and classifying turning points" },
    ],
  },
  {
    name: "C1: Sequences",
    subTopics: [
      { name: "C1: Arithmetic Sequences", description: "nth term, sum of arithmetic series (AP)" },
      { name: "C1: Recurrence Relations", description: "Defining sequences by recurrence" },
    ],
  },
  {
    name: "C2: Algebra",
    subTopics: [
      { name: "C2: Binomial Expansion", description: "Binomial theorem for positive integer n" },
      { name: "C2: Remainder and Factor Theorem", description: "Division algorithm, factor and remainder theorems" },
    ],
  },
  {
    name: "C2: Sequences and Series",
    subTopics: [
      { name: "C2: Geometric Sequences", description: "Common ratio, sum of GP, sum to infinity" },
    ],
  },
  {
    name: "C2: Trigonometry",
    subTopics: [
      { name: "C2: Trigonometric Functions", description: "Graphs of sin, cos, tan; exact values" },
      { name: "C2: Sine and Cosine Rules", description: "Area of triangle, sine rule, cosine rule" },
      { name: "C2: Radians", description: "Converting between radians and degrees, arc length, sector area" },
      { name: "C2: Trigonometric Equations", description: "Solving equations in given intervals" },
    ],
  },
  {
    name: "C2: Exponentials and Logarithms",
    subTopics: [
      { name: "C2: Exponential Functions", description: "y = aˣ and its graph" },
      { name: "C2: Logarithms (C2 level)", description: "Laws of logarithms, change of base, solving equations" },
    ],
  },
  {
    name: "C2: Calculus",
    subTopics: [
      { name: "C2: Differentiation (C2)", description: "Chain rule (basic), kinematics applications" },
      { name: "C2: Integration (Areas)", description: "Definite integrals, area under a curve, trapezium rule" },
    ],
  },
  {
    name: "C3: Algebra and Functions",
    subTopics: [
      { name: "C3: Functions and Mappings", description: "Domain, range, composite and inverse functions" },
      { name: "C3: Modulus Function", description: "Graphs and equations involving |f(x)|" },
      { name: "C3: Algebraic Fractions", description: "Adding, subtracting, simplifying rational expressions" },
      { name: "C3: Partial Fractions", description: "Decomposing rational expressions into partial fractions" },
    ],
  },
  {
    name: "C3: Trigonometry",
    subTopics: [
      { name: "C3: Reciprocal Trig Functions", description: "Sec, cosec, cot and their graphs" },
      { name: "C3: Inverse Trigonometric Functions", description: "arcsin, arccos, arctan" },
      { name: "C3: Trigonometric Identities", description: "Compound angle, double angle, R sin(x + α) form" },
    ],
  },
  {
    name: "C3: Exponentials and Logarithms",
    subTopics: [
      { name: "C3: Natural Logarithm and e", description: "eˣ and ln x, exponential modelling" },
      { name: "C3: Exponential Equations", description: "Solving equations using ln" },
    ],
  },
  {
    name: "C3: Calculus",
    subTopics: [
      { name: "C3: Differentiation (Chain Rule)", description: "Differentiating composite functions" },
      { name: "C3: Differentiation (Product and Quotient)", description: "Product rule, quotient rule" },
      { name: "C3: Differentiating Trig Functions", description: "Derivatives of sin, cos, tan and reciprocals" },
      { name: "C3: Differentiating Exponentials/Logs", description: "Derivatives of eˣ and ln x" },
      { name: "C3: Integration (Substitution)", description: "Integration by substitution" },
      { name: "C3: Integration (Trig Functions)", description: "Integrating trig, exponential and reciprocal functions" },
      { name: "C3: Numerical Methods", description: "Iteration, root-finding, sign change" },
    ],
  },
  {
    name: "C4: Algebra",
    subTopics: [
      { name: "C4: Partial Fractions (C4)", description: "Improper fractions, repeated factors" },
      { name: "C4: Binomial Expansion (C4)", description: "Binomial theorem for any n (negative and fractional)" },
    ],
  },
  {
    name: "C4: Coordinate Geometry",
    subTopics: [
      { name: "C4: Parametric Equations", description: "Sketching and converting parametric curves" },
    ],
  },
  {
    name: "C4: Vectors",
    subTopics: [
      { name: "C4: Vectors in 3D", description: "Position vectors, magnitude, unit vectors, scalar product" },
      { name: "C4: Lines in 3D", description: "Vector equations of lines, intersections, angles" },
    ],
  },
  {
    name: "C4: Calculus",
    subTopics: [
      { name: "C4: Implicit Differentiation", description: "Differentiating implicit equations" },
      { name: "C4: Parametric Differentiation", description: "Finding dy/dx from parametric equations" },
      { name: "C4: Integration (By Parts)", description: "Integration by parts" },
      { name: "C4: Integration (Partial Fractions)", description: "Integrating rational expressions" },
      { name: "C4: Differential Equations", description: "Separating variables, forming and solving DEs" },
      { name: "C4: Volumes of Revolution", description: "Rotating curves to find volumes" },
    ],
  },
  // Mechanics
  {
    name: "M1: Kinematics",
    subTopics: [
      { name: "M1: SUVAT Equations", description: "Constant acceleration equations in one dimension" },
      { name: "M1: Graphs of Motion", description: "Displacement-time and velocity-time graphs" },
      { name: "M1: Projectile Motion (M1)", description: "Basic projectile under gravity" },
    ],
  },
  {
    name: "M1: Dynamics and Statics",
    subTopics: [
      { name: "M1: Newton's Laws", description: "Force = mass × acceleration, applications" },
      { name: "M1: Connected Particles", description: "Strings, pulleys, Atwood machines" },
      { name: "M1: Statics and Equilibrium", description: "Resolving forces, friction, limiting equilibrium" },
      { name: "M1: Moments", description: "Moment of a force, equilibrium of a rod" },
    ],
  },
  {
    name: "M1: Vectors in Mechanics",
    subTopics: [
      { name: "M1: Vectors (Force and Velocity)", description: "Representing forces and velocities as vectors" },
    ],
  },
  {
    name: "M2: Kinematics and Energy",
    subTopics: [
      { name: "M2: Variable Acceleration", description: "Using calculus for non-constant acceleration" },
      { name: "M2: Projectile Motion (M2)", description: "Projectiles at an angle, range, maximum height" },
      { name: "M2: Work, Energy, Power", description: "KE, PE, work-energy theorem, power" },
      { name: "M2: Centre of Mass", description: "Centre of mass of composites and laminas" },
    ],
  },
  // Statistics
  {
    name: "S1: Data and Probability",
    subTopics: [
      { name: "S1: Measures of Location", description: "Mean, median, mode; coded data" },
      { name: "S1: Measures of Spread", description: "Variance, standard deviation, IQR" },
      { name: "S1: Probability", description: "Basic probability, mutually exclusive, independent events" },
      { name: "S1: Conditional Probability", description: "Conditional probability, Venn diagrams, tree diagrams" },
    ],
  },
  {
    name: "S1: Distributions",
    subTopics: [
      { name: "S1: Discrete Distributions", description: "Probability distributions, expectation, variance" },
      { name: "S1: Binomial Distribution", description: "B(n,p): probabilities, mean, variance" },
      { name: "S1: Normal Distribution", description: "N(μ,σ²): standardising, tables, modelling" },
    ],
  },
  {
    name: "S1: Regression and Correlation",
    subTopics: [
      { name: "S1: Correlation", description: "Product moment correlation coefficient (PMCC)" },
      { name: "S1: Regression", description: "Least squares regression line, predictions" },
    ],
  },
  {
    name: "S2: Further Distributions",
    subTopics: [
      { name: "S2: Continuous Random Variables", description: "PDF, CDF, mean and variance of continuous RVs" },
      { name: "S2: Poisson Distribution", description: "Poisson model, mean, variance, approximations" },
      { name: "S2: Approximations", description: "Binomial approximated by Poisson or normal" },
    ],
  },
  {
    name: "S2: Hypothesis Testing",
    subTopics: [
      { name: "S2: Hypothesis Testing (Binomial)", description: "One-tailed and two-tailed tests for p" },
      { name: "S2: Hypothesis Testing (Poisson)", description: "Tests using the Poisson distribution" },
    ],
  },
  // Further Pure
  {
    name: "FP1: Complex Numbers",
    subTopics: [
      { name: "FP1: Complex Arithmetic", description: "Adding, multiplying, dividing complex numbers" },
      { name: "FP1: Argand Diagrams", description: "Modulus-argument form, loci in the Argand plane" },
      { name: "FP1: Roots of Polynomials", description: "Complex roots in conjugate pairs" },
    ],
  },
  {
    name: "FP1: Matrices",
    subTopics: [
      { name: "FP1: Matrix Operations", description: "Addition, multiplication, inverse of 2×2 matrices" },
      { name: "FP1: Transformations (Matrices)", description: "Matrix representation of geometric transformations" },
      { name: "FP1: Determinants", description: "Determinant and area scale factor" },
    ],
  },
  {
    name: "FP1: Series and Proof",
    subTopics: [
      { name: "FP1: Proof by Induction", description: "Inductive proofs for series, divisibility, matrices" },
      { name: "FP1: Summation of Series", description: "Formulae for Σr, Σr², Σr³" },
    ],
  },
  {
    name: "FP2: Further Complex Numbers",
    subTopics: [
      { name: "FP2: De Moivre's Theorem", description: "Powers, roots of unity, trig identities" },
      { name: "FP2: Further Argand Diagrams", description: "Complex loci, transformations" },
    ],
  },
  {
    name: "FP2: Further Calculus",
    subTopics: [
      { name: "FP2: Polar Coordinates", description: "Polar equations, area and arc length in polar form" },
      { name: "FP2: Further Differential Equations", description: "Second-order DEs, complementary function, particular integral" },
      { name: "FP2: Maclaurin and Taylor Series", description: "Power series expansions" },
    ],
  },
  // Decision Mathematics
  {
    name: "D1: Algorithms and Networks",
    subTopics: [
      { name: "D1: Sorting Algorithms", description: "Bubble, quick, shell sort; complexity" },
      { name: "D1: Graph Theory", description: "Graphs, trees, bipartite graphs, planarity" },
      { name: "D1: Shortest Path", description: "Dijkstra's algorithm" },
      { name: "D1: Minimum Spanning Tree", description: "Kruskal's and Prim's algorithms" },
    ],
  },
  {
    name: "D1: Linear Programming",
    subTopics: [
      { name: "D1: Formulation", description: "Setting up LP problems with constraints and objective" },
      { name: "D1: Graphical Methods", description: "Feasible region, optimal vertex" },
      { name: "D1: Simplex Algorithm", description: "Tableau method for LP" },
    ],
  },
  {
    name: "D1: Critical Path Analysis",
    subTopics: [
      { name: "D1: Activity Networks", description: "Precedence tables, activity-on-arc networks" },
      { name: "D1: Critical Path", description: "Early/late times, float, critical activities" },
    ],
  },
  {
    name: "D2: Networks and Optimisation",
    subTopics: [
      { name: "D2: Transportation Problems", description: "North-west corner, stepping-stone method" },
      { name: "D2: Allocation Problems", description: "Hungarian algorithm" },
      { name: "D2: Maximum Flow", description: "Flow augmentation, max-flow min-cut" },
      { name: "D2: Game Theory", description: "Zero-sum games, mixed strategy Nash equilibria" },
    ],
  },
]

export const subjects: Subject[] = [
  {
    name: "Mathematics",
    levels: ["GCSE Foundation", "GCSE Higher"],
    topics: gcseMathsTopics,
  },
  {
    name: "A Level Mathematics",
    levels: ["AS Level", "A Level"],
    topics: aLevelMathsTopics,
  },
  {
    name: "A Level Mathematics (Legacy Modular)",
    levels: ["A Level"],
    topics: legacyALevelTopics,
  },
  {
    name: "IGCSE Mathematics",
    levels: ["IGCSE"],
    topics: igcseMathsTopics,
  },
  {
    name: "IB Mathematics",
    levels: ["IB SL", "IB HL"],
    topics: ibMathsTopics,
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

/**
 * Look up the learning objective description for a given sub-topic.
 * Searches all subjects and levels — returns first match.
 * Falls back to null if not found (caller should use the subTopic name directly).
 */
export function getLearningObjective(subTopic: string, topic?: string): string | null {
  for (const subject of subjects) {
    for (const t of subject.topics) {
      if (topic && t.name !== topic) continue
      for (const st of t.subTopics) {
        if (st.name === subTopic && st.description) {
          return st.description
        }
      }
    }
  }
  // Fuzzy match — try case-insensitive partial match as fallback
  for (const subject of subjects) {
    for (const t of subject.topics) {
      for (const st of t.subTopics) {
        if (
          st.name.toLowerCase() === subTopic.toLowerCase() &&
          st.description
        ) {
          return st.description
        }
      }
    }
  }
  return null
}
