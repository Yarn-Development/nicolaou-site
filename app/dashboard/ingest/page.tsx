import { requireTeacher } from "@/lib/auth/helpers"
import { redirect } from "next/navigation"
import { IngestClient } from "./ingest-client"

export default async function IngestPage() {
  // Require teacher authentication
  await requireTeacher().catch(() => {
    redirect('/?error=teacher_required')
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b-4 border-swiss-ink pb-6">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 md:col-span-3">
            <span className="block text-sm font-bold uppercase tracking-widest text-swiss-signal mb-2">
              QUESTION BANK
            </span>
          </div>
          <div className="col-span-12 md:col-span-9">
            <h1 className="text-5xl font-black uppercase tracking-tight text-swiss-ink mb-4">
              PAST PAPER INGESTION
            </h1>
            <p className="text-swiss-lead text-lg">
              Upload and tag questions from official exam papers
            </p>
          </div>
        </div>
      </div>

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
    </div>
  )
}
