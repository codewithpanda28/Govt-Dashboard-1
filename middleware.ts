import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  try {
    const supabase = createMiddlewareClient({ req, res })

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    const isAuthPage = req.nextUrl.pathname.startsWith('/login') || req.nextUrl.pathname.startsWith('/change-password')
    const isPublicPage = req.nextUrl.pathname === '/'

    // Allow auth pages and public pages without session
    if (!session && (isAuthPage || isPublicPage)) {
      return res
    }

    // Redirect to login if no session and trying to access protected page
    if (!session && !isAuthPage && !isPublicPage) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // If user has session and is on auth page, check if they should be redirected
    if (session && isAuthPage) {
      try {
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('role, is_first_login')
          .eq('auth_id', session.user.id)
          .eq('is_active', true)
          .single()

        if (user && !userError) {
          // Redirect based on first login status
          if (user.is_first_login && req.nextUrl.pathname !== '/change-password') {
            return NextResponse.redirect(new URL('/change-password', req.url))
          }

          if (!user.is_first_login && req.nextUrl.pathname === '/change-password') {
            return NextResponse.redirect(new URL('/dashboard', req.url))
          }

          // Check role only if not on login page
          if (req.nextUrl.pathname === '/login' && !['station_officer', 'data_operator'].includes(user.role)) {
            // Allow them to stay on login page to see error
            return res
          }
        }
      } catch (error) {
        // If error fetching user, allow access to login page
        console.error('Middleware user fetch error:', error)
        if (req.nextUrl.pathname === '/login') {
          return res
        }
      }
    }

    return res
  } catch (error) {
    console.error('Middleware error:', error)
    // On error, allow access to login page
    if (req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/') {
      return res
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}

