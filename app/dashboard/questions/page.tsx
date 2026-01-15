import { requireTeacher } from "@/lib/auth/helpers"
import { redirect } from "next/navigation"
import { QuestionCreatorWizard } from "@/components/question-creator-wizard"

export default async function QuestionCreatorPage() {
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
              CREATE QUESTIONS
            </h1>
            <p className="text-swiss-lead text-lg">
              Use AI to generate new questions or digitize existing ones from images
            </p>
          </div>
        </div>
      </div>

      {/* Question Creator */}
      <QuestionCreatorWizard />

      {/* Instructions */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="border-2 border-swiss-ink p-6 bg-swiss-paper">
          <h3 className="text-xl font-black uppercase tracking-wider text-swiss-ink mb-4">
            AI GENERATOR
          </h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="w-6 h-6 border-2 border-swiss-signal bg-swiss-signal text-white flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">
                01
              </span>
              <span>Select a topic and difficulty tier</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-6 h-6 border-2 border-swiss-signal bg-swiss-signal text-white flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">
                02
              </span>
              <span>Click &quot;Generate Question&quot; to create a new GCSE maths question</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-6 h-6 border-2 border-swiss-signal bg-swiss-signal text-white flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">
                03
              </span>
              <span>Review and edit the LaTeX if needed</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-6 h-6 border-2 border-swiss-signal bg-swiss-signal text-white flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">
                04
              </span>
              <span>Save to your question bank</span>
            </li>
          </ul>
        </div>

        <div className="border-2 border-swiss-ink p-6 bg-swiss-paper">
          <h3 className="text-xl font-black uppercase tracking-wider text-swiss-ink mb-4">
            SNIP & DIGITIZE
          </h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="w-6 h-6 border-2 border-swiss-signal bg-swiss-signal text-white flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">
                01
              </span>
              <span>Upload an image of a question (screenshot, photo, or scan)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-6 h-6 border-2 border-swiss-signal bg-swiss-signal text-white flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">
                02
              </span>
              <span>Click &quot;Extract Text&quot; to digitize the question using OCR</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-6 h-6 border-2 border-swiss-signal bg-swiss-signal text-white flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">
                03
              </span>
              <span>Review the extracted LaTeX and fix any OCR errors</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-6 h-6 border-2 border-swiss-signal bg-swiss-signal text-white flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">
                04
              </span>
              <span>Verify the topic and tier, then save</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Tips */}
      <div className="border-2 border-swiss-ink p-6 bg-swiss-signal text-white">
        <h3 className="text-xl font-black uppercase tracking-wider mb-4">
          TIPS FOR BEST RESULTS
        </h3>
        <div className="grid md:grid-cols-3 gap-6 text-sm">
          <div>
            <h4 className="font-black uppercase tracking-wider mb-2">LaTeX Editing</h4>
            <p className="opacity-90">
              Use $...$ for inline math and $$...$$ for display equations. Example: $x^2 + 5x + 6 = 0$
            </p>
          </div>
          <div>
            <h4 className="font-black uppercase tracking-wider mb-2">Image Quality</h4>
            <p className="opacity-90">
              For best OCR results, use high-resolution images with clear text and good lighting
            </p>
          </div>
          <div>
            <h4 className="font-black uppercase tracking-wider mb-2">Verification</h4>
            <p className="opacity-90">
              All questions are saved as unverified. Review and verify questions before using in assessments
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
