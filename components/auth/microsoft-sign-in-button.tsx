"use client"

import { useSignIn } from "@clerk/nextjs"
import { useState } from "react"

export function MicrosoftSignInButton() {
  const [isLoading, setIsLoading] = useState(false)
  const { signIn, fetchStatus } = useSignIn()

  const handleMicrosoftSignIn = async () => {
    if (fetchStatus === 'fetching' || isLoading) return
    try {
      setIsLoading(true)
      await signIn.sso({
        strategy: 'oauth_microsoft',
        redirectUrl: '/dashboard',
        redirectCallbackUrl: '/sso-callback',
      })
    } catch (error) {
      console.error('Error signing in with Microsoft:', error)
      alert('Failed to sign in with Microsoft. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleMicrosoftSignIn}
      disabled={isLoading || fetchStatus === 'fetching'}
      className="w-full bg-swiss-paper border-2 border-swiss-ink/20 text-swiss-ink hover:border-swiss-signal transition-colors duration-200 px-6 py-3 font-bold uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
    >
      {isLoading ? (
        <span className="text-sm">SIGNING IN...</span>
      ) : (
        <>
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1h10v10H1z" fill="#F25022"/>
            <path d="M12 1h10v10H12z" fill="#7FBA00"/>
            <path d="M1 12h10v10H1z" fill="#00A4EF"/>
            <path d="M12 12h10v10H12z" fill="#FFB900"/>
          </svg>
          <span className="text-sm">SIGN IN WITH MICROSOFT</span>
        </>
      )}
    </button>
  )
}
