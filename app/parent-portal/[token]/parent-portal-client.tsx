"use client"

import { useState } from "react"
import Link from "next/link"
import { FileText, TrendingUp, TrendingDown, Minus, Download } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { ParentPortalData } from "@/app/actions/parent-portal"

interface Props {
  token: string
  data: ParentPortalData
}

function RAGIcon({ status }: { status: "green" | "amber" | "red" }) {
  if (status === "green") return <TrendingUp className="h-4 w-4 text-green-600" />
  if (status === "amber") return <Minus className="h-4 w-4 text-amber-600" />
  return <TrendingDown className="h-4 w-4 text-red-600" />
}

function ragBadgeClass(status: "green" | "amber" | "red"): string {
  if (status === "green") return "bg-green-100 text-green-800 border-green-300"
  if (status === "amber") return "bg-amber-100 text-amber-800 border-amber-300"
  return "bg-red-100 text-red-800 border-red-300"
}

function ragLabel(status: "green" | "amber" | "red"): string {
  if (status === "green") return "Strong"
  if (status === "amber") return "Developing"
  return "Needs Work"
}

export function ParentPortalClient({ token, data }: Props) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const handleDownloadPDF = async (submissionId: string) => {
    setDownloadingId(submissionId)
    try {
      const res = await fetch(`/api/pdf/parent/${token}/${submissionId}`)
      if (!res.ok) throw new Error("PDF generation failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `feedback-${data.studentName.replace(/\s+/g, "-").toLowerCase()}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // silent fail
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-swiss-concrete">
      {/* Header */}
      <div className="bg-swiss-ink text-white">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-1">
            Nicolaou&apos;s Maths — Parent Portal
          </p>
          <h1 className="text-2xl font-black uppercase tracking-wider">
            {data.studentName}
          </h1>
          <p className="text-sm text-white/70 mt-1">
            Published feedback and assessment results
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        {data.feedbackSheets.length === 0 ? (
          <div className="bg-white border-2 border-swiss-ink p-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-swiss-lead" />
            <h2 className="text-lg font-black uppercase tracking-wider text-swiss-ink mb-2">
              No Feedback Yet
            </h2>
            <p className="text-swiss-lead font-medium">
              No feedback has been published for {data.studentName} yet.
              Please check back after the teacher has marked and released results.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-swiss-lead mb-4">
              {data.feedbackSheets.length} result{data.feedbackSheets.length > 1 ? "s" : ""} available
            </p>

            {data.feedbackSheets.map((sheet) => (
              <div
                key={sheet.submissionId}
                className="bg-white border-2 border-swiss-ink"
              >
                <div className="flex items-start justify-between p-5">
                  <div className="flex-1">
                    <h2 className="text-lg font-black uppercase tracking-wider text-swiss-ink mb-1">
                      {sheet.assignmentTitle}
                    </h2>
                    <p className="text-sm text-swiss-lead font-medium mb-3">
                      {sheet.className}
                    </p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge className={`${ragBadgeClass(sheet.status)} border font-bold uppercase text-xs tracking-wider`}>
                        <RAGIcon status={sheet.status} />
                        <span className="ml-1">{ragLabel(sheet.status)}</span>
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Link href={`/parent-portal/${token}/feedback/${sheet.submissionId}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-2 border-swiss-ink font-bold uppercase text-xs tracking-wider"
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadPDF(sheet.submissionId)}
                      disabled={downloadingId === sheet.submissionId}
                      className="border-2 border-swiss-signal text-swiss-signal font-bold uppercase text-xs tracking-wider hover:bg-swiss-signal hover:text-white"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      {downloadingId === sheet.submissionId ? "..." : "PDF"}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer note */}
        <p className="text-xs text-swiss-lead text-center mt-8">
          This is a secure, private link for {data.studentName}&apos;s parent/guardian.
          Do not share this URL with others.
        </p>
      </div>
    </div>
  )
}
