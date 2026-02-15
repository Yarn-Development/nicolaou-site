"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Upload,
  FileText,
  Loader2,
  Check,
  AlertCircle,
  Sparkles,
  Copy,
  ChevronRight,
  X,
  Calendar,
  GraduationCap,
  Users,
} from "lucide-react"

// =====================================================
// Types
// =====================================================

type ProcessingStatus = "idle" | "uploading" | "extracting" | "generating" | "saving" | "complete" | "error"

interface ProcessingProgress {
  status: ProcessingStatus
  message: string
  currentStep: number
  totalSteps: number
  extractedCount?: number
  generatedCount?: number
}

// Generate years from 2015 to current year + 1
const YEARS = Array.from(
  { length: new Date().getFullYear() - 2014 + 1 },
  (_, i) => (2015 + i).toString()
).reverse()

const TARGET_STREAMS = [
  { value: "GCSE Foundation", label: "GCSE Foundation" },
  { value: "GCSE Higher", label: "GCSE Higher" },
  { value: "A-Level Pure", label: "A Level Pure" },
  { value: "A-Level Statistics", label: "A Level Statistics" },
  { value: "A-Level Mechanics", label: "A Level Mechanics" },
]

// =====================================================
// Props
// =====================================================

interface ShadowPaperUploaderProps {
  classes: Array<{ id: string; name: string }>
}

// =====================================================
// Component
// =====================================================

export function ShadowPaperUploader({ classes }: ShadowPaperUploaderProps) {
  const router = useRouter()
  
  // File state
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  
  // Settings state
  const [targetYear, setTargetYear] = useState(new Date().getFullYear().toString())
  const [targetStream, setTargetStream] = useState("")
  const [selectedClassId, setSelectedClassId] = useState("")
  
  // Processing state
  const [progress, setProgress] = useState<ProcessingProgress>({
    status: "idle",
    message: "",
    currentStep: 0,
    totalSteps: 4,
  })
  const [resultAssignmentId, setResultAssignmentId] = useState<string | null>(null)
  const [resultTitle, setResultTitle] = useState<string>("")

  // =====================================================
  // Dropzone setup
  // =====================================================

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const pdfFile = acceptedFiles[0]
    if (!pdfFile) return

    if (pdfFile.type !== "application/pdf") {
      toast.error("INVALID FILE TYPE", {
        description: "Please upload a PDF file"
      })
      return
    }

    if (pdfFile.size > 50 * 1024 * 1024) {
      toast.error("FILE TOO LARGE", {
        description: "PDF must be smaller than 50MB"
      })
      return
    }

    setFile(pdfFile)
    setPreviewUrl(URL.createObjectURL(pdfFile))
    setProgress({ status: "idle", message: "", currentStep: 0, totalSteps: 4 })
    setResultAssignmentId(null)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"]
    },
    maxFiles: 1,
    multiple: false,
  })

  // =====================================================
  // PDF to Images conversion
  // =====================================================

  const convertPdfToImages = async (pdfFile: File): Promise<string[]> => {
    // Dynamically import pdfjs-dist to avoid SSR issues
    const pdfjsLib = await import("pdfjs-dist")
    
    // Set up worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
    
    const arrayBuffer = await pdfFile.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const images: string[] = []

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const scale = 2 // Higher quality
      const viewport = page.getViewport({ scale })

      const canvas = document.createElement("canvas")
      const context = canvas.getContext("2d")!
      canvas.width = viewport.width
      canvas.height = viewport.height

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
        canvas: canvas,
      }
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await page.render(renderContext as any).promise

      const imageData = canvas.toDataURL("image/png")
      images.push(imageData)
    }

    return images
  }

  // =====================================================
  // Helper: Upload page images to Supabase Storage
  // =====================================================

  const uploadPageImages = async (images: string[]): Promise<string[]> => {
    const supabase = createClient()
    const timestamp = Date.now()
    const uploadedPaths: string[] = []

    for (let i = 0; i < images.length; i++) {
      // Convert base64 data URL to Blob
      const response = await fetch(images[i])
      const blob = await response.blob()

      const filePath = `shadow-pages/${timestamp}/page-${i + 1}.png`

      const { error } = await supabase.storage
        .from("exam-papers")
        .upload(filePath, blob, {
          contentType: "image/png",
          upsert: false,
        })

      if (error) {
        throw new Error(`Failed to upload page ${i + 1}: ${error.message}`)
      }

      uploadedPaths.push(filePath)
    }

    return uploadedPaths
  }

  // =====================================================
  // Main processing function
  // =====================================================

  const handleGenerateShadowPaper = async () => {
    if (!file || !targetStream || !selectedClassId) {
      toast.error("MISSING SETTINGS", {
        description: "Please select a class, target year, and stream"
      })
      return
    }

    try {
      // Step 1: Convert PDF to images
      setProgress({
        status: "uploading",
        message: "Converting PDF to images...",
        currentStep: 1,
        totalSteps: 4,
      })

      const pageImages = await convertPdfToImages(file)

      if (pageImages.length === 0) {
        throw new Error("Failed to convert PDF to images")
      }

      // Step 1b: Upload images to Supabase Storage
      setProgress({
        status: "uploading",
        message: `Uploading ${pageImages.length} page images...`,
        currentStep: 1,
        totalSteps: 4,
      })

      const imagePaths = await uploadPageImages(pageImages)

      // Step 2: Send storage paths to API for extraction
      setProgress({
        status: "extracting",
        message: `Extracting questions from ${imagePaths.length} pages...`,
        currentStep: 2,
        totalSteps: 4,
      })

      const response = await fetch("/api/ai/shadow-paper", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imagePaths,
          targetYear,
          targetStream,
          classId: selectedClassId,
          originalFilename: file.name,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Failed to generate shadow paper")
      }

      // Step 3: Show results
      setProgress({
        status: "complete",
        message: "Shadow paper created successfully!",
        currentStep: 4,
        totalSteps: 4,
        extractedCount: result.data.extractedCount,
        generatedCount: result.data.generatedCount,
      })

      setResultAssignmentId(result.data.assignmentId)
      setResultTitle(result.data.assignmentTitle)

      toast.success("SHADOW PAPER CREATED", {
        description: `${result.data.generatedCount} questions generated`
      })

    } catch (error) {
      console.error("Shadow paper generation error:", error)
      setProgress({
        status: "error",
        message: error instanceof Error ? error.message : "An error occurred",
        currentStep: 0,
        totalSteps: 4,
      })
      toast.error("GENERATION FAILED", {
        description: error instanceof Error ? error.message : "Please try again"
      })
    }
  }

  // =====================================================
  // Reset function
  // =====================================================

  const handleReset = () => {
    setFile(null)
    setPreviewUrl(null)
    setProgress({ status: "idle", message: "", currentStep: 0, totalSteps: 4 })
    setResultAssignmentId(null)
    setResultTitle("")
  }

  // =====================================================
  // Render
  // =====================================================

  const isProcessing = ["uploading", "extracting", "generating", "saving"].includes(progress.status)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Panel: File Upload */}
      <Card className="border-2 border-swiss-ink bg-swiss-paper h-[700px] flex flex-col">
        <CardHeader className="border-b-2 border-swiss-ink flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-swiss-signal" />
            <CardTitle className="text-xl font-black uppercase tracking-wider text-swiss-ink">
              SHADOW PAPER GENERATOR
            </CardTitle>
          </div>
          <CardDescription className="font-bold text-xs uppercase tracking-wider text-swiss-lead">
            Upload a past paper to generate similar practice questions
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 p-4 overflow-hidden flex flex-col">
          {!file ? (
            /* Dropzone */
            <div
              {...getRootProps()}
              className={`flex-1 border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors ${
                isDragActive 
                  ? "border-swiss-signal bg-swiss-signal/10" 
                  : "border-swiss-ink bg-swiss-concrete hover:bg-swiss-concrete/70"
              }`}
            >
              <input {...getInputProps()} />
              <div className="text-center space-y-4 p-8">
                <div className={`w-20 h-20 mx-auto border-2 flex items-center justify-center transition-colors ${
                  isDragActive ? "border-swiss-signal bg-swiss-signal/20" : "border-swiss-ink bg-swiss-paper"
                }`}>
                  <Upload className={`w-10 h-10 ${isDragActive ? "text-swiss-signal" : "text-swiss-lead"}`} />
                </div>
                <div>
                  <p className="text-lg font-black uppercase tracking-wider text-swiss-ink mb-2">
                    {isDragActive ? "DROP YOUR PAST PAPER HERE" : "DRAG & DROP YOUR PAST PAPER HERE"}
                  </p>
                  <p className="text-sm text-swiss-lead">
                    or click to browse for a PDF file
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Badge variant="outline" className="border-swiss-ink text-xs">
                    PDF only
                  </Badge>
                  <Badge variant="outline" className="border-swiss-ink text-xs">
                    Max 50MB
                  </Badge>
                </div>
              </div>
            </div>
          ) : (
            /* File Preview & Settings */
            <div className="flex-1 flex flex-col gap-4">
              {/* File info */}
              <div className="border-2 border-swiss-ink bg-swiss-concrete p-4 flex items-center gap-4">
                <div className="w-12 h-12 border-2 border-swiss-ink bg-swiss-paper flex items-center justify-center">
                  <FileText className="w-6 h-6 text-swiss-signal" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{file.name}</p>
                  <p className="text-xs text-swiss-lead">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReset}
                  disabled={isProcessing}
                  className="border-2 border-swiss-ink"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* PDF Preview */}
              {previewUrl && (
                <div className="flex-1 border-2 border-swiss-ink bg-white overflow-hidden">
                  <iframe
                    src={previewUrl}
                    className="w-full h-full"
                    title="PDF Preview"
                  />
                </div>
              )}

              {/* Settings */}
              <div className="border-2 border-swiss-ink bg-swiss-paper p-4 space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-swiss-ink">
                  TARGET SETTINGS
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-swiss-lead flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      ASSIGN TO CLASS *
                    </label>
                    <Select value={selectedClassId} onValueChange={setSelectedClassId} disabled={isProcessing}>
                      <SelectTrigger className="border-2 border-swiss-ink bg-white">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-swiss-lead flex items-center gap-1">
                      <GraduationCap className="w-3 h-3" />
                      TARGET STREAM *
                    </label>
                    <Select value={targetStream} onValueChange={setTargetStream} disabled={isProcessing}>
                      <SelectTrigger className="border-2 border-swiss-ink bg-white">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {TARGET_STREAMS.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-swiss-lead flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      TARGET YEAR
                    </label>
                    <Select value={targetYear} onValueChange={setTargetYear} disabled={isProcessing}>
                      <SelectTrigger className="border-2 border-swiss-ink bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {YEARS.map(y => (
                          <SelectItem key={y} value={y}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Right Panel: Processing Status */}
      <Card className="border-2 border-swiss-ink bg-swiss-paper h-[700px] flex flex-col">
        <CardHeader className="border-b-2 border-swiss-ink flex-shrink-0">
          <CardTitle className="text-xl font-black uppercase tracking-wider text-swiss-ink">
            GENERATION STATUS
          </CardTitle>
          <CardDescription className="font-bold text-xs uppercase tracking-wider text-swiss-lead">
            AI-powered question cloning
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 p-6 flex flex-col">
          {progress.status === "idle" && !file && (
            /* Initial state */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4">
                <Copy className="w-16 h-16 mx-auto text-swiss-lead opacity-50" />
                <p className="text-lg font-bold text-swiss-ink">
                  Upload a past paper to begin
                </p>
                <p className="text-sm text-swiss-lead max-w-xs mx-auto">
                  The AI will analyze each question and generate new variations that test the same skills
                </p>
              </div>
            </div>
          )}

          {progress.status === "idle" && file && (
            /* Ready to generate */
            <div className="flex-1 flex flex-col">
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 mx-auto border-2 border-swiss-signal bg-swiss-signal/10 flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-swiss-signal" />
                  </div>
                  <div>
                    <p className="text-lg font-black uppercase tracking-wider text-swiss-ink mb-2">
                      READY TO GENERATE
                    </p>
                    <p className="text-sm text-swiss-lead">
                      The AI will:
                    </p>
                    <ul className="text-xs text-swiss-lead mt-3 space-y-2 text-left max-w-xs mx-auto">
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 bg-swiss-ink text-white text-xs flex items-center justify-center flex-shrink-0">1</span>
                        Extract all questions from the PDF
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 bg-swiss-ink text-white text-xs flex items-center justify-center flex-shrink-0">2</span>
                        Analyze the mathematical skills tested
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 bg-swiss-ink text-white text-xs flex items-center justify-center flex-shrink-0">3</span>
                        Generate new questions with different values
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 bg-swiss-ink text-white text-xs flex items-center justify-center flex-shrink-0">4</span>
                        Create a ready-to-use assignment
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <Button
                onClick={handleGenerateShadowPaper}
                disabled={!targetStream || !selectedClassId}
                className="w-full bg-swiss-signal hover:bg-swiss-signal/90 text-white font-bold uppercase tracking-wider h-14 text-lg"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                GENERATE SHADOW PAPER
              </Button>
            </div>
          )}

          {isProcessing && (
            /* Processing state */
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="text-center space-y-6 w-full max-w-sm">
                <Loader2 className="w-16 h-16 mx-auto text-swiss-signal animate-spin" />
                <div>
                  <p className="text-lg font-black uppercase tracking-wider text-swiss-ink mb-2">
                    {progress.status === "uploading" && "CONVERTING PDF"}
                    {progress.status === "extracting" && "EXTRACTING QUESTIONS"}
                    {progress.status === "generating" && "GENERATING SHADOWS"}
                    {progress.status === "saving" && "SAVING QUESTIONS"}
                  </p>
                  <p className="text-sm text-swiss-lead">
                    {progress.message}
                  </p>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-swiss-concrete border-2 border-swiss-ink h-3">
                  <div 
                    className="bg-swiss-signal h-full transition-all duration-500"
                    style={{ width: `${(progress.currentStep / progress.totalSteps) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-swiss-lead">
                  Step {progress.currentStep} of {progress.totalSteps}
                </p>
              </div>
            </div>
          )}

          {progress.status === "complete" && (
            /* Success state */
            <div className="flex-1 flex flex-col">
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 mx-auto border-2 border-green-500 bg-green-50 flex items-center justify-center">
                    <Check className="w-10 h-10 text-green-600" />
                  </div>
                  <div>
                    <p className="text-lg font-black uppercase tracking-wider text-swiss-ink mb-2">
                      SHADOW PAPER CREATED
                    </p>
                    <p className="text-sm text-swiss-lead mb-4">
                      {resultTitle}
                    </p>
                    <div className="flex justify-center gap-4">
                      <div className="text-center">
                        <p className="text-3xl font-black text-swiss-ink">{progress.extractedCount}</p>
                        <p className="text-xs text-swiss-lead uppercase tracking-wider">Extracted</p>
                      </div>
                      <div className="w-px bg-swiss-ink/20" />
                      <div className="text-center">
                        <p className="text-3xl font-black text-swiss-signal">{progress.generatedCount}</p>
                        <p className="text-xs text-swiss-lead uppercase tracking-wider">Generated</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <Button
                  onClick={() => router.push(`/dashboard/assignments/${resultAssignmentId}`)}
                  className="w-full bg-swiss-signal hover:bg-swiss-signal/90 text-white font-bold uppercase tracking-wider h-12"
                >
                  VIEW ASSIGNMENT
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="w-full border-2 border-swiss-ink font-bold uppercase tracking-wider"
                >
                  CREATE ANOTHER
                </Button>
              </div>
            </div>
          )}

          {progress.status === "error" && (
            /* Error state */
            <div className="flex-1 flex flex-col">
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 mx-auto border-2 border-red-500 bg-red-50 flex items-center justify-center">
                    <AlertCircle className="w-10 h-10 text-red-600" />
                  </div>
                  <div>
                    <p className="text-lg font-black uppercase tracking-wider text-swiss-ink mb-2">
                      GENERATION FAILED
                    </p>
                    <p className="text-sm text-red-600 max-w-xs mx-auto">
                      {progress.message}
                    </p>
                  </div>
                </div>
              </div>
              
              <Button
                onClick={handleReset}
                variant="outline"
                className="w-full border-2 border-swiss-ink font-bold uppercase tracking-wider"
              >
                TRY AGAIN
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
