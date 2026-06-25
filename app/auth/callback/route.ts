import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Clerk handles OAuth callbacks natively via /sso-callback.
// This route is kept for legacy redirect compatibility.
export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin
  return NextResponse.redirect(`${origin}/dashboard`)
}
