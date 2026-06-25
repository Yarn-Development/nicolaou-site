"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { toast } from "sonner"
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
  CheckCircle2,
  XCircle,
  Trash2,
  Save,
  AlertCircle,
} from "lucide-react"
import { ingestQuestion } from "@/app/actions/ingest"
import type { ExamBoard, CurriculumLevel } from "@/app/actions/ingest"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

// =====================================================
// Types
// =====================================================

interface PdfJob {
  id: string
  file: File
  status: "pending" | "processing" | "done" | "error"
  error?: string
  questionsFound: number
}

interface ExtractedQ {
  pdfName: string
  questionNumber: string
  questionLatex: string
  suggestedTopic: string
  suggestedSubTopic: string
  suggestedMarks: number
  suggestedDifficulty: "Foundation" | "Higher"
  saved: boolean
  source_spec?: "legacy-gcse" | "legacy-modular" | null
  error?: string
}

const YEARS = Array.from(
  { length: new Date().getFullYear() - 2014 + 1 },
  (_, i) => (2015 + i).toString()
).reverse()

const LEGACY_YEAR_RANGE = Array.from({ length: 2017 - 2005 + 1 }, (_, i) => (2005 + i).toString()).reverse()

const LEGACY_MODULES = ["C1","C2","C3","C4","M1","M2","S1","S2","FP1","FP2","D1","D2"]
const NON_CALC_MODULES = new Set(["C1"])

// =====================================================
// Component
// =====================================================

export function IYGBBulkIngestor() {
  const [jobs, setJobs] = useState<PdfJob[]>([])
  const [extracted, setExtracted] = useState<ExtractedQ[]>([])
  const [processing, setProcessing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Batch type: "iygb" = Madas Maths IYGB, "alevel-legacy" = A Level legacy modular
  const [batchType, setBatchType] = useState<"iygb" | "alevel-legacy">("iygb")

  // IYGB-specific metadata
  const [examBoard, setExamBoard] = useState<ExamBoard>("Edexcel")
  const [level, setLevel] = useState<CurriculumLevel>("GCSE Higher")
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [calculatorAllowed, setCalculatorAllowed] = useState(false)
  const [paperEra, setPaperEra] = useState<"mixed" | "current" | "legacy">("mixed")

  // A Level legacy-specific metadata
  const [legacyModules, setLegacyModules] = useState<string[]>([])
  const [legacyYear, setLegacyYear] = useState("2014")

  function toggleLegacyModule(mod: string) {
    setLegacyModules(prev => prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod])
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newJobs: PdfJob[] = acceptedFiles.map((f) => ({
      id: `${f.name}-${Date.now()}-${Math.random()}`,
      file: f,
      status: "pending",
      questionsFound: 0,
    }))
    setJobs((prev) => [...prev, ...newJobs])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: true,
  })

  const convertPdfToImages = async (pdfFile: File): Promise<string[]> => {
    const pdfjsLib = await import("pdfjs-dist")
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
    const arrayBuffer = await pdfFile.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const images: string[] = []
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const viewport = page.getViewport({ scale: 1.5 })
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")!
      canvas.width = viewport.width
      canvas.height = viewport.height
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await page.render({ canvasContext: ctx, viewport, canvas } as any).promise
      images.push(canvas.toDataURL("image/png"))
    }
    return images
  }

  const handleProcessAll = async () => {
    const pending = jobs.filter((j) => j.status === "pending")
    if (pending.length === 0) return
    setProcessing(true)

    for (const job of pending) {
      setJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, status: "processing" } : j))
      try {
        const images = await convertPdfToImages(job.file)
        const res = await fetch("/api/ai/analyze-paper", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pageImages: images,
            examBoard,
            level,
            year,
            spec: batchType === "alevel-legacy" ? "legacy-modular" : (paperEra === "legacy" ? "legacy-gcse" : null),
            module: batchType === "alevel-legacy" && legacyModules.length === 1 ? legacyModules[0] : null,
          }),
        })
        const result = await res.json()
        if (!result.success) throw new Error(result.error || "Analysis failed")

        const qs: ExtractedQ[] = (result.data?.questions ?? []).map((q: {
          questionNumber?: string
          questionLatex?: string
          questionText?: string
          suggestedTopic?: string
          suggestedSubTopic?: string
          marks?: number
          difficulty?: string
        }) => ({
          pdfName: job.file.name,
          questionNumber: q.questionNumber || "",
          questionLatex: q.questionLatex || q.questionText || "",
          suggestedTopic: q.suggestedTopic || "General",
          suggestedSubTopic: q.suggestedSubTopic || q.suggestedTopic || "General",
          suggestedMarks: q.marks || 1,
          suggestedDifficulty: (q.difficulty === "Foundation" ? "Foundation" : "Higher") as "Foundation" | "Higher",
          saved: false,
        }))

        setExtracted((prev) => [...prev, ...qs])
        setJobs((prev) => prev.map((j) =>
          j.id === job.id ? { ...j, status: "done", questionsFound: qs.length } : j
        ))
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error"
        setJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, status: "error", error: msg } : j))
      }
    }

    setProcessing(false)
    const totalFound = extracted.length
    toast.success(`Extraction complete — ${totalFound} questions found across ${pending.length} PDFs`)
  }

  const handleSaveAll = async () => {
    const unsaved = extracted.filter((q) => !q.saved && !q.error)
    if (unsaved.length === 0) return
    setSaving(true)
    let savedCount = 0

    for (let i = 0; i < extracted.length; i++) {
      const q = extracted[i]
      if (q.saved || q.error) continue
      try {
        let sourceSpec: "legacy-gcse" | "legacy-modular" | null = null
        let effectiveBoard: ExamBoard = examBoard
        let effectiveLevel: CurriculumLevel = level
        let paperRef: string
        let effectiveCalc = calculatorAllowed

        if (batchType === "alevel-legacy") {
          sourceSpec = "legacy-modular"
          effectiveBoard = "Edexcel"
          effectiveLevel = "A Level"
          const moduleStr = legacyModules.length > 0 ? legacyModules.join("/") : "Mixed"
          paperRef = `Edexcel A Level ${moduleStr} ${legacyYear}`
          // All modules are calculator except C1
          const primaryModule = legacyModules.find(m => NON_CALC_MODULES.has(m))
          effectiveCalc = !primaryModule || legacyModules.some(m => !NON_CALC_MODULES.has(m))
        } else {
          // IYGB
          if (paperEra === "legacy") {
            sourceSpec = "legacy-gcse"
          } else if (paperEra === "mixed") {
            const yearNum = parseInt(year)
            if (!isNaN(yearNum) && yearNum < 2017) sourceSpec = "legacy-gcse"
          }
          paperRef = `IYGB ${year}`
        }

        const result = await ingestQuestion({
          question_content: q.questionLatex,
          image_url: "",
          exam_board: effectiveBoard,
          level: effectiveLevel,
          paper_reference: paperRef,
          question_number_ref: q.questionNumber,
          topic: q.suggestedTopic,
          sub_topic: q.suggestedSubTopic,
          marks: q.suggestedMarks,
          calculator_allowed: effectiveCalc,
          answer_key: { answer: "", explanation: "" },
          source_spec: sourceSpec,
        })
        if (result.success) {
          savedCount++
          setExtracted((prev) => prev.map((eq, idx) => idx === i ? { ...eq, saved: true, source_spec: sourceSpec } : eq))
        } else {
          setExtracted((prev) => prev.map((eq, idx) => idx === i ? { ...eq, error: result.error || "Save failed" } : eq))
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error"
        setExtracted((prev) => prev.map((eq, idx) => idx === i ? { ...eq, error: msg } : eq))
      }
    }

    setSaving(false)
    toast.success(`Saved ${savedCount} questions to the question bank`)
  }

  const pendingCount = jobs.filter((j) => j.status === "pending").length
  const unsavedCount = extracted.filter((q) => !q.saved).length

  return (
    <div className="space-y-6">
      {/* Batch type selector */}
      <div className="border-2 border-swiss-ink bg-swiss-paper p-6">
        <h3 className="text-sm font-black uppercase tracking-widest mb-4">Batch Type</h3>
        <RadioGroup
          value={batchType}
          onValueChange={(v) => setBatchType(v as "iygb" | "alevel-legacy")}
          className="flex flex-wrap gap-6"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="iygb" id="batch-iygb" />
            <label htmlFor="batch-iygb" className="text-sm font-bold cursor-pointer">Madas Maths IYGB</label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="alevel-legacy" id="batch-alevel" />
            <label htmlFor="batch-alevel" className="text-sm font-bold cursor-pointer">Past Papers — A Level Legacy Modular</label>
          </div>
        </RadioGroup>
      </div>

      {/* Metadata defaults */}
      <div className="border-2 border-swiss-ink bg-swiss-paper p-6">
        <h3 className="text-sm font-black uppercase tracking-widest mb-4">
          {batchType === "alevel-legacy" ? "A Level Legacy Modular Settings" : "Paper Defaults"}
        </h3>

        {/* A Level Legacy Modular UI (Screen 10c) */}
        {batchType === "alevel-legacy" && (
          <div className="space-y-5">
            <div className="bg-swiss-concrete/40 border border-swiss-ink/20 p-3 text-xs text-swiss-lead">
              Selecting modules helps the AI tagger narrow its topic tree — improving accuracy.
              If papers from multiple modules are mixed in the batch, select all relevant modules.
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-swiss-lead">Year</label>
              <Select value={legacyYear} onValueChange={setLegacyYear}>
                <SelectTrigger className="border-2 border-swiss-ink h-9 w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEGACY_YEAR_RANGE.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-swiss-lead">
                Modules in this batch
              </label>
              <div className="grid grid-cols-4 gap-2">
                {LEGACY_MODULES.map(mod => (
                  <label key={mod} className="flex items-center gap-2 cursor-pointer border border-swiss-ink/20 px-2 py-1.5 hover:bg-swiss-concrete/30">
                    <input
                      type="checkbox"
                      checked={legacyModules.includes(mod)}
                      onChange={() => toggleLegacyModule(mod)}
                      className="accent-swiss-signal"
                    />
                    <span className="text-sm font-bold">{mod}</span>
                    {NON_CALC_MODULES.has(mod) && (
                      <span className="text-xs text-red-600 ml-auto">No calc</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* IYGB UI */}
        {batchType === "iygb" && (
        <>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-widest text-swiss-lead">Exam Board</label>
            <Select value={examBoard} onValueChange={(v) => setExamBoard(v as ExamBoard)}>
              <SelectTrigger className="border-2 border-swiss-ink h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Edexcel","AQA","OCR","MEI","WJEC","CIE","IB"].map(b => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-widest text-swiss-lead">Level</label>
            <Select value={level} onValueChange={(v) => setLevel(v as CurriculumLevel)}>
              <SelectTrigger className="border-2 border-swiss-ink h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["GCSE Foundation","GCSE Higher","AS Level","A Level","IGCSE","IB SL","IB HL"].map(l => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-widest text-swiss-lead">Year</label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="border-2 border-swiss-ink h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-widest text-swiss-lead">Calculator</label>
            <Select value={calculatorAllowed ? "yes" : "no"} onValueChange={(v) => setCalculatorAllowed(v === "yes")}>
              <SelectTrigger className="border-2 border-swiss-ink h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no">Non-Calculator</SelectItem>
                <SelectItem value="yes">Calculator</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Paper era */}
        <div className="mt-5 pt-5 border-t border-swiss-ink/10">
          <p className="text-xs font-bold uppercase tracking-widest text-swiss-lead mb-3">Paper Era</p>
          <RadioGroup
            value={paperEra}
            onValueChange={(v) => setPaperEra(v as "mixed" | "current" | "legacy")}
            className="flex flex-wrap gap-4"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="mixed" id="era-mixed" />
              <label htmlFor="era-mixed" className="text-sm font-medium cursor-pointer">
                Mixed — detect from year
              </label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="current" id="era-current" />
              <label htmlFor="era-current" className="text-sm font-medium cursor-pointer">
                Current spec only (2017+)
              </label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="legacy" id="era-legacy" />
              <label htmlFor="era-legacy" className="text-sm font-medium cursor-pointer">
                Legacy only (pre-2017)
              </label>
            </div>
          </RadioGroup>
          {paperEra === "legacy" && (
            <p className="mt-2 text-xs text-swiss-lead bg-swiss-concrete/50 border border-swiss-ink/20 p-2">
              Pre-2017 IYGB questions will be tagged against the legacy GCSE topic tree and shown with a Legacy badge in the bank.
            </p>
          )}
          {paperEra === "mixed" && (
            <p className="mt-2 text-xs text-swiss-lead">
              Questions from years before 2017 will be automatically flagged as legacy spec.
            </p>
          )}
        </div>
        </>
        )}
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`border-4 border-dashed p-12 text-center cursor-pointer transition-colors ${
          isDragActive ? "border-swiss-signal bg-swiss-signal/5" : "border-swiss-ink hover:border-swiss-signal"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="w-12 h-12 mx-auto mb-4 text-swiss-lead" />
        <p className="font-black uppercase tracking-wider text-lg mb-1">
          {isDragActive ? "Drop PDFs here" : batchType === "alevel-legacy" ? "Drop A Level PDFs here" : "Drop IYGB PDFs here"}
        </p>
        <p className="text-sm text-swiss-lead">Multiple files supported — all will be processed with the settings above</p>
      </div>

      {/* Job list */}
      {jobs.length > 0 && (
        <div className="border-2 border-swiss-ink">
          <div className="bg-swiss-concrete border-b-2 border-swiss-ink p-3 flex items-center justify-between">
            <h3 className="font-black uppercase tracking-widest text-sm">
              {jobs.length} PDF{jobs.length !== 1 ? "s" : ""} queued
            </h3>
            {pendingCount > 0 && (
              <Button
                onClick={handleProcessAll}
                disabled={processing}
                className="bg-swiss-signal text-white hover:bg-swiss-ink font-bold uppercase tracking-wider h-8 text-xs"
              >
                {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Extract Questions ({pendingCount} pending)
              </Button>
            )}
          </div>
          <div className="divide-y divide-swiss-ink/20">
            {jobs.map((job) => (
              <div key={job.id} className="p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="w-4 h-4 shrink-0 text-swiss-lead" />
                  <span className="text-sm font-bold truncate">{job.file.name}</span>
                  <span className="text-xs text-swiss-lead">({(job.file.size / 1024 / 1024).toFixed(1)} MB)</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {job.status === "pending" && (
                    <Badge variant="outline" className="border-swiss-ink text-xs">Pending</Badge>
                  )}
                  {job.status === "processing" && (
                    <Badge className="bg-swiss-signal text-white text-xs">
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      Processing
                    </Badge>
                  )}
                  {job.status === "done" && (
                    <Badge className="bg-green-600 text-white text-xs">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      {job.questionsFound} questions
                    </Badge>
                  )}
                  {job.status === "error" && (
                    <Badge className="bg-red-600 text-white text-xs" title={job.error}>
                      <XCircle className="w-3 h-3 mr-1" />
                      Error
                    </Badge>
                  )}
                  {job.status === "pending" && (
                    <button
                      onClick={() => setJobs((prev) => prev.filter((j) => j.id !== job.id))}
                      className="text-swiss-lead hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Extracted questions review */}
      {extracted.length > 0 && (
        <div className="border-2 border-swiss-ink">
          <div className="bg-swiss-concrete border-b-2 border-swiss-ink p-3 flex items-center justify-between">
            <div>
              <h3 className="font-black uppercase tracking-widest text-sm">
                {extracted.length} questions extracted
              </h3>
              <p className="text-xs text-swiss-lead mt-0.5">
                {extracted.filter(q => q.saved).length} saved · {unsavedCount} pending save
              </p>
            </div>
            {unsavedCount > 0 && (
              <Button
                onClick={handleSaveAll}
                disabled={saving}
                className="bg-swiss-ink text-white hover:bg-swiss-signal font-bold uppercase tracking-wider h-8 text-xs"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                Save All to Bank ({unsavedCount})
              </Button>
            )}
          </div>

          <div className="divide-y divide-swiss-ink/20 max-h-[400px] overflow-y-auto">
            {extracted.map((q, i) => (
              <div key={i} className={`p-3 flex items-start gap-3 ${q.saved ? "bg-green-50" : q.error ? "bg-red-50" : ""}`}>
                <div className="w-5 h-5 shrink-0 mt-0.5">
                  {q.saved ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : q.error ? (
                    <XCircle className="w-5 h-5 text-red-600" />
                  ) : (
                    <div className="w-5 h-5 border-2 border-swiss-ink/30 rounded-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-bold text-swiss-lead">{q.pdfName}</span>
                    {q.questionNumber && (
                      <Badge variant="outline" className="text-[10px] border-swiss-ink">Q{q.questionNumber}</Badge>
                    )}
                    <Badge variant="outline" className="text-[10px] border-swiss-ink">{q.suggestedTopic}</Badge>
                    <Badge variant="outline" className="text-[10px] border-swiss-signal text-swiss-signal">{q.suggestedMarks} marks</Badge>
                  </div>
                  <p className="text-xs text-swiss-ink font-mono line-clamp-2">{q.questionLatex}</p>
                  {q.error && <p className="text-xs text-red-600 mt-0.5">{q.error}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Screen 12b — Spec era summary (shown after all questions saved) */}
      {extracted.length > 0 && unsavedCount === 0 && extracted.some(q => q.saved) && (
        (() => {
          const currentSpecCount = extracted.filter(q => q.saved && !q.source_spec).length
          const legacyGcseCount = extracted.filter(q => q.saved && q.source_spec === "legacy-gcse").length
          const legacyModularCount = extracted.filter(q => q.saved && q.source_spec === "legacy-modular").length
          const hasLegacy = legacyGcseCount > 0 || legacyModularCount > 0
          if (!hasLegacy && currentSpecCount === extracted.filter(q => q.saved).length) return null
          return (
            <div className="border-2 border-swiss-ink bg-swiss-paper p-4 space-y-3">
              <h3 className="font-black uppercase tracking-widest text-xs text-swiss-lead">By spec era</h3>
              <div className="space-y-2">
                {currentSpecCount > 0 && (
                  <div className="flex items-center justify-between border border-swiss-ink/20 px-3 py-2">
                    <span className="text-sm font-medium">Current spec (2017+)</span>
                    <span className="font-black text-swiss-ink">{currentSpecCount} questions</span>
                  </div>
                )}
                {legacyGcseCount > 0 && (
                  <div className="flex items-center justify-between border border-amber-300 bg-amber-50 px-3 py-2">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <span className="text-amber-600">⚠</span> Legacy GCSE spec (pre-2017)
                    </span>
                    <span className="font-black text-amber-700">{legacyGcseCount} questions</span>
                  </div>
                )}
                {legacyModularCount > 0 && (
                  <div className="flex items-center justify-between border border-amber-300 bg-amber-50 px-3 py-2">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <span className="text-amber-600">⚠</span> Legacy modular (pre-2017)
                    </span>
                    <span className="font-black text-amber-700">{legacyModularCount} questions</span>
                  </div>
                )}
              </div>
              {hasLegacy && (
                <p className="text-xs text-swiss-lead">Legacy spec questions are flagged with a ⚠ Legacy spec badge in the question bank and in generated booklets.</p>
              )}
            </div>
          )
        })()
      )}

      {/* Instructions */}
      {jobs.length === 0 && extracted.length === 0 && (
        <div className="border-2 border-swiss-ink p-6 bg-swiss-paper">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-swiss-signal mt-0.5" />
            <div className="space-y-2 text-sm">
              <p className="font-bold">IYGB Bulk Import — How it works:</p>
              <ol className="space-y-1 text-swiss-lead list-decimal list-inside">
                <li>Set the exam board, level, year, and calculator status above</li>
                <li>Drag and drop one or more IYGB PDF papers into the drop zone</li>
                <li>Click &quot;Extract Questions&quot; — AI scans each page for question boundaries</li>
                <li>Review extracted questions, then click &quot;Save All to Bank&quot;</li>
                <li>Questions are immediately available in the question bank for assessment building</li>
              </ol>
              <p className="text-swiss-lead text-xs mt-2">
                Questions without mark schemes are saved with empty answers — you can review and complete them from the question bank.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
