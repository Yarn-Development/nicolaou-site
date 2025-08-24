import { TeacherDashboard } from "@/components/teacher-dashboard"

export default function DashboardPage() {
  // In a real app, we would determine the user role from auth
  // For now, we'll default to the teacher dashboard
  return <TeacherDashboard />
}
