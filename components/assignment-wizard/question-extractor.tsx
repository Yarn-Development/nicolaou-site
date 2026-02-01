"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { 
  Loader2, 
  AlertCircle,
  FileText,
  Sparkles,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { 
  getTopicNames, 
  getSubTopicsForTopic,
} from "@/lib/topic-taxonomy"
import { toast } from "sonner"
import { LatexPreview, LatexPreviewCompact } from "@/components/latex-preview"
import type { ExtractedQuestion, DifficultyTier } from "@/lib/types/database"

// =====================================================
// Types
// =====================================================

export interface QuestionExtractorProps {
  /** URL of the uploaded PDF */
  pdfUrl: string | null
  /** Callback when extraction is complete */
  onExtractComplete: (questions: ExtractedQuestion[]) => void
  /** Callback to go back */
  onBack: () => void
  /** Initial questions if editing */
  initialQuestions?: ExtractedQuestion[]
}

// =====================================================
// Helper: Generate unique ID
// =====================================================

function generateId(): string {
  return `eq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// =====================================================
// PDF Page Renderer (uses pdf.js from CDN)
// =====================================================

interface PdfViewerProps {
  pdfUrl: string
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  onPagesLoaded: (total: number) => void
  onPageImageReady: (pageNum: number, imageData: string) => void
}

function PdfViewer({ 
  pdfUrl, 
  currentPage, 
  totalPages,
  onPageChange,
  onPagesLoaded,
  onPageImageReady,
}: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pdfDocRef = useRef<unknown>(null)

  useEffect(() => {
    let isMounted = true

    async function loadPdf() {
      try {
        setLoading(true)
        setError(null)

        // Dynamically load pdf.js from CDN if not already loaded
        if (typeof window !== 'undefined' && !(window as unknown as { pdfjsLib?: unknown }).pdfjsLib) {
          const script = document.createElement('script')
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
          script.async = true
          await new Promise((resolve, reject) => {
            script.onload = resolve
            script.onerror = reject
            document.head.appendChild(script)
          })
          
          // Set worker source
          const pdfjsLib = (window as unknown as { pdfjsLib: { GlobalWorkerOptions: { workerSrc: string }; getDocument: (url: string) => { promise: Promise<unknown> } } }).pdfjsLib
          pdfjsLib.GlobalWorkerOptions.workerSrc = 
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
        }

        const pdfjsLib = (window as unknown as { pdfjsLib: { getDocument: (url: string) => { promise: Promise<{ numPages: number; getPage: (num: number) => Promise<{ getViewport: (opts: { scale: number }) => { width: number; height: number }; render: (opts: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> } }> }> } } }).pdfjsLib
        const loadingTask = pdfjsLib.getDocument(pdfUrl)
        const pdfDoc = await loadingTask.promise

        if (!isMounted) return

        pdfDocRef.current = pdfDoc
        onPagesLoaded(pdfDoc.numPages)
        setLoading(false)
      } catch (err) {
        console.error('PDF load error:', err)
        if (isMounted) {
          setError('Failed to load PDF')
          setLoading(false)
        }
      }
    }

    loadPdf()

    return () => {
      isMounted = false
    }
  }, [pdfUrl, onPagesLoaded])

  // Render current page
  useEffect(() => {
    async function renderPage() {
      if (!pdfDocRef.current || !canvasRef.current) return

      try {
        const pdfDoc = pdfDocRef.current as { getPage: (num: number) => Promise<{ getViewport: (opts: { scale: number }) => { width: number; height: number }; render: (opts: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> } }> }
        const page = await pdfDoc.getPage(currentPage)
        
        const canvas = canvasRef.current
        const context = canvas.getContext('2d')
        if (!context) return

        // Scale to fit container width while maintaining aspect ratio
        const containerWidth = canvas.parentElement?.clientWidth || 600
        const viewport = page.getViewport({ scale: 1 })
        const scale = containerWidth / viewport.width
        const scaledViewport = page.getViewport({ scale })

        canvas.width = scaledViewport.width
        canvas.height = scaledViewport.height

        await page.render({
          canvasContext: context,
          viewport: scaledViewport,
        }).promise

        // Export as base64 for OCR
        const imageData = canvas.toDataURL('image/png')
        onPageImageReady(currentPage, imageData)
      } catch (err) {
        console.error('Page render error:', err)
      }
    }

    renderPage()
  }, [currentPage, onPageImageReady])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-swiss-concrete">
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-swiss-lead" />
          <p className="text-sm text-swiss-lead">Loading PDF...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-swiss-concrete">
        <div className="text-center space-y-2 text-red-600">
          <AlertCircle className="h-8 w-8 mx-auto" />
          <p className="text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Page navigation */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-swiss-lead/20 bg-white">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="border-2 border-swiss-ink"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-bold">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="border-2 border-swiss-ink"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Canvas */}
      <div className="flex-1 overflow-auto p-4 bg-gray-100">
        <canvas ref={canvasRef} className="mx-auto shadow-lg" />
      </div>
    </div>
  )
}

// =====================================================
// Question Editor Row
// =====================================================

interface QuestionRowProps {
  question: ExtractedQuestion
  onUpdate: (id: string, updates: Partial<ExtractedQuestion>) => void
  onDelete: (id: string) => void
  isExpanded: boolean
  onToggleExpand: () => void
}

function QuestionRow({ 
  question, 
  onUpdate, 
  onDelete,
  isExpanded,
  onToggleExpand,
}: QuestionRowProps) {
  const topics = getTopicNames()
  const subTopics = question.suggestedTopic 
    ? getSubTopicsForTopic(question.suggestedTopic) 
    : []

  return (
    <div className={`border-2 rounded-lg transition-all ${
      question.included 
        ? "border-swiss-ink bg-white" 
        : "border-swiss-lead/30 bg-swiss-concrete/50 opacity-60"
    }`}>
      {/* Header row */}
      <div 
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={onToggleExpand}
      >
        <Switch
          checked={question.included}
          onCheckedChange={(checked) => {
            onUpdate(question.id, { included: !!checked })
          }}
          onClick={(e) => e.stopPropagation()}
        />
        
        <Badge variant="outline" className="font-mono font-bold border-2 border-swiss-ink">
          Q{question.questionNumber}
        </Badge>
        
        <div className="flex-1 min-w-0">
          <div className="text-sm">
            <LatexPreviewCompact latex={question.questionLatex.slice(0, 80) + (question.questionLatex.length > 80 ? "..." : "")} />
          </div>
        </div>
        
        <Badge variant="secondary" className="font-bold">
          {question.suggestedMarks} marks
        </Badge>
        
        <Badge variant={question.suggestedDifficulty === 'Higher' ? 'default' : 'outline'}>
          {question.suggestedDifficulty}
        </Badge>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(question.id)
          }}
          className="text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Expanded editor */}
      {isExpanded && (
        <div className="border-t-2 border-swiss-ink/20 p-4 space-y-4">
          {/* Question text */}
          <div className="space-y-2">
            <Label className="font-bold uppercase tracking-wider text-xs">
              Question Text (LaTeX)
            </Label>
            <Textarea
              value={question.questionLatex}
              onChange={(e) => onUpdate(question.id, { questionLatex: e.target.value })}
              rows={3}
              className="font-mono text-sm border-2 border-swiss-ink"
            />
            {/* Live preview */}
            <div className="bg-swiss-concrete/50 border border-swiss-lead/30 rounded-lg p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-swiss-lead mb-2">
                Preview
              </p>
              <LatexPreview latex={question.questionLatex} showSkeleton={false} />
            </div>
          </div>
          
          {/* Metadata row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Question Number */}
            <div className="space-y-2">
              <Label className="font-bold uppercase tracking-wider text-xs">
                Q Number
              </Label>
              <Input
                value={question.questionNumber}
                onChange={(e) => onUpdate(question.id, { questionNumber: e.target.value })}
                className="border-2 border-swiss-ink"
              />
            </div>
            
            {/* Topic */}
            <div className="space-y-2">
              <Label className="font-bold uppercase tracking-wider text-xs">
                Topic
              </Label>
              <Select
                value={question.suggestedTopic}
                onValueChange={(value) => onUpdate(question.id, { 
                  suggestedTopic: value,
                  suggestedSubTopic: '' // Reset sub-topic
                })}
              >
                <SelectTrigger className="border-2 border-swiss-ink">
                  <SelectValue placeholder="Select topic" />
                </SelectTrigger>
                <SelectContent>
                  {topics.map(topic => (
                    <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Sub-topic */}
            <div className="space-y-2">
              <Label className="font-bold uppercase tracking-wider text-xs">
                Sub-topic
              </Label>
              <Select
                value={question.suggestedSubTopic}
                onValueChange={(value) => onUpdate(question.id, { suggestedSubTopic: value })}
                disabled={!question.suggestedTopic}
              >
                <SelectTrigger className="border-2 border-swiss-ink">
                  <SelectValue placeholder="Select sub-topic" />
                </SelectTrigger>
                <SelectContent>
                  {subTopics.map(st => (
                    <SelectItem key={st} value={st}>{st}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Marks */}
            <div className="space-y-2">
              <Label className="font-bold uppercase tracking-wider text-xs">
                Marks
              </Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={question.suggestedMarks}
                onChange={(e) => onUpdate(question.id, { 
                  suggestedMarks: parseInt(e.target.value) || 1 
                })}
                className="border-2 border-swiss-ink"
              />
            </div>
          </div>
          
          {/* Difficulty */}
          <div className="space-y-2">
            <Label className="font-bold uppercase tracking-wider text-xs">
              Difficulty
            </Label>
            <Select
              value={question.suggestedDifficulty}
              onValueChange={(value) => onUpdate(question.id, { 
                suggestedDifficulty: value as DifficultyTier 
              })}
            >
              <SelectTrigger className="border-2 border-swiss-ink w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Foundation">Foundation</SelectItem>
                <SelectItem value="Higher">Higher</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  )
}

// =====================================================
// Main Component
// =====================================================

export function QuestionExtractor({
  pdfUrl,
  onExtractComplete,
  onBack,
  initialQuestions = [],
}: QuestionExtractorProps) {
  // State
  const [questions, setQuestions] = useState<ExtractedQuestion[]>(initialQuestions)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [pageImages, setPageImages] = useState<Map<number, string>>(new Map())
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractionProgress, setExtractionProgress] = useState({ current: 0, total: 0 })
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null)

  // Handle page image ready
  const handlePageImageReady = useCallback((pageNum: number, imageData: string) => {
    setPageImages(prev => new Map(prev).set(pageNum, imageData))
  }, [])

  // Handle pages loaded
  const handlePagesLoaded = useCallback((total: number) => {
    setTotalPages(total)
  }, [])

  // Extract questions from all pages
  const handleExtractAll = useCallback(async () => {
    if (totalPages === 0) {
      toast.error("PDF not loaded yet")
      return
    }

    setIsExtracting(true)
    setExtractionProgress({ current: 0, total: totalPages })
    
    const allQuestions: ExtractedQuestion[] = []

    try {
      for (let page = 1; page <= totalPages; page++) {
        setExtractionProgress({ current: page, total: totalPages })
        
        // Wait for page image if not ready
        let imageData = pageImages.get(page)
        if (!imageData) {
          // Navigate to page to trigger render
          setCurrentPage(page)
          // Wait a bit for render
          await new Promise(resolve => setTimeout(resolve, 1500))
          imageData = pageImages.get(page)
        }

        if (!imageData) {
          console.warn(`Page ${page} image not ready, skipping`)
          continue
        }

        try {
          const response = await fetch('/api/ai/extract-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageData,
              pageNumber: page,
              isBase64: true,
            }),
          })

          const result = await response.json()

          if (result.success && result.data?.questions) {
            const pageQuestions: ExtractedQuestion[] = result.data.questions.map(
              (q: { 
                questionNumber: string; 
                questionLatex: string; 
                suggestedTopic: string; 
                suggestedSubTopic: string; 
                suggestedMarks: number; 
                suggestedDifficulty: DifficultyTier 
              }) => ({
                id: generateId(),
                questionNumber: q.questionNumber,
                questionLatex: q.questionLatex,
                suggestedTopic: q.suggestedTopic,
                suggestedSubTopic: q.suggestedSubTopic,
                suggestedMarks: q.suggestedMarks,
                suggestedDifficulty: q.suggestedDifficulty,
                pageNumber: page,
                included: true,
              })
            )
            allQuestions.push(...pageQuestions)
          }
        } catch (err) {
          console.error(`Failed to extract page ${page}:`, err)
        }

        // Rate limiting delay
        if (page < totalPages) {
          await new Promise(resolve => setTimeout(resolve, 1500))
        }
      }

      setQuestions(allQuestions)
      
      if (allQuestions.length > 0) {
        toast.success(`Extracted ${allQuestions.length} questions from ${totalPages} pages`)
      } else {
        toast.warning("No questions found in the PDF")
      }
    } catch (err) {
      console.error('Extraction error:', err)
      toast.error("Failed to extract questions")
    } finally {
      setIsExtracting(false)
    }
  }, [totalPages, pageImages])

  // Update a question
  const handleUpdateQuestion = useCallback((id: string, updates: Partial<ExtractedQuestion>) => {
    setQuestions(prev => prev.map(q => 
      q.id === id ? { ...q, ...updates } : q
    ))
  }, [])

  // Delete a question
  const handleDeleteQuestion = useCallback((id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id))
  }, [])

  // Add a manual question
  const handleAddQuestion = useCallback(() => {
    const newQuestion: ExtractedQuestion = {
      id: generateId(),
      questionNumber: String(questions.length + 1),
      questionLatex: '',
      suggestedTopic: '',
      suggestedSubTopic: '',
      suggestedMarks: 2,
      suggestedDifficulty: 'Foundation',
      pageNumber: currentPage,
      included: true,
    }
    setQuestions(prev => [...prev, newQuestion])
    setExpandedQuestionId(newQuestion.id)
  }, [questions.length, currentPage])

  // Handle continue
  const handleContinue = useCallback(() => {
    const includedQuestions = questions.filter(q => q.included)
    if (includedQuestions.length === 0) {
      toast.error("Please include at least one question")
      return
    }
    onExtractComplete(includedQuestions)
  }, [questions, onExtractComplete])

  // Count included questions
  const includedCount = questions.filter(q => q.included).length
  const totalMarks = questions
    .filter(q => q.included)
    .reduce((sum, q) => sum + q.suggestedMarks, 0)

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6">
      {/* Left Panel: PDF Viewer */}
      <div className="lg:w-1/2 flex flex-col min-h-[400px] lg:min-h-0">
        <Card className="flex-1 border-2 border-swiss-ink overflow-hidden flex flex-col">
          <CardHeader className="border-b-2 border-swiss-ink bg-swiss-concrete py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <CardTitle className="text-sm font-black uppercase tracking-wider">
                  Exam Paper
                </CardTitle>
              </div>
              {pdfUrl && (
                <a 
                  href={pdfUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline font-bold uppercase"
                >
                  Open in New Tab
                </a>
              )}
            </div>
          </CardHeader>
          
          {pdfUrl ? (
            <PdfViewer
              pdfUrl={pdfUrl}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              onPagesLoaded={handlePagesLoaded}
              onPageImageReady={handlePageImageReady}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-swiss-concrete">
              <p className="text-swiss-lead">No PDF uploaded</p>
            </div>
          )}
        </Card>
      </div>

      {/* Right Panel: Extracted Questions */}
      <div className="lg:w-1/2 flex flex-col min-h-[400px] lg:min-h-0">
        <Card className="flex-1 border-2 border-swiss-ink overflow-hidden flex flex-col">
          <CardHeader className="border-b-2 border-swiss-ink bg-swiss-concrete py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <CardTitle className="text-sm font-black uppercase tracking-wider">
                  Extracted Questions
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {questions.length > 0 && (
                  <Badge variant="outline" className="border-2 border-swiss-ink font-bold">
                    {includedCount} selected / {totalMarks} marks
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-auto p-4 space-y-4">
            {/* Extract button */}
            {questions.length === 0 && (
              <div className="text-center py-8 space-y-4">
                <p className="text-swiss-lead">
                  Click the button below to automatically extract questions from the PDF using AI.
                </p>
                <Button
                  onClick={handleExtractAll}
                  disabled={isExtracting || totalPages === 0}
                  className="bg-swiss-signal hover:bg-swiss-ink text-white font-bold uppercase tracking-wider"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Extracting Page {extractionProgress.current} of {extractionProgress.total}...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Extract Questions from PDF
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Extraction in progress */}
            {isExtracting && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  <div>
                    <p className="font-bold text-blue-900">
                      Extracting questions...
                    </p>
                    <p className="text-sm text-blue-700">
                      Processing page {extractionProgress.current} of {extractionProgress.total}
                    </p>
                  </div>
                </div>
                <div className="mt-3 h-2 bg-blue-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ 
                      width: `${(extractionProgress.current / extractionProgress.total) * 100}%` 
                    }}
                  />
                </div>
              </div>
            )}

            {/* Questions list */}
            {questions.length > 0 && (
              <div className="space-y-3">
                {questions.map(question => (
                  <QuestionRow
                    key={question.id}
                    question={question}
                    onUpdate={handleUpdateQuestion}
                    onDelete={handleDeleteQuestion}
                    isExpanded={expandedQuestionId === question.id}
                    onToggleExpand={() => setExpandedQuestionId(
                      expandedQuestionId === question.id ? null : question.id
                    )}
                  />
                ))}
                
                {/* Add question button */}
                <Button
                  variant="outline"
                  onClick={handleAddQuestion}
                  className="w-full border-2 border-dashed border-swiss-lead hover:border-swiss-ink"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question Manually
                </Button>
              </div>
            )}
          </CardContent>

          {/* Footer actions */}
          <div className="border-t-2 border-swiss-ink bg-swiss-concrete p-4 flex justify-between">
            <Button
              variant="outline"
              onClick={onBack}
              className="border-2 border-swiss-ink"
            >
              Back
            </Button>
            
            <div className="flex gap-2">
              {questions.length > 0 && (
                <Button
                  variant="outline"
                  onClick={handleExtractAll}
                  disabled={isExtracting}
                  className="border-2 border-swiss-ink"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Re-Extract
                </Button>
              )}
              
              <Button
                onClick={handleContinue}
                disabled={includedCount === 0}
                className="bg-swiss-signal hover:bg-swiss-ink text-white font-bold uppercase tracking-wider"
              >
                Continue with {includedCount} Questions
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
