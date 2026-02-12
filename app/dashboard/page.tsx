import { 
  getAssignmentsNeedingAttention,
  getRecentAssignmentActivity,
  type AssignmentAction,
  type RecentAssignmentActivity,
} from "@/app/actions/dashboard"
import { DashboardClient } from "./dashboard-client"

export default async function DashboardPage() {
  // Fetch data in parallel
  const [actionsResult, activityResult] = await Promise.all([
    getAssignmentsNeedingAttention(),
    getRecentAssignmentActivity(),
  ])

  const actionQueue: AssignmentAction[] = actionsResult.success ? actionsResult.data || [] : []
  const recentActivity: RecentAssignmentActivity[] = activityResult.success ? activityResult.data || [] : []

  return (
    <DashboardClient 
      actionQueue={actionQueue}
      recentActivity={recentActivity}
    />
  )
}
