import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PORTAL_ROUTES = ['/client-portal', '/client-portal/register'];
const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;

function isTokenValid(token: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const parts = decoded.split(':');
    if (parts.length < 3) return false;

    const timestamp = parseInt(parts[1], 10);
    if (isNaN(timestamp)) return false;

    return Date.now() - timestamp < EIGHT_HOURS_MS;
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect client-portal routes
  if (!pathname.startsWith('/client-portal')) {
    return NextResponse.next();
  }

  const token = request.cookies.get('portalToken')?.value;
  const hasValidToken = token ? isTokenValid(token) : false;

  // Public routes — redirect authenticated users to dashboard
  if (PUBLIC_PORTAL_ROUTES.includes(pathname)) {
    if (hasValidToken) {
      return NextResponse.redirect(new URL('/client-portal/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Protected routes — require valid token
  if (!hasValidToken) {
    const response = NextResponse.redirect(new URL('/client-portal', request.url));
    if (token) {
      // Clear expired/invalid token
      response.cookies.delete('portalToken');
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/client-portal/:path*',
  ],
};
