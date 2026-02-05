import { SettingsClient } from "./settings-client"

export const metadata = {
  title: "Settings | Nicolaou Maths",
  description: "Manage your account settings and preferences",
}

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tight">Settings</h1>
        <p className="text-swiss-lead mt-2">
          Manage your account and application preferences
        </p>
      </div>

      {/* Settings Content */}
      <SettingsClient />
    </div>
  )
}
