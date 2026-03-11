import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Role-based route access configuration
const roleRoutes: Record<string, string[]> = {
  ADMIN: ['/admin', '/orders', '/call-center', '/delivery', '/stock', '/finance', '/users'],
  SELLER: ['/orders', '/stock'],
  CALL_CENTER: ['/call-center', '/orders'],
  DELIVERY: ['/delivery', '/orders']
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('session')?.value

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/api/auth/login', '/api/auth/register']

  if (publicRoutes.some(route => pathname.startsWith(route))) {
    // If user is already authenticated and tries to access login/register, redirect to dashboard
    if (token && (pathname === '/login' || pathname === '/register')) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  // Check if route requires authentication
  const protectedRoutes = ['/admin', '/orders', '/call-center', '/delivery', '/stock', '/finance', '/users']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  if (!isProtectedRoute) {
    return NextResponse.next()
  }

  // No token, redirect to login
  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Verify token and get user role
  try {
    const { jwtVerify } = await import('jose')
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'gabon-cod-platform-secret-key-2024')
    const { payload } = await jwtVerify(token, secret)
    const userRole = payload.role as string

    // Check if user has access to this route
    const allowedRoutes = roleRoutes[userRole] || []
    const hasAccess = allowedRoutes.some(route => pathname.startsWith(route))

    if (!hasAccess) {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }

    return NextResponse.next()
  } catch (error) {
    // Invalid token, redirect to login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}
