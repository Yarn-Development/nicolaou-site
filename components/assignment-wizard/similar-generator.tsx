"use client"

import { useState, useCallback, useMemo } from "react"
import { 
  Loader2, 
  AlertCircle,
  Sparkles,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { LatexPreview, LatexPreviewCompact } from "@/components/latex-preview"
import type { ExtractedQuestion, GeneratedSimilarQuestion, DifficultyTier } from "@/lib/types/database"

// =====================================================
// Types
// =====================================================

export interface SimilarGeneratorProps {
  /** Extracted questions from previous step */
  extractedQuestions: ExtractedQuestion[]
  /** Callback when generation is complete */
  onGenerateComplete: (questions: GeneratedSimilarQuestion[]) => void
  /** Callback to go back */
  onBack: () => void
  /** Initial generated questions if editing */
  initialGeneratedQuestions?: GeneratedSimilarQuestion[]
}

interface GenerationStatus {
  questionId: string
  status: 'pending' | 'generating' | 'done' | 'error'
  error?: string
}

// =====================================================
// Helper: Generate unique ID
// =====================================================

function generateId(): string {
  return `gq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// =====================================================
// Original Question Card with Generated Similar
// =====================================================

interface QuestionGroupProps {
  original: ExtractedQuestion
  generated: GeneratedSimilarQuestion[]
  status: GenerationStatus
  onToggleInclude: (id: string) => void
  onRegenerate: (originalId: string) => void
  isExpanded: boolean
  onToggleExpand: () => void
}

function QuestionGroup({
  original,
  generated,
  status,
  onToggleInclude,
  onRegenerate,
  isExpanded,
  onToggleExpand,
}: QuestionGroupProps) {
  const includedCount = generated.filter(g => g.included).length

  return (
    <div className="border-2 border-swiss-ink rounded-lg overflow-hidden">
      {/* Original question header */}
      <div 
        className="bg-swiss-concrete p-4 cursor-pointer"
        onClick={onToggleExpand}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="font-mono font-bold border-2 border-swiss-ink">
              Q{original.questionNumber}
            </Badge>
            <div className="flex-1">
              <p className="font-bold text-sm">Original Question</p>
              <div className="text-xs text-swiss-lead max-w-md">
                <LatexPreviewCompact latex={original.questionLatex.slice(0, 100) + (original.questionLatex.length > 100 ? "..." : "")} />
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {status.status === 'generating' && (
              <div className="flex items-center gap-2 text-blue-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs font-bold">Generating...</span>
              </div>
            )}
            
            {status.status === 'done' && generated.length > 0 && (
              <Badge className="bg-green-600">
                {includedCount}/{generated.length} selected
              </Badge>
            )}
            
            {status.status === 'error' && (
              <Badge variant="destructive">Error</Badge>
            )}
            
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-swiss-lead" />
            ) : (
              <ChevronDown className="h-5 w-5 text-swiss-lead" />
            )}
          </div>
        </div>
      </div>
      
      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t-2 border-swiss-ink">
          {/* Original question details */}
          <div className="p-4 bg-blue-50 border-b border-swiss-ink/20">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-2">
              Original Question
            </p>
            <div className="text-sm bg-white p-3 rounded border">
              <LatexPreview latex={original.questionLatex} showSkeleton={false} />
            </div>
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary">{original.suggestedTopic}</Badge>
              <Badge variant="outline">{original.suggestedSubTopic}</Badge>
              <Badge>{original.suggestedMarks} marks</Badge>
            </div>
          </div>
          
          {/* Generated questions */}
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-swiss-lead">
                Generated Similar Questions
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRegenerate(original.id)}
                disabled={status.status === 'generating'}
                className="border-2 border-swiss-ink"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Regenerate
              </Button>
            </div>
            
            {status.status === 'generating' && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            )}
            
            {status.status === 'error' && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded border border-red-200">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{status.error || "Failed to generate"}</span>
              </div>
            )}
            
            {status.status === 'done' && generated.length === 0 && (
              <p className="text-sm text-swiss-lead text-center py-4">
                No questions generated yet
              </p>
            )}
            
            {generated.map((gq, index) => (
              <div 
                key={gq.id}
                className={`p-3 rounded-lg border-2 transition-all ${
                  gq.included 
                    ? "border-green-500 bg-green-50" 
                    : "border-swiss-lead/30 bg-gray-50 opacity-60"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Switch
                    checked={gq.included}
                    onCheckedChange={() => onToggleInclude(gq.id)}
                  />
                  
                  <div className="flex-1 space-y-2">
                    <p className="text-xs font-bold text-swiss-lead">
                      Similar #{index + 1}
                    </p>
                    <div className="text-sm">
                      <LatexPreview latex={gq.questionLatex} showSkeleton={false} />
                    </div>
                    
                    {gq.answerKey && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-blue-600 font-bold">
                          View Answer
                        </summary>
                        <div className="mt-2 p-2 bg-white rounded border space-y-1">
                          <div><strong>Answer:</strong> <LatexPreviewCompact latex={gq.answerKey.answer} /></div>
                          <div className="text-swiss-lead">
                            <LatexPreviewCompact latex={gq.answerKey.explanation} />
                          </div>
                        </div>
                      </details>
                    )}
                  </div>
                  
                  <Badge variant="secondary" className="shrink-0">
                    {gq.marks} marks
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// =====================================================
// Main Component
// =====================================================

export function SimilarGenerator({
  extractedQuestions,
  onGenerateComplete,
  onBack,
  initialGeneratedQuestions = [],
}: SimilarGeneratorProps) {
  // State
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedSimilarQuestion[]>(
    initialGeneratedQuestions
  )
  const [generationStatuses, setGenerationStatuses] = useState<Map<string, GenerationStatus>>(
    new Map(extractedQuestions.map(q => [q.id, { questionId: q.id, status: 'pending' }]))
  )
  const [expandedId, setExpandedId] = useState<string | null>(
    extractedQuestions[0]?.id || null
  )
  const [isGeneratingAll, setIsGeneratingAll] = useState(false)

  // Group generated questions by source
  const questionsBySource = useMemo(() => {
    const map = new Map<string, GeneratedSimilarQuestion[]>()
    extractedQuestions.forEach(eq => {
      map.set(eq.id, generatedQuestions.filter(gq => 
        gq.sourceQuestionNumber === eq.questionNumber
      ))
    })
    return map
  }, [extractedQuestions, generatedQuestions])

  // Generate similar questions for one original
  const generateForQuestion = useCallback(async (original: ExtractedQuestion) => {
    // Update status to generating
    setGenerationStatuses(prev => new Map(prev).set(original.id, {
      questionId: original.id,
      status: 'generating'
    }))

    try {
      const response = await fetch('/api/ai/generate-similar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalQuestion: original.questionLatex,
          topic: original.suggestedTopic,
          subTopic: original.suggestedSubTopic,
          difficulty: original.suggestedDifficulty,
          marks: original.suggestedMarks,
          count: 2, // Generate 2 similar questions
        }),
      })

      const result = await response.json()

      if (result.success && result.data?.questions) {
        const newQuestions: GeneratedSimilarQuestion[] = result.data.questions.map(
          (q: { questionLatex: string; answerKey: { answer: string; explanation: string }; marks: number }) => ({
            id: generateId(),
            sourceQuestionNumber: original.questionNumber,
            sourceQuestionLatex: original.questionLatex,
            questionLatex: q.questionLatex,
            answerKey: q.answerKey,
            topic: original.suggestedTopic,
            subTopic: original.suggestedSubTopic,
            difficulty: original.suggestedDifficulty as DifficultyTier,
            marks: q.marks || original.suggestedMarks,
            included: true, // Include by default
          })
        )

        // Remove old generated questions for this source and add new ones
        setGeneratedQuestions(prev => [
          ...prev.filter(gq => gq.sourceQuestionNumber !== original.questionNumber),
          ...newQuestions
        ])

        // Update status to done
        setGenerationStatuses(prev => new Map(prev).set(original.id, {
          questionId: original.id,
          status: 'done'
        }))
      } else {
        throw new Error(result.error || 'Failed to generate')
      }
    } catch (err) {
      console.error('Generation error:', err)
      setGenerationStatuses(prev => new Map(prev).set(original.id, {
        questionId: original.id,
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to generate'
      }))
    }
  }, [])

  // Generate for all questions
  const handleGenerateAll = useCallback(async () => {
    setIsGeneratingAll(true)

    for (const original of extractedQuestions) {
      await generateForQuestion(original)
      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    setIsGeneratingAll(false)
    toast.success('Generation complete!')
  }, [extractedQuestions, generateForQuestion])

  // Regenerate for single question
  const handleRegenerate = useCallback(async (originalId: string) => {
    const original = extractedQuestions.find(q => q.id === originalId)
    if (original) {
      await generateForQuestion(original)
    }
  }, [extractedQuestions, generateForQuestion])

  // Toggle include
  const handleToggleInclude = useCallback((id: string) => {
    setGeneratedQuestions(prev => prev.map(gq =>
      gq.id === id ? { ...gq, included: !gq.included } : gq
    ))
  }, [])

  // Handle continue
  const handleContinue = useCallback(() => {
    const included = generatedQuestions.filter(gq => gq.included)
    if (included.length === 0) {
      toast.error("Please select at least one generated question")
      return
    }
    onGenerateComplete(included)
  }, [generatedQuestions, onGenerateComplete])

  // Stats
  const totalGenerated = generatedQuestions.length
  const totalIncluded = generatedQuestions.filter(gq => gq.included).length
  const totalMarks = generatedQuestions
    .filter(gq => gq.included)
    .reduce((sum, gq) => sum + gq.marks, 0)
  const completedCount = Array.from(generationStatuses.values())
    .filter(s => s.status === 'done').length

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b-2 border-swiss-ink bg-swiss-concrete p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-black uppercase tracking-wider">
              Generate Similar Questions
            </h2>
            <p className="text-sm text-swiss-lead">
              AI will generate 1-2 similar practice questions for each extracted question
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-wider text-swiss-lead">
                Progress
              </p>
              <p className="font-bold">
                {completedCount} / {extractedQuestions.length} questions
              </p>
            </div>
            
            <Badge variant="outline" className="border-2 border-swiss-ink text-lg px-4 py-2">
              {totalIncluded} selected / {totalMarks} marks
            </Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Generate all button */}
          {totalGenerated === 0 && (
            <Card className="border-2 border-swiss-ink">
              <CardContent className="p-8 text-center space-y-4">
                <Sparkles className="h-12 w-12 mx-auto text-swiss-signal" />
                <h3 className="font-black text-lg uppercase tracking-wider">
                  Ready to Generate
                </h3>
                <p className="text-swiss-lead max-w-md mx-auto">
                  Click below to generate 1-2 similar practice questions for each of your 
                  {' '}{extractedQuestions.length} extracted questions.
                </p>
                <Button
                  onClick={handleGenerateAll}
                  disabled={isGeneratingAll}
                  size="lg"
                  className="bg-swiss-signal hover:bg-swiss-ink text-white font-bold uppercase tracking-wider"
                >
                  {isGeneratingAll ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 mr-2" />
                      Generate All Similar Questions
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Progress bar during generation */}
          {isGeneratingAll && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <p className="font-bold text-blue-900">
                  Generating similar questions...
                </p>
              </div>
              <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-500"
                  style={{ 
                    width: `${(completedCount / extractedQuestions.length) * 100}%` 
                  }}
                />
              </div>
              <p className="text-sm text-blue-700 mt-2">
                {completedCount} of {extractedQuestions.length} complete
              </p>
            </div>
          )}

          {/* Question groups */}
          {extractedQuestions.map(original => (
            <QuestionGroup
              key={original.id}
              original={original}
              generated={questionsBySource.get(original.id) || []}
              status={generationStatuses.get(original.id) || { 
                questionId: original.id, 
                status: 'pending' 
              }}
              onToggleInclude={handleToggleInclude}
              onRegenerate={handleRegenerate}
              isExpanded={expandedId === original.id}
              onToggleExpand={() => setExpandedId(
                expandedId === original.id ? null : original.id
              )}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t-2 border-swiss-ink bg-swiss-concrete p-4 flex justify-between">
        <Button
          variant="outline"
          onClick={onBack}
          className="border-2 border-swiss-ink"
        >
          Back
        </Button>
        
        <div className="flex gap-2">
          {totalGenerated > 0 && !isGeneratingAll && (
            <Button
              variant="outline"
              onClick={handleGenerateAll}
              className="border-2 border-swiss-ink"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Regenerate All
            </Button>
          )}
          
          <Button
            onClick={handleContinue}
            disabled={totalIncluded === 0 || isGeneratingAll}
            className="bg-swiss-signal hover:bg-swiss-ink text-white font-bold uppercase tracking-wider"
          >
            Continue with {totalIncluded} Questions
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}
