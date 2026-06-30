import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { redis } from '@/lib/redis';
import { createSessionCookie } from '@/lib/auth';

const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(5, '60 s'),
  analytics: true,
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';

  const { success, limit, remaining, reset } = await ratelimit.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
        },
      }
    );
  }

  const { password } = await request.json();
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const cookieValue = await createSessionCookie();
  const response = NextResponse.json({ ok: true });
  const isSecure = process.env.NODE_ENV === 'production';
  response.headers.set(
    'Set-Cookie',
    `tonassist_session=${cookieValue}; Path=/; HttpOnly;${isSecure ? ' Secure;' : ''} SameSite=Strict; Max-Age=${30 * 24 * 60 * 60}`
  );

  // Add rate limit headers to successful responses too
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());

  return response;
}
