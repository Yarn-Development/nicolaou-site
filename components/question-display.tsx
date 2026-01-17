'use client'

import { LatexPreview } from '@/components/latex-preview'
import { ImageLightbox } from '@/components/image-lightbox'
import { FileText, Triangle, Image as ImageIcon, FileCheck } from 'lucide-react'
import type { Question, ContentType } from '@/lib/types/database'

interface QuestionDisplayProps {
  question: Question
  /** Display variant */
  variant?: 'card' | 'inline' | 'preview'
  /** Show the source badge */
  showSourceBadge?: boolean
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

  return (
    <div 
      className={`
        question-display
        ${variant === 'card' ? 'bg-white border border-swiss-ink/10 rounded-lg p-4' : ''}
        ${variant === 'preview' ? 'bg-swiss-paper p-4' : ''}
        ${className}
      `}
      style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}
    >
      {/* Source Badge */}
      {showSourceBadge && (
        <div className="mb-3">
          <SourceBadge contentType={content_type} />
        </div>
      )}

      {/* Topic Info */}
      {showTopicInfo && (question.topic_name || question.sub_topic_name) && (
        <div className="mb-3 flex flex-wrap gap-2">
          {question.topic_name && (
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 bg-swiss-concrete text-swiss-ink border border-swiss-ink/20">
              {question.topic_name}
            </span>
          )}
          {question.sub_topic_name && (
            <span className="text-xs font-medium text-swiss-lead">
              / {question.sub_topic_name}
            </span>
          )}
        </div>
      )}

      {/* Content Rendering - Text First Layout (synthetic_image, generated_text) */}
      {isTextFirst && (
        <div className="space-y-4">
          {/* Text Layer */}
          {hasText && (
            <div className="question-text">
              <LatexPreview 
                latex={question_latex} 
                className="text-swiss-ink leading-relaxed"
              />
            </div>
          )}

          {/* Diagram Layer */}
          {hasImage && (
            <div className="question-diagram flex justify-center my-4">
              {enableZoom ? (
                <ImageLightbox
                  src={image_url}
                  alt={`Diagram for question`}
                  width={400}
                  height={300}
                  className="max-w-md w-full"
                />
              ) : (
                <div className="border border-swiss-ink/20 rounded-lg overflow-hidden bg-white max-w-md w-full">
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
          {/* Image Layer */}
          {hasImage && (
            <div className="question-image flex justify-center">
              {enableZoom ? (
                <ImageLightbox
                  src={image_url}
                  alt={`Question image`}
                  width={500}
                  height={400}
                  className="max-w-lg w-full"
                />
              ) : (
                <div className="border border-swiss-ink/20 rounded-lg overflow-hidden bg-white max-w-lg w-full">
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
            <div className="question-text mt-4 pt-4 border-t border-swiss-ink/10">
              <p className="text-xs font-bold uppercase tracking-wider text-swiss-lead mb-2">
                Extracted Text
              </p>
              <LatexPreview 
                latex={question_latex} 
                className="text-swiss-ink text-sm"
              />
            </div>
          )}
        </div>
      )}

      {/* Fallback for no content */}
      {!hasText && !hasImage && (
        <div className="text-swiss-lead italic text-sm py-4 text-center">
          Question content not available
        </div>
      )}
    </div>
  )
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
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-700',
        borderColor: 'border-blue-200',
      }
    case 'synthetic_image':
      return {
        label: 'AI Diagram',
        icon: Triangle,
        bgColor: 'bg-purple-50',
        textColor: 'text-purple-700',
        borderColor: 'border-purple-200',
      }
    case 'image_ocr':
      return {
        label: 'Scanned',
        icon: ImageIcon,
        bgColor: 'bg-amber-50',
        textColor: 'text-amber-700',
        borderColor: 'border-amber-200',
      }
    case 'official_past_paper':
      return {
        label: 'Past Paper',
        icon: FileCheck,
        bgColor: 'bg-green-50',
        textColor: 'text-green-700',
        borderColor: 'border-green-200',
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
          className="text-sm text-swiss-ink line-clamp-2"
          showSkeleton={false}
        />
      ) : image_url ? (
        <div className="flex items-center gap-2">
          <img 
            src={image_url} 
            alt="Question thumbnail" 
            className="w-12 h-12 object-cover rounded border border-swiss-ink/20"
          />
          <span className="text-xs text-swiss-lead italic">Image question</span>
        </div>
      ) : (
        <span className="text-sm text-swiss-lead italic">No preview</span>
      )}
    </div>
  )
}

/**
 * Export SourceBadge for use elsewhere
 */
export { SourceBadge }
