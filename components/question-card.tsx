"use client"

import { Plus, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { QuestionDisplay, SourceBadge } from "@/components/question-display"
import type { Question } from "@/lib/types/database"

interface QuestionCardProps {
  question: Question
  onAdd: (question: Question) => void
  disabled?: boolean
  isAdded?: boolean
  /** Show full question preview or compact view */
  variant?: 'full' | 'compact'
}

/**
 * QuestionCard - Professional question card for the question bank
 * 
 * Uses QuestionDisplay internally for consistent rendering.
 * Never shows raw LaTeX - always rendered through LatexPreview.
 */
export function QuestionCard({ 
  question, 
  onAdd, 
  disabled, 
  isAdded,
  variant = 'compact'
}: QuestionCardProps) {
  return (
    <div className={`
      border-2 border-swiss-ink bg-swiss-paper
      hover:bg-swiss-concrete transition-colors group
      ${isAdded ? 'ring-2 ring-green-500 ring-offset-2' : ''}
    `}>
      {/* Header */}
      <div className="p-4 border-b border-swiss-ink/10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Source Badge & Marks */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <SourceBadge contentType={question.content_type} />
              {question.marks && (
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 bg-swiss-ink text-white">
                  {question.marks} {question.marks === 1 ? "Mark" : "Marks"}
                </span>
              )}
              {question.calculator_allowed !== null && (
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 border border-swiss-ink/30 text-swiss-ink">
                  {question.calculator_allowed ? "Calculator" : "Non-Calc"}
                </span>
              )}
            </div>

            {/* Topic Info */}
            {(question.topic_name || question.sub_topic_name) && (
              <div className="flex items-center gap-2 text-xs text-swiss-lead">
                {question.topic_name && (
                  <span className="font-bold">{question.topic_name}</span>
                )}
                {question.sub_topic_name && (
                  <>
                    <span className="text-swiss-ink/30">/</span>
                    <span>{question.sub_topic_name}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Add Button */}
          <Button
            onClick={() => onAdd(question)}
            disabled={disabled || isAdded}
            className={`
              font-bold uppercase tracking-wider text-xs px-4 py-2
              transition-colors duration-200 flex-shrink-0
              ${isAdded 
                ? "bg-green-500 text-white border-2 border-green-600 hover:bg-green-500" 
                : "bg-swiss-signal text-white hover:bg-swiss-ink"
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {isAdded ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Added
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Question Content */}
      <div className="p-4">
        <QuestionDisplay
          question={question}
          variant="inline"
          showSourceBadge={false}
          showTopicInfo={false}
          enableZoom={true}
          maxHeight={variant === 'compact' ? '200px' : undefined}
        />
      </div>

      {/* Footer - Metadata */}
      <div className="px-4 pb-4">
        <div className="flex flex-wrap gap-2 pt-3 border-t border-swiss-ink/10">
          {/* Difficulty */}
          <span className={`
            text-[10px] font-bold uppercase tracking-wider px-2 py-1 border
            ${question.difficulty === 'Higher' 
              ? 'border-purple-500 text-purple-700 bg-purple-50' 
              : 'border-blue-500 text-blue-700 bg-blue-50'
            }
          `}>
            {question.difficulty}
          </span>

          {/* Question Type */}
          {question.question_type && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 border border-swiss-ink/30 text-swiss-ink">
              {question.question_type}
            </span>
          )}

          {/* Curriculum Level */}
          {question.curriculum_level && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 border border-swiss-ink/30 text-swiss-ink">
              {question.curriculum_level}
            </span>
          )}

          {/* Usage Stats */}
          {question.times_used > 0 && (
            <span className="text-[10px] font-medium text-swiss-lead ml-auto">
              Used {question.times_used}x
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * QuestionCardCompact - Minimal card for lists and tables
 */
export function QuestionCardCompact({
  question,
  onAdd,
  isAdded,
  disabled,
}: QuestionCardProps) {
  return (
    <div className={`
      flex items-center gap-4 p-3
      border border-swiss-ink/20 bg-white
      hover:bg-swiss-paper transition-colors
      ${isAdded ? 'ring-1 ring-green-500' : ''}
    `}>
      {/* Source indicator */}
      <SourceBadge contentType={question.content_type} />

      {/* Content preview */}
      <div className="flex-1 min-w-0">
        <QuestionDisplay
          question={question}
          variant="inline"
          showSourceBadge={false}
          enableZoom={false}
          maxHeight="60px"
          className="text-sm"
        />
      </div>

      {/* Marks */}
      {question.marks && (
        <span className="text-xs font-bold text-swiss-lead flex-shrink-0">
          {question.marks}m
        </span>
      )}

      {/* Add button */}
      <Button
        size="sm"
        onClick={() => onAdd(question)}
        disabled={disabled || isAdded}
        className={`
          flex-shrink-0 text-xs
          ${isAdded 
            ? "bg-green-100 text-green-700 hover:bg-green-100" 
            : "bg-swiss-signal text-white hover:bg-swiss-ink"
          }
        `}
      >
        {isAdded ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
      </Button>
    </div>
  )
}
