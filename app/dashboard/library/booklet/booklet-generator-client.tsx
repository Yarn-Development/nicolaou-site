"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ChevronRight,
  ChevronLeft,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Download,
  FileText,
} from "lucide-react"
import { runGapAnalysis, createBookletJob } from "@/app/actions/booklet"
import type { BankFilter, GapAnalysisResult, BookletSpec } from "@/app/actions/booklet"

type Step = 1 | 2 | 3 | "generating" | "done" | "error"

const LEGACY_MODULES = ["C1", "C2", "C3", "C4", "M1", "M2", "S1", "S2", "FP1", "FP2", "D1", "D2"]

const BANK_PRESETS = [
  { id: "iygb-all", label: "IYGB — All papers (current + legacy)", board: "Madas Maths", level: "GCSE Higher", spec: undefined },
  { id: "iygb-current", label: "IYGB — Current spec only (2017+)", board: "Madas Maths", level: "GCSE Higher", spec: null },
  { id: "iygb-legacy", label: "IYGB — Legacy only (pre-2017)", board: "Madas Maths", level: "GCSE Higher", spec: "legacy-gcse" as BookletSpec },
  { id: "alevel-new", label: "Edexcel A Level — New spec (2017+)", board: "Edexcel", level: "A Level", spec: "new-spec" as BookletSpec },
  { id: "alevel-legacy", label: "Edexcel A Level — Legacy modular (pre-2017)", board: "Edexcel", level: "A Level", spec: "legacy-modular" as BookletSpec },
  { id: "custom", label: "Custom filter", board: undefined, level: undefined, spec: undefined },
]

interface Props {
  classes: { id: string; name: string; subject: string; assessmentCount: number }[]
}

export function BookletGeneratorClient({ classes }: Props) {
  const [step, setStep] = useState<Step>(1)
  const [selectedClass, setSelectedClass] = useState<string>("")
  const [presetId, setPresetId] = useState<string>("iygb-all")
  const [selectedModules, setSelectedModules] = useState<string[]>([])
  const [marksTarget, setMarksTarget] = useState<string>("")
  const [includeTopicTags, setIncludeTopicTags] = useState(false)
  const [includeLegacyBadge, setIncludeLegacyBadge] = useState(true)
  const [gapResult, setGapResult] = useState<GapAnalysisResult | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isDownloading, setIsDownloading] = useState(false)

  // Custom filter state
  const [customBoard, setCustomBoard] = useState("Edexcel")
  const [customLevel, setCustomLevel] = useState("A Level")
  const [customSpec, setCustomSpec] = useState<BookletSpec>(null)
  const [yearFrom, setYearFrom] = useState("")
  const [yearTo, setYearTo] = useState("")

  const selectedClassObj = classes.find(c => c.id === selectedClass)
  const selectedPreset = BANK_PRESETS.find(p => p.id === presetId)
  const isLegacyModular = presetId === "alevel-legacy" || (presetId === "custom" && customSpec === "legacy-modular")

  function buildFilter(): BankFilter {
    if (presetId === "custom") {
      return {
        board: customBoard || undefined,
        level: customLevel || undefined,
        spec: customSpec,
        modules: isLegacyModular && selectedModules.length > 0 ? selectedModules : undefined,
        yearFrom: yearFrom ? parseInt(yearFrom) : undefined,
        yearTo: yearTo ? parseInt(yearTo) : undefined,
        marksTarget: marksTarget ? parseInt(marksTarget) : undefined,
        includeTopicTags,
        includeLegacyBadge,
      } as BankFilter
    }
    const preset = BANK_PRESETS.find(p => p.id === presetId)!
    return {
      board: preset.board,
      level: preset.level,
      spec: preset.spec !== undefined ? preset.spec : undefined,
      modules: isLegacyModular && selectedModules.length > 0 ? selectedModules : undefined,
      marksTarget: marksTarget ? parseInt(marksTarget) : undefined,
      includeTopicTags,
      includeLegacyBadge,
    } as BankFilter
  }

  function handleRunAnalysis() {
    if (!selectedClass) {
      toast.error("Select a class first")
      return
    }
    const filter = buildFilter()
    startTransition(async () => {
      const { result, error } = await runGapAnalysis(selectedClass, filter)
      if (error || !result) {
        toast.error("Gap analysis failed", { description: error })
        return
      }
      setGapResult(result)
      setStep(3)
    })
  }

  function handleGenerate() {
    if (!gapResult || !selectedClass) return
    const filter = buildFilter()
    startTransition(async () => {
      setStep("generating")
      const { jobId: id, error } = await createBookletJob(selectedClass, filter, gapResult.unusedQuestions)
      if (error || !id) {
        toast.error("Failed to start generation", { description: error })
        setStep("error")
        return
      }
      setJobId(id)
      setStep("done")
    })
  }

  async function handleDownload() {
    if (!jobId) return
    setIsDownloading(true)
    try {
      const res = await fetch(`/api/pdf/booklet/${jobId}`)
      if (!res.ok) throw new Error("Download failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const className = selectedClassObj?.name?.replace(/\s+/g, "-").toLowerCase() || "class"
      a.download = `booklet-${className}-${new Date().toISOString().slice(0, 10)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error("Download failed. Try again.")
    } finally {
      setIsDownloading(false)
    }
  }

  function toggleModule(mod: string) {
    setSelectedModules(prev =>
      prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]
    )
  }

  const scopeLabel = selectedPreset?.label || "Custom filter"
  const totalMarks = gapResult?.unusedQuestions.reduce((sum, q) => sum + (q.marks || 0), 0) || 0

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <a href="/dashboard/library" className="hover:underline">Question Bank</a>
          <ChevronRight className="w-3 h-3" />
          <span>Generate Booklet</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Generate Booklet</h1>
        <p className="text-muted-foreground mt-1">
          Compile unused questions from your bank into a downloadable PDF booklet with mark schemes.
        </p>
      </div>

      {/* Progress indicator */}
      {(step === 1 || step === 2 || step === 3) && (
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                step >= s ? "bg-foreground text-background border-foreground" : "border-muted-foreground/30 text-muted-foreground"
              }`}>
                {s}
              </div>
              {i < 2 && <div className={`h-0.5 w-8 ${step > s ? "bg-foreground" : "bg-muted-foreground/20"}`} />}
            </div>
          ))}
          <span className="text-sm text-muted-foreground ml-2">
            {step === 1 ? "Select class" : step === 2 ? "Select questions" : "Review & generate"}
          </span>
        </div>
      )}

      {/* Step 1: Select class */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Which class is this for?</CardTitle>
            <p className="text-sm text-muted-foreground">
              Questions already used in assessments for this class will be excluded.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={selectedClass} onValueChange={setSelectedClass}>
              {classes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No classes found. Create a class first.</p>
              ) : (
                classes.map(cls => (
                  <div key={cls.id} className="flex items-start space-x-3 py-2 border-b last:border-0">
                    <RadioGroupItem value={cls.id} id={cls.id} className="mt-0.5" />
                    <Label htmlFor={cls.id} className="cursor-pointer">
                      <div className="font-medium">{cls.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {cls.subject} · {cls.assessmentCount} assessment{cls.assessmentCount !== 1 ? "s" : ""} on record
                      </div>
                    </Label>
                  </div>
                ))
              )}
            </RadioGroup>

            <div className="bg-muted/50 rounded-md p-3 text-sm text-muted-foreground">
              If a question has been used in any assessment for this class, it will be excluded from the booklet.
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setStep(2)} disabled={!selectedClass}>
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select bank subset */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Which questions should be in scope?</CardTitle>
            <p className="text-sm text-muted-foreground">
              Select a preset or define a custom filter for the question bank subset.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={presetId} onValueChange={setPresetId}>
              {BANK_PRESETS.map(preset => (
                <div key={preset.id} className="flex items-start space-x-3 py-2 border-b last:border-0">
                  <RadioGroupItem value={preset.id} id={preset.id} className="mt-0.5" />
                  <Label htmlFor={preset.id} className="cursor-pointer flex-1">
                    <div className="font-medium">{preset.label}</div>
                    {preset.spec === "legacy-gcse" && (
                      <Badge variant="outline" className="mt-1 text-amber-700 border-amber-300 bg-amber-50 text-xs">Legacy</Badge>
                    )}
                    {preset.spec === "legacy-modular" && (
                      <Badge variant="outline" className="mt-1 text-amber-700 border-amber-300 bg-amber-50 text-xs">Legacy</Badge>
                    )}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            {/* Legacy modular module selector */}
            {isLegacyModular && (
              <div className="border rounded-md p-4 space-y-3">
                <Label className="text-sm font-medium">Modules in scope</Label>
                <div className="grid grid-cols-4 gap-2">
                  {LEGACY_MODULES.map(mod => (
                    <div key={mod} className="flex items-center space-x-2">
                      <Checkbox
                        id={`mod-${mod}`}
                        checked={selectedModules.includes(mod)}
                        onCheckedChange={() => toggleModule(mod)}
                      />
                      <Label htmlFor={`mod-${mod}`} className="text-sm cursor-pointer">{mod}</Label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Leave all unchecked to include all modules.</p>
              </div>
            )}

            {/* Custom filter */}
            {presetId === "custom" && (
              <div className="border rounded-md p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Exam board</Label>
                    <Input value={customBoard} onChange={e => setCustomBoard(e.target.value)} placeholder="Edexcel" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Level</Label>
                    <Input value={customLevel} onChange={e => setCustomLevel(e.target.value)} placeholder="A Level" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Year from</Label>
                    <Input value={yearFrom} onChange={e => setYearFrom(e.target.value)} placeholder="2007" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Year to</Label>
                    <Input value={yearTo} onChange={e => setYearTo(e.target.value)} placeholder="2017" className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Specification</Label>
                  <RadioGroup
                    value={customSpec ?? "any"}
                    onValueChange={v => setCustomSpec(v === "any" ? null : v as BookletSpec)}
                    className="flex flex-wrap gap-3 mt-1"
                  >
                    {[
                      { value: "any", label: "Any" },
                      { value: "new-spec", label: "New spec" },
                      { value: "legacy-modular", label: "Legacy modular" },
                      { value: "legacy-gcse", label: "Legacy GCSE" },
                    ].map(opt => (
                      <div key={opt.value} className="flex items-center space-x-2">
                        <RadioGroupItem value={opt.value} id={`cspec-${opt.value}`} />
                        <Label htmlFor={`cspec-${opt.value}`} className="text-xs cursor-pointer">{opt.label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </div>
            )}

            {/* Options */}
            <div className="space-y-3 pt-2">
              <div>
                <Label className="text-sm">Marks target (optional)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="number"
                    value={marksTarget}
                    onChange={e => setMarksTarget(e.target.value)}
                    placeholder="e.g. 80"
                    className="w-28"
                  />
                  <span className="text-sm text-muted-foreground">marks — leave blank to include all unused</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox id="topic-tags" checked={includeTopicTags} onCheckedChange={v => setIncludeTopicTags(!!v)} />
                <Label htmlFor="topic-tags" className="text-sm cursor-pointer">Include topic tags in booklet</Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox id="legacy-badge" checked={includeLegacyBadge} onCheckedChange={v => setIncludeLegacyBadge(!!v)} />
                <Label htmlFor="legacy-badge" className="text-sm cursor-pointer">Show legacy spec badge on pre-2017 questions</Label>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button onClick={handleRunAnalysis} disabled={isPending}>
                {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Run gap analysis <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Gap analysis result */}
      {step === 3 && gapResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gap Analysis Result</CardTitle>
            <div className="text-sm text-muted-foreground">
              {selectedClassObj?.name} · {scopeLabel}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "In scope", value: gapResult.totalInScope },
                { label: "Used already", value: gapResult.usedCount },
                { label: "Unused", value: gapResult.unusedCount, highlight: true },
              ].map(({ label, value, highlight }) => (
                <div key={label} className={`border rounded-md p-3 text-center ${highlight ? "border-foreground" : ""}`}>
                  <div className={`text-2xl font-bold ${highlight ? "text-foreground" : "text-muted-foreground"}`}>{value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{label}</div>
                </div>
              ))}
            </div>

            {/* Warning: empty */}
            {gapResult.warning === "empty" && (
              <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-md p-4">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-800">All questions already used</p>
                  <p className="text-sm text-green-700 mt-1">
                    Every question in this scope has been used in at least one assessment for {selectedClassObj?.name}.
                    Try expanding your bank subset or selecting a different class.
                  </p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => setStep(2)}>
                    Change scope
                  </Button>
                </div>
              </div>
            )}

            {/* Warning: too large */}
            {gapResult.warning === "too_large" && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-md p-4">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">{gapResult.unusedCount} unused questions — large booklet</p>
                  <p className="text-sm text-amber-700 mt-1">
                    We recommend setting a marks target to keep the booklet manageable. Go back to set one.
                  </p>
                </div>
              </div>
            )}

            {/* Topic breakdown */}
            {gapResult.unusedByTopic.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Unused by topic (top 10)</p>
                <div className="border rounded-md divide-y">
                  {gapResult.unusedByTopic.slice(0, 10).map(({ topic, count }) => (
                    <div key={topic} className="flex justify-between items-center px-3 py-2 text-sm">
                      <span className="text-muted-foreground">{topic}</span>
                      <Badge variant="secondary">{count} unused</Badge>
                    </div>
                  ))}
                  {gapResult.unusedByTopic.length > 10 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      + {gapResult.unusedByTopic.length - 10} more topics
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Marks summary */}
            {gapResult.unusedCount > 0 && (
              <div className="bg-muted/50 rounded-md p-3 flex justify-between text-sm">
                <span>Selected: {gapResult.unusedCount} questions</span>
                <span className="font-medium">Total marks: {totalMarks}</span>
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={isPending || gapResult.unusedCount === 0}
              >
                {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BookOpen className="w-4 h-4 mr-2" />}
                Generate Booklet
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generating state */}
      {step === "generating" && (
        <Card>
          <CardContent className="py-12 flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
            <p className="text-lg font-medium">Generating booklet…</p>
            <p className="text-sm text-muted-foreground">Building questions and mark schemes section. This usually takes under 30 seconds.</p>
          </CardContent>
        </Card>
      )}

      {/* Done state */}
      {step === "done" && (
        <Card>
          <CardContent className="py-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="font-medium">Your booklet is ready</p>
                <p className="text-sm text-muted-foreground">{selectedClassObj?.name} · {scopeLabel}</p>
              </div>
            </div>

            <div className="border rounded-md p-4 space-y-3">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-sm">{selectedClassObj?.name} — Unused Questions Booklet</p>
                  <p className="text-xs text-muted-foreground">
                    {gapResult?.unusedCount} questions · {totalMarks} marks · Questions + Mark Schemes
                  </p>
                  <p className="text-xs text-muted-foreground">Available for download for 30 days</p>
                </div>
              </div>

              <Button onClick={handleDownload} disabled={isDownloading} className="w-full">
                {isDownloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                Download Booklet PDF
              </Button>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => {
                setStep(1)
                setSelectedClass("")
                setGapResult(null)
                setJobId(null)
              }}>
                Generate another booklet
              </Button>
              <Button variant="ghost" className="flex-1" asChild>
                <a href="/dashboard/library">Back to Question Bank</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {step === "error" && (
        <Card>
          <CardContent className="py-8 text-center space-y-4">
            <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
            <p className="font-medium">Generation failed</p>
            <p className="text-sm text-muted-foreground">Something went wrong building the PDF. Please try again.</p>
            <Button onClick={() => setStep(3)} variant="outline">Try again</Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
