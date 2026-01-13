import { createClient } from '@/lib/supabase/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { UserRole } from '@/lib/types/database'

/**
 * Middleware for Role-Based Access Control (RBAC)
 * 
 * This middleware:
 * 1. Checks if user is authenticated
 * 2. Fetches user's role from the profiles table
 * 3. Redirects users to appropriate dashboards based on role
 * 4. Prevents unauthorized access to protected routes
 * 
 * Role-based routing:
 * - Students -> /student-dashboard
 * - Teachers/Admins -> /dashboard
 * - Unauthenticated -> / (home page)
 */
export async function middleware(request: NextRequest) {
  const { supabase, response, user } = await createClient(request)

  // List of protected routes
  const protectedRoutes = {
    student: ['/student-dashboard'],
    teacher: ['/dashboard', '/exam-builder'],
    admin: ['/dashboard', '/exam-builder', '/admin'],
  }

  const pathname = request.nextUrl.pathname

  // Allow auth callback route
  if (pathname.startsWith('/auth/callback')) {
    return response
  }

  // If user is not authenticated and trying to access protected routes
  if (!user) {
    const isProtectedRoute = 
      pathname.startsWith('/dashboard') || 
      pathname.startsWith('/student-dashboard') ||
      pathname.startsWith('/admin')

    if (isProtectedRoute) {
      const redirectUrl = new URL('/', request.url)
      redirectUrl.searchParams.set('error', 'auth_required')
      return NextResponse.redirect(redirectUrl)
    }

    return response
  }

  // User is authenticated - fetch their role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const userRole: UserRole = profile?.role || 'student'

  // Role-based route protection and redirection
  
  // 1. If student tries to access teacher/admin routes
  if (userRole === 'student') {
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/student-dashboard', request.url))
    }
  }

  // 2. If teacher/admin tries to access student routes
  if (userRole === 'teacher' || userRole === 'admin') {
    if (pathname.startsWith('/student-dashboard')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // 3. If teacher tries to access admin-only routes
  if (userRole === 'teacher' && pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // 4. Redirect authenticated users from home page to their dashboard
  if (pathname === '/') {
    if (userRole === 'student') {
      return NextResponse.redirect(new URL('/student-dashboard', request.url))
    } else if (userRole === 'teacher' || userRole === 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

/**
 * Middleware Configuration
 * 
 * Matcher pattern controls which routes this middleware runs on.
 * We exclude static files and API routes that don't need auth.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (images, etc.)
     * - API routes that don't need auth
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
