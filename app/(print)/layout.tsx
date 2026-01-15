import type React from "react"

/**
 * Print Layout - Clean white layout without Dashboard chrome (Sidebar/Header)
 * Used for printable pages that need to bypass the main dashboard layout
 */
export default function PrintLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-white">
      {children}
    </div>
  )
}
