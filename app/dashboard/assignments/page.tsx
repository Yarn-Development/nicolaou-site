import { getTeacherAssignments } from "@/app/actions/assignments"
import { AssignmentsListClient } from "./assignments-list-client"

export default async function AssignmentsPage() {
  const result = await getTeacherAssignments()

  const assignments = result.success ? result.data || [] : []

  return <AssignmentsListClient assignments={assignments} />
}
