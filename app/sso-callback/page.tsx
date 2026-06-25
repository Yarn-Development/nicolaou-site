"use client"

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs"

// Handles OAuth redirect callbacks from Clerk after Google/Microsoft sign-in.
export default function SSOCallbackPage() {
  return <AuthenticateWithRedirectCallback />
}
