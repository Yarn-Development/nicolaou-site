"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
  ChevronRight,
  ChevronLeft,
  X,
  Calendar,
  GraduationCap,
  Building2,
  Edit3,
  Trash2,
  Plus,
  Save,
  Eye,
} from "lucide-react"
import type { DetectedQuestion } from "@/app/api/ai/analyze-paper/route"
import { uploadExamPaper, createExternalAssignment } from "@/app/actions/external-assignment"

// =====================================================
// Types
// =====================================================

type DigitizerStep = "upload" | "analyzing" | "verify" | "saving" | "complete"

interface PaperMetadata {
  examBoard: string
  level: string
  year: string
  title: string
}

interface EditableQuestion extends DetectedQuestion {
  isEditing?: boolean
}

// Generate years from 2015 to current year + 1
const YEARS = Array.from(
  { length: new Date().getFullYear() - 2014 + 1 },
  (_, i) => (2015 + i).toString()
).reverse()

const EXAM_BOARDS = [
  { value: "AQA", label: "AQA" },
  { value: "Edexcel", label: "Edexcel" },
  { value: "OCR", label: "OCR" },
  { value: "MEI", label: "MEI" },
  { value: "WJEC", label: "WJEC" },
  { value: "CIE", label: "Cambridge (CIE)" },
]

const LEVELS = [
  { value: "GCSE Foundation", label: "GCSE Foundation" },
  { value: "GCSE Higher", label: "GCSE Higher" },
  { value: "A-Level Pure", label: "A-Level Pure" },
  { value: "A-Level Statistics", label: "A-Level Statistics" },
  { value: "A-Level Mechanics", label: "A-Level Mechanics" },
]

const TOPIC_OPTIONS = [
  "Number",
  "Algebra",
  "Ratio, Proportion and Rates of Change",
  "Geometry and Measures",
  "Probability",
  "Statistics",
  "Pure Mathematics",
  "Mechanics",
  "Trigonometry",
  "Calculus",
  "Vectors",
]

// =====================================================
// Props
// =====================================================

interface SmartDigitizerProps {
  /** Available classes for assignment creation */
  classes: Array<{ id: string; name: string }>
}

// =====================================================
// Component
// =====================================================

export function SmartDigitizer({ classes }: SmartDigitizerProps) {
  const router = useRouter()
  
  // Step state
  const [step, setStep] = useState<DigitizerStep>("upload")
  
  // File state
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [pageImages, setPageImages] = useState<string[]>([])
  
  // Metadata state
  const [metadata, setMetadata] = useState<PaperMetadata>({
    examBoard: "",
    level: "",
    year: new Date().getFullYear().toString(),
    title: "",
  })
  
  // Analysis state
  const [questions, setQuestions] = useState<EditableQuestion[]>([])
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  
  // Assignment state
  const [selectedClassId, setSelectedClassId] = useState<string>("")
  const [assignmentTitle, setAssignmentTitle] = useState<string>("")
  const [resultAssignmentId, setResultAssignmentId] = useState<string | null>(null)
  
  // Current page for preview
  const [currentPage, setCurrentPage] = useState(0)

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
    
    // Extract title from filename
    const baseName = pdfFile.name.replace(/\.pdf$/i, "").replace(/[_-]/g, " ")
    setMetadata(prev => ({ ...prev, title: baseName }))
    setAssignmentTitle(baseName)
    
    // Reset state
    setStep("upload")
    setQuestions([])
    setAnalysisError(null)
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
      const scale = 1.5 // Good balance of quality and size
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
  // Analyze Paper
  // =====================================================

  const handleAnalyzePaper = async () => {
    if (!file) {
      toast.error("NO FILE", { description: "Please upload a PDF first" })
      return
    }

    if (!metadata.level) {
      toast.error("MISSING LEVEL", { description: "Please select a curriculum level" })
      return
    }

    try {
      setStep("analyzing")
      setAnalysisError(null)

      // Convert PDF to images
      const images = await convertPdfToImages(file)
      setPageImages(images)

      if (images.length === 0) {
        throw new Error("Failed to convert PDF to images")
      }

      // Call the analysis API
      const response = await fetch("/api/ai/analyze-paper", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pageImages: images,
          examBoard: metadata.examBoard,
          level: metadata.level,
          year: metadata.year,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Failed to analyze paper")
      }

      setQuestions(result.data.questions)
      setStep("verify")

      toast.success("ANALYSIS COMPLETE", {
        description: `Detected ${result.data.questions.length} questions (${result.data.totalMarks} marks)`
      })

    } catch (error) {
      console.error("Paper analysis error:", error)
      setAnalysisError(error instanceof Error ? error.message : "An error occurred")
      setStep("upload")
      toast.error("ANALYSIS FAILED", {
        description: error instanceof Error ? error.message : "Please try again"
      })
    }
  }

  // =====================================================
  // Question Editing Functions
  // =====================================================

  const updateQuestion = (id: string, updates: Partial<EditableQuestion>) => {
    setQuestions(prev => prev.map(q => 
      q.id === id ? { ...q, ...updates } : q
    ))
  }

  const deleteQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id))
    toast.success("Question removed")
  }

  const addQuestion = () => {
    const newQuestion: EditableQuestion = {
      id: `q-new-${Date.now()}`,
      questionNumber: `${questions.length + 1}`,
      suggestedTopic: "Algebra",
      suggestedSubTopic: "",
      marks: 2,
      pageStart: 1,
      pageEnd: 1,
      confidence: 1,
      isEditing: true,
    }
    setQuestions(prev => [...prev, newQuestion])
  }

  // =====================================================
  // Save Assignment
  // =====================================================

  const handleSaveAssignment = async () => {
    if (!file) {
      toast.error("NO FILE", { description: "Please upload a PDF first" })
      return
    }

    if (!selectedClassId) {
      toast.error("NO CLASS SELECTED", { description: "Please select a class" })
      return
    }

    if (!assignmentTitle.trim()) {
      toast.error("NO TITLE", { description: "Please enter an assignment title" })
      return
    }

    if (questions.length === 0) {
      toast.error("NO QUESTIONS", { description: "Please add at least one question" })
      return
    }

    try {
      setStep("saving")

      // Step 1: Upload the PDF
      const formData = new FormData()
      formData.append("file", file)
      
      const uploadResult = await uploadExamPaper(formData)
      
      if (!uploadResult.success || !uploadResult.data) {
        throw new Error(uploadResult.error || "Failed to upload PDF")
      }

      // Step 2: Create the assignment with mapped questions
      const mappedQuestions = questions.map(q => ({
        id: q.id,
        questionNumber: q.questionNumber,
        topic: q.suggestedTopic,
        subTopic: q.suggestedSubTopic || q.suggestedTopic,
        marks: q.marks,
      }))

      const createResult = await createExternalAssignment({
        classId: selectedClassId,
        title: assignmentTitle,
        resourceUrl: uploadResult.data.url,
        mappedQuestions,
        mode: "paper",
      })

      if (!createResult.success || !createResult.data) {
        throw new Error(createResult.error || "Failed to create assignment")
      }

      setResultAssignmentId(createResult.data.id)
      setStep("complete")

      toast.success("ASSIGNMENT CREATED", {
        description: `${questions.length} questions mapped`
      })

    } catch (error) {
      console.error("Save error:", error)
      setStep("verify")
      toast.error("SAVE FAILED", {
        description: error instanceof Error ? error.message : "Please try again"
      })
    }
  }

  // =====================================================
  // Reset
  // =====================================================

  const handleReset = () => {
    setFile(null)
    setPreviewUrl(null)
    setPageImages([])
    setMetadata({
      examBoard: "",
      level: "",
      year: new Date().getFullYear().toString(),
      title: "",
    })
    setQuestions([])
    setAnalysisError(null)
    setStep("upload")
    setSelectedClassId("")
    setAssignmentTitle("")
    setResultAssignmentId(null)
    setCurrentPage(0)
  }

  // =====================================================
  // Computed values
  // =====================================================

  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0)
  const isProcessing = step === "analyzing" || step === "saving"

  // =====================================================
  // Render: Upload Step
  // =====================================================

  if (step === "upload" || step === "analyzing") {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel: File Upload */}
        <Card className="border-2 border-swiss-ink bg-swiss-paper h-[700px] flex flex-col">
          <CardHeader className="border-b-2 border-swiss-ink flex-shrink-0">
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-swiss-signal" />
              <CardTitle className="text-xl font-black uppercase tracking-wider text-swiss-ink">
                UPLOAD EXAM PAPER
              </CardTitle>
            </div>
            <CardDescription className="font-bold text-xs uppercase tracking-wider text-swiss-lead">
              Step 1: Upload a PDF and set metadata
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
                      {isDragActive ? "DROP YOUR EXAM PAPER HERE" : "DRAG & DROP YOUR EXAM PAPER"}
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
              /* File Preview & Settings */
              <div className="flex-1 flex flex-col gap-4 overflow-hidden">
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
                  <div className="flex-1 border-2 border-swiss-ink bg-white overflow-hidden min-h-0">
                    <iframe
                      src={previewUrl}
                      className="w-full h-full"
                      title="PDF Preview"
                    />
                  </div>
                )}

                {/* Metadata Settings */}
                <div className="border-2 border-swiss-ink bg-swiss-paper p-4 space-y-4 flex-shrink-0">
                  <h3 className="text-sm font-black uppercase tracking-widest text-swiss-ink">
                    PAPER METADATA
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-widest text-swiss-lead flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        EXAM BOARD
                      </label>
                      <Select 
                        value={metadata.examBoard} 
                        onValueChange={(v) => setMetadata(prev => ({ ...prev, examBoard: v }))}
                        disabled={isProcessing}
                      >
                        <SelectTrigger className="border-2 border-swiss-ink bg-white h-9">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {EXAM_BOARDS.map(b => (
                            <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-widest text-swiss-lead flex items-center gap-1">
                        <GraduationCap className="w-3 h-3" />
                        LEVEL *
                      </label>
                      <Select 
                        value={metadata.level} 
                        onValueChange={(v) => setMetadata(prev => ({ ...prev, level: v }))}
                        disabled={isProcessing}
                      >
                        <SelectTrigger className="border-2 border-swiss-ink bg-white h-9">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {LEVELS.map(l => (
                            <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-widest text-swiss-lead flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        YEAR
                      </label>
                      <Select 
                        value={metadata.year} 
                        onValueChange={(v) => setMetadata(prev => ({ ...prev, year: v }))}
                        disabled={isProcessing}
                      >
                        <SelectTrigger className="border-2 border-swiss-ink bg-white h-9">
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

        {/* Right Panel: Status & Action */}
        <Card className="border-2 border-swiss-ink bg-swiss-paper h-[700px] flex flex-col">
          <CardHeader className="border-b-2 border-swiss-ink flex-shrink-0">
            <CardTitle className="text-xl font-black uppercase tracking-wider text-swiss-ink">
              AI ANALYSIS
            </CardTitle>
            <CardDescription className="font-bold text-xs uppercase tracking-wider text-swiss-lead">
              Step 2: Automatic question detection
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1 p-6 flex flex-col">
            {step === "analyzing" ? (
              /* Analyzing state */
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="text-center space-y-6 w-full max-w-sm">
                  <Loader2 className="w-16 h-16 mx-auto text-swiss-signal animate-spin" />
                  <div>
                    <p className="text-lg font-black uppercase tracking-wider text-swiss-ink mb-2">
                      ANALYZING PAPER
                    </p>
                    <p className="text-sm text-swiss-lead">
                      Scanning pages and detecting question structure...
                    </p>
                  </div>
                  <div className="w-full bg-swiss-concrete border-2 border-swiss-ink h-3">
                    <div 
                      className="bg-swiss-signal h-full transition-all duration-1000 animate-pulse"
                      style={{ width: "60%" }}
                    />
                  </div>
                </div>
              </div>
            ) : !file ? (
              /* Initial state */
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <Sparkles className="w-16 h-16 mx-auto text-swiss-lead opacity-50" />
                  <p className="text-lg font-bold text-swiss-ink">
                    Upload an exam paper to begin
                  </p>
                  <p className="text-sm text-swiss-lead max-w-xs mx-auto">
                    The AI will scan each page and detect questions, topics, and mark allocations automatically
                  </p>
                </div>
              </div>
            ) : (
              /* Ready to analyze */
              <div className="flex-1 flex flex-col">
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center space-y-6">
                    <div className="w-20 h-20 mx-auto border-2 border-swiss-signal bg-swiss-signal/10 flex items-center justify-center">
                      <Sparkles className="w-10 h-10 text-swiss-signal" />
                    </div>
                    <div>
                      <p className="text-lg font-black uppercase tracking-wider text-swiss-ink mb-2">
                        READY TO ANALYZE
                      </p>
                      <p className="text-sm text-swiss-lead mb-4">
                        The AI will:
                      </p>
                      <ul className="text-xs text-swiss-lead space-y-2 text-left max-w-xs mx-auto">
                        <li className="flex items-start gap-2">
                          <span className="w-5 h-5 bg-swiss-ink text-white text-xs flex items-center justify-center flex-shrink-0">1</span>
                          <span>Scan all pages of the PDF</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-5 h-5 bg-swiss-ink text-white text-xs flex items-center justify-center flex-shrink-0">2</span>
                          <span>Detect question numbers and boundaries</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-5 h-5 bg-swiss-ink text-white text-xs flex items-center justify-center flex-shrink-0">3</span>
                          <span>Identify topics and mark allocations</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-5 h-5 bg-swiss-ink text-white text-xs flex items-center justify-center flex-shrink-0">4</span>
                          <span>Create editable question map for review</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                {analysisError && (
                  <div className="border-2 border-red-500 bg-red-50 p-4 mb-4">
                    <p className="text-sm text-red-600 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {analysisError}
                    </p>
                  </div>
                )}
                
                <Button
                  onClick={handleAnalyzePaper}
                  disabled={!metadata.level}
                  className="w-full bg-swiss-signal hover:bg-swiss-signal/90 text-white font-bold uppercase tracking-wider h-14 text-lg"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  ANALYZE PAPER
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // =====================================================
  // Render: Verify Step
  // =====================================================

  if (step === "verify" || step === "saving") {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-wider text-swiss-ink">
              VERIFY QUESTION MAP
            </h2>
            <p className="text-sm text-swiss-lead">
              Review and edit the detected questions, then save as an assignment
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="border-2 border-swiss-ink text-lg px-4 py-2">
              {questions.length} Questions
            </Badge>
            <Badge variant="outline" className="border-2 border-swiss-signal text-swiss-signal text-lg px-4 py-2">
              {totalMarks} Marks
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel: PDF Preview */}
          <Card className="border-2 border-swiss-ink bg-swiss-paper h-[700px] flex flex-col">
            <CardHeader className="border-b-2 border-swiss-ink flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-swiss-signal" />
                  <CardTitle className="text-lg font-black uppercase tracking-wider text-swiss-ink">
                    PDF PREVIEW
                  </CardTitle>
                </div>
                {pageImages.length > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                      disabled={currentPage === 0}
                      className="border-2 border-swiss-ink"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm font-bold">
                      {currentPage + 1} / {pageImages.length}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage(p => Math.min(pageImages.length - 1, p + 1))}
                      disabled={currentPage === pageImages.length - 1}
                      className="border-2 border-swiss-ink"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              {previewUrl ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-full"
                  title="PDF Preview"
                />
              ) : pageImages[currentPage] ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img 
                  src={pageImages[currentPage]} 
                  alt={`Page ${currentPage + 1}`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-swiss-lead">
                  No preview available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Panel: Question List */}
          <Card className="border-2 border-swiss-ink bg-swiss-paper h-[700px] flex flex-col">
            <CardHeader className="border-b-2 border-swiss-ink flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-swiss-signal" />
                  <CardTitle className="text-lg font-black uppercase tracking-wider text-swiss-ink">
                    QUESTION MAP
                  </CardTitle>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addQuestion}
                  className="border-2 border-swiss-ink"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  ADD
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-3">
                {questions.map((q, index) => (
                  <div 
                    key={q.id}
                    className="border-2 border-swiss-ink bg-white p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 bg-swiss-ink text-white flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </span>
                        <Input
                          value={q.questionNumber}
                          onChange={(e) => updateQuestion(q.id, { questionNumber: e.target.value })}
                          className="w-20 h-8 border-2 border-swiss-ink font-bold text-center"
                          placeholder="Q#"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={q.marks}
                          onChange={(e) => updateQuestion(q.id, { marks: parseInt(e.target.value) || 0 })}
                          className="w-16 h-8 border-2 border-swiss-ink text-center"
                          min={0}
                        />
                        <span className="text-xs text-swiss-lead">marks</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteQuestion(q.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={q.suggestedTopic}
                        onValueChange={(v) => updateQuestion(q.id, { suggestedTopic: v })}
                      >
                        <SelectTrigger className="h-8 border-2 border-swiss-ink text-xs">
                          <SelectValue placeholder="Topic" />
                        </SelectTrigger>
                        <SelectContent>
                          {TOPIC_OPTIONS.map(t => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={q.suggestedSubTopic}
                        onChange={(e) => updateQuestion(q.id, { suggestedSubTopic: e.target.value })}
                        placeholder="Sub-topic"
                        className="h-8 border-2 border-swiss-ink text-xs"
                      />
                    </div>
                    {q.confidence < 0.7 && (
                      <div className="flex items-center gap-1 text-xs text-amber-600">
                        <AlertCircle className="w-3 h-3" />
                        Low confidence - please verify
                      </div>
                    )}
                  </div>
                ))}
                
                {questions.length === 0 && (
                  <div className="text-center py-8 text-swiss-lead">
                    <p>No questions detected.</p>
                    <Button
                      onClick={addQuestion}
                      className="mt-4"
                      variant="outline"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Question Manually
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom: Assignment Settings & Save */}
        <Card className="border-2 border-swiss-ink bg-swiss-paper">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-swiss-lead">
                  ASSIGN TO CLASS *
                </label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger className="border-2 border-swiss-ink bg-white">
                    <SelectValue placeholder="Select class..." />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-widest text-swiss-lead">
                  ASSIGNMENT TITLE *
                </label>
                <Input
                  value={assignmentTitle}
                  onChange={(e) => setAssignmentTitle(e.target.value)}
                  placeholder="e.g., Practice Paper 1"
                  className="border-2 border-swiss-ink bg-white"
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep("upload")}
                  disabled={step === "saving"}
                  className="border-2 border-swiss-ink"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  BACK
                </Button>
                <Button
                  onClick={handleSaveAssignment}
                  disabled={step === "saving" || !selectedClassId || !assignmentTitle.trim() || questions.length === 0}
                  className="flex-1 bg-swiss-signal hover:bg-swiss-signal/90 text-white font-bold uppercase tracking-wider"
                >
                  {step === "saving" ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      SAVING...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      SAVE ASSIGNMENT
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // =====================================================
  // Render: Complete Step
  // =====================================================

  if (step === "complete") {
    return (
      <Card className="border-2 border-swiss-ink bg-swiss-paper max-w-xl mx-auto">
        <CardContent className="p-8">
          <div className="text-center space-y-6">
            <div className="w-20 h-20 mx-auto border-2 border-green-500 bg-green-50 flex items-center justify-center">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-black uppercase tracking-wider text-swiss-ink mb-2">
                ASSIGNMENT CREATED
              </p>
              <p className="text-lg text-swiss-lead mb-4">
                {assignmentTitle}
              </p>
              <div className="flex justify-center gap-6">
                <div className="text-center">
                  <p className="text-3xl font-black text-swiss-ink">{questions.length}</p>
                  <p className="text-xs text-swiss-lead uppercase tracking-wider">Questions</p>
                </div>
                <div className="w-px bg-swiss-ink/20" />
                <div className="text-center">
                  <p className="text-3xl font-black text-swiss-signal">{totalMarks}</p>
                  <p className="text-xs text-swiss-lead uppercase tracking-wider">Total Marks</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-3 pt-4">
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
                DIGITIZE ANOTHER PAPER
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return null
}
