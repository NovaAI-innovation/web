import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const url = request.nextUrl;
  
  // Protect all /client-portal routes except the login page
  if (url.pathname.startsWith('/client-portal') && url.pathname !== '/client-portal') {
    const token = request.cookies.get('portalToken')?.value;
    
    if (!token) {
      return NextResponse.redirect(new URL('/client-portal', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/client-portal/:path*',
  ],
};
