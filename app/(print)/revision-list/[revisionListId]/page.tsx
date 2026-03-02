import { notFound } from "next/navigation"
import { getRevisionListDetail } from "@/app/actions/revision-lists"
import { RevisionListPrintClient } from "./revision-list-print-client"

interface RevisionListPrintPageProps {
  params: Promise<{ revisionListId: string }>
}

export default async function RevisionListPrintPage({ params }: RevisionListPrintPageProps) {
  const { revisionListId } = await params
  const result = await getRevisionListDetail(revisionListId)

  if (!result.success || !result.data) {
    notFound()
  }

  return (
    <RevisionListPrintClient
      revisionList={result.data.revisionList}
      questions={result.data.questions}
    />
  )
}
