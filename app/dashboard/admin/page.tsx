import { requireTeacher, getCurrentProfile } from "@/lib/auth/helpers"
import { redirect } from "next/navigation"
import { AdminClient } from "./admin-client"
import { getAdminUsers } from "@/app/actions/admin"
import Link from "next/link"
import { ClipboardList } from "lucide-react"

export default async function AdminPage() {
  const user = await requireTeacher().catch(() => {
    redirect("/?error=teacher_required")
  })
  if (!user) redirect("/?error=teacher_required")

  const profile = await getCurrentProfile()

  const { users } = await getAdminUsers()

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <AdminClient
        users={users}
        currentUserId={user.id}
        currentUserRole={profile?.role ?? "teacher"}
      />

      {/* Quick links */}
      <div className="border-t-2 border-swiss-ink/20 pt-6">
        <p className="text-xs font-bold uppercase tracking-wider text-swiss-lead mb-4">Quick Links</p>
        <Link
          href="/dashboard/admin/audit"
          className="inline-flex items-center gap-2 border-2 border-swiss-ink px-4 py-2 text-sm font-black uppercase tracking-wider hover:bg-swiss-ink hover:text-white transition-colors"
        >
          <ClipboardList className="w-4 h-4" />
          Question Audit Tool
        </Link>
      </div>
    </div>
  )
}
