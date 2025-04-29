import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If user is not signed in and the current path is not / or /auth,
  // redirect the user to /
  if (!session && !request.nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // If user is signed in and the current path is / or /auth,
  // redirect the user to /dashboard
  if (session && (request.nextUrl.pathname === '/' || request.nextUrl.pathname.startsWith('/auth'))) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
} 