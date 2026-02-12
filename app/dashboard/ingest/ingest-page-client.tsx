"use client"

import { useState } from "react"
import { IngestClient } from "./ingest-client"
import { ShadowPaperUploader } from "./shadow-paper-uploader"
import { SmartDigitizer } from "./smart-digitizer"
import { Scissors, Sparkles, FileSearch } from "lucide-react"

type IngestMode = "manual" | "shadow" | "digitize"

interface IngestPageClientProps {
  classes: Array<{ id: string; name: string }>
  initialMode?: IngestMode
}

export function IngestPageClient({ classes, initialMode = "manual" }: IngestPageClientProps) {
  const [mode, setMode] = useState<IngestMode>(initialMode)

  const getModeTitle = () => {
    switch (mode) {
      case "manual": return "PAST PAPER INGESTION"
      case "shadow": return "SHADOW PAPER GENERATOR"
      case "digitize": return "SMART DIGITIZER"
    }
  }

  const getModeDescription = () => {
    switch (mode) {
      case "manual": return "Upload and tag questions from official exam papers"
      case "shadow": return "AI-powered question cloning from existing papers"
      case "digitize": return "Upload an exam paper and auto-map question structure"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b-4 border-swiss-ink pb-6">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 md:col-span-3">
            <span className="block text-sm font-bold uppercase tracking-widest text-swiss-signal mb-2">
              {mode === "digitize" ? "ASSIGNMENTS" : "QUESTION BANK"}
            </span>
          </div>
          <div className="col-span-12 md:col-span-9">
            <h1 className="text-5xl font-black uppercase tracking-tight text-swiss-ink mb-4">
              {getModeTitle()}
            </h1>
            <p className="text-swiss-lead text-lg">
              {getModeDescription()}
            </p>
          </div>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex border-2 border-swiss-ink">
        <button
          onClick={() => setMode("digitize")}
          className={`flex-1 px-6 py-4 flex items-center justify-center gap-3 font-black uppercase tracking-wider transition-colors ${
            mode === "digitize"
              ? "bg-swiss-signal text-white"
              : "bg-swiss-paper text-swiss-ink hover:bg-swiss-concrete"
          }`}
        >
          <FileSearch className="w-5 h-5" />
          SMART DIGITIZE
        </button>
        <button
          onClick={() => setMode("shadow")}
          className={`flex-1 px-6 py-4 flex items-center justify-center gap-3 font-black uppercase tracking-wider transition-colors border-l-2 border-swiss-ink ${
            mode === "shadow"
              ? "bg-swiss-signal text-white"
              : "bg-swiss-paper text-swiss-ink hover:bg-swiss-concrete"
          }`}
        >
          <Sparkles className="w-5 h-5" />
          SHADOW PAPER
        </button>
        <button
          onClick={() => setMode("manual")}
          className={`flex-1 px-6 py-4 flex items-center justify-center gap-3 font-black uppercase tracking-wider transition-colors border-l-2 border-swiss-ink ${
            mode === "manual"
              ? "bg-swiss-ink text-white"
              : "bg-swiss-paper text-swiss-ink hover:bg-swiss-concrete"
          }`}
        >
          <Scissors className="w-5 h-5" />
          MANUAL INGEST
        </button>
      </div>

      {/* Content based on mode */}
      {mode === "digitize" && (
        <>
          {/* Smart Digitizer Tool */}
          <SmartDigitizer classes={classes} />

          {/* Instructions */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="border-2 border-swiss-ink p-6 bg-swiss-paper">
              <h3 className="text-xl font-black uppercase tracking-wider text-swiss-ink mb-4">
                HOW IT WORKS
              </h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 border-2 border-swiss-signal bg-swiss-signal text-white flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">
                    01
                  </span>
                  <span>Upload a PDF of an exam paper</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 border-2 border-swiss-signal bg-swiss-signal text-white flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">
                    02
                  </span>
                  <span>AI scans and detects all questions automatically</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 border-2 border-swiss-signal bg-swiss-signal text-white flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">
                    03
                  </span>
                  <span>Review and edit the detected question structure</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 border-2 border-swiss-signal bg-swiss-signal text-white flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">
                    04
                  </span>
                  <span>Save as a ready-to-mark assignment</span>
                </li>
              </ul>
            </div>

            <div className="border-2 border-swiss-ink p-6 bg-swiss-paper">
              <h3 className="text-xl font-black uppercase tracking-wider text-swiss-ink mb-4">
                BEST FOR
              </h3>
              <div className="space-y-4 text-sm text-swiss-lead">
                <p>
                  Use Smart Digitize when you want to upload an <strong>external exam paper</strong> 
                  (like a past paper or mock exam) and quickly create an assignment for marking.
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Past papers from exam boards</li>
                  <li>Mock exams you&apos;ve created</li>
                  <li>Practice tests from textbooks</li>
                  <li>Custom assessments</li>
                </ul>
                <p>
                  The AI automatically detects questions, topics, and marks - saving you hours of manual mapping.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {mode === "shadow" && (
        <>
          {/* Shadow Paper Tool */}
          <ShadowPaperUploader classes={classes} />

          {/* Shadow Paper Instructions */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="border-2 border-swiss-ink p-6 bg-swiss-paper">
              <h3 className="text-xl font-black uppercase tracking-wider text-swiss-ink mb-4">
                HOW IT WORKS
              </h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 border-2 border-swiss-signal bg-swiss-signal text-white flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">
                    01
                  </span>
                  <span>Upload a PDF of an official past paper</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 border-2 border-swiss-signal bg-swiss-signal text-white flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">
                    02
                  </span>
                  <span>AI extracts and analyzes each question</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 border-2 border-swiss-signal bg-swiss-signal text-white flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">
                    03
                  </span>
                  <span>New questions are generated testing the same skills</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 border-2 border-swiss-signal bg-swiss-signal text-white flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">
                    04
                  </span>
                  <span>A ready-to-use assignment is created automatically</span>
                </li>
              </ul>
            </div>

            <div className="border-2 border-swiss-ink p-6 bg-swiss-paper">
              <h3 className="text-xl font-black uppercase tracking-wider text-swiss-ink mb-4">
                WHAT IS A SHADOW PAPER?
              </h3>
              <div className="space-y-4 text-sm text-swiss-lead">
                <p>
                  A shadow paper is a practice exam that mirrors an official past paper, 
                  but with completely new questions. Each question tests the <strong>exact same 
                  mathematical skill</strong> as the original, but uses different:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Numbers and values</li>
                  <li>Context and scenarios</li>
                  <li>Variable names</li>
                </ul>
                <p>
                  This allows students to practice the same skills without simply memorizing 
                  answers from past papers.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {mode === "manual" && (
        <>
          {/* Ingestion Tool */}
          <IngestClient />

          {/* Instructions */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="border-2 border-swiss-ink p-6 bg-swiss-paper">
              <h3 className="text-xl font-black uppercase tracking-wider text-swiss-ink mb-4">
                HOW TO INGEST
              </h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 border-2 border-swiss-signal bg-swiss-signal text-white flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">
                    01
                  </span>
                  <span>Upload a PDF or image of a past paper</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 border-2 border-swiss-signal bg-swiss-signal text-white flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">
                    02
                  </span>
                  <span>Navigate to a specific question in the viewer</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 border-2 border-swiss-signal bg-swiss-signal text-white flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">
                    03
                  </span>
                  <span>Snip the question area using the crop tool</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 border-2 border-swiss-signal bg-swiss-signal text-white flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">
                    04
                  </span>
                  <span>Fill in exam metadata (Board, Year, Paper)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 border-2 border-swiss-signal bg-swiss-signal text-white flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">
                    05
                  </span>
                  <span>Tag with curriculum topic and save to bank</span>
                </li>
              </ul>
            </div>

            <div className="border-2 border-swiss-ink p-6 bg-swiss-paper">
              <h3 className="text-xl font-black uppercase tracking-wider text-swiss-ink mb-4">
                SUPPORTED FORMATS
              </h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-bold text-sm uppercase tracking-wider mb-2">Documents</h4>
                  <p className="text-sm text-swiss-lead">PDF files from exam board websites</p>
                </div>
                <div>
                  <h4 className="font-bold text-sm uppercase tracking-wider mb-2">Images</h4>
                  <p className="text-sm text-swiss-lead">PNG, JPG, WebP screenshots or scans</p>
                </div>
                <div>
                  <h4 className="font-bold text-sm uppercase tracking-wider mb-2">Exam Boards</h4>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="px-2 py-1 bg-swiss-ink text-white text-xs font-bold uppercase">AQA</span>
                    <span className="px-2 py-1 bg-swiss-ink text-white text-xs font-bold uppercase">Edexcel</span>
                    <span className="px-2 py-1 bg-swiss-ink text-white text-xs font-bold uppercase">OCR</span>
                    <span className="px-2 py-1 bg-swiss-ink text-white text-xs font-bold uppercase">MEI</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
