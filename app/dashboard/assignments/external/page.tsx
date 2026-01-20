import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getClassList } from "@/app/actions/classes"
import { ExternalPaperWizard } from "./external-paper-wizard"

export default async function ExternalPaperPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Verify user is a teacher
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "teacher") {
    redirect("/student-dashboard")
  }

  // Fetch teacher's classes for the dropdown
  const classesResult = await getClassList()
  const classes = classesResult.success ? classesResult.data || [] : []

  return <ExternalPaperWizard classes={classes} />
}
