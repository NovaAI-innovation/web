/**
 * Next.js 16 proxy (middleware) — role-based routing enforcement.
 *
 * Reads the `sessionToken` cookie (presence check) and the `userRole`
 * cookie (routing hint) to enforce portal separation.
 *
 * Authorization is NOT performed here — that happens server-side in
 * requireRole() inside each API route. This proxy handles UX routing
 * only (e.g. redirect unauthenticated users to /login).
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Auth pages within each portal — accessible without a session
const PORTAL_AUTH_PATHS = [
  '/client-portal',
  '/client-portal/register',
  '/client-portal/forgot-password',
  '/client-portal/reset-password',
  '/client-portal/verify-email',
  '/admin',
  '/login',
  '/login/verify',
];

// Role → portal prefix map
const ROLE_PREFIX: Record<string, string> = {
  client: '/client-portal',
  admin: '/admin',
  developer: '/developer',
};

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Pass through API routes and static assets
  if (pathname.startsWith('/api') || pathname.includes('.')) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get('sessionToken')?.value;
  const userRole = request.cookies.get('userRole')?.value;

  // Portal auth pages — if user has a session, redirect to their dashboard
  const isPortalAuthPath = PORTAL_AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + '?'));
  if (isPortalAuthPath) {
    if (sessionToken && userRole) {
      const home = ROLE_PREFIX[userRole];
      if (home && (pathname === '/client-portal' || pathname === '/admin' || pathname === '/login')) {
        return NextResponse.redirect(new URL(`${home}/dashboard`, request.url));
      }
    }
    return NextResponse.next();
  }

  // Protected portal routes — require a session
  const isClientPortal = pathname.startsWith('/client-portal/');
  const isAdminPortal = pathname.startsWith('/admin/');
  const isDeveloperPortal = pathname.startsWith('/developer/');

  if (isClientPortal || isAdminPortal || isDeveloperPortal) {
    if (!sessionToken) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Cross-role access check using the userRole hint cookie
    if (userRole) {
      const expectedPrefix = ROLE_PREFIX[userRole];
      if (expectedPrefix) {
        if (isClientPortal && userRole !== 'client') {
          return NextResponse.redirect(new URL(`${expectedPrefix}/dashboard`, request.url));
        }
        if (isAdminPortal && userRole !== 'admin') {
          return NextResponse.redirect(new URL(`${expectedPrefix}/dashboard`, request.url));
        }
        if (isDeveloperPortal && userRole !== 'developer') {
          return NextResponse.redirect(new URL(`${expectedPrefix}/dashboard`, request.url));
        }
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
