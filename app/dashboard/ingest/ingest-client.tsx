"use client"

import { useState, useRef } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
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
  Save,
  Loader2,
  Check,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Calculator,
  GraduationCap,
  BookOpen,
  Hash,
  Calendar,
  Target,
  RefreshCw,
  Image as ImageIcon,
  Scissors,
} from "lucide-react"
import Image from "next/image"
import { 
  uploadSnippetImage, 
  ingestQuestion,
  type ExamBoard,
  type CurriculumLevel as IngestCurriculumLevel,
} from "@/app/actions/ingest"
import {
  getTopicsForLevel,
  getSubTopicsForTopic,
  type CurriculumLevel,
} from "@/lib/curriculum-data"

const EXAM_BOARDS: ExamBoard[] = ["AQA", "Edexcel", "OCR", "MEI"]
const CURRICULUM_LEVELS: CurriculumLevel[] = [
  "GCSE Foundation",
  "GCSE Higher",
  "A-Level Pure",
  "A-Level Statistics",
  "A-Level Mechanics"
]

// Generate years from 2015 to current year
const YEARS = Array.from(
  { length: new Date().getFullYear() - 2014 },
  (_, i) => (2015 + i).toString()
).reverse()

const SESSIONS = ["June", "November", "January", "Sample"]
const PAPER_NUMBERS = ["Paper 1", "Paper 2", "Paper 3"]
const PAPER_VARIANTS = ["none", "H", "F", "A", "B", "C"] // H=Higher, F=Foundation, etc.

export function IngestClient() {
  // Document/PDF state
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [zoom, setZoom] = useState(100)

  // Snippet state
  const [snippetPreview, setSnippetPreview] = useState<string | null>(null)
  const [snippetUrl, setSnippetUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  // Exam metadata
  const [examBoard, setExamBoard] = useState<ExamBoard | "">("")
  const [level, setLevel] = useState<CurriculumLevel | "">("")
  const [year, setYear] = useState("")
  const [session, setSession] = useState("")
  const [paperNumber, setPaperNumber] = useState("")
  const [paperVariant, setPaperVariant] = useState("")
  const [questionNumber, setQuestionNumber] = useState("")

  // Curriculum tags
  const [topic, setTopic] = useState("")
  const [subTopic, setSubTopic] = useState("")

  // Pedagogy
  const [marks, setMarks] = useState<number>(1)
  const [calculatorAllowed, setCalculatorAllowed] = useState(true)

  // Optional text content
  const [questionContent, setQuestionContent] = useState("")

  // Answer key (optional)
  const [answerText, setAnswerText] = useState("")
  const [explanationText, setExplanationText] = useState("")

  // Saving state
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const pdfInputRef = useRef<HTMLInputElement>(null)
  const snippetInputRef = useRef<HTMLInputElement>(null)

  // Get available topics based on selected level
  const availableTopics = level ? getTopicsForLevel(level) : []
  const availableSubTopics = topic && level ? getSubTopicsForTopic(level, topic) : []

  // Construct paper reference from components (exclude "none" variant)
  const paperReference = [session, year, paperNumber, paperVariant === "none" ? "" : paperVariant]
    .filter(Boolean)
    .join(" ")
    .trim()

  /**
   * Handle PDF/Image upload for viewing
   */
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Support both PDF and images
    if (file.type === 'application/pdf') {
      // For PDF, create object URL
      const url = URL.createObjectURL(file)
      setPdfUrl(url)
      setPdfFile(file)
      setTotalPages(1) // Will be updated when PDF loads
    } else if (file.type.startsWith('image/')) {
      // For images, show directly
      const reader = new FileReader()
      reader.onloadend = () => {
        setPdfUrl(reader.result as string)
        setPdfFile(file)
        setTotalPages(1)
      }
      reader.readAsDataURL(file)
    } else {
      toast.error("UNSUPPORTED FILE", {
        description: "Please upload a PDF or image file"
      })
    }
  }

  /**
   * Handle snippet image selection
   */
  const handleSnippetSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error("INVALID FILE TYPE", {
        description: "Please select an image file for the snippet"
      })
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("FILE TOO LARGE", {
        description: "Snippet must be smaller than 10MB"
      })
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setSnippetPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Upload to Supabase
    await uploadSnippet(file)
  }

  /**
   * Upload snippet to Supabase Storage
   */
  const uploadSnippet = async (file: File) => {
    setUploading(true)
    setSaved(false)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const result = await uploadSnippetImage(formData)

      if (!result.success) {
        throw new Error(result.error)
      }

      setSnippetUrl(result.data!.url)
      toast.success("SNIPPET UPLOADED", {
        description: "Ready to add metadata"
      })
    } catch (error) {
      console.error("Upload error:", error)
      toast.error("UPLOAD FAILED", {
        description: error instanceof Error ? error.message : "Failed to upload snippet"
      })
    } finally {
      setUploading(false)
    }
  }

  /**
   * Save question to database
   */
  const handleSave = async () => {
    if (!snippetUrl) {
      toast.error("NO SNIPPET", {
        description: "Please upload a question snippet first"
      })
      return
    }

    if (!examBoard || !level) {
      toast.error("MISSING METADATA", {
        description: "Please select exam board and level"
      })
      return
    }

    if (!paperReference) {
      toast.error("MISSING PAPER REFERENCE", {
        description: "Please fill in year, session, and paper number"
      })
      return
    }

    if (!topic) {
      toast.error("MISSING TOPIC", {
        description: "Please select a curriculum topic"
      })
      return
    }

    setSaving(true)

    try {
      const topicObj = availableTopics.find(t => t.id === topic)
      const subTopicObj = availableSubTopics.find(st => st.id === subTopic)

      const result = await ingestQuestion({
        question_content: questionContent,
        image_url: snippetUrl,
        exam_board: examBoard as ExamBoard,
        level: level as IngestCurriculumLevel,
        paper_reference: paperReference,
        question_number_ref: questionNumber,
        topic: topicObj?.name || topic,
        sub_topic: subTopicObj?.name || subTopic,
        marks,
        calculator_allowed: calculatorAllowed,
        answer_key: answerText || explanationText ? {
          answer: answerText,
          explanation: explanationText,
        } : undefined
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      setSaved(true)
      toast.success("QUESTION SAVED", {
        description: `${paperReference} ${questionNumber} added to bank`
      })

      // Reset form for next question
      resetSnippetForm()
    } catch (error) {
      console.error("Save error:", error)
      toast.error("SAVE FAILED", {
        description: error instanceof Error ? error.message : "Failed to save question"
      })
    } finally {
      setSaving(false)
    }
  }

  /**
   * Reset snippet form (keep exam metadata)
   */
  const resetSnippetForm = () => {
    setSnippetPreview(null)
    setSnippetUrl(null)
    setQuestionNumber("")
    setTopic("")
    setSubTopic("")
    setMarks(1)
    setQuestionContent("")
    setAnswerText("")
    setExplanationText("")
    setSaved(false)
    if (snippetInputRef.current) {
      snippetInputRef.current.value = ""
    }
  }

  /**
   * Reset entire form
   */
  const resetAll = () => {
    setPdfUrl(null)
    setPdfFile(null)
    setCurrentPage(1)
    setExamBoard("")
    setLevel("")
    setYear("")
    setSession("")
    setPaperNumber("")
    setPaperVariant("")
    resetSnippetForm()
    if (pdfInputRef.current) {
      pdfInputRef.current.value = ""
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Panel: Document Viewer */}
      <Card className="border-2 border-swiss-ink bg-swiss-paper h-[800px] flex flex-col">
        <CardHeader className="border-b-2 border-swiss-ink flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-black uppercase tracking-wider text-swiss-ink">
                DOCUMENT VIEWER
              </CardTitle>
              <CardDescription className="font-bold text-xs uppercase tracking-wider text-swiss-lead">
                Upload PDF or image to view and snip questions
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setZoom(Math.max(50, zoom - 25))}
                className="border-2 border-swiss-ink"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-xs font-bold w-12 text-center">{zoom}%</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setZoom(Math.min(200, zoom + 25))}
                className="border-2 border-swiss-ink"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-4 overflow-hidden flex flex-col">
          {!pdfUrl ? (
            // Upload prompt
            <div className="flex-1 border-2 border-dashed border-swiss-ink flex items-center justify-center bg-swiss-concrete">
              <div className="text-center space-y-4 p-8">
                <FileText className="w-16 h-16 mx-auto text-swiss-lead" />
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider text-swiss-ink mb-2">
                    UPLOAD PAST PAPER
                  </p>
                  <p className="text-xs text-swiss-lead mb-4">
                    PDF or image file from exam board
                  </p>
                </div>
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept=".pdf,image/*"
                  onChange={handlePdfUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => pdfInputRef.current?.click()}
                  className="bg-swiss-signal hover:bg-swiss-signal/90 text-white font-bold uppercase tracking-wider"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  SELECT FILE
                </Button>
              </div>
            </div>
          ) : (
            // Document viewer
            <div className="flex-1 flex flex-col">
              {/* Viewer */}
              <div className="flex-1 overflow-auto border-2 border-swiss-ink bg-white">
                {pdfFile?.type === 'application/pdf' ? (
                  // PDF viewer - using iframe for simplicity
                  <iframe
                    src={`${pdfUrl}#zoom=${zoom}`}
                    className="w-full h-full"
                    title="PDF Viewer"
                  />
                ) : (
                  // Image viewer
                  <div className="p-4 flex items-center justify-center min-h-full">
                    <Image
                      src={pdfUrl}
                      alt="Document"
                      width={800}
                      height={1100}
                      className="max-w-full"
                      style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
                      unoptimized
                    />
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t-2 border-swiss-ink">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="border-2 border-swiss-ink"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-xs font-bold">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="border-2 border-swiss-ink"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={resetAll}
                  className="border-2 border-swiss-ink"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  NEW DOC
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Right Panel: Metadata Form */}
      <Card className="border-2 border-swiss-ink bg-swiss-paper h-[800px] flex flex-col overflow-hidden">
        <CardHeader className="border-b-2 border-swiss-ink flex-shrink-0">
          <CardTitle className="text-xl font-black uppercase tracking-wider text-swiss-ink">
            QUESTION METADATA
          </CardTitle>
          <CardDescription className="font-bold text-xs uppercase tracking-wider text-swiss-lead">
            Tag and save question to bank
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Snippet Upload */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Scissors className="w-5 h-5 text-swiss-signal" />
              <h3 className="text-sm font-black uppercase tracking-widest text-swiss-ink">
                Question Snippet
              </h3>
            </div>

            {snippetPreview ? (
              <div className="space-y-3">
                <div className="border-2 border-swiss-ink p-2 bg-white">
                  <Image
                    src={snippetPreview}
                    alt="Question snippet"
                    width={400}
                    height={300}
                    className="mx-auto"
                    style={{ maxHeight: "192px", width: "auto", height: "auto" }}
                    unoptimized
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    ref={snippetInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleSnippetSelect}
                    className="hidden"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => snippetInputRef.current?.click()}
                    disabled={uploading}
                    className="flex-1 border-2 border-swiss-ink"
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    CHANGE
                  </Button>
                  {uploading && (
                    <Badge className="bg-swiss-signal text-white">
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      UPLOADING
                    </Badge>
                  )}
                  {snippetUrl && !uploading && (
                    <Badge className="bg-swiss-ink text-white">
                      <Check className="w-3 h-3 mr-1" />
                      UPLOADED
                    </Badge>
                  )}
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-swiss-ink p-6 text-center bg-swiss-concrete">
                <input
                  ref={snippetInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleSnippetSelect}
                  className="hidden"
                />
                <ImageIcon className="w-10 h-10 mx-auto text-swiss-lead mb-3" />
                <Button
                  onClick={() => snippetInputRef.current?.click()}
                  className="bg-swiss-signal hover:bg-swiss-signal/90 text-white font-bold uppercase tracking-wider"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  UPLOAD SNIPPET
                </Button>
                <p className="text-xs text-swiss-lead mt-2">
                  Screenshot or crop the question from the document
                </p>
              </div>
            )}
          </div>

          {/* Exam Metadata */}
          <div className="space-y-4 border-2 border-swiss-ink p-4 bg-swiss-concrete">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-swiss-signal" />
              <h3 className="text-sm font-black uppercase tracking-widest text-swiss-ink">
                Exam Details
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Exam Board */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-swiss-ink">
                  EXAM BOARD *
                </Label>
                <Select value={examBoard} onValueChange={(v) => setExamBoard(v as ExamBoard)}>
                  <SelectTrigger className="border-2 border-swiss-ink bg-white">
                    <SelectValue placeholder="Select board" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXAM_BOARDS.map(board => (
                      <SelectItem key={board} value={board}>{board}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Level */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-swiss-ink">
                  LEVEL *
                </Label>
                <Select value={level} onValueChange={(v) => {
                  setLevel(v as CurriculumLevel)
                  setTopic("")
                  setSubTopic("")
                }}>
                  <SelectTrigger className="border-2 border-swiss-ink bg-white">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRICULUM_LEVELS.map(lvl => (
                      <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Paper Reference */}
            <div className="grid grid-cols-4 gap-2">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-swiss-ink">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  SESSION
                </Label>
                <Select value={session} onValueChange={setSession}>
                  <SelectTrigger className="border-2 border-swiss-ink bg-white">
                    <SelectValue placeholder="..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SESSIONS.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-swiss-ink">
                  YEAR
                </Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger className="border-2 border-swiss-ink bg-white">
                    <SelectValue placeholder="..." />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map(y => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-swiss-ink">
                  PAPER
                </Label>
                <Select value={paperNumber} onValueChange={setPaperNumber}>
                  <SelectTrigger className="border-2 border-swiss-ink bg-white">
                    <SelectValue placeholder="..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PAPER_NUMBERS.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-swiss-ink">
                  VARIANT
                </Label>
                <Select value={paperVariant} onValueChange={setPaperVariant}>
                  <SelectTrigger className="border-2 border-swiss-ink bg-white">
                    <SelectValue placeholder="..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PAPER_VARIANTS.map(v => (
                      <SelectItem key={v} value={v}>{v === "none" ? "—" : v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Question Number */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-swiss-ink flex items-center gap-1">
                <Hash className="w-3 h-3" />
                QUESTION NUMBER
              </Label>
              <Input
                value={questionNumber}
                onChange={(e) => setQuestionNumber(e.target.value)}
                placeholder="e.g., Q4, Q12a, Q15bi"
                className="border-2 border-swiss-ink bg-white"
              />
            </div>

            {/* Preview paper reference */}
            {paperReference && (
              <div className="bg-swiss-ink text-white px-3 py-2">
                <span className="text-xs font-bold uppercase tracking-widest">
                  Paper Reference: {paperReference} {questionNumber}
                </span>
              </div>
            )}
          </div>

          {/* Curriculum Tags */}
          <div className="space-y-4 border-2 border-swiss-ink p-4 bg-swiss-paper">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-swiss-signal" />
              <h3 className="text-sm font-black uppercase tracking-widest text-swiss-ink">
                Curriculum Tags
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Topic */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-swiss-ink">
                  TOPIC *
                </Label>
                <Select 
                  value={topic} 
                  onValueChange={(v) => {
                    setTopic(v)
                    setSubTopic("")
                  }}
                  disabled={!level}
                >
                  <SelectTrigger className="border-2 border-swiss-ink">
                    <SelectValue placeholder={level ? "Select topic" : "Select level first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTopics.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sub-Topic */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-swiss-ink">
                  SUB-TOPIC
                </Label>
                <Select 
                  value={subTopic} 
                  onValueChange={setSubTopic}
                  disabled={!topic}
                >
                  <SelectTrigger className="border-2 border-swiss-ink">
                    <SelectValue placeholder={topic ? "Select sub-topic" : "Select topic first"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {availableSubTopics.map(st => (
                      <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Pedagogy */}
          <div className="space-y-4 border-2 border-swiss-ink p-4 bg-swiss-concrete">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-swiss-signal" />
              <h3 className="text-sm font-black uppercase tracking-widest text-swiss-ink">
                Question Details
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Marks */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-swiss-ink">
                  MARKS
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={marks}
                  onChange={(e) => setMarks(parseInt(e.target.value) || 1)}
                  className="border-2 border-swiss-ink bg-white"
                />
              </div>

              {/* Calculator */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-swiss-ink">
                  CALCULATOR
                </Label>
                <div className="flex items-center gap-3 border-2 border-swiss-ink bg-white px-3 py-2">
                  <Calculator className="w-4 h-4 text-swiss-lead" />
                  <span className="text-sm">
                    {calculatorAllowed ? "Allowed" : "Not allowed"}
                  </span>
                  <Switch
                    checked={calculatorAllowed}
                    onCheckedChange={setCalculatorAllowed}
                    className="ml-auto"
                  />
                </div>
              </div>
            </div>

            {/* Optional: Question text */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-swiss-ink">
                QUESTION TEXT (OPTIONAL)
              </Label>
              <Textarea
                value={questionContent}
                onChange={(e) => setQuestionContent(e.target.value)}
                placeholder="Optionally type or paste the question text..."
                rows={2}
                className="border-2 border-swiss-ink bg-white font-mono text-sm"
              />
            </div>
          </div>

          {/* Answer Key (Optional) */}
          <details className="border-2 border-swiss-ink bg-swiss-paper">
            <summary className="p-4 cursor-pointer text-sm font-bold uppercase tracking-widest text-swiss-ink hover:bg-swiss-concrete transition-colors">
              ANSWER KEY (OPTIONAL)
            </summary>
            <div className="p-4 pt-0 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-swiss-ink">
                  ANSWER
                </Label>
                <Input
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Final answer..."
                  className="border-2 border-swiss-ink"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-swiss-ink">
                  EXPLANATION / MARK SCHEME
                </Label>
                <Textarea
                  value={explanationText}
                  onChange={(e) => setExplanationText(e.target.value)}
                  placeholder="Working out or mark scheme..."
                  rows={3}
                  className="border-2 border-swiss-ink"
                />
              </div>
            </div>
          </details>

          {/* Save Button */}
          <div className="flex gap-2 pt-4 border-t-2 border-swiss-ink">
            <Button
              onClick={handleSave}
              disabled={saving || !snippetUrl || !examBoard || !level || !paperReference || !topic}
              className="flex-1 bg-swiss-signal hover:bg-swiss-signal/90 text-white font-bold uppercase tracking-wider h-12"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  SAVING...
                </>
              ) : saved ? (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  SAVED TO BANK
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  SAVE TO BANK
                </>
              )}
            </Button>
            <Button
              onClick={resetSnippetForm}
              variant="outline"
              className="border-2 border-swiss-ink font-bold uppercase tracking-wider"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              CLEAR
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
