import { notFound } from "next/navigation"
import { getRevisionListDetail } from "@/app/actions/revision-lists"
import { RevisionDetailClient } from "./revision-detail-client"

interface RevisionDetailPageProps {
  params: Promise<{ revisionListId: string }>
}

export default async function RevisionDetailPage({ params }: RevisionDetailPageProps) {
  const { revisionListId } = await params
  const result = await getRevisionListDetail(revisionListId)

  if (!result.success || !result.data) {
    notFound()
  }

  return (
    <RevisionDetailClient
      revisionList={result.data.revisionList}
      questions={result.data.questions}
      allocations={result.data.allocations}
    />
  )
}
