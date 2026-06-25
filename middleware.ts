import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/login(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/sso-callback(.*)',
  '/auth(.*)',
  '/parent-portal(.*)',
  '/api/webhooks(.*)',
  // Cron job — authenticated by CRON_SECRET, not a Clerk session.
  '/api/cron(.*)',
  // Question generation — called server-to-server by the cron (no Clerk session).
  '/api/ai/generate(.*)',
  // Parent feedback PDF — opened from the tokenised parent portal (no Clerk session).
  '/api/pdf/parent(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
