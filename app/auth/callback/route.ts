import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Auth Callback Route Handler
 * 
 * This route handles the OAuth callback from Google (and other providers).
 * It exchanges the authorization code for a session and redirects based on user role.
 * 
 * Flow:
 * 1. User clicks "Sign in with Google"
 * 2. Redirected to Google OAuth
 * 3. Google redirects back to /auth/callback with a code
 * 4. This handler exchanges code for session
 * 5. Fetch user's role from profiles table
 * 6. Redirect to appropriate dashboard
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()

    // Exchange code for session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Error exchanging code for session:', error.message)
      // Redirect to login page with error
      return NextResponse.redirect(`${origin}/?error=auth_failed`)
    }

    if (data.user) {
      // Fetch user's profile to get their role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (profileError) {
        console.error('Error fetching profile:', profileError.message)
        // Default to student dashboard if profile fetch fails
        return NextResponse.redirect(`${origin}/student-dashboard`)
      }

      // Redirect based on role
      switch (profile.role) {
        case 'teacher':
        case 'admin':
          return NextResponse.redirect(`${origin}/dashboard`)
        case 'student':
        default:
          return NextResponse.redirect(`${origin}/student-dashboard`)
      }
    }
  }

  // If no code or user, redirect to home
  return NextResponse.redirect(`${origin}/`)
}
