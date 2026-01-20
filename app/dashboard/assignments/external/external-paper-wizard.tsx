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
import { ExternalMapper, type MappedQuestion } from "@/components/assignment-wizard/external-mapper"
import { 
  uploadExamPaper, 
  createExternalAssignment,
  type ExternalAssignment 
} from "@/app/actions/external-assignment"
import { type Class } from "@/app/actions/classes"
import { toast } from "sonner"

// =====================================================
// Types
// =====================================================

interface ExternalPaperWizardProps {
  classes: Class[]
}

type WizardStep = "upload" | "mapping" | "configuration" | "success"

// =====================================================
// Main Component
// =====================================================

export function ExternalPaperWizard({ classes }: ExternalPaperWizardProps) {
  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>("upload")

  // Step 1: Upload state
  const [file, setFile] = useState<File | null>(null)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Step 2: Mapping state
  const [mappedQuestions, setMappedQuestions] = useState<MappedQuestion[]>([])

  // Step 3: Configuration state
  const [title, setTitle] = useState("")
  const [selectedClassId, setSelectedClassId] = useState("")
  const [dueDate, setDueDate] = useState("")

  // Step 4: Success state
  const [createdAssignment, setCreatedAssignment] = useState<ExternalAssignment | null>(null)
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
      setCurrentStep("mapping")
      toast.success("PDF uploaded successfully!")
    } catch (err) {
      console.error("Upload error:", err)
      setUploadError("An unexpected error occurred")
    } finally {
      setUploading(false)
    }
  }, [file])

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
      setCurrentStep("success")
      toast.success("Assignment created!")
    } catch (err) {
      console.error("Create error:", err)
      toast.error("An unexpected error occurred")
    } finally {
      setSubmitting(false)
    }
  }, [uploadedUrl, mappedQuestions, title, selectedClassId, dueDate])

  const handleCopyLink = useCallback(async () => {
    if (!createdAssignment) return

    const url = `${window.location.origin}/dashboard/assignments/${createdAssignment.id}/mark`
    await navigator.clipboard.writeText(url)
    setLinkCopied(true)
    toast.success("Link copied!")
    setTimeout(() => setLinkCopied(false), 3000)
  }, [createdAssignment])

  const totalMarks = mappedQuestions.reduce((sum, q) => sum + q.marks, 0)

  // =====================================================
  // Step 1: Upload
  // =====================================================

  if (currentStep === "upload") {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col">
        {/* Header */}
        <div className="border-b-2 border-swiss-ink bg-swiss-concrete px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/assignments">
              <Button variant="outline" size="icon" className="border-2 border-swiss-ink">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-swiss-lead">
                Step 1 of 4
              </p>
              <h1 className="text-2xl font-black uppercase tracking-tight">
                Upload Exam Paper
              </h1>
            </div>
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
                Upload an exam paper created in Exam Wizard or any other tool
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
                  <li>2. Map each question to topics for analytics</li>
                  <li>3. Assign to a class and set due date</li>
                  <li>4. Mark submissions and generate feedback</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // =====================================================
  // Step 2: Mapping
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
                onClick={() => setCurrentStep("upload")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-swiss-lead">
                  Step 2 of 4
                </p>
                <h1 className="text-2xl font-black uppercase tracking-tight">
                  Map Questions to Topics
                </h1>
              </div>
            </div>
          </div>
        </div>

        {/* External Mapper */}
        <div className="flex-1 overflow-hidden p-6">
          <ExternalMapper
            pdfUrl={uploadedUrl}
            onMappingComplete={handleMappingComplete}
            onBack={() => setCurrentStep("upload")}
            initialQuestions={mappedQuestions.length > 0 ? mappedQuestions : undefined}
          />
        </div>
      </div>
    )
  }

  // =====================================================
  // Step 3: Configuration
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
                  Step 3 of 4
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

              {/* Summary */}
              <div className="bg-swiss-concrete border-2 border-swiss-ink p-4 space-y-2">
                <h4 className="font-black uppercase tracking-wider text-sm">Summary</h4>
                <ul className="text-sm space-y-1 text-swiss-lead">
                  <li>• {mappedQuestions.length} questions mapped</li>
                  <li>• {totalMarks} total marks</li>
                  <li>• Mode: Paper-based (mark after collection)</li>
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
  // Step 4: Success
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
              Step 4 of 4
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
