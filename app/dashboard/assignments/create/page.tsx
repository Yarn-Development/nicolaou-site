import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getClassList } from "@/app/actions/classes"
import { QuestionSelector } from "./question-selector"

export default async function CreateAssignmentPage() {
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

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <span className="swiss-module-label">Assignment Builder</span>
        <h1 className="swiss-heading-md mt-1">Create New Assignment</h1>
        <p className="text-muted-foreground mt-1">
          Select questions from the bank to build your assignment
        </p>
      </div>

      {/* Main Content - Full Height */}
      <div className="flex-1 overflow-hidden">
        <QuestionSelector classes={classes} />
      </div>
    </div>
  )
}
