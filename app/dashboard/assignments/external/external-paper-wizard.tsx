"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  FileUp,
  Check,
  AlertCircle,
  FileText,
  Calendar,
  Users,
  Copy,
  Printer,
  ExternalLink,
  Sparkles,
  BookOpen,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ExternalMapper, type MappedQuestion } from "@/components/assignment-wizard/external-mapper"
import { QuestionExtractor } from "@/components/assignment-wizard/question-extractor"
import { SimilarGenerator } from "@/components/assignment-wizard/similar-generator"
import { 
  uploadExamPaper, 
  createExternalAssignment,
  type ExternalAssignment 
} from "@/app/actions/external-assignment"
import { createRevisionListWithQuestions } from "@/app/actions/revision-lists"
import { type Class } from "@/app/actions/classes"
import { toast } from "sonner"
import type { ExtractedQuestion, GeneratedSimilarQuestion } from "@/lib/types/database"

// =====================================================
// Types
// =====================================================

interface ExternalPaperWizardProps {
  classes: Class[]
}

type WizardStep = 
  | "upload" 
  | "extract"      // NEW: AI extraction of questions
  | "generate"     // NEW: Generate similar questions
  | "mapping" 
  | "configuration" 
  | "success"

// =====================================================
// Step indicator component
// =====================================================

interface StepIndicatorProps {
  currentStep: WizardStep
  enableRevisionFlow: boolean
}

function StepIndicator({ currentStep, enableRevisionFlow }: StepIndicatorProps) {
  const allSteps: WizardStep[] = enableRevisionFlow 
    ? ["upload", "extract", "generate", "mapping", "configuration", "success"]
    : ["upload", "mapping", "configuration", "success"]
  
  const stepLabels: Record<WizardStep, string> = {
    upload: "Upload",
    extract: "Extract",
    generate: "Generate",
    mapping: "Map Topics",
    configuration: "Configure",
    success: "Done",
  }

  const currentIndex = allSteps.indexOf(currentStep)

  return (
    <div className="flex items-center gap-2">
      {allSteps.map((step, index) => (
        <div key={step} className="flex items-center">
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
            ${index < currentIndex 
              ? "bg-green-600 text-white" 
              : index === currentIndex 
                ? "bg-swiss-signal text-white" 
                : "bg-swiss-lead/20 text-swiss-lead"
            }
          `}>
            {index < currentIndex ? <Check className="h-4 w-4" /> : index + 1}
          </div>
          <span className={`
            ml-2 text-xs font-bold uppercase tracking-wider hidden md:inline
            ${index === currentIndex ? "text-swiss-ink" : "text-swiss-lead"}
          `}>
            {stepLabels[step]}
          </span>
          {index < allSteps.length - 1 && (
            <div className={`
              w-8 h-0.5 mx-2
              ${index < currentIndex ? "bg-green-600" : "bg-swiss-lead/20"}
            `} />
          )}
        </div>
      ))}
    </div>
  )
}

// =====================================================
// Main Component
// =====================================================

export function ExternalPaperWizard({ classes }: ExternalPaperWizardProps) {
  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>("upload")
  
  // Feature flag: enable revision flow (extract + generate)
  const [enableRevisionFlow, setEnableRevisionFlow] = useState(true)

  // Step 1: Upload state
  const [file, setFile] = useState<File | null>(null)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Step 2: Extract state (NEW)
  const [extractedQuestions, setExtractedQuestions] = useState<ExtractedQuestion[]>([])

  // Step 3: Generate state (NEW)
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedSimilarQuestion[]>([])

  // Step 4: Mapping state
  const [mappedQuestions, setMappedQuestions] = useState<MappedQuestion[]>([])

  // Step 5: Configuration state
  const [title, setTitle] = useState("")
  const [selectedClassId, setSelectedClassId] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [createRevisionList, setCreateRevisionList] = useState(true)

  // Step 6: Success state
  const [createdAssignment, setCreatedAssignment] = useState<ExternalAssignment | null>(null)
  const [revisionListCreated, setRevisionListCreated] = useState<{
    questionCount: number
    studentsAllocated: number
  } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  // =====================================================
  // Handlers
  // =====================================================

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        setUploadError("Please select a PDF file")
        return
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        setUploadError("File size must be less than 10MB")
        return
      }
      setFile(selectedFile)
      setUploadError(null)
    }
  }, [])

  const handleUpload = useCallback(async () => {
    if (!file) return

    setUploading(true)
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const result = await uploadExamPaper(formData)

      if (!result.success) {
        setUploadError(result.error || "Upload failed")
        return
      }

      setUploadedUrl(result.data?.url || null)
      
      // Go to extract step if revision flow is enabled, otherwise mapping
      setCurrentStep(enableRevisionFlow ? "extract" : "mapping")
      toast.success("PDF uploaded successfully!")
    } catch (err) {
      console.error("Upload error:", err)
      setUploadError("An unexpected error occurred")
    } finally {
      setUploading(false)
    }
  }, [file, enableRevisionFlow])

  const handleExtractComplete = useCallback((questions: ExtractedQuestion[]) => {
    setExtractedQuestions(questions)
    
    // Also pre-populate mapped questions from extracted data
    const prePopulatedMapped: MappedQuestion[] = questions.map((q, index) => ({
      id: `mapped_${index}`,
      questionNumber: q.questionNumber,
      topic: q.suggestedTopic,
      subTopic: q.suggestedSubTopic,
      marks: q.suggestedMarks,
    }))
    setMappedQuestions(prePopulatedMapped)
    
    setCurrentStep("generate")
  }, [])

  const handleGenerateComplete = useCallback((questions: GeneratedSimilarQuestion[]) => {
    setGeneratedQuestions(questions)
    setCurrentStep("mapping")
  }, [])

  const handleMappingComplete = useCallback((questions: MappedQuestion[]) => {
    setMappedQuestions(questions)
    setCurrentStep("configuration")
  }, [])

  const handleCreateAssignment = useCallback(async () => {
    if (!uploadedUrl || mappedQuestions.length === 0 || !title || !selectedClassId) {
      return
    }

    setSubmitting(true)

    try {
      // 1. Create the assignment
      const result = await createExternalAssignment({
        classId: selectedClassId,
        title,
        dueDate: dueDate || null,
        resourceUrl: uploadedUrl,
        mappedQuestions,
        mode: "paper",
      })

      if (!result.success) {
        toast.error(result.error || "Failed to create assignment")
        return
      }

      setCreatedAssignment(result.data || null)

      // 2. Create revision list if enabled and we have generated questions
      if (createRevisionList && generatedQuestions.length > 0 && result.data) {
        const revisionResult = await createRevisionListWithQuestions({
          assignmentId: result.data.id,
          title: `Revision: ${title}`,
          description: `Practice questions generated from ${title}`,
          generatedQuestions,
          classId: selectedClassId,
        })

        if (revisionResult.success && revisionResult.data) {
          setRevisionListCreated({
            questionCount: revisionResult.data.questionCount,
            studentsAllocated: revisionResult.data.studentsAllocated,
          })
          toast.success("Revision list created and allocated to students!")
        } else {
          console.error("Failed to create revision list:", revisionResult.error)
          toast.warning("Assignment created, but revision list failed to create")
        }
      }

      setCurrentStep("success")
      toast.success("Assignment created!")
    } catch (err) {
      console.error("Create error:", err)
      toast.error("An unexpected error occurred")
    } finally {
      setSubmitting(false)
    }
  }, [uploadedUrl, mappedQuestions, title, selectedClassId, dueDate, createRevisionList, generatedQuestions])

  const handleCopyLink = useCallback(async () => {
    if (!createdAssignment) return

    const url = `${window.location.origin}/dashboard/assignments/${createdAssignment.id}/mark`
    await navigator.clipboard.writeText(url)
    setLinkCopied(true)
    toast.success("Link copied!")
    setTimeout(() => setLinkCopied(false), 3000)
  }, [createdAssignment])

  const totalMarks = mappedQuestions.reduce((sum, q) => sum + q.marks, 0)
  const totalSteps = enableRevisionFlow ? 6 : 4
  const _currentStepNum = enableRevisionFlow
    ? ["upload", "extract", "generate", "mapping", "configuration", "success"].indexOf(currentStep) + 1
    : ["upload", "mapping", "configuration", "success"].indexOf(currentStep) + 1
  void _currentStepNum // Available for step indicator if needed

  // =====================================================
  // Step 1: Upload
  // =====================================================

  if (currentStep === "upload") {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col">
        {/* Header */}
        <div className="border-b-2 border-swiss-ink bg-swiss-concrete px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/assignments">
                <Button variant="outline" size="icon" className="border-2 border-swiss-ink">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-swiss-lead">
                  Step 1 of {totalSteps}
                </p>
                <h1 className="text-2xl font-black uppercase tracking-tight">
                  Upload Exam Paper
                </h1>
              </div>
            </div>
            <StepIndicator currentStep={currentStep} enableRevisionFlow={enableRevisionFlow} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="w-full max-w-xl border-2 border-swiss-ink">
            <CardHeader className="border-b-2 border-swiss-ink bg-swiss-concrete">
              <CardTitle className="text-lg font-black uppercase tracking-wider">
                Upload PDF
              </CardTitle>
              <CardDescription>
                Upload an exam paper to extract questions and generate revision materials
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Drop zone */}
              <div
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center transition-colors
                  ${file ? "border-swiss-signal bg-swiss-signal/5" : "border-swiss-lead hover:border-swiss-ink"}
                `}
              >
                {file ? (
                  <div className="space-y-2">
                    <FileText className="h-12 w-12 mx-auto text-swiss-signal" />
                    <p className="font-bold">{file.name}</p>
                    <p className="text-sm text-swiss-lead">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFile(null)}
                      className="border-2 border-swiss-ink"
                    >
                      Choose Different File
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <FileUp className="h-12 w-12 mx-auto text-swiss-lead" />
                    <div>
                      <p className="font-bold">Drop PDF here or click to browse</p>
                      <p className="text-sm text-swiss-lead">Maximum file size: 10MB</p>
                    </div>
                    <Input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handleFileChange}
                      className="max-w-xs mx-auto"
                    />
                  </div>
                )}
              </div>

              {/* Error message */}
              {uploadError && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 p-3 rounded">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <p className="text-sm">{uploadError}</p>
                </div>
              )}

              {/* Revision flow toggle */}
              <div className="flex items-center justify-between p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-bold text-blue-900">Generate Revision Questions</p>
                    <p className="text-xs text-blue-700">
                      AI will extract questions and generate similar practice questions
                    </p>
                  </div>
                </div>
                <Switch
                  checked={enableRevisionFlow}
                  onCheckedChange={setEnableRevisionFlow}
                />
              </div>

              {/* Upload button */}
              <Button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="w-full bg-swiss-signal hover:bg-swiss-ink text-white font-bold uppercase tracking-wider"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    Upload & Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>

              {/* Info */}
              <div className="bg-swiss-concrete border-2 border-swiss-ink p-4 space-y-2">
                <h4 className="font-black uppercase tracking-wider text-sm">How it works</h4>
                <ol className="text-sm space-y-1 text-swiss-lead">
                  <li>1. Upload your exam paper PDF</li>
                  {enableRevisionFlow && (
                    <>
                      <li>2. AI extracts questions from the paper</li>
                      <li>3. Generate similar revision questions</li>
                    </>
                  )}
                  <li>{enableRevisionFlow ? "4" : "2"}. Map questions to topics for analytics</li>
                  <li>{enableRevisionFlow ? "5" : "3"}. Assign to a class and configure</li>
                  <li>{enableRevisionFlow ? "6" : "4"}. Revision list auto-allocated to students</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // =====================================================
  // Step 2: Extract (NEW)
  // =====================================================

  if (currentStep === "extract") {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {/* Header */}
        <div className="border-b-2 border-swiss-ink bg-swiss-concrete px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="icon" 
                className="border-2 border-swiss-ink"
                onClick={() => setCurrentStep("upload")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-swiss-lead">
                  Step 2 of {totalSteps}
                </p>
                <h1 className="text-2xl font-black uppercase tracking-tight">
                  Extract Questions
                </h1>
              </div>
            </div>
            <StepIndicator currentStep={currentStep} enableRevisionFlow={enableRevisionFlow} />
          </div>
        </div>

        {/* Question Extractor */}
        <div className="flex-1 overflow-hidden p-6">
          <QuestionExtractor
            pdfUrl={uploadedUrl}
            onExtractComplete={handleExtractComplete}
            onBack={() => setCurrentStep("upload")}
            initialQuestions={extractedQuestions.length > 0 ? extractedQuestions : undefined}
          />
        </div>
      </div>
    )
  }

  // =====================================================
  // Step 3: Generate (NEW)
  // =====================================================

  if (currentStep === "generate") {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {/* Header */}
        <div className="border-b-2 border-swiss-ink bg-swiss-concrete px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="icon" 
                className="border-2 border-swiss-ink"
                onClick={() => setCurrentStep("extract")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-swiss-lead">
                  Step 3 of {totalSteps}
                </p>
                <h1 className="text-2xl font-black uppercase tracking-tight">
                  Generate Similar Questions
                </h1>
              </div>
            </div>
            <StepIndicator currentStep={currentStep} enableRevisionFlow={enableRevisionFlow} />
          </div>
        </div>

        {/* Similar Generator */}
        <div className="flex-1 overflow-hidden">
          <SimilarGenerator
            extractedQuestions={extractedQuestions}
            onGenerateComplete={handleGenerateComplete}
            onBack={() => setCurrentStep("extract")}
            initialGeneratedQuestions={generatedQuestions.length > 0 ? generatedQuestions : undefined}
          />
        </div>
      </div>
    )
  }

  // =====================================================
  // Step 4: Mapping
  // =====================================================

  if (currentStep === "mapping") {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {/* Header */}
        <div className="border-b-2 border-swiss-ink bg-swiss-concrete px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="icon" 
                className="border-2 border-swiss-ink"
                onClick={() => setCurrentStep(enableRevisionFlow ? "generate" : "upload")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-swiss-lead">
                  Step {enableRevisionFlow ? 4 : 2} of {totalSteps}
                </p>
                <h1 className="text-2xl font-black uppercase tracking-tight">
                  Map Questions to Topics
                </h1>
              </div>
            </div>
            <StepIndicator currentStep={currentStep} enableRevisionFlow={enableRevisionFlow} />
          </div>
        </div>

        {/* External Mapper */}
        <div className="flex-1 overflow-hidden p-6">
          <ExternalMapper
            pdfUrl={uploadedUrl}
            onMappingComplete={handleMappingComplete}
            onBack={() => setCurrentStep(enableRevisionFlow ? "generate" : "upload")}
            initialQuestions={mappedQuestions.length > 0 ? mappedQuestions : undefined}
          />
        </div>
      </div>
    )
  }

  // =====================================================
  // Step 5: Configuration
  // =====================================================

  if (currentStep === "configuration") {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col">
        {/* Header */}
        <div className="border-b-2 border-swiss-ink bg-swiss-concrete px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="icon" 
                className="border-2 border-swiss-ink"
                onClick={() => setCurrentStep("mapping")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-swiss-lead">
                  Step {enableRevisionFlow ? 5 : 3} of {totalSteps}
                </p>
                <h1 className="text-2xl font-black uppercase tracking-tight">
                  Assignment Details
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="border-2 border-swiss-ink font-bold">
                {mappedQuestions.length} Questions / {totalMarks} Marks
              </Badge>
              <StepIndicator currentStep={currentStep} enableRevisionFlow={enableRevisionFlow} />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="w-full max-w-xl border-2 border-swiss-ink">
            <CardHeader className="border-b-2 border-swiss-ink bg-swiss-concrete">
              <CardTitle className="text-lg font-black uppercase tracking-wider">
                Configure Assignment
              </CardTitle>
              <CardDescription>
                Set the title, class, and due date for this assignment
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label className="font-bold uppercase tracking-wider text-xs">
                  Assignment Title *
                </Label>
                <Input
                  placeholder="e.g., Year 11 Mock Exam - Paper 1"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="border-2 border-swiss-ink"
                />
              </div>

              {/* Class */}
              <div className="space-y-2">
                <Label className="font-bold uppercase tracking-wider text-xs flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Assign to Class *
                </Label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger className="border-2 border-swiss-ink">
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name} ({cls.subject})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {classes.length === 0 && (
                  <p className="text-sm text-swiss-lead">
                    No classes found. Create a class first.
                  </p>
                )}
              </div>

              {/* Due Date */}
              <div className="space-y-2">
                <Label className="font-bold uppercase tracking-wider text-xs flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Due Date (Optional)
                </Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="border-2 border-swiss-ink"
                />
              </div>

              {/* Revision list toggle (if questions were generated) */}
              {generatedQuestions.length > 0 && (
                <div className="flex items-center justify-between p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-bold text-green-900">Create Revision List</p>
                      <p className="text-xs text-green-700">
                        {generatedQuestions.length} questions will be saved and allocated to students
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={createRevisionList}
                    onCheckedChange={setCreateRevisionList}
                  />
                </div>
              )}

              {/* Summary */}
              <div className="bg-swiss-concrete border-2 border-swiss-ink p-4 space-y-2">
                <h4 className="font-black uppercase tracking-wider text-sm">Summary</h4>
                <ul className="text-sm space-y-1 text-swiss-lead">
                  <li>• {mappedQuestions.length} questions mapped</li>
                  <li>• {totalMarks} total marks</li>
                  <li>• Mode: Paper-based (mark after collection)</li>
                  {generatedQuestions.length > 0 && createRevisionList && (
                    <li className="text-green-700">
                      • {generatedQuestions.length} revision questions to be created
                    </li>
                  )}
                </ul>
              </div>

              {/* Create button */}
              <Button
                onClick={handleCreateAssignment}
                disabled={!title || !selectedClassId || submitting}
                className="w-full bg-swiss-signal hover:bg-swiss-ink text-white font-bold uppercase tracking-wider"
              >
                {submitting ? (
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
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // =====================================================
  // Step 6: Success
  // =====================================================

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="border-b-2 border-swiss-ink bg-swiss-signal px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center">
            <Check className="h-6 w-6 text-swiss-signal" />
          </div>
          <div className="text-white">
            <p className="text-xs font-black uppercase tracking-widest opacity-75">
              Step {totalSteps} of {totalSteps}
            </p>
            <h1 className="text-2xl font-black uppercase tracking-tight">
              Assignment Created!
            </h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-xl border-2 border-swiss-ink">
          <CardHeader className="border-b-2 border-swiss-ink bg-swiss-concrete text-center">
            <CardTitle className="text-xl font-black uppercase tracking-wider">
              {createdAssignment?.title}
            </CardTitle>
            <CardDescription>
              Assigned to {createdAssignment?.className}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-swiss-concrete border-2 border-swiss-ink p-4 text-center">
                <p className="text-3xl font-black">{createdAssignment?.questionCount}</p>
                <p className="text-xs font-bold uppercase tracking-wider text-swiss-lead">Questions</p>
              </div>
              <div className="bg-swiss-concrete border-2 border-swiss-ink p-4 text-center">
                <p className="text-3xl font-black">{createdAssignment?.totalMarks}</p>
                <p className="text-xs font-bold uppercase tracking-wider text-swiss-lead">Marks</p>
              </div>
            </div>

            {/* Revision list created notice */}
            {revisionListCreated && (
              <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="font-bold text-green-900">Revision List Created!</p>
                    <p className="text-sm text-green-700">
                      {revisionListCreated.questionCount} revision questions saved and 
                      allocated to {revisionListCreated.studentsAllocated} students
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <Link href={`/dashboard/assignments/${createdAssignment?.id}/mark`} className="block">
                <Button className="w-full bg-swiss-signal hover:bg-swiss-ink text-white font-bold uppercase tracking-wider">
                  <Printer className="h-4 w-4 mr-2" />
                  Go to Marking
                </Button>
              </Link>

              <Button
                variant="outline"
                className="w-full border-2 border-swiss-ink font-bold uppercase tracking-wider"
                onClick={handleCopyLink}
              >
                {linkCopied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Marking Link
                  </>
                )}
              </Button>

              {createdAssignment?.resourceUrl && (
                <a 
                  href={createdAssignment.resourceUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button
                    variant="outline"
                    className="w-full border-2 border-swiss-ink font-bold uppercase tracking-wider"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Exam Paper PDF
                  </Button>
                </a>
              )}

              <Link href="/dashboard/assignments" className="block">
                <Button
                  variant="ghost"
                  className="w-full font-bold uppercase tracking-wider"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Assignments
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
