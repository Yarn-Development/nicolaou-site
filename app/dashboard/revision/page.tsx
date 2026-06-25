import { getAuthUser } from "@/lib/auth"
import { getCurrentProfile } from "@/lib/auth/helpers"
import { redirect } from "next/navigation"
import { RevisionListsClient } from "./revision-lists-client"
import { getStudentRevisionLists } from "@/app/actions/revision-lists"

export default async function RevisionPage() {
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect("/sign-in")
  }

  // Get user profile to check role
  const profile = await getCurrentProfile()

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
        userName={profile?.full_name || authUser.email || "Student"}
        isStudent={isStudent}
      />
    </div>
  )
}
