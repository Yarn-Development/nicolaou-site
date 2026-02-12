"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { ChevronRight, ChevronDown, Sparkles, Upload, X } from "lucide-react"

// =============================================================================
// TYPES & DATA STRUCTURES
// =============================================================================

export type CurriculumLevel = "a-level" | "gcse" | "ks3" | null
export type ALevelStream = "pure" | "applied" | null
export type ALevelYear = "year1" | "year2" | null
export type GCSETier = "foundation" | "higher" | null

export interface FilterState {
  curriculum: CurriculumLevel
  // A Level specific
  aLevelStream: ALevelStream
  aLevelYear: ALevelYear
  // GCSE specific
  gcseTier: GCSETier
  // Shared: selected strands/topics
  selectedStrands: string[]
  selectedSubtopics: string[]
}

export interface QuestionBankFilterSidebarProps {
  onFilterChange?: (filters: FilterState) => void
  className?: string
}

// A Level Topics by Stream and Year
const A_LEVEL_TOPICS: Record<string, Record<string, { name: string; subtopics: string[] }[]>> = {
  pure: {
    year1: [
      { name: "Algebraic Expressions", subtopics: ["Index Laws", "Expanding Brackets", "Factorising", "Surds"] },
      { name: "Quadratics", subtopics: ["Solving Quadratics", "Discriminant", "Quadratic Graphs", "Inequalities"] },
      { name: "Equations & Inequalities", subtopics: ["Linear Simultaneous Equations", "Quadratic Simultaneous Equations", "Inequalities on Graphs"] },
      { name: "Graphs & Transformations", subtopics: ["Cubic Graphs", "Reciprocal Graphs", "Transformations"] },
      { name: "Straight Line Graphs", subtopics: ["Equation of a Line", "Parallel & Perpendicular", "Modelling"] },
      { name: "Circles", subtopics: ["Equation of a Circle", "Circle Theorems", "Tangents"] },
      { name: "Algebraic Methods", subtopics: ["Factor Theorem", "Algebraic Fractions", "Partial Fractions"] },
      { name: "Binomial Expansion", subtopics: ["Pascal's Triangle", "Factorial Notation", "Binomial Theorem"] },
      { name: "Trigonometry", subtopics: ["Sine & Cosine Rules", "Trig Graphs", "Trig Equations"] },
      { name: "Exponentials & Logs", subtopics: ["Exponential Functions", "Logarithms", "Natural Logs"] },
      { name: "Differentiation", subtopics: ["First Principles", "Differentiation Rules", "Tangents & Normals", "Stationary Points"] },
      { name: "Integration", subtopics: ["Indefinite Integration", "Definite Integration", "Area Under Curves"] },
      { name: "Vectors", subtopics: ["Vector Notation", "Position Vectors", "Vector Geometry"] },
    ],
    year2: [
      { name: "Algebraic Methods", subtopics: ["Proof by Contradiction", "Algebraic Fractions", "Partial Fractions"] },
      { name: "Functions & Graphs", subtopics: ["Modulus Functions", "Composite Functions", "Inverse Functions"] },
      { name: "Sequences & Series", subtopics: ["Arithmetic Sequences", "Geometric Sequences", "Sigma Notation", "Recurrence Relations"] },
      { name: "Binomial Expansion", subtopics: ["General Binomial Expansion", "Using Partial Fractions"] },
      { name: "Radians", subtopics: ["Radian Measure", "Arc Length", "Sector Area", "Small Angle Approximations"] },
      { name: "Trigonometry", subtopics: ["Secant, Cosecant, Cotangent", "Inverse Trig Functions", "Addition Formulae", "Double Angle Formulae"] },
      { name: "Parametric Equations", subtopics: ["Parametric Curves", "Converting Forms", "Modelling"] },
      { name: "Differentiation", subtopics: ["Chain Rule", "Product Rule", "Quotient Rule", "Implicit Differentiation", "Parametric Differentiation"] },
      { name: "Numerical Methods", subtopics: ["Locating Roots", "Iteration", "Newton-Raphson"] },
      { name: "Integration", subtopics: ["Integration by Substitution", "Integration by Parts", "Partial Fractions", "Differential Equations"] },
      { name: "Vectors", subtopics: ["3D Vectors", "Vector Equations of Lines", "Scalar Product"] },
    ],
  },
  applied: {
    year1: [
      { name: "Data Collection", subtopics: ["Sampling Methods", "Types of Data", "Large Data Sets"] },
      { name: "Data Presentation", subtopics: ["Box Plots", "Histograms", "Cumulative Frequency"] },
      { name: "Data Measures", subtopics: ["Central Tendency", "Spread", "Coding"] },
      { name: "Correlation & Regression", subtopics: ["Scatter Diagrams", "Correlation Coefficients", "Regression Lines"] },
      { name: "Probability", subtopics: ["Venn Diagrams", "Tree Diagrams", "Mutually Exclusive Events", "Independent Events"] },
      { name: "Statistical Distributions", subtopics: ["Discrete Random Variables", "Binomial Distribution"] },
      { name: "Hypothesis Testing", subtopics: ["Hypothesis Testing for Binomial"] },
      { name: "Kinematics", subtopics: ["Displacement-Time Graphs", "Velocity-Time Graphs", "SUVAT Equations", "Vertical Motion"] },
      { name: "Forces & Newton's Laws", subtopics: ["Force Diagrams", "Newton's Laws", "Connected Particles", "Pulleys"] },
      { name: "Variable Acceleration", subtopics: ["Calculus in Kinematics"] },
    ],
    year2: [
      { name: "Regression & Correlation", subtopics: ["Exponential Models", "Change of Variable"] },
      { name: "Probability", subtopics: ["Conditional Probability", "Probability Formulae"] },
      { name: "Normal Distribution", subtopics: ["Normal Distribution", "Standard Normal", "Inverse Normal", "Approximating Binomial"] },
      { name: "Hypothesis Testing", subtopics: ["Hypothesis Testing for Normal", "Correlation Coefficients"] },
      { name: "Moments", subtopics: ["Moments", "Equilibrium", "Centres of Mass"] },
      { name: "Forces & Friction", subtopics: ["Static Particles", "Friction", "Inclined Planes"] },
      { name: "Projectiles", subtopics: ["Horizontal Projection", "Projection at an Angle"] },
      { name: "Further Kinematics", subtopics: ["Vectors in Kinematics", "Variable Acceleration in 2D"] },
    ],
  },
}

// GCSE/KS3 Strands and Subtopics
const GCSE_KS3_STRANDS: { name: string; id: string; subtopics: string[] }[] = [
  { 
    name: "Number", 
    id: "number",
    subtopics: ["Integers", "Decimals", "Fractions", "Percentages", "Ratio", "Standard Form", "Bounds", "Surds"] 
  },
  { 
    name: "Ratio", 
    id: "ratio",
    subtopics: ["Simplifying Ratios", "Dividing in a Ratio", "Ratio Problems", "Proportion", "Best Buy", "Recipe Problems"] 
  },
  { 
    name: "Geometry", 
    id: "geometry",
    subtopics: ["Angles", "Polygons", "Circles", "Constructions", "Transformations", "Pythagoras", "Trigonometry", "Vectors", "3D Shapes", "Similarity & Congruence"] 
  },
  { 
    name: "Algebra", 
    id: "algebra",
    subtopics: ["Sequences", "Quadratics", "Simultaneous Equations", "Inequalities", "Functions", "Graphs", "Algebraic Fractions", "Rearranging Formulae"] 
  },
  { 
    name: "Probability", 
    id: "probability",
    subtopics: ["Basic Probability", "Combined Events", "Tree Diagrams", "Venn Diagrams", "Conditional Probability", "Expected Outcomes"] 
  },
  { 
    name: "Data", 
    id: "data",
    subtopics: ["Averages", "Representing Data", "Scatter Graphs", "Cumulative Frequency", "Box Plots", "Histograms", "Comparing Distributions"] 
  },
]

// =============================================================================
// ACCORDION TREE ITEM COMPONENT
// =============================================================================

interface TreeItemProps {
  label: string
  level: number
  isExpanded?: boolean
  isSelected?: boolean
  hasChildren?: boolean
  onToggle?: () => void
  onSelect?: () => void
  children?: React.ReactNode
}

function TreeItem({ 
  label, 
  level, 
  isExpanded = false, 
  isSelected = false,
  hasChildren = false,
  onToggle,
  onSelect,
  children 
}: TreeItemProps) {
  const paddingLeft = level * 16

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => {
          if (hasChildren && onToggle) {
            onToggle()
          }
          if (onSelect) {
            onSelect()
          }
        }}
        className={cn(
          "w-full flex items-center gap-2 py-2 px-3 text-left transition-colors border-l-2",
          level === 0 && "font-bold uppercase tracking-wider text-sm border-l-0 bg-swiss-concrete/50 dark:bg-swiss-ink/50",
          level === 1 && "text-sm font-semibold",
          level === 2 && "text-sm font-medium",
          level === 3 && "text-xs",
          isSelected && "bg-swiss-signal/10 border-l-swiss-signal text-swiss-signal",
          !isSelected && "border-l-transparent hover:bg-swiss-concrete/30 dark:hover:bg-swiss-paper/5"
        )}
        style={{ paddingLeft: `${paddingLeft + 12}px` }}
      >
        {hasChildren && (
          <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </span>
        )}
        {!hasChildren && <span className="w-4 h-4 flex-shrink-0" />}
        <span className="flex-1 truncate">{label}</span>
        {isSelected && !hasChildren && (
          <span className="w-2 h-2 bg-swiss-signal flex-shrink-0" />
        )}
      </button>
      {isExpanded && children && (
        <div className="w-full">
          {children}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// SHADOW PAPER MODAL
// =============================================================================

function ShadowPaperModal({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean
  onClose: () => void 
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-swiss-signal" />
            Generate Shadow Paper
          </DialogTitle>
          <DialogDescription>
            Upload an exam paper PDF to generate a similar practice paper with matched question styles and topics.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="border-2 border-dashed border-swiss-ink/30 dark:border-swiss-paper/30 p-8 flex flex-col items-center justify-center gap-3 bg-swiss-concrete/20 dark:bg-swiss-paper/5">
            <Upload className="w-10 h-10 text-swiss-lead" />
            <p className="text-sm font-medium text-center">
              Drag and drop your exam paper PDF here
            </p>
            <p className="text-xs text-swiss-lead text-center">
              or click to browse files
            </p>
            <Button variant="outline" className="mt-2">
              Select PDF
            </Button>
          </div>
          <p className="text-xs text-swiss-lead">
            Supported formats: PDF (max 20MB)
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// =============================================================================
// MAIN FILTER SIDEBAR COMPONENT
// =============================================================================

export function QuestionBankFilterSidebar({ onFilterChange, className }: QuestionBankFilterSidebarProps) {
  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    curriculum: null,
    aLevelStream: null,
    aLevelYear: null,
    gcseTier: null,
    selectedStrands: [],
    selectedSubtopics: [],
  })

  // UI State
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set())
  const [expandedStrands, setExpandedStrands] = useState<Set<string>>(new Set())
  const [showShadowModal, setShowShadowModal] = useState(false)

  // Notify parent of filter changes
  useEffect(() => {
    onFilterChange?.(filters)
  }, [filters, onFilterChange])

  // Reset child filters when parent changes
  const setCurriculum = useCallback((curriculum: CurriculumLevel) => {
    setFilters({
      curriculum,
      aLevelStream: null,
      aLevelYear: null,
      gcseTier: null,
      selectedStrands: [],
      selectedSubtopics: [],
    })
    setExpandedTopics(new Set())
    setExpandedStrands(new Set())
  }, [])

  const setALevelStream = useCallback((stream: ALevelStream) => {
    setFilters(prev => ({
      ...prev,
      aLevelStream: stream,
      aLevelYear: null,
      selectedStrands: [],
      selectedSubtopics: [],
    }))
    setExpandedTopics(new Set())
  }, [])

  const setALevelYear = useCallback((year: ALevelYear) => {
    setFilters(prev => ({
      ...prev,
      aLevelYear: year,
      selectedStrands: [],
      selectedSubtopics: [],
    }))
    setExpandedTopics(new Set())
  }, [])

  const setGCSETier = useCallback((tier: GCSETier) => {
    setFilters(prev => ({
      ...prev,
      gcseTier: tier,
      selectedStrands: [],
      selectedSubtopics: [],
    }))
    setExpandedStrands(new Set())
  }, [])

  const toggleTopicExpansion = (topicName: string) => {
    setExpandedTopics(prev => {
      const next = new Set(prev)
      if (next.has(topicName)) {
        next.delete(topicName)
      } else {
        next.add(topicName)
      }
      return next
    })
  }

  const toggleStrandExpansion = (strandId: string) => {
    setExpandedStrands(prev => {
      const next = new Set(prev)
      if (next.has(strandId)) {
        next.delete(strandId)
      } else {
        next.add(strandId)
      }
      return next
    })
  }

  const toggleSubtopic = (subtopic: string) => {
    setFilters(prev => ({
      ...prev,
      selectedSubtopics: prev.selectedSubtopics.includes(subtopic)
        ? prev.selectedSubtopics.filter(s => s !== subtopic)
        : [...prev.selectedSubtopics, subtopic],
    }))
  }

  const clearFilters = () => {
    setFilters({
      curriculum: null,
      aLevelStream: null,
      aLevelYear: null,
      gcseTier: null,
      selectedStrands: [],
      selectedSubtopics: [],
    })
    setExpandedTopics(new Set())
    setExpandedStrands(new Set())
  }

  const hasActiveFilters = filters.curriculum !== null || filters.selectedSubtopics.length > 0

  return (
    <div className={cn("h-full flex flex-col bg-swiss-paper dark:bg-swiss-ink border-r-2 border-swiss-ink dark:border-swiss-paper", className)}>
      {/* Header */}
      <div className="p-4 border-b-2 border-swiss-ink dark:border-swiss-paper">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-black uppercase tracking-widest">Filters</h2>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-xs h-7 px-2"
            >
              <X className="w-3 h-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
        
        {/* Shadow Paper Button */}
        <Button
          onClick={() => setShowShadowModal(true)}
          className="w-full bg-gradient-to-r from-swiss-signal to-orange-500 hover:from-swiss-signal/90 hover:to-orange-500/90 text-white font-bold"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Generate Shadow Paper
        </Button>
      </div>

      {/* Filter Tree */}
      <div className="flex-1 overflow-y-auto">
        {/* Level 1: Curriculum Selection */}
        <div className="border-b border-swiss-ink/20 dark:border-swiss-paper/20">
          <TreeItem
            label="A Level Maths"
            level={0}
            isSelected={filters.curriculum === "a-level"}
            hasChildren={true}
            isExpanded={filters.curriculum === "a-level"}
            onSelect={() => setCurriculum(filters.curriculum === "a-level" ? null : "a-level")}
            onToggle={() => setCurriculum(filters.curriculum === "a-level" ? null : "a-level")}
          >
            {/* Level 2: Stream */}
            <TreeItem
              label="Pure"
              level={1}
              isSelected={filters.aLevelStream === "pure"}
              hasChildren={true}
              isExpanded={filters.aLevelStream === "pure"}
              onSelect={() => setALevelStream(filters.aLevelStream === "pure" ? null : "pure")}
              onToggle={() => setALevelStream(filters.aLevelStream === "pure" ? null : "pure")}
            >
              {/* Level 3: Year */}
              <TreeItem
                label="Year 1"
                level={2}
                isSelected={filters.aLevelYear === "year1" && filters.aLevelStream === "pure"}
                hasChildren={true}
                isExpanded={filters.aLevelYear === "year1" && filters.aLevelStream === "pure"}
                onSelect={() => setALevelYear(filters.aLevelYear === "year1" ? null : "year1")}
                onToggle={() => setALevelYear(filters.aLevelYear === "year1" ? null : "year1")}
              >
                {/* Level 4: Topics (Accordion) */}
                {filters.aLevelStream === "pure" && filters.aLevelYear === "year1" && 
                  A_LEVEL_TOPICS.pure.year1.map(topic => (
                    <TreeItem
                      key={topic.name}
                      label={topic.name}
                      level={3}
                      hasChildren={true}
                      isExpanded={expandedTopics.has(topic.name)}
                      onToggle={() => toggleTopicExpansion(topic.name)}
                    >
                      {topic.subtopics.map(subtopic => (
                        <TreeItem
                          key={subtopic}
                          label={subtopic}
                          level={4}
                          isSelected={filters.selectedSubtopics.includes(subtopic)}
                          onSelect={() => toggleSubtopic(subtopic)}
                        />
                      ))}
                    </TreeItem>
                  ))
                }
              </TreeItem>
              <TreeItem
                label="Year 2"
                level={2}
                isSelected={filters.aLevelYear === "year2" && filters.aLevelStream === "pure"}
                hasChildren={true}
                isExpanded={filters.aLevelYear === "year2" && filters.aLevelStream === "pure"}
                onSelect={() => setALevelYear(filters.aLevelYear === "year2" ? null : "year2")}
                onToggle={() => setALevelYear(filters.aLevelYear === "year2" ? null : "year2")}
              >
                {filters.aLevelStream === "pure" && filters.aLevelYear === "year2" && 
                  A_LEVEL_TOPICS.pure.year2.map(topic => (
                    <TreeItem
                      key={topic.name}
                      label={topic.name}
                      level={3}
                      hasChildren={true}
                      isExpanded={expandedTopics.has(topic.name)}
                      onToggle={() => toggleTopicExpansion(topic.name)}
                    >
                      {topic.subtopics.map(subtopic => (
                        <TreeItem
                          key={subtopic}
                          label={subtopic}
                          level={4}
                          isSelected={filters.selectedSubtopics.includes(subtopic)}
                          onSelect={() => toggleSubtopic(subtopic)}
                        />
                      ))}
                    </TreeItem>
                  ))
                }
              </TreeItem>
            </TreeItem>
            <TreeItem
              label="Applied (Stats & Mechanics)"
              level={1}
              isSelected={filters.aLevelStream === "applied"}
              hasChildren={true}
              isExpanded={filters.aLevelStream === "applied"}
              onSelect={() => setALevelStream(filters.aLevelStream === "applied" ? null : "applied")}
              onToggle={() => setALevelStream(filters.aLevelStream === "applied" ? null : "applied")}
            >
              <TreeItem
                label="Year 1"
                level={2}
                isSelected={filters.aLevelYear === "year1" && filters.aLevelStream === "applied"}
                hasChildren={true}
                isExpanded={filters.aLevelYear === "year1" && filters.aLevelStream === "applied"}
                onSelect={() => setALevelYear(filters.aLevelYear === "year1" ? null : "year1")}
                onToggle={() => setALevelYear(filters.aLevelYear === "year1" ? null : "year1")}
              >
                {filters.aLevelStream === "applied" && filters.aLevelYear === "year1" && 
                  A_LEVEL_TOPICS.applied.year1.map(topic => (
                    <TreeItem
                      key={topic.name}
                      label={topic.name}
                      level={3}
                      hasChildren={true}
                      isExpanded={expandedTopics.has(topic.name)}
                      onToggle={() => toggleTopicExpansion(topic.name)}
                    >
                      {topic.subtopics.map(subtopic => (
                        <TreeItem
                          key={subtopic}
                          label={subtopic}
                          level={4}
                          isSelected={filters.selectedSubtopics.includes(subtopic)}
                          onSelect={() => toggleSubtopic(subtopic)}
                        />
                      ))}
                    </TreeItem>
                  ))
                }
              </TreeItem>
              <TreeItem
                label="Year 2"
                level={2}
                isSelected={filters.aLevelYear === "year2" && filters.aLevelStream === "applied"}
                hasChildren={true}
                isExpanded={filters.aLevelYear === "year2" && filters.aLevelStream === "applied"}
                onSelect={() => setALevelYear(filters.aLevelYear === "year2" ? null : "year2")}
                onToggle={() => setALevelYear(filters.aLevelYear === "year2" ? null : "year2")}
              >
                {filters.aLevelStream === "applied" && filters.aLevelYear === "year2" && 
                  A_LEVEL_TOPICS.applied.year2.map(topic => (
                    <TreeItem
                      key={topic.name}
                      label={topic.name}
                      level={3}
                      hasChildren={true}
                      isExpanded={expandedTopics.has(topic.name)}
                      onToggle={() => toggleTopicExpansion(topic.name)}
                    >
                      {topic.subtopics.map(subtopic => (
                        <TreeItem
                          key={subtopic}
                          label={subtopic}
                          level={4}
                          isSelected={filters.selectedSubtopics.includes(subtopic)}
                          onSelect={() => toggleSubtopic(subtopic)}
                        />
                      ))}
                    </TreeItem>
                  ))
                }
              </TreeItem>
            </TreeItem>
          </TreeItem>
        </div>

        {/* GCSE */}
        <div className="border-b border-swiss-ink/20 dark:border-swiss-paper/20">
          <TreeItem
            label="GCSE"
            level={0}
            isSelected={filters.curriculum === "gcse"}
            hasChildren={true}
            isExpanded={filters.curriculum === "gcse"}
            onSelect={() => setCurriculum(filters.curriculum === "gcse" ? null : "gcse")}
            onToggle={() => setCurriculum(filters.curriculum === "gcse" ? null : "gcse")}
          >
            {/* Level 2: Tier */}
            <TreeItem
              label="Foundation"
              level={1}
              isSelected={filters.gcseTier === "foundation"}
              hasChildren={true}
              isExpanded={filters.gcseTier === "foundation"}
              onSelect={() => setGCSETier(filters.gcseTier === "foundation" ? null : "foundation")}
              onToggle={() => setGCSETier(filters.gcseTier === "foundation" ? null : "foundation")}
            >
              {/* Level 3: Strands */}
              {filters.gcseTier === "foundation" && GCSE_KS3_STRANDS.map(strand => (
                <TreeItem
                  key={strand.id}
                  label={strand.name}
                  level={2}
                  hasChildren={true}
                  isExpanded={expandedStrands.has(strand.id)}
                  onToggle={() => toggleStrandExpansion(strand.id)}
                >
                  {/* Level 4: Subtopics */}
                  {strand.subtopics.map(subtopic => (
                    <TreeItem
                      key={subtopic}
                      label={subtopic}
                      level={3}
                      isSelected={filters.selectedSubtopics.includes(subtopic)}
                      onSelect={() => toggleSubtopic(subtopic)}
                    />
                  ))}
                </TreeItem>
              ))}
            </TreeItem>
            <TreeItem
              label="Higher"
              level={1}
              isSelected={filters.gcseTier === "higher"}
              hasChildren={true}
              isExpanded={filters.gcseTier === "higher"}
              onSelect={() => setGCSETier(filters.gcseTier === "higher" ? null : "higher")}
              onToggle={() => setGCSETier(filters.gcseTier === "higher" ? null : "higher")}
            >
              {filters.gcseTier === "higher" && GCSE_KS3_STRANDS.map(strand => (
                <TreeItem
                  key={strand.id}
                  label={strand.name}
                  level={2}
                  hasChildren={true}
                  isExpanded={expandedStrands.has(strand.id)}
                  onToggle={() => toggleStrandExpansion(strand.id)}
                >
                  {strand.subtopics.map(subtopic => (
                    <TreeItem
                      key={subtopic}
                      label={subtopic}
                      level={3}
                      isSelected={filters.selectedSubtopics.includes(subtopic)}
                      onSelect={() => toggleSubtopic(subtopic)}
                    />
                  ))}
                </TreeItem>
              ))}
            </TreeItem>
          </TreeItem>
        </div>

        {/* KS3 */}
        <div className="border-b border-swiss-ink/20 dark:border-swiss-paper/20">
          <TreeItem
            label="KS3"
            level={0}
            isSelected={filters.curriculum === "ks3"}
            hasChildren={true}
            isExpanded={filters.curriculum === "ks3"}
            onSelect={() => setCurriculum(filters.curriculum === "ks3" ? null : "ks3")}
            onToggle={() => setCurriculum(filters.curriculum === "ks3" ? null : "ks3")}
          >
            {/* KS3 goes straight to Strands (no tier) */}
            {filters.curriculum === "ks3" && GCSE_KS3_STRANDS.map(strand => (
              <TreeItem
                key={strand.id}
                label={strand.name}
                level={1}
                hasChildren={true}
                isExpanded={expandedStrands.has(strand.id)}
                onToggle={() => toggleStrandExpansion(strand.id)}
              >
                {strand.subtopics.map(subtopic => (
                  <TreeItem
                    key={subtopic}
                    label={subtopic}
                    level={2}
                    isSelected={filters.selectedSubtopics.includes(subtopic)}
                    onSelect={() => toggleSubtopic(subtopic)}
                  />
                ))}
              </TreeItem>
            ))}
          </TreeItem>
        </div>
      </div>

      {/* Footer: Selected count */}
      {filters.selectedSubtopics.length > 0 && (
        <div className="p-4 border-t-2 border-swiss-ink dark:border-swiss-paper bg-swiss-concrete/30 dark:bg-swiss-paper/5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {filters.selectedSubtopics.length} subtopic{filters.selectedSubtopics.length !== 1 ? "s" : ""} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilters(prev => ({ ...prev, selectedSubtopics: [] }))}
              className="text-xs h-7 px-2 text-swiss-signal hover:text-swiss-signal"
            >
              Clear selection
            </Button>
          </div>
        </div>
      )}

      {/* Shadow Paper Modal */}
      <ShadowPaperModal 
        isOpen={showShadowModal} 
        onClose={() => setShowShadowModal(false)} 
      />
    </div>
  )
}
