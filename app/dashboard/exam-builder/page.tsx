"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { 
  X, 
  FileText, 
  Trash2, 
  Database, 
  ExternalLink, 
  Search, 
  FileDown,
  Loader2,
  AlertCircle,
  CheckCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LatexPreview } from "@/components/latex-preview"
import { 
  getQuestionBankQuestions, 
  type Question as DBQuestion,
  type QuestionBankFilters
} from "@/app/actions/questions"
import { 
  exportExamToWord, 
  exportExamWithMarkScheme,
  type ExamQuestion 
} from "@/lib/docx-exporter"
import { mockQuestions as fallbackQuestions, type Question as MockQuestion } from "@/lib/mock-questions"

// =====================================================
// Types
// =====================================================

// Unified question type for the exam builder
interface ExamBuilderQuestion {
  id: string
  questionLatex: string      // Raw LaTeX for rendering
  questionText: string       // Plain text fallback / preview
  markSchemeLatex: string    // Raw LaTeX for mark scheme
  markSchemeText: string     // Plain text fallback
  tier: "Higher" | "Foundation"
  level: string
  topic: string
  learningObjective: string
  calculatorAllowed: boolean
  difficulty: number
  marks: number
  imageUrl?: string | null   // For image_ocr questions
  // Original database question for export
  originalDbQuestion?: DBQuestion
  // Source indicator
  source: "database" | "mock"
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Create a plain text preview from LaTeX (for card previews)
 */
function createPlainTextPreview(latex: string | null): string {
  if (!latex) return "[No content]"
  
  return latex
    .replace(/\$\$/g, "")
    .replace(/\$/g, "")
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1)/($2)")
    .replace(/\\sqrt\{([^}]+)\}/g, "sqrt($1)")
    .replace(/\\times/g, "×")
    .replace(/\\div/g, "÷")
    .replace(/\\pm/g, "±")
    .replace(/\\leq/g, "≤")
    .replace(/\\geq/g, "≥")
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/\{|\}/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Convert database question to exam builder format
 */
function dbQuestionToExamFormat(q: DBQuestion): ExamBuilderQuestion {
  const marks = q.marks || q.answer_key?.marks || 2
  const questionLatex = q.question_latex || "[Question content]"
  const markSchemeLatex = q.answer_key?.answer || q.answer_key?.explanation || "No mark scheme available"

  return {
    id: q.id,
    questionLatex,
    questionText: createPlainTextPreview(questionLatex),
    markSchemeLatex,
    markSchemeText: createPlainTextPreview(markSchemeLatex),
    tier: q.difficulty || "Foundation",
    level: q.curriculum_level || "GCSE",
    topic: q.topic_name || q.topic || "General",
    learningObjective: q.sub_topic_name || q.topic_name || q.topic || "",
    calculatorAllowed: q.calculator_allowed ?? false,
    difficulty: q.difficulty === "Higher" ? 4 : 2,
    marks,
    imageUrl: q.image_url,
    originalDbQuestion: q,
    source: "database"
  }
}

/**
 * Convert mock question to exam builder format
 */
function mockQuestionToExamFormat(q: MockQuestion): ExamBuilderQuestion {
  return {
    id: q.id,
    questionLatex: q.questionText,  // Mock questions store text directly
    questionText: q.questionText,
    markSchemeLatex: q.markSchemeText,
    markSchemeText: q.markSchemeText,
    tier: q.tier,
    level: q.level,
    topic: q.topic,
    learningObjective: q.learningObjective,
    calculatorAllowed: q.calculatorAllowed,
    difficulty: q.difficulty,
    marks: q.marks,
    originalDbQuestion: undefined,
    source: "mock"
  }
}

/**
 * Convert exam builder question to export format
 */
function toExportFormat(q: ExamBuilderQuestion): ExamQuestion {
  if (q.originalDbQuestion) {
    return {
      id: q.originalDbQuestion.id,
      content_type: q.originalDbQuestion.content_type,
      question_latex: q.originalDbQuestion.question_latex,
      image_url: q.originalDbQuestion.image_url,
      topic: q.originalDbQuestion.topic,
      topic_name: q.originalDbQuestion.topic_name,
      sub_topic_name: q.originalDbQuestion.sub_topic_name,
      difficulty: q.originalDbQuestion.difficulty,
      marks: q.originalDbQuestion.marks,
      calculator_allowed: q.originalDbQuestion.calculator_allowed,
      answer_key: q.originalDbQuestion.answer_key as ExamQuestion["answer_key"],
    }
  }
  
  // Convert mock question format
  return {
    id: q.id,
    content_type: "generated_text",
    question_latex: q.questionLatex,
    image_url: q.imageUrl || null,
    topic: q.topic,
    topic_name: q.topic,
    sub_topic_name: q.learningObjective,
    difficulty: q.tier,
    marks: q.marks,
    calculator_allowed: q.calculatorAllowed,
    answer_key: {
      answer: q.markSchemeLatex,
      explanation: q.markSchemeLatex,
    },
  }
}

// =====================================================
// Question Card Component (inline)
// =====================================================

interface QuestionCardProps {
  question: ExamBuilderQuestion
  onAdd: (question: ExamBuilderQuestion) => void
  isAdded: boolean
}

function QuestionBankCard({ question, onAdd, isAdded }: QuestionCardProps) {
  return (
    <div className="border-2 border-swiss-ink bg-swiss-paper p-4 hover:bg-swiss-concrete transition-colors group">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs font-black uppercase tracking-widest text-swiss-signal">
              {question.id.slice(0, 8)}...
            </span>
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 bg-swiss-ink text-white">
              {question.marks} {question.marks === 1 ? "Mark" : "Marks"}
            </span>
            {question.source === "database" && (
              <Badge variant="outline" className="text-[10px]">DB</Badge>
            )}
          </div>
          {/* LaTeX preview with truncation - fixed height container for consistent card sizing */}
          <div className="h-16 mb-3 overflow-hidden relative">
            <div className="text-sm font-medium leading-relaxed text-swiss-ink">
              <LatexPreview latex={question.questionLatex} className="text-sm [&_.katex]:text-sm" />
            </div>
            {/* Fade overlay to indicate truncation */}
            <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-swiss-paper to-transparent pointer-events-none group-hover:from-swiss-concrete" />
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 border border-swiss-ink">
          {question.tier}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 border border-swiss-ink">
          {question.level}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 border border-swiss-ink">
          {question.topic}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 border border-swiss-ink">
          {question.calculatorAllowed ? "Calculator" : "Non-Calc"}
        </span>
      </div>

      {/* Add Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 ${
                i < question.difficulty ? "bg-swiss-signal" : "bg-swiss-concrete border border-swiss-ink"
              }`}
            />
          ))}
          <span className="text-xs font-bold uppercase tracking-wider text-swiss-lead ml-2">
            Difficulty
          </span>
        </div>

        <Button
          onClick={() => onAdd(question)}
          disabled={isAdded}
          className={`${
            isAdded 
              ? "bg-swiss-ink/20 text-swiss-ink border-2 border-swiss-ink/40" 
              : "bg-swiss-signal text-white hover:bg-swiss-ink"
          } font-bold uppercase tracking-wider text-xs px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200`}
        >
          {isAdded ? "Added" : "+ Add"}
        </Button>
      </div>

      {/* Learning Objective */}
      <div className="mt-3 pt-3 border-t border-swiss-ink">
        <p className="text-xs text-swiss-lead font-medium line-clamp-1">
          {question.learningObjective}
        </p>
      </div>
    </div>
  )
}

// =====================================================
// Main Component
// =====================================================

export default function ExamBuilderPage() {
  // State
  const [selectedQuestions, setSelectedQuestions] = useState<ExamBuilderQuestion[]>([])
  const [showMarkScheme, setShowMarkScheme] = useState(false)
  const [examTitle, setExamTitle] = useState("Mathematics Assessment")
  
  // Data fetching state
  const [questions, setQuestions] = useState<ExamBuilderQuestion[]>([])
  const [topics, setTopics] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasDbData, setHasDbData] = useState(false)
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("")
  const [tierFilter, setTierFilter] = useState<string>("All")
  const [topicFilter, setTopicFilter] = useState<string>("All")
  const [calculatorFilter, setCalculatorFilter] = useState<string>("All")
  
  // Export state
  const [isExporting, setIsExporting] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)

  // Fetch questions from database
  const fetchQuestions = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const filters: QuestionBankFilters = {
        search: searchQuery || undefined,
        topic: topicFilter !== "All" ? topicFilter : undefined,
        difficulty: tierFilter !== "All" ? tierFilter as "Foundation" | "Higher" : "All",
        calculatorAllowed: calculatorFilter === "Calculator" ? true : 
                          calculatorFilter === "Non-Calculator" ? false : "All",
        limit: 100,
      }
      
      const result = await getQuestionBankQuestions(filters)
      
      if (result.success && result.data) {
        const { questions: dbQuestions, topics: dbTopics } = result.data
        
        if (dbQuestions.length > 0) {
          setQuestions(dbQuestions.map(dbQuestionToExamFormat))
          setTopics(dbTopics)
          setHasDbData(true)
        } else {
          // No DB questions, use mock data
          setQuestions(fallbackQuestions.map(mockQuestionToExamFormat))
          setTopics(Array.from(new Set(fallbackQuestions.map(q => q.topic))).sort())
          setHasDbData(false)
        }
      } else {
        // Error fetching, use mock data
        console.error("Error fetching questions:", result.error)
        setQuestions(fallbackQuestions.map(mockQuestionToExamFormat))
        setTopics(Array.from(new Set(fallbackQuestions.map(q => q.topic))).sort())
        setHasDbData(false)
        setError(result.error || "Could not load questions from database")
      }
    } catch (err) {
      console.error("Unexpected error:", err)
      setQuestions(fallbackQuestions.map(mockQuestionToExamFormat))
      setTopics(Array.from(new Set(fallbackQuestions.map(q => q.topic))).sort())
      setHasDbData(false)
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, tierFilter, topicFilter, calculatorFilter])

  // Fetch on mount and when filters change
  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      fetchQuestions()
    }, searchQuery ? 300 : 0)
    
    return () => clearTimeout(timer)
  }, [fetchQuestions, searchQuery])

  // Filter questions locally for additional filters not sent to server
  const filteredQuestions = questions.filter(q => {
    if (calculatorFilter === "Calculator" && !q.calculatorAllowed) return false
    if (calculatorFilter === "Non-Calculator" && q.calculatorAllowed) return false
    return true
  })

  // Handler functions
  const handleAddQuestion = (question: ExamBuilderQuestion) => {
    if (!selectedQuestions.find(q => q.id === question.id)) {
      setSelectedQuestions([...selectedQuestions, question])
    }
  }
  
  const handleRemoveQuestion = (id: string) => {
    setSelectedQuestions(selectedQuestions.filter(q => q.id !== id))
  }
  
  const handleClearAll = () => {
    setSelectedQuestions([])
  }

  // Export handlers
  const handleExportWord = async (includeMarkScheme: boolean = false) => {
    if (selectedQuestions.length === 0) return
    
    setIsExporting(true)
    setExportSuccess(false)
    
    try {
      const exportQuestions = selectedQuestions.map(toExportFormat)
      
      if (includeMarkScheme) {
        await exportExamWithMarkScheme(exportQuestions, examTitle)
      } else {
        await exportExamToWord(exportQuestions, examTitle, {
          includeMarkScheme: false,
          includeAnswers: false,
        })
      }
      
      setExportSuccess(true)
      setTimeout(() => setExportSuccess(false), 3000)
    } catch (err) {
      console.error("Export error:", err)
      setError("Failed to export document")
    } finally {
      setIsExporting(false)
    }
  }
  
  // Calculate total marks
  const totalMarks = selectedQuestions.reduce((sum, q) => sum + q.marks, 0)
  
  return (
    <div className="h-screen flex flex-col lg:flex-row">
      {/* LEFT SIDEBAR - QUESTION BANK */}
      <div className="w-full lg:w-[35%] border-r-0 lg:border-r-2 border-swiss-ink/10 dark:border-swiss-ink/20 flex flex-col bg-swiss-paper">
        {/* Header */}
        <div className="border-b-2 border-swiss-ink/10 dark:border-swiss-ink/20 p-6 bg-swiss-concrete dark:bg-swiss-ink/5">
          <h1 className="text-2xl font-bold text-swiss-ink uppercase tracking-widest">
            EXAM BUILDER
          </h1>
          <p className="text-sm text-swiss-lead mt-2 tracking-wide">
            Select questions to build your exam
          </p>
          
          {/* Data Source Indicator */}
          {!isLoading && (
            <div className={`mt-3 flex items-center gap-2 ${hasDbData ? 'text-green-600' : 'text-amber-600'}`}>
              {hasDbData ? (
                <>
                  <Database className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Connected to Question Bank
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Using Demo Questions
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Search Input */}
        <div className="border-b-2 border-swiss-ink/10 dark:border-swiss-ink/20 p-4 bg-swiss-paper">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-swiss-lead" />
            <input
              type="text"
              placeholder="Search by topic or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-swiss-paper text-swiss-ink border-2 border-swiss-ink/20 pl-10 pr-4 py-2 text-sm font-medium focus:outline-none focus:border-swiss-signal transition-colors duration-200"
            />
          </div>
        </div>
        
        {/* Filters */}
        <div className="border-b-2 border-swiss-ink/10 dark:border-swiss-ink/20 p-4 bg-swiss-paper space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {/* Tier Filter */}
            <div>
              <label className="block text-xs font-bold text-swiss-ink uppercase tracking-widest mb-2">
                TIER
              </label>
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="w-full bg-swiss-paper text-swiss-ink border-2 border-swiss-ink/20 p-2 text-sm font-medium focus:outline-none focus:border-swiss-signal transition-colors duration-200"
              >
                <option value="All">All</option>
                <option value="Foundation">Foundation</option>
                <option value="Higher">Higher</option>
              </select>
            </div>
            
            {/* Topic Filter */}
            <div>
              <label className="block text-xs font-bold text-swiss-ink uppercase tracking-widest mb-2">
                TOPIC
              </label>
              <select
                value={topicFilter}
                onChange={(e) => setTopicFilter(e.target.value)}
                className="w-full bg-swiss-paper text-swiss-ink border-2 border-swiss-ink/20 p-2 text-sm font-medium focus:outline-none focus:border-swiss-signal transition-colors duration-200"
              >
                <option value="All">All</option>
                {topics.map(topic => (
                  <option key={topic} value={topic}>{topic}</option>
                ))}
              </select>
            </div>
            
            {/* Calculator Filter */}
            <div>
              <label className="block text-xs font-bold text-swiss-ink uppercase tracking-widest mb-2">
                CALC
              </label>
              <select
                value={calculatorFilter}
                onChange={(e) => setCalculatorFilter(e.target.value)}
                className="w-full bg-swiss-paper text-swiss-ink border-2 border-swiss-ink/20 p-2 text-sm font-medium focus:outline-none focus:border-swiss-signal transition-colors duration-200"
              >
                <option value="All">All</option>
                <option value="Calculator">Calculator</option>
                <option value="Non-Calculator">Non-Calc</option>
              </select>
            </div>
          </div>
          
          {/* Results count */}
          <div className="pt-2 border-t-2 border-swiss-ink/10 dark:border-swiss-ink/20 flex items-center justify-between">
            <p className="text-xs text-swiss-lead uppercase tracking-wider">
              {filteredQuestions.length} QUESTIONS FOUND
            </p>
            {isLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-swiss-signal" />
            )}
          </div>
        </div>
        
        {/* Question List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 mx-auto text-swiss-signal animate-spin mb-4" />
              <p className="text-swiss-lead text-sm uppercase tracking-wider">
                LOADING QUESTIONS...
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 mx-auto text-amber-500 mb-4" />
              <p className="text-swiss-lead text-sm uppercase tracking-wider mb-2">
                {error}
              </p>
              <p className="text-xs text-swiss-lead">
                Showing demo questions instead
              </p>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto text-swiss-lead/40 mb-4" />
              <p className="text-swiss-lead text-sm uppercase tracking-wider">
                NO QUESTIONS MATCH FILTERS
              </p>
            </div>
          ) : (
            filteredQuestions.map(question => (
              <QuestionBankCard
                key={question.id}
                question={question}
                onAdd={handleAddQuestion}
                isAdded={selectedQuestions.some(q => q.id === question.id)}
              />
            ))
          )}
        </div>
      </div>
      
      {/* RIGHT PANEL - EXAM PREVIEW */}
      <div className="w-full lg:w-[65%] flex flex-col bg-swiss-paper">
        {/* Header */}
        <div className="border-b-2 border-swiss-ink/10 dark:border-swiss-ink/20 p-6 bg-swiss-concrete dark:bg-swiss-ink/5">
          <div className="flex flex-col gap-4">
            {/* Title Input */}
            <div>
              <label className="block text-xs font-bold text-swiss-ink uppercase tracking-widest mb-2">
                EXAM TITLE
              </label>
              <input
                type="text"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                className="w-full bg-swiss-paper text-swiss-ink border-2 border-swiss-ink/20 px-4 py-2 text-lg font-bold focus:outline-none focus:border-swiss-signal transition-colors duration-200"
                placeholder="Enter exam title..."
              />
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-sm text-swiss-lead tracking-wide">
                  {selectedQuestions.length} {selectedQuestions.length === 1 ? 'Question' : 'Questions'} · Total: {totalMarks} {totalMarks === 1 ? 'Mark' : 'Marks'}
                </p>
              </div>
              
              <div className="flex items-center gap-3 flex-wrap">
                {/* Mark Scheme Toggle */}
                <button
                  onClick={() => setShowMarkScheme(!showMarkScheme)}
                  className={`px-4 py-2 border-2 text-sm font-bold uppercase tracking-wider transition-colors duration-200 ${
                    showMarkScheme
                      ? 'bg-swiss-signal border-swiss-signal text-white'
                      : 'bg-swiss-paper border-swiss-ink/20 text-swiss-ink hover:border-swiss-signal'
                  }`}
                >
                  {showMarkScheme ? '✓ MARK SCHEME' : 'MARK SCHEME'}
                </button>
                
                {/* Export Dropdown */}
                {selectedQuestions.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleExportWord(false)}
                      disabled={isExporting}
                      className="bg-swiss-signal hover:bg-swiss-ink text-white font-bold uppercase tracking-wider text-xs border-2 border-swiss-ink"
                    >
                      {isExporting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : exportSuccess ? (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      ) : (
                        <FileDown className="w-4 h-4 mr-2" />
                      )}
                      {exportSuccess ? "EXPORTED!" : "EXPORT WORD"}
                    </Button>
                    
                    <Button
                      onClick={() => handleExportWord(true)}
                      disabled={isExporting}
                      variant="outline"
                      className="font-bold uppercase tracking-wider text-xs border-2"
                    >
                      + ANSWERS
                    </Button>
                  </div>
                )}
                
                {/* Clear All Button */}
                {selectedQuestions.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="px-4 py-2 border-2 border-swiss-ink/20 bg-swiss-paper text-swiss-ink text-sm font-bold uppercase tracking-wider hover:border-swiss-signal hover:text-swiss-signal transition-colors duration-200 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    CLEAR
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Exam Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedQuestions.length === 0 ? (
            <div className="text-center py-24">
              <FileText className="w-16 h-16 mx-auto text-swiss-lead/40 mb-6" />
              <h3 className="text-xl font-bold text-swiss-ink uppercase tracking-widest mb-2">
                NO QUESTIONS SELECTED
              </h3>
              <p className="text-swiss-lead text-sm uppercase tracking-wider mb-6">
                Add questions from the left panel to build your exam
              </p>
              <Link href="/dashboard/questions/browse">
                <Button className="bg-swiss-signal hover:bg-swiss-ink text-white font-bold uppercase tracking-wider">
                  <Database className="w-4 h-4 mr-2" />
                  Browse Full Question Bank
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-8 max-w-4xl">
              {selectedQuestions.map((question, index) => (
                <div
                  key={question.id}
                  className="border-2 border-swiss-ink/10 dark:border-swiss-ink/20 bg-swiss-paper"
                >
                  {/* Question Header */}
                  <div className="border-b-2 border-swiss-ink/10 dark:border-swiss-ink/20 p-4 bg-swiss-concrete dark:bg-swiss-ink/5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-swiss-lead uppercase tracking-widest mb-1">
                        QUESTION {index + 1}
                      </p>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs px-2 py-1 bg-swiss-paper border-2 border-swiss-ink/20 text-swiss-ink font-bold uppercase tracking-wider">
                          {question.id.slice(0, 8)}
                        </span>
                        <span className="text-xs px-2 py-1 bg-swiss-paper border-2 border-swiss-ink/20 text-swiss-ink font-bold uppercase tracking-wider">
                          {question.marks} {question.marks === 1 ? 'MARK' : 'MARKS'}
                        </span>
                        <span className="text-xs px-2 py-1 bg-swiss-paper border-2 border-swiss-ink/20 text-swiss-ink font-medium">
                          {question.tier}
                        </span>
                        <span className="text-xs px-2 py-1 bg-swiss-paper border-2 border-swiss-ink/20 text-swiss-ink font-medium">
                          {question.topic}
                        </span>
                        {question.source === "database" && (
                          <Badge variant="outline" className="text-[10px]">DB</Badge>
                        )}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleRemoveQuestion(question.id)}
                      className="p-2 border-2 border-swiss-ink/20 bg-swiss-paper text-swiss-ink hover:border-swiss-signal hover:text-swiss-signal transition-colors duration-200"
                      aria-label="Remove question"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Question Text with LaTeX rendering */}
                  <div className="p-6">
                    {question.imageUrl && (
                      <div className="mb-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={question.imageUrl} 
                          alt="Question image" 
                          className="max-w-full h-auto rounded border border-swiss-ink/10"
                        />
                      </div>
                    )}
                    <div className="text-swiss-ink text-base leading-relaxed">
                      <LatexPreview latex={question.questionLatex} />
                    </div>
                  </div>
                  
                  {/* Mark Scheme (Conditional) with LaTeX rendering */}
                  {showMarkScheme && (
                    <div className="border-t-2 border-swiss-ink/10 dark:border-swiss-ink/20 p-6 bg-swiss-concrete dark:bg-swiss-ink/5">
                      <p className="text-xs font-bold text-swiss-signal uppercase tracking-widest mb-3">
                        MARK SCHEME
                      </p>
                      <div className="text-swiss-ink text-sm leading-relaxed">
                        <LatexPreview latex={question.markSchemeLatex} className="text-sm" />
                      </div>
                    </div>
                  )}
                  
                  {/* Learning Objective */}
                  <div className="border-t-2 border-swiss-ink/10 dark:border-swiss-ink/20 p-4 bg-swiss-paper">
                    <p className="text-xs text-swiss-lead uppercase tracking-wider">
                      {question.learningObjective}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
