import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Auth Callback Route Handler
 *
 * Handles OAuth callbacks from Google and Microsoft (Azure AD).
 *
 * Flow:
 * 1. Exchange the auth code for a session
 * 2. Validate the user's email domain against school_domains
 *    → Unknown domain: redirect to /login?error=domain_not_allowed
 * 3. Try to auto-detect role from the school's teacher_email_pattern
 *    → Pattern match  : set role='teacher', role_source='auto_detected'
 *    → No pattern     : leave role_source='pending' (onboarding will ask)
 * 4. Redirect to onboarding (if incomplete) or the appropriate dashboard
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (!code) {
    return NextResponse.redirect(`${origin}/`)
  }

  const supabase = await createClient()

  // Exchange the auth code for a session
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    console.error('Auth callback error:', error?.message)
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const user = data.user
  const email = user.email ?? ''
  const domain = email.split('@')[1]?.toLowerCase()

  if (!domain) {
    return NextResponse.redirect(`${origin}/login?error=invalid_email`)
  }

  // Look up the school domain configuration
  const { data: schoolDomain } = await supabase
    .from('school_domains')
    .select('teacher_email_pattern, sso_provider, school_name')
    .eq('domain', domain)
    .eq('is_active', true)
    .maybeSingle()

  if (!schoolDomain) {
    // Email domain not registered — sign them out and redirect with error
    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}/login?error=domain_not_allowed`)
  }

  // Fetch the profile that was auto-created by the DB trigger
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, role_source, onboarding_completed')
    .eq('id', user.id)
    .single()

  // Only attempt auto-detection on first sign-in (role_source still 'pending')
  const isFirstSignIn = !profile || profile.role_source === 'pending'

  if (isFirstSignIn && schoolDomain.teacher_email_pattern) {
    const localPart = email.split('@')[0]
    let isTeacher = false

    try {
      const pattern = new RegExp(schoolDomain.teacher_email_pattern)
      isTeacher = pattern.test(localPart)
    } catch (err) {
      // Malformed pattern — fall back to the onboarding prompt
      console.warn('Invalid teacher_email_pattern for domain', domain, err)
    }

    await supabase
      .from('profiles')
      .update({
        role: isTeacher ? 'teacher' : 'student',
        role_source: 'auto_detected',
      })
      .eq('id', user.id)

    // Auto-detected role — skip directly to onboarding details step
    // (onboarding_completed is still false, middleware will redirect there)
    const onboardingCompleted = profile?.onboarding_completed ?? false
    if (onboardingCompleted) {
      return NextResponse.redirect(
        `${origin}/${isTeacher ? 'dashboard' : 'student-dashboard'}`
      )
    }
    return NextResponse.redirect(`${origin}/onboarding`)
  }

  // No pattern or not first sign-in — use existing profile to decide where to go
  const onboardingCompleted = profile?.onboarding_completed ?? false
  if (!onboardingCompleted) {
    return NextResponse.redirect(`${origin}/onboarding`)
  }

  const role = profile?.role ?? 'student'
  switch (role) {
    case 'teacher':
    case 'admin':
      return NextResponse.redirect(`${origin}/dashboard`)
    default:
      return NextResponse.redirect(`${origin}/student-dashboard`)
  }
}
