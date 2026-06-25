import type React from "react"
import { redirect } from "next/navigation"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { getCurrentProfile } from "@/lib/auth/helpers"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getCurrentProfile()

  if (!profile) {
    redirect("/sign-in")
  }

  if (!profile.onboarding_completed) {
    redirect("/onboarding")
  }

  if (profile.role === "student") {
    redirect("/student-dashboard")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <div className="flex flex-1">
        <DashboardSidebar />
        <main className="flex-1 min-w-0 overflow-x-hidden p-6 md:p-8 print:p-0">{children}</main>
      </div>
    </div>
  )
}
