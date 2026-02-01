import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { RevisionListsClient } from "./revision-lists-client"
import { getStudentRevisionLists } from "@/app/actions/revision-lists"

export default async function RevisionPage() {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    redirect("/login")
  }

  // Get user profile to check role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single()

  // For now, this page is primarily for students
  // Teachers could use it to view revision list status (future enhancement)
  const isStudent = profile?.role === "student"

  // Get revision lists
  const result = await getStudentRevisionLists()
  const revisionLists = result.success ? result.data || [] : []

  return (
    <div className="min-h-screen bg-swiss-paper">
      <RevisionListsClient 
        revisionLists={revisionLists}
        userName={profile?.full_name || user.email || "Student"}
        isStudent={isStudent}
      />
    </div>
  )
}
