import { getCurrentProfile, requireAuth } from "@/lib/auth/helpers"
import { redirect } from "next/navigation"
import StudentDashboardClient from "./student-dashboard-client"
import { acceptPendingInvites } from "@/app/actions/class-invites"

export default async function StudentDashboardPage() {
  // Require authentication
  await requireAuth().catch(() => {
    redirect('/?error=auth_required')
  })

  // Get user profile
  const profile = await getCurrentProfile()

  if (!profile) {
    redirect('/onboarding')
  }

  if (!profile.onboarding_completed) {
    redirect('/onboarding')
  }

  // If not a student, redirect to appropriate dashboard
  if (profile.role === 'teacher' || profile.role === 'admin') {
    redirect('/dashboard')
  }

  // Auto-enroll from any pending CSV invites
  await acceptPendingInvites().catch(() => {})

  return <StudentDashboardClient profile={profile} />
}
