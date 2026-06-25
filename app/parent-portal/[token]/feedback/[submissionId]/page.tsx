import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getParentFeedbackDetail } from "@/app/actions/parent-portal"
import { StudentFeedbackSheet } from "@/components/student-feedback-sheet"

interface Props {
  params: Promise<{ token: string; submissionId: string }>
}

export default async function ParentFeedbackDetailPage({ params }: Props) {
  const { token, submissionId } = await params

  const result = await getParentFeedbackDetail(token, submissionId)

  if (!result.success || !result.data) {
    return notFound()
  }

  return (
    <div>
      {/* Back nav (not printed) */}
      <div className="print:hidden bg-white border-b border-swiss-ink/20 px-6 py-3">
        <Link
          href={`/parent-portal/${token}`}
          className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-swiss-lead hover:text-swiss-ink transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Results
        </Link>
      </div>
      <StudentFeedbackSheet feedback={result.data} />
    </div>
  )
}
