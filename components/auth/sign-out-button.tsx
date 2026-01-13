"use client"

import { createClient } from "@/lib/supabase/client"
import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

export function SignOutButton() {
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      setIsLoading(true)
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error('Error signing out:', error.message)
        alert('Failed to sign out. Please try again.')
        return
      }

      // Redirect to home page after sign out
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Unexpected error:', error)
      alert('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={isLoading}
      className="w-full bg-swiss-paper border-2 border-swiss-ink/20 text-swiss-ink hover:border-swiss-signal hover:text-swiss-signal transition-colors duration-200 px-4 py-2 font-bold uppercase tracking-wider text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
    >
      <LogOut className="w-4 h-4" />
      {isLoading ? 'SIGNING OUT...' : 'SIGN OUT'}
    </button>
  )
}
