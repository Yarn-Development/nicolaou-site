import type { UserRole, Profile } from '@/lib/types/database'
import { getAuthUser } from '@/lib/auth'
import { fetchQuery, api } from '@/lib/convex/server'

/**
 * Get the current authenticated user.
 *
 * Delegates to the unified `getAuthUser()`, which resolves the Clerk session
 * to a Convex `users` record. The returned `id` is the Convex user `_id` for
 * existing users, so downstream queries keyed on it continue to work.
 *
 * Use in Server Components, Server Actions, and Route Handlers.
 */
export async function getCurrentUser() {
  const authUser = await getAuthUser()
  if (!authUser) return null
  return { id: authUser.id, email: authUser.email }
}

/**
 * Get the current user's profile (including role).
 *
 * Resolves the user through the unified auth path, then loads the full Convex
 * `users` record by `clerkId` and maps it onto the legacy `Profile` shape that
 * route guards and components expect.
 *
 * Brand-new Clerk users have no record yet — we return a minimal stub with
 * `onboarding_completed: false` so route guards send them to onboarding rather
 * than bouncing them back to sign-in.
 *
 * Use in Server Components, Server Actions, and Route Handlers.
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const authUser = await getAuthUser()
  if (!authUser) return null

  const stub = (): Profile => ({
    id: authUser.id,
    email: authUser.email ?? '',
    full_name: null,
    role: (authUser.role as UserRole) ?? 'student',
    role_source: 'self_selected',
    avatar_url: null,
    institution: null,
    onboarding_completed: false,
    parent_email: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })

  // Brand-new user with no Convex record yet → route through onboarding.
  if (authUser.isNewUser || !authUser.clerkId) return stub()

  const user = await fetchQuery(api.users.getUserByClerkId, { clerkId: authUser.clerkId })
  if (!user) return stub()

  return {
    id: user._id,
    email: user.email ?? authUser.email ?? '',
    full_name: user.fullName ?? null,
    role: (user.role as UserRole) ?? 'student',
    role_source: 'self_selected',
    avatar_url: user.avatarUrl ?? null,
    institution: null,
    onboarding_completed: user.onboardingComplete ?? false,
    parent_email: user.parentEmail ?? null,
    created_at: new Date(user._creationTime).toISOString(),
    updated_at: new Date(user._creationTime).toISOString(),
  }
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
