'use client'

import { LatexPreview } from '@/components/latex-preview'
import { ImageLightbox } from '@/components/image-lightbox'
import { FileText, Triangle, Image as ImageIcon, FileCheck, BanIcon } from 'lucide-react'
import type { Question, ContentType, QuestionAnswerKey } from '@/lib/types/database'

interface QuestionDisplayProps {
  question: Question
  /** Display variant */
  variant?: 'card' | 'inline' | 'preview'
  /** Show the source badge */
  showSourceBadge?: boolean
  /** Show source label (e.g. "Edexcel GCSE Higher — Paper 1, 2023, Q12") */
  showSourceLabel?: boolean
  /** Show topic/subtopic info */
  showTopicInfo?: boolean
  /** Enable image zoom */
  enableZoom?: boolean
  /** Additional className */
  className?: string
  /** Max height for the container */
  maxHeight?: string
}

/**
 * QuestionDisplay - Professional question renderer for teacher UI
 * 
 * This is the single source of truth for rendering questions across the app.
 * It handles all content types and ensures a consistent, polished appearance.
 * 
 * Layout by content_type:
 * - generated_text: Text only (via LatexPreview)
 * - synthetic_image: Text first, then diagram below
 * - image_ocr: Image first, optional text below
 * - official_past_paper: Image first, optional text below
 */
export function QuestionDisplay({
  question,
  variant = 'card',
  showSourceBadge = true,
  showSourceLabel = false,
  showTopicInfo = false,
  enableZoom = true,
  className = '',
  maxHeight,
}: QuestionDisplayProps) {
  const { content_type, question_latex, image_url } = question

  // Determine layout based on content type
  const isTextFirst = content_type === 'synthetic_image' || content_type === 'generated_text'
  const hasImage = !!image_url
  const hasText = !!question_latex

  // Calculator indicator: use answer_key.source.is_calculator if present, else question.calculator_allowed
  const answerKey = question.answer_key as QuestionAnswerKey | null
  const isCalculatorAllowed = answerKey?.source?.is_calculator !== undefined
    ? answerKey.source.is_calculator
    : (question.calculator_allowed ?? true)

  // Build source label string
  const sourceLabel = buildSourceLabel(answerKey)

  // Determine container classes based on variant
  const containerClasses = variant === 'card'
    ? 'exam-paper-card'
    : variant === 'preview'
      ? 'bg-background p-4'
      : ''

  return (
    <div
      className={`question-display ${containerClasses} ${className}`}
      style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}
    >
      {/* Header Row - Badges at top, separated by divider */}
      {(showSourceBadge || showTopicInfo || showSourceLabel) && (
        <div className="exam-paper-header">
          {/* Source Badge */}
          {showSourceBadge && (
            <SourceBadge contentType={content_type} />
          )}

          {/* Topic Info */}
          {showTopicInfo && question.topic_name && (
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 bg-muted text-foreground border border-border/20">
              {question.topic_name}
            </span>
          )}
          {showTopicInfo && question.sub_topic_name && (
            <span className="text-xs font-medium text-muted-foreground">
              / {question.sub_topic_name}
            </span>
          )}

          {/* Legacy spec badge */}
          {(question.source_spec === 'legacy-modular' || question.source_spec === 'legacy-gcse') && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold uppercase tracking-wider border border-amber-400 text-amber-700 bg-amber-50">
              ⚠ Legacy spec
            </span>
          )}

          {/* Calculator indicator */}
          {!isCalculatorAllowed && (
            <span
              title="Non-calculator question"
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold uppercase tracking-wider border border-red-300 text-red-600 bg-red-50"
            >
              <BanIcon className="w-3 h-3" />
              No Calculator
            </span>
          )}

          {/* Marks Badge - Always show if available */}
          {question.marks && (
            <span className="ml-auto text-xs font-bold uppercase tracking-wider px-2 py-1 bg-muted text-foreground border border-border/20">
              {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
            </span>
          )}
        </div>
      )}

      {/* Source Label Row - "Edexcel GCSE Higher — Paper 1, 2023, Q12" */}
      {showSourceLabel && sourceLabel && (
        <div className="px-4 pb-2">
          <span className="text-xs text-muted-foreground italic">{sourceLabel}</span>
        </div>
      )}

      {/* Content Rendering - Text First Layout (synthetic_image, generated_text) */}
      {isTextFirst && (
        <div className="space-y-4">
          {/* Text Layer */}
          {hasText && (
            <div className="exam-paper-content">
              <LatexPreview 
                latex={question_latex} 
                className="text-foreground"
              />
            </div>
          )}

          {/* Diagram Layer - Framed container */}
          {hasImage && (
            <div className="exam-paper-diagram">
              {enableZoom ? (
                <ImageLightbox
                  src={image_url}
                  alt={`Diagram for question`}
                  width={400}
                  height={300}
                  className="max-w-md w-full"
                />
              ) : (
                <div className="max-w-md w-full">
                  <img
                    src={image_url}
                    alt={`Diagram for question`}
                    className="w-full h-auto object-contain"
                    style={{ maxHeight: '300px' }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Content Rendering - Image First Layout (image_ocr, official_past_paper) */}
      {!isTextFirst && (
        <div className="space-y-4">
          {/* Image Layer - Framed container */}
          {hasImage && (
            <div className="exam-paper-diagram">
              {enableZoom ? (
                <ImageLightbox
                  src={image_url}
                  alt={`Question image`}
                  width={500}
                  height={400}
                  className="max-w-lg w-full"
                />
              ) : (
                <div className="max-w-lg w-full">
                  <img
                    src={image_url}
                    alt={`Question image`}
                    className="w-full h-auto object-contain"
                    style={{ maxHeight: '400px' }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Optional Text Layer (OCR text) */}
          {hasText && (
            <div className="mt-4 pt-4 border-t border-border/20">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Extracted Text
              </p>
              <LatexPreview 
                latex={question_latex} 
                className="text-foreground text-sm"
              />
            </div>
          )}
        </div>
      )}

      {/* Fallback for no content */}
      {!hasText && !hasImage && (
        <div className="text-muted-foreground italic text-sm py-4 text-center">
          Question content not available
        </div>
      )}
    </div>
  )
}

/**
 * Build a human-readable source label from answer_key.source
 * e.g. "Edexcel GCSE Higher — Paper 1, 2023, Q12"
 */
function buildSourceLabel(answerKey: QuestionAnswerKey | null): string | null {
  const src = answerKey?.source
  if (!src) return null

  const parts: string[] = []
  if (src.exam_board) parts.push(src.exam_board)
  if (src.level) parts.push(src.level)

  const detail: string[] = []
  if (src.paper) detail.push(src.paper)
  if (src.year) detail.push(String(src.year))
  if (src.question_number) detail.push(src.question_number)

  if (parts.length === 0 && detail.length === 0) return null

  if (detail.length > 0) {
    return [...parts, detail.join(', ')].join(' — ')
  }
  return parts.join(' ')
}

/**
 * Source Label component — standalone, reusable
 */
export function QuestionSourceLabel({ answerKey, className = '' }: { answerKey: QuestionAnswerKey | null; className?: string }) {
  const label = buildSourceLabel(answerKey)
  if (!label) return null
  return <span className={`text-xs text-muted-foreground italic ${className}`}>{label}</span>
}

/**
 * Source Badge - Clean, friendly indicator of question origin
 */
function SourceBadge({ contentType }: { contentType: ContentType }) {
  const config = getSourceConfig(contentType)
  
  return (
    <span className={`
      inline-flex items-center gap-1.5
      px-2.5 py-1
      text-xs font-bold uppercase tracking-wider
      rounded-full
      ${config.bgColor}
      ${config.textColor}
      ${config.borderColor}
      border
    `}>
      <config.icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  )
}

/**
 * Get configuration for source badge
 */
function getSourceConfig(contentType: ContentType) {
  switch (contentType) {
    case 'generated_text':
      return {
        label: 'AI Generated',
        icon: FileText,
        bgColor: 'bg-muted',
        textColor: 'text-foreground',
        borderColor: 'border-border',
      }
    case 'synthetic_image':
      return {
        label: 'AI Diagram',
        icon: Triangle,
        bgColor: 'bg-foreground/5',
        textColor: 'text-foreground',
        borderColor: 'border-foreground/20',
      }
    case 'image_ocr':
      return {
        label: 'Scanned',
        icon: ImageIcon,
        bgColor: 'bg-muted',
        textColor: 'text-muted-foreground',
        borderColor: 'border-border',
      }
    case 'official_past_paper':
      return {
        label: 'Past Paper',
        icon: FileCheck,
        bgColor: 'bg-primary/5',
        textColor: 'text-primary',
        borderColor: 'border-primary/20',
      }
    default:
      return {
        label: 'Question',
        icon: FileText,
        bgColor: 'bg-swiss-concrete',
        textColor: 'text-swiss-ink',
        borderColor: 'border-swiss-ink/20',
      }
  }
}

/**
 * Compact version for table cells
 */
export function QuestionDisplayCompact({ 
  question,
  className = ''
}: { 
  question: Question
  className?: string
}) {
  const { content_type, question_latex, image_url } = question
  const isTextFirst = content_type === 'synthetic_image' || content_type === 'generated_text'
  
  return (
    <div className={`question-display-compact ${className}`}>
      {isTextFirst && question_latex ? (
        <LatexPreview
          latex={question_latex}
          className="text-sm text-swiss-ink line-clamp-3"
          showSkeleton={false}
        />
      ) : image_url ? (
        <img
          src={image_url}
          alt="Question preview"
          className="max-h-20 w-auto object-contain border border-swiss-ink/20 rounded"
        />
      ) : (
        <div className="flex flex-col gap-0.5 py-0.5">
          <span className="text-xs font-bold uppercase tracking-wider text-swiss-lead">
            {content_type === 'official_past_paper' ? 'Past Paper' : 'No content'}
          </span>
          {(question.sub_topic_name || question.topic_name) && (
            <span className="text-xs text-swiss-ink font-medium">
              {question.sub_topic_name || question.topic_name}
            </span>
          )}
          <div className="flex items-center gap-2">
            {question.marks && (
              <span className="text-xs text-swiss-lead">
                {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
              </span>
            )}
            {question.difficulty && (
              <span className="text-xs text-swiss-lead">{question.difficulty}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Export SourceBadge for use elsewhere
 */
export { SourceBadge }
