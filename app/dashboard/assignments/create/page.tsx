import { redirect } from "next/navigation"
import { getAuthUser } from "@/lib/auth"
import { getCurrentProfile } from "@/lib/auth/helpers"
import { getClassList } from "@/app/actions/classes"
import { CreateAssignmentWizard } from "./create-assignment-wizard"

export default async function CreateAssignmentPage() {
  const authUser = await getAuthUser()

  if (!authUser) {
    redirect("/sign-in")
  }

  // Verify user is a teacher
  const profile = await getCurrentProfile()

  if (profile?.role !== "teacher") {
    redirect("/student-dashboard")
  }

  // Fetch teacher's classes for the dropdown
  const classesResult = await getClassList()
  const classes = classesResult.success ? classesResult.data || [] : []

  return <CreateAssignmentWizard classes={classes} />
}
