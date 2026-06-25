import { requireTeacher } from "@/lib/auth/helpers"
import { redirect } from "next/navigation"
import { getClassList } from "@/app/actions/classes"
import { getDigitizedPapers } from "@/app/actions/external-assignment"
import { IngestPageClient } from "./ingest-page-client"

export default async function IngestPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>
}) {
  // Require teacher authentication
  const user = await requireTeacher().catch(() => {
    redirect('/?error=teacher_required')
  })

  if (!user) {
    redirect('/?error=teacher_required')
  }

  // Fetch teacher's classes and previously digitized papers in parallel
  const [classesResult, papersResult] = await Promise.all([
    getClassList(),
    getDigitizedPapers(),
  ])

  const classes = (classesResult.success ? classesResult.data || [] : []).map((c) => ({
    id: c.id,
    name: c.name,
  }))

  // Get mode from query params
  const params = await searchParams
  const initialMode = params.mode === "shadow"
    ? "shadow"
    : params.mode === "digitize"
      ? "digitize"
      : "manual"

  return (
    <IngestPageClient
      classes={classes}
      digitizedPapers={papersResult.data || []}
      initialMode={initialMode as "manual" | "shadow" | "digitize"}
    />
  )
}
