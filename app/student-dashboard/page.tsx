import { getCurrentProfile, requireAuth } from "@/lib/auth/helpers"
import { redirect } from "next/navigation"
import StudentDashboardClient from "./student-dashboard-client"

export default async function StudentDashboardPage() {
  // Require authentication
  await requireAuth().catch(() => {
    redirect('/?error=auth_required')
  })

  // Get user profile
  const profile = await getCurrentProfile()

  if (!profile) {
    redirect('/?error=profile_not_found')
  }

  // If not a student, redirect to appropriate dashboard
  if (profile.role === 'teacher' || profile.role === 'admin') {
    redirect('/dashboard')
  }

  return <StudentDashboardClient profile={profile} />
}
