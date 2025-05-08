import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// These routes don't require authentication
const publicRoutes = [
  '/',
  '/auth/login',
  '/auth/signup',
  '/auth/verify-email',
  '/auth/reset-password',
  '/privacy',
  '/terms'
]

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  const isPublicRoute = publicRoutes.includes(req.nextUrl.pathname)
  const isAuthRoute = req.nextUrl.pathname.startsWith('/auth/')

  // Handle authentication
  if (!session) {
    // If not authenticated and trying to access protected route, redirect to login
    if (!isPublicRoute) {
      const redirectUrl = new URL('/auth/login', req.url)
      redirectUrl.searchParams.set('redirect', req.url)
      return NextResponse.redirect(redirectUrl)
    }
  } else {
    // If authenticated and trying to access auth routes, redirect to feed
    if (isAuthRoute) {
      return NextResponse.redirect(new URL('/feed', req.url))
    }
  }

  return res
}

// Configure which routes to run the middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
} 