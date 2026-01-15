import { getAssignmentsForMarking } from "@/app/actions/marking"
import { MarkingListClient } from "./marking-list-client"

export default async function MarkingPage() {
  const result = await getAssignmentsForMarking()

  const assignments = result.success ? result.data || [] : []

  return <MarkingListClient assignments={assignments} />
}
