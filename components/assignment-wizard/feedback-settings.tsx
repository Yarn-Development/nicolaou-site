"use client"

import { useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Eye, ScrollText } from "lucide-react"

// =====================================================
// Types
// =====================================================

interface FeedbackSettingsProps {
  generateFeedback: boolean
  onGenerateFeedbackChange: (value: boolean) => void
  includeRemediation: boolean
  onIncludeRemediationChange: (value: boolean) => void
}

// =====================================================
// RAG Badge — three colored dots
// =====================================================

function RagBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 ml-1" aria-label="RAG indicator">
      <span className="w-2 h-2 rounded-full bg-red-500" />
      <span className="w-2 h-2 rounded-full bg-amber-400" />
      <span className="w-2 h-2 rounded-full bg-green-500" />
    </span>
  )
}

// =====================================================
// Sample Preview Skeleton
// =====================================================

function SamplePreviewContent() {
  const rows = [
    { topic: "Solving Linear Equations", status: "red", score: "1 / 4" },
    { topic: "Expanding Brackets", status: "red", score: "0 / 3" },
    { topic: "Ratio & Proportion", status: "amber", score: "2 / 4" },
    { topic: "Calculating Angles", status: "amber", score: "3 / 5" },
    { topic: "Probability Trees", status: "green", score: "4 / 4" },
    { topic: "Area of Compound Shapes", status: "green", score: "5 / 5" },
  ]

  const statusColor: Record<string, string> = {
    red: "bg-red-500",
    amber: "bg-amber-400",
    green: "bg-green-500",
  }

  const statusLabel: Record<string, string> = {
    red: "Revise",
    amber: "Developing",
    green: "Secure",
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="border-2 border-swiss-ink p-3 bg-swiss-concrete">
        <p className="text-xs font-black uppercase tracking-widest text-swiss-lead">
          Sample Output
        </p>
        <p className="font-black uppercase tracking-wider text-lg mt-1">
          Student Feedback Sheet
        </p>
      </div>

      {/* Student info skeleton */}
      <div className="border-2 border-swiss-ink p-3 bg-swiss-paper">
        <div className="flex justify-between mb-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-swiss-lead">
              Student
            </p>
            <p className="font-bold">Amira K.</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-swiss-lead">
              Overall Score
            </p>
            <p className="font-black text-xl">15 / 25</p>
          </div>
        </div>
      </div>

      {/* RAG Table */}
      <div className="border-2 border-swiss-ink overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-swiss-ink text-white">
              <th className="text-left px-3 py-2 text-xs font-black uppercase tracking-wider">
                Topic
              </th>
              <th className="text-center px-3 py-2 text-xs font-black uppercase tracking-wider">
                RAG
              </th>
              <th className="text-right px-3 py-2 text-xs font-black uppercase tracking-wider">
                Score
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.topic}
                className={i % 2 === 0 ? "bg-swiss-paper" : "bg-swiss-concrete/50"}
              >
                <td className="px-3 py-2 font-medium">{row.topic}</td>
                <td className="px-3 py-2 text-center">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className={`w-3 h-3 rounded-full ${statusColor[row.status]}`}
                    />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {statusLabel[row.status]}
                    </span>
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-bold">{row.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Remediation preview */}
      <div className="border-2 border-swiss-ink p-3 bg-amber-50">
        <p className="text-xs font-black uppercase tracking-widest text-amber-700 mb-2">
          Remediation Questions
        </p>
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <span className="font-black text-amber-700">1.</span>
            <span>Solve: 3x + 7 = 22</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-black text-amber-700">2.</span>
            <span>Expand and simplify: 2(x + 3) + 4(x - 1)</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-black text-amber-700">3.</span>
            <span>
              Share 450 in the ratio 2 : 3
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// Main Component
// =====================================================

export function FeedbackSettings({
  generateFeedback,
  onGenerateFeedbackChange,
  includeRemediation,
  onIncludeRemediationChange,
}: FeedbackSettingsProps) {
  const [showSample, setShowSample] = useState(false)

  return (
    <>
      <div className="border-2 border-swiss-ink bg-swiss-concrete p-4 space-y-4">
        {/* Section header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-swiss-ink" />
            <span className="font-black uppercase tracking-wider text-sm">
              Student Feedback &amp; Revision
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSample(true)}
            className="border-2 border-swiss-ink text-xs font-bold uppercase tracking-wider h-7 px-2"
          >
            <Eye className="w-3 h-3 mr-1" />
            View Sample
          </Button>
        </div>

        {/* Toggle 1 — Generate RAG Feedback Sheets */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-1.5">
              <Label
                htmlFor="generate-feedback"
                className="font-bold text-sm cursor-pointer"
              >
                Generate RAG Feedback Sheets
              </Label>
              <RagBadge />
            </div>
            <p className="text-xs text-swiss-lead">
              Automatically create a Red / Amber / Green topic breakdown for
              each student after marking.
            </p>
          </div>
          <Switch
            id="generate-feedback"
            checked={generateFeedback}
            onCheckedChange={(checked) => {
              onGenerateFeedbackChange(checked)
              if (!checked) {
                onIncludeRemediationChange(false)
              }
            }}
          />
        </div>

        {/* Toggle 2 — Include Remediation Questions */}
        <div
          className={`flex items-start justify-between gap-4 transition-opacity ${
            generateFeedback ? "opacity-100" : "opacity-40 pointer-events-none"
          }`}
        >
          <div className="flex-1 space-y-1">
            <Label
              htmlFor="include-remediation"
              className="font-bold text-sm cursor-pointer"
            >
              Include Remediation Questions
            </Label>
            <p className="text-xs text-swiss-lead">
              Append 2-3 personalised practice questions to the feedback sheet
              based on weak topics.
            </p>
          </div>
          <Switch
            id="include-remediation"
            checked={includeRemediation}
            onCheckedChange={onIncludeRemediationChange}
            disabled={!generateFeedback}
          />
        </div>
      </div>

      {/* Sample Preview Dialog */}
      <Dialog open={showSample} onOpenChange={setShowSample}>
        <DialogContent className="border-2 border-swiss-ink max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-wider">
              Feedback Sheet Preview
            </DialogTitle>
            <DialogDescription>
              This is what each student receives after marking is complete.
            </DialogDescription>
          </DialogHeader>
          <SamplePreviewContent />
        </DialogContent>
      </Dialog>
    </>
  )
}
