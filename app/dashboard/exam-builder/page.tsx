"use client"

import { useState } from "react"
import { QuestionCard, Question } from "@/components/question-card"
import { mockQuestions } from "@/lib/mock-questions"
import { X, FileText, Trash2 } from "lucide-react"

export default function ExamBuilderPage() {
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([])
  const [showMarkScheme, setShowMarkScheme] = useState(false)
  
  // Filter states
  const [tierFilter, setTierFilter] = useState<string>("All")
  const [levelFilter, setLevelFilter] = useState<string>("All")
  const [topicFilter, setTopicFilter] = useState<string>("All")
  const [calculatorFilter, setCalculatorFilter] = useState<string>("All")
  
  // Get unique values for filters
  const tiers = ["All", ...Array.from(new Set(mockQuestions.map(q => q.tier)))]
  const levels = ["All", ...Array.from(new Set(mockQuestions.map(q => q.level)))]
  const topics = ["All", ...Array.from(new Set(mockQuestions.map(q => q.topic)))]
  const calculatorOptions = ["All", "Calculator", "Non-Calculator"]
  
  // Filter logic
  const filteredQuestions = mockQuestions.filter(q => {
    if (tierFilter !== "All" && q.tier !== tierFilter) return false
    if (levelFilter !== "All" && q.level !== levelFilter) return false
    if (topicFilter !== "All" && q.topic !== topicFilter) return false
    if (calculatorFilter === "Calculator" && !q.calculatorAllowed) return false
    if (calculatorFilter === "Non-Calculator" && q.calculatorAllowed) return false
    return true
  })
  
  // Handler functions
  const handleAddQuestion = (question: Question) => {
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
  
  // Calculate total marks
  const totalMarks = selectedQuestions.reduce((sum, q) => sum + q.marks, 0)
  
  return (
    <div className="h-screen flex flex-col lg:flex-row">
      {/* LEFT SIDEBAR - QUESTION BANK */}
      <div className="w-full lg:w-[30%] border-r-0 lg:border-r-2 border-swiss-ink/10 dark:border-swiss-ink/20 flex flex-col bg-swiss-paper">
        {/* Header */}
        <div className="border-b-2 border-swiss-ink/10 dark:border-swiss-ink/20 p-6 bg-swiss-concrete dark:bg-swiss-ink/5">
          <h1 className="text-2xl font-bold text-swiss-ink uppercase tracking-widest">
            EXAM BUILDER
          </h1>
          <p className="text-sm text-swiss-lead mt-2 tracking-wide">
            Select questions to build your exam
          </p>
        </div>
        
        {/* Filters */}
        <div className="border-b-2 border-swiss-ink/10 dark:border-swiss-ink/20 p-4 bg-swiss-paper space-y-3">
          <div className="grid grid-cols-2 gap-3">
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
                {tiers.map(tier => (
                  <option key={tier} value={tier}>{tier}</option>
                ))}
              </select>
            </div>
            
            {/* Level Filter */}
            <div>
              <label className="block text-xs font-bold text-swiss-ink uppercase tracking-widest mb-2">
                LEVEL
              </label>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="w-full bg-swiss-paper text-swiss-ink border-2 border-swiss-ink/20 p-2 text-sm font-medium focus:outline-none focus:border-swiss-signal transition-colors duration-200"
              >
                {levels.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
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
                {topics.map(topic => (
                  <option key={topic} value={topic}>{topic}</option>
                ))}
              </select>
            </div>
            
            {/* Calculator Filter */}
            <div>
              <label className="block text-xs font-bold text-swiss-ink uppercase tracking-widest mb-2">
                CALCULATOR
              </label>
              <select
                value={calculatorFilter}
                onChange={(e) => setCalculatorFilter(e.target.value)}
                className="w-full bg-swiss-paper text-swiss-ink border-2 border-swiss-ink/20 p-2 text-sm font-medium focus:outline-none focus:border-swiss-signal transition-colors duration-200"
              >
                {calculatorOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Results count */}
          <div className="pt-2 border-t-2 border-swiss-ink/10 dark:border-swiss-ink/20">
            <p className="text-xs text-swiss-lead uppercase tracking-wider">
              {filteredQuestions.length} QUESTIONS FOUND
            </p>
          </div>
        </div>
        
        {/* Question List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredQuestions.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto text-swiss-lead/40 mb-4" />
              <p className="text-swiss-lead text-sm uppercase tracking-wider">
                NO QUESTIONS MATCH FILTERS
              </p>
            </div>
          ) : (
            filteredQuestions.map(question => (
              <QuestionCard
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
      <div className="w-full lg:w-[70%] flex flex-col bg-swiss-paper">
        {/* Header */}
        <div className="border-b-2 border-swiss-ink/10 dark:border-swiss-ink/20 p-6 bg-swiss-concrete dark:bg-swiss-ink/5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-swiss-ink uppercase tracking-widest">
                CURRENT EXAM
              </h2>
              <p className="text-sm text-swiss-lead mt-1 tracking-wide">
                {selectedQuestions.length} {selectedQuestions.length === 1 ? 'Question' : 'Questions'} · Total: {totalMarks} {totalMarks === 1 ? 'Mark' : 'Marks'}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
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
              
              {/* Clear All Button */}
              {selectedQuestions.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="px-4 py-2 border-2 border-swiss-ink/20 bg-swiss-paper text-swiss-ink text-sm font-bold uppercase tracking-wider hover:border-swiss-signal hover:text-swiss-signal transition-colors duration-200 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  CLEAR ALL
                </button>
              )}
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
              <p className="text-swiss-lead text-sm uppercase tracking-wider">
                Add questions from the left panel to build your exam
              </p>
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
                          {question.id}
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
                  
                  {/* Question Text */}
                  <div className="p-6">
                    <p className="text-swiss-ink text-base leading-relaxed">
                      {question.questionText}
                    </p>
                  </div>
                  
                  {/* Mark Scheme (Conditional) */}
                  {showMarkScheme && (
                    <div className="border-t-2 border-swiss-ink/10 dark:border-swiss-ink/20 p-6 bg-swiss-concrete dark:bg-swiss-ink/5">
                      <p className="text-xs font-bold text-swiss-signal uppercase tracking-widest mb-3">
                        MARK SCHEME
                      </p>
                      <p className="text-swiss-ink text-sm leading-relaxed whitespace-pre-line">
                        {question.markSchemeText}
                      </p>
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
