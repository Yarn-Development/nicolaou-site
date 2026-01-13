import { createClient } from '@/lib/supabase/server'
import type { UserRole, Profile } from '@/lib/types/database'

/**
 * Get the current authenticated user
 * Use in Server Components, Server Actions, and Route Handlers
 */
export async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

/**
 * Get the current user's profile (including role)
 * Use in Server Components, Server Actions, and Route Handlers
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}

/**
 * Get the current user's role
 * Use in Server Components, Server Actions, and Route Handlers
 */
export async function getCurrentUserRole(): Promise<UserRole | null> {
  const profile = await getCurrentProfile()
  return profile?.role ?? null
}

/**
 * Check if current user has a specific role
 */
export async function hasRole(role: UserRole): Promise<boolean> {
  const userRole = await getCurrentUserRole()
  return userRole === role
}

/**
 * Check if current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  return hasRole('admin')
}

/**
 * Check if current user is a teacher or admin
 */
export async function isTeacher(): Promise<boolean> {
  const userRole = await getCurrentUserRole()
  return userRole === 'teacher' || userRole === 'admin'
}

/**
 * Check if current user is a student
 */
export async function isStudent(): Promise<boolean> {
  return hasRole('student')
}

/**
 * Require authentication - throw error if not authenticated
 * Use in Server Actions and Route Handlers
 */
export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Authentication required')
  }
  return user
}

/**
 * Require specific role - throw error if user doesn't have role
 * Use in Server Actions and Route Handlers
 */
export async function requireRole(role: UserRole) {
  const user = await requireAuth()
  const userRole = await getCurrentUserRole()
  
  if (userRole !== role) {
    throw new Error(`${role} role required`)
  }
  
  return user
}

/**
 * Require teacher or admin role
 */
export async function requireTeacher() {
  const user = await requireAuth()
  const userRole = await getCurrentUserRole()
  
  if (userRole !== 'teacher' && userRole !== 'admin') {
    throw new Error('Teacher or admin role required')
  }
  
  return user
}

/**
 * Require admin role
 */
export async function requireAdmin() {
  return requireRole('admin')
}
