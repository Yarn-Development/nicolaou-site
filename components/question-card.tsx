"use client"

import { useState } from "react"
import { Plus, Check, Bookmark, BookmarkCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { QuestionDisplay, SourceBadge } from "@/components/question-display"
import { saveQuestionToBank, removeQuestionFromBank } from "@/app/actions/saved-questions"
import { toast } from "sonner"
import type { Question } from "@/lib/types/database"

interface QuestionCardProps {
  question: Question
  onAdd: (question: Question) => void
  disabled?: boolean
  isAdded?: boolean
  /** Show full question preview or compact view */
  variant?: 'full' | 'compact'
  /** Whether this question is saved in the teacher's personal bank */
  isSaved?: boolean
  /** Show the save-to-bank button */
  showSaveButton?: boolean
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
  variant = 'compact',
  isSaved: initialIsSaved = false,
  showSaveButton = true,
}: QuestionCardProps) {
  const [isSaved, setIsSaved] = useState(initialIsSaved)
  const [isSaving, setIsSaving] = useState(false)

  const handleToggleSave = async () => {
    setIsSaving(true)
    try {
      if (isSaved) {
        const result = await removeQuestionFromBank(question.id)
        if (result.success) {
          setIsSaved(false)
          toast.success('Removed from Personal Bank')
        } else {
          toast.error('Failed to remove from bank')
        }
      } else {
        const result = await saveQuestionToBank(question.id)
        if (result.success) {
          setIsSaved(true)
          toast.success('Saved to Personal Bank')
        } else {
          toast.error('Failed to save to bank')
        }
      }
    } catch {
      toast.error('An error occurred')
    } finally {
      setIsSaving(false)
    }
  }

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

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Save to Bank Button */}
            {showSaveButton && (
              <Button
                onClick={handleToggleSave}
                disabled={isSaving}
                variant="outline"
                size="sm"
                className={`
                  text-xs px-2 py-2 transition-colors duration-200
                  ${isSaved 
                    ? "border-foreground text-foreground bg-muted hover:bg-muted" 
                    : "border-swiss-ink/30 text-swiss-lead hover:border-swiss-ink hover:text-swiss-ink"
                  }
                `}
                title={isSaved ? "Remove from Personal Bank" : "Save to Personal Bank"}
              >
                {isSaved ? (
                  <BookmarkCheck className="h-4 w-4" />
                ) : (
                  <Bookmark className="h-4 w-4" />
                )}
              </Button>
            )}

            {/* Add Button */}
            <Button
              onClick={() => onAdd(question)}
              disabled={disabled || isAdded}
              className={`
                font-bold uppercase tracking-wider text-xs px-4 py-2
                transition-colors duration-200
                ${isAdded 
                  ? "bg-foreground text-background border-2 border-foreground hover:bg-foreground" 
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
              ? 'border-foreground text-foreground bg-foreground/5'
              : 'border-muted-foreground text-muted-foreground bg-muted'
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
            ? "bg-foreground text-background hover:bg-foreground/90"
            : "bg-swiss-signal text-white hover:bg-swiss-ink"
          }
        `}
      >
        {isAdded ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
      </Button>
    </div>
  )
}
