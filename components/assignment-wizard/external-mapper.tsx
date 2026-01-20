"use client"

import { useState, useCallback, useMemo } from "react"
import { 
  Plus, 
  Trash2, 
  FileUp, 
  Loader2, 
  Check,
  AlertCircle,
  FileText,
  GripVertical,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  getTopicNames, 
  getSubTopicsForTopic,
} from "@/lib/topic-taxonomy"

// =====================================================
// Types
// =====================================================

export interface MappedQuestion {
  id: string
  questionNumber: string
  topic: string
  subTopic: string
  marks: number
}

export interface ExternalMapperProps {
  /** URL of the uploaded PDF (from previous step) */
  pdfUrl: string | null
  /** Callback when mapping is complete */
  onMappingComplete: (questions: MappedQuestion[]) => void
  /** Callback to go back to file upload */
  onBack: () => void
  /** Optional initial questions (for editing) */
  initialQuestions?: MappedQuestion[]
  /** Whether the form is currently submitting */
  isSubmitting?: boolean
}

// =====================================================
// Main Component
// =====================================================

export function ExternalMapper({
  pdfUrl,
  onMappingComplete,
  onBack,
  initialQuestions = [],
  isSubmitting = false,
}: ExternalMapperProps) {
  // State for mapped questions
  const [questions, setQuestions] = useState<MappedQuestion[]>(
    initialQuestions.length > 0 
      ? initialQuestions 
      : [createEmptyQuestion()]
  )

  // Calculate total marks
  const totalMarks = useMemo(() => {
    return questions.reduce((sum, q) => sum + (q.marks || 0), 0)
  }, [questions])

  // Check if form is valid
  const isValid = useMemo(() => {
    return questions.length > 0 && questions.every(q => 
      q.questionNumber.trim() !== "" &&
      q.topic !== "" &&
      q.subTopic !== "" &&
      q.marks > 0
    )
  }, [questions])

  // Add a new question row
  const handleAddQuestion = useCallback(() => {
    setQuestions(prev => [...prev, createEmptyQuestion()])
  }, [])

  // Remove a question row
  const handleRemoveQuestion = useCallback((id: string) => {
    setQuestions(prev => {
      if (prev.length <= 1) return prev // Keep at least one row
      return prev.filter(q => q.id !== id)
    })
  }, [])

  // Update a question field
  const handleUpdateQuestion = useCallback((
    id: string, 
    field: keyof MappedQuestion, 
    value: string | number
  ) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== id) return q
      
      // If changing topic, reset sub-topic
      if (field === "topic") {
        return { ...q, topic: value as string, subTopic: "" }
      }
      
      return { ...q, [field]: value }
    }))
  }, [])

  // Handle form submission
  const handleSubmit = useCallback(() => {
    if (!isValid) return
    onMappingComplete(questions)
  }, [isValid, questions, onMappingComplete])

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
                  Exam Paper Preview
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
          <CardContent className="flex-1 p-0 bg-swiss-lead/10">
            {pdfUrl ? (
              <iframe
                src={pdfUrl}
                className="w-full h-full min-h-[500px]"
                title="Exam Paper Preview"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <FileUp className="h-16 w-16 text-swiss-lead/50 mb-4" />
                <p className="text-swiss-lead font-bold uppercase tracking-wider">
                  No PDF Uploaded
                </p>
                <p className="text-sm text-swiss-lead/70 mt-2">
                  Upload a PDF in the previous step to see preview
                </p>
                <Button 
                  variant="outline" 
                  onClick={onBack}
                  className="mt-4 border-2 border-swiss-ink font-bold uppercase"
                >
                  Go Back to Upload
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Panel: Tagging Grid */}
      <div className="lg:w-1/2 flex flex-col">
        <Card className="flex-1 border-2 border-swiss-ink overflow-hidden flex flex-col">
          <CardHeader className="border-b-2 border-swiss-ink bg-swiss-paper py-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-wider">
                  Question Mapping
                </CardTitle>
                <CardDescription className="text-xs font-bold uppercase tracking-wider text-swiss-lead mt-1">
                  Tag each question with topic and marks
                </CardDescription>
              </div>
              <Badge 
                variant="outline" 
                className="border-2 border-swiss-ink font-black text-lg px-3 py-1"
              >
                {totalMarks} marks
              </Badge>
            </div>
          </CardHeader>

          {/* Question List */}
          <CardContent className="flex-1 overflow-auto p-4 space-y-3">
            {questions.map((question, index) => (
              <QuestionRow
                key={question.id}
                question={question}
                index={index}
                onUpdate={handleUpdateQuestion}
                onRemove={handleRemoveQuestion}
                canRemove={questions.length > 1}
              />
            ))}

            {/* Add Question Button */}
            <Button
              variant="outline"
              onClick={handleAddQuestion}
              className="w-full border-2 border-dashed border-swiss-ink/50 hover:border-swiss-ink font-bold uppercase tracking-wider text-swiss-lead hover:text-swiss-ink"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </CardContent>

          {/* Footer */}
          <div className="border-t-2 border-swiss-ink p-4 bg-swiss-concrete">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-sm">
                  <span className="text-swiss-lead font-bold uppercase">Questions:</span>
                  <span className="ml-2 font-black">{questions.length}</span>
                </div>
                <div className="text-sm">
                  <span className="text-swiss-lead font-bold uppercase">Total Marks:</span>
                  <span className="ml-2 font-black">{totalMarks}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={onBack}
                  className="border-2 border-swiss-ink font-bold uppercase tracking-wider"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!isValid || isSubmitting}
                  className="bg-swiss-signal hover:bg-swiss-signal/90 text-white font-bold uppercase tracking-wider"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Create Assignment
                    </>
                  )}
                </Button>
              </div>
            </div>

            {!isValid && questions.length > 0 && (
              <div className="mt-3 flex items-center gap-2 text-amber-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-xs font-bold uppercase">
                  Complete all fields to continue
                </span>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

// =====================================================
// Question Row Component
// =====================================================

interface QuestionRowProps {
  question: MappedQuestion
  index: number
  onUpdate: (id: string, field: keyof MappedQuestion, value: string | number) => void
  onRemove: (id: string) => void
  canRemove: boolean
}

function QuestionRow({ question, index, onUpdate, onRemove, canRemove }: QuestionRowProps) {
  const topicNames = getTopicNames()
  const subTopics = question.topic ? getSubTopicsForTopic(question.topic) : []

  // Check if row is complete
  const isComplete = 
    question.questionNumber.trim() !== "" &&
    question.topic !== "" &&
    question.subTopic !== "" &&
    question.marks > 0

  return (
    <div 
      className={`
        border-2 p-3 transition-colors
        ${isComplete 
          ? "border-green-600 bg-green-50/30" 
          : "border-swiss-ink/30 bg-swiss-paper hover:border-swiss-ink/50"
        }
      `}
    >
      <div className="grid grid-cols-12 gap-3 items-end">
        {/* Drag Handle (placeholder for future) & Row Number */}
        <div className="col-span-1 flex items-center gap-1">
          <GripVertical className="h-4 w-4 text-swiss-lead/50" />
          <span className="text-xs font-black text-swiss-lead">{index + 1}</span>
        </div>

        {/* Question Number */}
        <div className="col-span-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-swiss-lead mb-1 block">
            Q#
          </Label>
          <Input
            value={question.questionNumber}
            onChange={(e) => onUpdate(question.id, "questionNumber", e.target.value)}
            placeholder="1a"
            className="border-2 border-swiss-ink/50 focus:border-swiss-ink font-bold h-9"
          />
        </div>

        {/* Topic Dropdown */}
        <div className="col-span-3">
          <Label className="text-xs font-bold uppercase tracking-wider text-swiss-lead mb-1 block">
            Topic
          </Label>
          <Select
            value={question.topic}
            onValueChange={(value) => onUpdate(question.id, "topic", value)}
          >
            <SelectTrigger className="border-2 border-swiss-ink/50 focus:border-swiss-ink h-9">
              <SelectValue placeholder="Select topic" />
            </SelectTrigger>
            <SelectContent>
              {topicNames.map((topic) => (
                <SelectItem key={topic} value={topic}>
                  {topic}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sub-Topic Dropdown */}
        <div className="col-span-3">
          <Label className="text-xs font-bold uppercase tracking-wider text-swiss-lead mb-1 block">
            Sub-Topic
          </Label>
          <Select
            value={question.subTopic}
            onValueChange={(value) => onUpdate(question.id, "subTopic", value)}
            disabled={!question.topic}
          >
            <SelectTrigger 
              className={`
                border-2 h-9
                ${question.topic 
                  ? "border-swiss-ink/50 focus:border-swiss-ink" 
                  : "border-swiss-ink/20 text-swiss-lead/50"
                }
              `}
            >
              <SelectValue placeholder={question.topic ? "Select sub-topic" : "Select topic first"} />
            </SelectTrigger>
            <SelectContent>
              {subTopics.map((subTopic) => (
                <SelectItem key={subTopic} value={subTopic}>
                  {subTopic}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Marks */}
        <div className="col-span-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-swiss-lead mb-1 block">
            Marks
          </Label>
          <Input
            type="number"
            min={1}
            max={20}
            value={question.marks || ""}
            onChange={(e) => onUpdate(question.id, "marks", parseInt(e.target.value) || 0)}
            placeholder="3"
            className="border-2 border-swiss-ink/50 focus:border-swiss-ink font-bold h-9 text-center"
          />
        </div>

        {/* Remove Button */}
        <div className="col-span-1 flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(question.id)}
            disabled={!canRemove}
            className={`
              h-9 w-9 
              ${canRemove 
                ? "text-red-600 hover:text-red-700 hover:bg-red-50" 
                : "text-swiss-lead/30"
              }
            `}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// Helper Functions
// =====================================================

function createEmptyQuestion(): MappedQuestion {
  return {
    id: crypto.randomUUID(),
    questionNumber: "",
    topic: "",
    subTopic: "",
    marks: 0,
  }
}

// =====================================================
// Bulk Add Helper (for quickly adding multiple questions)
// =====================================================

export interface QuickAddQuestion {
  questionNumber: string
  marks: number
}

/**
 * Helper to quickly create multiple question rows
 */
export function createQuestionRows(count: number, startNumber: number = 1): MappedQuestion[] {
  return Array.from({ length: count }, (_, i) => ({
    id: crypto.randomUUID(),
    questionNumber: String(startNumber + i),
    topic: "",
    subTopic: "",
    marks: 0,
  }))
}
