import { NextRequest, NextResponse } from 'next/server';
import { validateSessionCookie } from '@/lib/auth';

const PUBLIC_EXACT: Set<string> = new Set(['/', '/api/auth']);
const PUBLIC_PREFIXES = ['/api/auth/'];

export function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicRoute(pathname)) return NextResponse.next();
  const session = request.cookies.get('tonassist_session')?.value;

  let isValid = false;
  try {
    isValid = !!session && (await validateSessionCookie(session));
  } catch (error) {
    console.error('[proxy] session validation error:', error);
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (!isValid) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
