"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useConvex } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
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
  Library,
} from "lucide-react"
import type { DigitizedPaper } from "@/app/actions/external-assignment"

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
  { value: "AS Level", label: "AS Level" },
  { value: "A Level", label: "A Level" },
  { value: "IGCSE", label: "IGCSE" },
  { value: "IB SL", label: "IB SL" },
  { value: "IB HL", label: "IB HL" },
]

// =====================================================
// Props
// =====================================================

type PaperSource = "upload" | "library"
type SourceMode = "ai_only" | "bank_only" | "mixed"

interface ShadowPaperUploaderProps {
  classes: Array<{ id: string; name: string }>
  digitizedPapers: DigitizedPaper[]
}

// =====================================================
// TargetSettings sub-component (shared between upload/library views)
// =====================================================

interface TargetSettingsProps {
  classes: Array<{ id: string; name: string }>
  selectedClassId: string
  setSelectedClassId: (v: string) => void
  targetStream: string
  setTargetStream: (v: string) => void
  targetYear: string
  setTargetYear: (v: string) => void
  isProcessing: boolean
}

function TargetSettings({
  classes, selectedClassId, setSelectedClassId,
  targetStream, setTargetStream,
  targetYear, setTargetYear,
  isProcessing,
}: TargetSettingsProps) {
  return (
    <div className="border-2 border-swiss-ink bg-swiss-paper p-4 space-y-4 flex-shrink-0">
      <h3 className="text-sm font-black uppercase tracking-widest text-swiss-ink">TARGET SETTINGS</h3>
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
  )
}

// =====================================================
// Source Mode Selector sub-component
// =====================================================

interface SourceModeSelectorProps {
  sourceMode: SourceMode
  setSourceMode: (v: SourceMode) => void
  isProcessing: boolean
}

const SOURCE_MODE_OPTIONS: { value: SourceMode; label: string; description: string }[] = [
  { value: "ai_only", label: "AI Only", description: "New questions generated by AI, matching exam style" },
  { value: "bank_only", label: "Bank Only", description: "Questions drawn from your question bank by topic" },
  { value: "mixed", label: "Mixed", description: "Half from the bank, half AI-generated" },
]

function SourceModeSelector({ sourceMode, setSourceMode, isProcessing }: SourceModeSelectorProps) {
  return (
    <div className="border-2 border-swiss-ink bg-swiss-paper p-4 space-y-3 flex-shrink-0">
      <h3 className="text-sm font-black uppercase tracking-widest text-swiss-ink">QUESTION SOURCE</h3>
      <div className="grid grid-cols-3 gap-2">
        {SOURCE_MODE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSourceMode(opt.value)}
            disabled={isProcessing}
            className={`border-2 p-3 text-left transition-colors ${
              sourceMode === opt.value
                ? "border-swiss-signal bg-swiss-signal/5"
                : "border-swiss-ink/30 bg-white hover:border-swiss-ink"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <div className={`text-xs font-black uppercase tracking-wider mb-1 ${sourceMode === opt.value ? "text-swiss-signal" : "text-swiss-ink"}`}>
              {opt.label}
            </div>
            <div className="text-[10px] text-swiss-lead leading-tight">{opt.description}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

// =====================================================
// Component
// =====================================================

export function ShadowPaperUploader({ classes, digitizedPapers }: ShadowPaperUploaderProps) {
  const router = useRouter()
  const convex = useConvex()

  // Source toggle: upload a new PDF or pick from library
  const [paperSource, setPaperSource] = useState<PaperSource>("upload")
  const [loadingLibraryPaper, setLoadingLibraryPaper] = useState(false)

  // File state
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedLibraryPaperId, setSelectedLibraryPaperId] = useState<string | null>(null)

  // Settings state
  const [targetYear, setTargetYear] = useState(new Date().getFullYear().toString())
  const [targetStream, setTargetStream] = useState("")
  const [selectedClassId, setSelectedClassId] = useState("")
  const [sourceMode, setSourceMode] = useState<SourceMode>("ai_only")

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
  // Load a PDF from the library by URL
  // =====================================================

  const handleSelectLibraryPaper = async (paper: DigitizedPaper) => {
    try {
      setLoadingLibraryPaper(true)
      setSelectedLibraryPaperId(paper.id)

      const response = await fetch(paper.resource_url)
      if (!response.ok) throw new Error("Failed to download paper from library")

      const blob = await response.blob()
      const pdfFile = new File([blob], `${paper.title}.pdf`, { type: "application/pdf" })

      setFile(pdfFile)
      setPreviewUrl(URL.createObjectURL(pdfFile))
      setProgress({ status: "idle", message: "", currentStep: 0, totalSteps: 4 })
      setResultAssignmentId(null)

      // Pre-fill stream from paper metadata
      if (paper.level) setTargetStream(paper.level)
      if (paper.year) setTargetYear(paper.year)

      toast.success("PAPER LOADED", {
        description: `${paper.title} ready for shadow generation`
      })
    } catch (error) {
      toast.error("LOAD FAILED", {
        description: error instanceof Error ? error.message : "Could not load paper"
      })
      setSelectedLibraryPaperId(null)
    } finally {
      setLoadingLibraryPaper(false)
    }
  }

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
  // Helper: Upload page images to Convex file storage.
  // Returns the Convex storageIds — the /api/ai/shadow-paper route resolves
  // served URLs (and cleans them up) from these ids.
  // =====================================================

  const uploadPageImages = async (images: string[]): Promise<string[]> => {
    const storageIds: string[] = []

    for (let i = 0; i < images.length; i++) {
      // Convert base64 data URL to Blob
      const response = await fetch(images[i])
      const blob = await response.blob()

      // 1. Request an upload URL from Convex.
      const { uploadUrl } = await convex.mutation(api.files.generateUploadUrl, {})

      // 2. POST the page image directly to Convex storage.
      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "image/png" },
        body: blob,
      })
      if (!uploadRes.ok) {
        throw new Error(`Failed to upload page ${i + 1}: status ${uploadRes.status}`)
      }
      const { storageId } = (await uploadRes.json()) as { storageId: Id<"_storage"> }
      storageIds.push(storageId)
    }

    return storageIds
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

      // Step 1b: Upload images to Convex storage
      setProgress({
        status: "uploading",
        message: `Uploading ${pageImages.length} page images...`,
        currentStep: 1,
        totalSteps: 4,
      })

      const imagePaths = await uploadPageImages(pageImages)

      // Step 2: Send Convex served URLs to API for extraction
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
          sourceMode,
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
    setSelectedLibraryPaperId(null)
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
      {/* Left Panel: Paper Source */}
      <Card className="border-2 border-swiss-ink bg-swiss-paper h-[700px] flex flex-col">
        <CardHeader className="border-b-2 border-swiss-ink flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-swiss-signal" />
            <CardTitle className="text-xl font-black uppercase tracking-wider text-swiss-ink">
              SHADOW PAPER GENERATOR
            </CardTitle>
          </div>
          <CardDescription className="font-bold text-xs uppercase tracking-wider text-swiss-lead">
            Choose a past paper to generate similar practice questions
          </CardDescription>

          {/* Source toggle */}
          <div className="flex border-2 border-swiss-ink mt-2">
            <button
              type="button"
              onClick={() => { setPaperSource("upload"); handleReset() }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                paperSource === "upload"
                  ? "bg-swiss-ink text-white"
                  : "hover:bg-swiss-concrete"
              }`}
            >
              <Upload className="w-3 h-3" />
              Upload New
            </button>
            <button
              type="button"
              onClick={() => { setPaperSource("library"); handleReset() }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold uppercase tracking-wider transition-colors border-l-2 border-swiss-ink ${
                paperSource === "library"
                  ? "bg-swiss-ink text-white"
                  : "hover:bg-swiss-concrete"
              }`}
            >
              <Library className="w-3 h-3" />
              From Library
            </button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-4 overflow-hidden flex flex-col">
          {/* ---- UPLOAD SOURCE ---- */}
          {paperSource === "upload" && (
            !file ? (
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
                    <Badge variant="outline" className="border-swiss-ink text-xs">PDF only</Badge>
                    <Badge variant="outline" className="border-swiss-ink text-xs">Max 50MB</Badge>
                  </div>
                </div>
              </div>
            ) : (
              /* File selected */
              <div className="flex-1 flex flex-col gap-4">
                {/* File info */}
                <div className="border-2 border-swiss-ink bg-swiss-concrete p-4 flex items-center gap-4 flex-shrink-0">
                  <div className="w-12 h-12 border-2 border-swiss-ink bg-swiss-paper flex items-center justify-center">
                    <FileText className="w-6 h-6 text-swiss-signal" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{file.name}</p>
                    <p className="text-xs text-swiss-lead">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={handleReset} disabled={isProcessing} className="border-2 border-swiss-ink">
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* PDF Preview */}
                {previewUrl && (
                  <div className="flex-1 border-2 border-swiss-ink bg-white overflow-hidden">
                    <iframe src={previewUrl} className="w-full h-full" title="PDF Preview" />
                  </div>
                )}

                {/* Settings */}
                <TargetSettings
                  classes={classes}
                  selectedClassId={selectedClassId}
                  setSelectedClassId={setSelectedClassId}
                  targetStream={targetStream}
                  setTargetStream={setTargetStream}
                  targetYear={targetYear}
                  setTargetYear={setTargetYear}
                  isProcessing={isProcessing}
                />

                {/* Source Mode */}
                <SourceModeSelector sourceMode={sourceMode} setSourceMode={setSourceMode} isProcessing={isProcessing} />
              </div>
            )
          )}

          {/* ---- LIBRARY SOURCE ---- */}
          {paperSource === "library" && (
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
              {!file ? (
                /* Paper picker list */
                <div className="flex-1 overflow-y-auto space-y-2">
                  {digitizedPapers.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-center p-8">
                      <div className="space-y-3">
                        <Library className="w-12 h-12 mx-auto text-swiss-lead opacity-50" />
                        <p className="font-bold text-swiss-ink">No digitized papers yet</p>
                        <p className="text-sm text-swiss-lead">
                          Use Smart Digitize to upload papers first, then pick them here.
                        </p>
                      </div>
                    </div>
                  ) : (
                    digitizedPapers.map(paper => (
                      <button
                        key={paper.id}
                        type="button"
                        onClick={() => handleSelectLibraryPaper(paper)}
                        disabled={loadingLibraryPaper}
                        className={`w-full text-left border-2 p-4 transition-colors hover:bg-swiss-concrete flex items-center gap-4 ${
                          selectedLibraryPaperId === paper.id
                            ? "border-swiss-signal bg-swiss-signal/10"
                            : "border-swiss-ink"
                        }`}
                      >
                        <div className="w-10 h-10 border-2 border-swiss-ink bg-swiss-concrete flex items-center justify-center flex-shrink-0">
                          {loadingLibraryPaper && selectedLibraryPaperId === paper.id
                            ? <Loader2 className="w-5 h-5 animate-spin text-swiss-signal" />
                            : <FileText className="w-5 h-5 text-swiss-lead" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate">{paper.title}</p>
                          <p className="text-xs text-swiss-lead">
                            {[paper.exam_board, paper.level, paper.year].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        {selectedLibraryPaperId === paper.id && !loadingLibraryPaper && (
                          <Check className="w-5 h-5 text-swiss-signal flex-shrink-0" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              ) : (
                /* Paper loaded from library */
                <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                  <div className="border-2 border-swiss-signal bg-swiss-signal/10 p-4 flex items-center gap-4 flex-shrink-0">
                    <div className="w-12 h-12 border-2 border-swiss-signal bg-white flex items-center justify-center">
                      <Library className="w-6 h-6 text-swiss-signal" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate text-swiss-signal">FROM LIBRARY</p>
                      <p className="text-xs text-swiss-ink font-bold truncate">{file.name.replace(/\.pdf$/i, "")}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={handleReset} disabled={isProcessing} className="border-2 border-swiss-ink">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {previewUrl && (
                    <div className="flex-1 border-2 border-swiss-ink bg-white overflow-hidden">
                      <iframe src={previewUrl} className="w-full h-full" title="PDF Preview" />
                    </div>
                  )}

                  <TargetSettings
                    classes={classes}
                    selectedClassId={selectedClassId}
                    setSelectedClassId={setSelectedClassId}
                    targetStream={targetStream}
                    setTargetStream={setTargetStream}
                    targetYear={targetYear}
                    setTargetYear={setTargetYear}
                    isProcessing={isProcessing}
                  />

                  {/* Source Mode */}
                  <SourceModeSelector sourceMode={sourceMode} setSourceMode={setSourceMode} isProcessing={isProcessing} />
                </div>
              )}
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
                  onClick={() => router.push(`/dashboard/assignments/${resultAssignmentId}/print`)}
                  className="w-full bg-swiss-signal hover:bg-swiss-signal/90 text-white font-bold uppercase tracking-wider h-12"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  PRINT / EXPORT PAPER
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  onClick={() => router.push(`/dashboard/assignments/${resultAssignmentId}`)}
                  variant="outline"
                  className="w-full border-2 border-swiss-ink font-bold uppercase tracking-wider h-12"
                >
                  VIEW ASSIGNMENT
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => router.push('/dashboard/library')}
                    variant="outline"
                    className="border-2 border-swiss-ink font-bold uppercase tracking-wider"
                  >
                    VIEW IN LIBRARY
                  </Button>
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="border-2 border-swiss-ink font-bold uppercase tracking-wider"
                  >
                    CREATE ANOTHER
                  </Button>
                </div>
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
