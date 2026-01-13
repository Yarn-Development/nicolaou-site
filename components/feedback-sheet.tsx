"use client"

import { useMemo } from "react"

// =====================================================
// TYPES
// =====================================================

export interface GradedQuestion {
  id: string
  maxMarks: number
  studentMarks: number
  learningObjective: string
  questionNumber?: number
}

type RAGStatus = "red" | "amber" | "green"

interface ObjectiveSummary {
  objective: string
  totalMarks: number
  studentMarks: number
  percentage: number
  ragStatus: RAGStatus
  questionCount: number
  questions: GradedQuestion[]
}

// =====================================================
// RAG LOGIC
// =====================================================

function calculateRAGStatus(percentage: number): RAGStatus {
  if (percentage < 40) return "red"
  if (percentage <= 70) return "amber"
  return "green"
}

function getRAGColor(status: RAGStatus): string {
  switch (status) {
    case "red":
      return "bg-red-500"
    case "amber":
      return "bg-amber-500"
    case "green":
      return "bg-green-500"
  }
}

function getRAGTextColor(status: RAGStatus): string {
  switch (status) {
    case "red":
      return "text-red-500"
    case "amber":
      return "text-amber-500"
    case "green":
      return "text-green-500"
  }
}

function getRAGLabel(status: RAGStatus): string {
  switch (status) {
    case "red":
      return "NEEDS WORK"
    case "amber":
      return "DEVELOPING"
    case "green":
      return "STRONG"
  }
}

// =====================================================
// COMPONENT PROPS
// =====================================================

interface FeedbackSheetProps {
  questions: GradedQuestion[]
  studentName?: string
  assessmentTitle?: string
  assessmentDate?: string
  printMode?: boolean
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export function FeedbackSheet({
  questions,
  studentName,
  assessmentTitle,
  assessmentDate,
  printMode = false
}: FeedbackSheetProps) {
  // Group questions by learning objective and calculate statistics
  const objectiveSummaries = useMemo<ObjectiveSummary[]>(() => {
    const grouped = questions.reduce((acc, question) => {
      const objective = question.learningObjective
      
      if (!acc[objective]) {
        acc[objective] = {
          objective,
          totalMarks: 0,
          studentMarks: 0,
          questionCount: 0,
          questions: []
        }
      }
      
      acc[objective].totalMarks += question.maxMarks
      acc[objective].studentMarks += question.studentMarks
      acc[objective].questionCount += 1
      acc[objective].questions.push(question)
      
      return acc
    }, {} as Record<string, Omit<ObjectiveSummary, "percentage" | "ragStatus">>)

    // Calculate percentages and RAG status
    return Object.values(grouped).map(summary => {
      const percentage = summary.totalMarks > 0 
        ? Math.round((summary.studentMarks / summary.totalMarks) * 100)
        : 0
      
      return {
        ...summary,
        percentage,
        ragStatus: calculateRAGStatus(percentage)
      }
    }).sort((a, b) => a.objective.localeCompare(b.objective))
  }, [questions])

  // Calculate overall statistics
  const overallStats = useMemo(() => {
    const totalMarks = questions.reduce((sum, q) => sum + q.maxMarks, 0)
    const studentMarks = questions.reduce((sum, q) => sum + q.studentMarks, 0)
    const percentage = totalMarks > 0 ? Math.round((studentMarks / totalMarks) * 100) : 0
    
    return {
      totalMarks,
      studentMarks,
      percentage,
      ragStatus: calculateRAGStatus(percentage)
    }
  }, [questions])

  // Get revision list (Red and Amber objectives only)
  const revisionList = useMemo(() => {
    return objectiveSummaries.filter(
      summary => summary.ragStatus === "red" || summary.ragStatus === "amber"
    )
  }, [objectiveSummaries])

  return (
    <div className={`${printMode ? 'print:p-8' : 'p-8'} bg-swiss-paper`}>
      {/* Header */}
      <div className="border-4 border-swiss-ink bg-swiss-paper mb-8 print:mb-6">
        <div className="bg-swiss-signal p-6 border-b-4 border-swiss-ink">
          <h1 className="text-4xl font-black uppercase tracking-widest text-white mb-2">
            STUDENT FEEDBACK SHEET
          </h1>
          {assessmentTitle && (
            <p className="text-lg font-bold uppercase tracking-wider text-white/90">
              {assessmentTitle}
            </p>
          )}
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {studentName && (
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-swiss-lead mb-1">
                STUDENT NAME
              </p>
              <p className="text-lg font-bold text-swiss-ink">
                {studentName}
              </p>
            </div>
          )}
          
          {assessmentDate && (
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-swiss-lead mb-1">
                DATE
              </p>
              <p className="text-lg font-bold text-swiss-ink">
                {assessmentDate}
              </p>
            </div>
          )}
          
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-swiss-lead mb-1">
              OVERALL SCORE
            </p>
            <p className={`text-3xl font-black ${getRAGTextColor(overallStats.ragStatus)}`}>
              {overallStats.studentMarks}/{overallStats.totalMarks} ({overallStats.percentage}%)
            </p>
          </div>
        </div>
      </div>

      {/* Main Results Table */}
      <div className="border-2 border-swiss-ink mb-8 print:mb-6 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-swiss-ink text-white">
              <th className="border-2 border-swiss-ink p-3 text-left text-xs font-black uppercase tracking-widest">
                QUESTION #
              </th>
              <th className="border-2 border-swiss-ink p-3 text-left text-xs font-black uppercase tracking-widest">
                TOPIC / OBJECTIVE
              </th>
              <th className="border-2 border-swiss-ink p-3 text-center text-xs font-black uppercase tracking-widest">
                MAX MARKS
              </th>
              <th className="border-2 border-swiss-ink p-3 text-center text-xs font-black uppercase tracking-widest">
                STUDENT MARKS
              </th>
              <th className="border-2 border-swiss-ink p-3 text-center text-xs font-black uppercase tracking-widest">
                SCORE
              </th>
              <th className="border-2 border-swiss-ink p-3 text-center text-xs font-black uppercase tracking-widest">
                RAG STATUS
              </th>
            </tr>
          </thead>
          <tbody>
            {questions.map((question, index) => {
              const percentage = question.maxMarks > 0 
                ? Math.round((question.studentMarks / question.maxMarks) * 100)
                : 0
              const ragStatus = calculateRAGStatus(percentage)
              
              return (
                <tr 
                  key={question.id}
                  className="hover:bg-swiss-concrete transition-colors print:hover:bg-transparent"
                >
                  <td className="border-2 border-swiss-ink/20 p-3 text-center font-black text-swiss-ink">
                    {question.questionNumber || index + 1}
                  </td>
                  <td className="border-2 border-swiss-ink/20 p-3 text-sm font-medium text-swiss-ink">
                    {question.learningObjective}
                  </td>
                  <td className="border-2 border-swiss-ink/20 p-3 text-center font-bold text-swiss-ink">
                    {question.maxMarks}
                  </td>
                  <td className="border-2 border-swiss-ink/20 p-3 text-center font-bold text-swiss-ink">
                    {question.studentMarks}
                  </td>
                  <td className={`border-2 border-swiss-ink/20 p-3 text-center font-black ${getRAGTextColor(ragStatus)}`}>
                    {percentage}%
                  </td>
                  <td className="border-2 border-swiss-ink/20 p-3">
                    <div className="flex items-center justify-center gap-2">
                      <div className={`w-4 h-4 ${getRAGColor(ragStatus)} border-2 border-swiss-ink`}></div>
                      <span className="text-xs font-black uppercase tracking-wider text-swiss-ink">
                        {getRAGLabel(ragStatus)}
                      </span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Learning Objectives Summary */}
      <div className="border-2 border-swiss-ink mb-8 print:mb-6">
        <div className="bg-swiss-concrete dark:bg-swiss-ink/5 border-b-2 border-swiss-ink p-4">
          <h2 className="text-xl font-black uppercase tracking-widest text-swiss-ink">
            LEARNING OBJECTIVES SUMMARY
          </h2>
        </div>
        
        <div className="p-6 space-y-4">
          {objectiveSummaries.map((summary) => (
            <div 
              key={summary.objective}
              className="border-2 border-swiss-ink bg-swiss-paper p-4"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-swiss-ink mb-1">
                    {summary.objective}
                  </h3>
                  <p className="text-xs text-swiss-lead uppercase tracking-wider font-bold">
                    {summary.questionCount} {summary.questionCount === 1 ? 'Question' : 'Questions'}
                  </p>
                </div>
                
                <div className="text-right">
                  <p className={`text-2xl font-black ${getRAGTextColor(summary.ragStatus)} mb-1`}>
                    {summary.percentage}%
                  </p>
                  <div className="flex items-center justify-end gap-2">
                    <div className={`w-3 h-3 ${getRAGColor(summary.ragStatus)} border-2 border-swiss-ink`}></div>
                    <span className="text-xs font-black uppercase tracking-wider text-swiss-ink">
                      {getRAGLabel(summary.ragStatus)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-xs font-bold text-swiss-ink">
                <span className="uppercase tracking-wider">SCORE:</span>
                <span>{summary.studentMarks}/{summary.totalMarks} MARKS</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Revision List */}
      {revisionList.length > 0 && (
        <div className="border-4 border-swiss-signal bg-swiss-paper print:break-before-page">
          <div className="bg-swiss-signal p-6 border-b-4 border-swiss-ink">
            <h2 className="text-2xl font-black uppercase tracking-widest text-white">
              📋 REVISION LIST
            </h2>
            <p className="text-sm font-bold uppercase tracking-wider text-white/90 mt-2">
              Focus on these areas to improve your understanding
            </p>
          </div>
          
          <div className="p-6 space-y-4">
            {revisionList.map((summary, index) => (
              <div 
                key={summary.objective}
                className="flex items-start gap-4 pb-4 border-b-2 border-swiss-ink/10 last:border-b-0"
              >
                <div className="flex-shrink-0">
                  <div className={`w-12 h-12 ${getRAGColor(summary.ragStatus)} border-2 border-swiss-ink flex items-center justify-center`}>
                    <span className="text-2xl font-black text-white">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>
                </div>
                
                <div className="flex-1">
                  <h3 className="text-base font-black uppercase tracking-wider text-swiss-ink mb-2">
                    {summary.objective}
                  </h3>
                  
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-swiss-lead mb-1">
                        SCORE
                      </p>
                      <p className={`text-xl font-black ${getRAGTextColor(summary.ragStatus)}`}>
                        {summary.percentage}%
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-swiss-lead mb-1">
                        MARKS
                      </p>
                      <p className="text-xl font-black text-swiss-ink">
                        {summary.studentMarks}/{summary.totalMarks}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-swiss-lead mb-1">
                        STATUS
                      </p>
                      <p className={`text-sm font-black uppercase tracking-wider ${getRAGTextColor(summary.ragStatus)}`}>
                        {getRAGLabel(summary.ragStatus)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="border-l-4 border-swiss-signal bg-swiss-concrete dark:bg-swiss-ink/5 p-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-swiss-ink mb-1">
                      💡 RECOMMENDED ACTION
                    </p>
                    <p className="text-xs text-swiss-lead font-medium">
                      {summary.ragStatus === "red" 
                        ? "Review class notes and complete additional practice exercises on this topic. Consider asking your teacher for extra support."
                        : "Review your work and practice similar questions to strengthen your understanding of this topic."}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Summary Footer */}
          <div className="bg-swiss-concrete dark:bg-swiss-ink/5 border-t-4 border-swiss-ink p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-swiss-lead mb-1">
                  AREAS FOR IMPROVEMENT
                </p>
                <p className="text-2xl font-black text-swiss-ink">
                  {revisionList.length} {revisionList.length === 1 ? 'Topic' : 'Topics'}
                </p>
              </div>
              
              <div className="flex gap-6">
                <div className="text-right">
                  <p className="text-xs font-black uppercase tracking-widest text-swiss-lead mb-1">
                    NEEDS WORK
                  </p>
                  <p className="text-2xl font-black text-red-500">
                    {revisionList.filter(s => s.ragStatus === "red").length}
                  </p>
                </div>
                
                <div className="text-right">
                  <p className="text-xs font-black uppercase tracking-widest text-swiss-lead mb-1">
                    DEVELOPING
                  </p>
                  <p className="text-2xl font-black text-amber-500">
                    {revisionList.filter(s => s.ragStatus === "amber").length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          .print\\:break-before-page {
            page-break-before: always;
          }
        }
      `}</style>
    </div>
  )
}
