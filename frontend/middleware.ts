import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/', '/login', '/register', '/verify', '/forgot-password', '/reset-password'];
const AUTH_ONLY_PATHS = ['/login', '/register', '/forgot-password'];

const ROLE_PREFIX: Record<string, string> = {
  STUDENT: '/student',
  OFFICER: '/officer',
  REGISTRAR: '/registrar',
  ADMIN: '/admin',
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let Next.js internals and static files pass
  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.includes('.')) {
    return NextResponse.next();
  }

  const token = request.cookies.get('accessToken')?.value
    ?? request.headers.get('authorization')?.replace('Bearer ', '');

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
  const isAuthOnly = AUTH_ONLY_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));

  // Logged-in users shouldn't visit login/register
  if (token && isAuthOnly) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Protected routes need a token
  if (!isPublic && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
