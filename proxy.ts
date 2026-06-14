import { NextRequest, NextResponse } from 'next/server';
import { validateSessionCookie } from '@/lib/auth';

const PUBLIC_PATHS = ['/', '/api/auth'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();
  const session = request.cookies.get('tonassist_session')?.value;
  if (!session || !validateSessionCookie(session)) {
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
