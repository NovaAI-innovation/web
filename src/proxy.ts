import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PORTAL_ROUTES = ['/client-portal', '/client-portal/register'];
const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

function isPortalTokenValid(token: string): boolean {
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

function isAdminTokenValid(token: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const parts = decoded.split(':');
    if (parts[0] !== 'admin') return false;
    const timestamp = parseInt(parts[1], 10);
    if (isNaN(timestamp)) return false;
    return Date.now() - timestamp < TWENTY_FOUR_HOURS_MS;
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Client portal protection
  if (pathname.startsWith('/client-portal')) {
    const token = request.cookies.get('portalToken')?.value;
    const hasValidToken = token ? isPortalTokenValid(token) : false;

    if (PUBLIC_PORTAL_ROUTES.includes(pathname)) {
      if (hasValidToken) {
        return NextResponse.redirect(new URL('/client-portal/dashboard', request.url));
      }
      return NextResponse.next();
    }

    if (!hasValidToken) {
      const response = NextResponse.redirect(new URL('/client-portal', request.url));
      if (token) response.cookies.delete('portalToken');
      return response;
    }
  }

  // Admin portal protection
  if (pathname.startsWith('/admin') && pathname !== '/admin' && pathname !== '/admin/') {
    const token = request.cookies.get('adminToken')?.value;
    if (!token || !isAdminTokenValid(token)) {
      const response = NextResponse.redirect(new URL('/admin', request.url));
      if (token) response.cookies.delete('adminToken');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/client-portal/:path*', '/admin/:path*'],
};
