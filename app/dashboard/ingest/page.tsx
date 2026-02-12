import { requireTeacher } from "@/lib/auth/helpers"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
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

  // Fetch teacher's classes for the Smart Digitizer
  const supabase = await createClient()
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .eq("teacher_id", user.id)
    .order("name")

  // Get mode from query params
  const params = await searchParams
  const initialMode = params.mode === "shadow" 
    ? "shadow" 
    : params.mode === "digitize" 
      ? "digitize" 
      : "manual"

  return (
    <IngestPageClient 
      classes={classes || []} 
      initialMode={initialMode as "manual" | "shadow" | "digitize"}
    />
  )
}
