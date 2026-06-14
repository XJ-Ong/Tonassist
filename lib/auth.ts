import './env';
import { createHmac, timingSafeEqual } from 'crypto';
const SECRET = process.env.SESSION_SECRET!;

export function createSessionCookie(): string {
  const timestamp = Date.now().toString();
  const sig = createHmac('sha256', SECRET).update(timestamp).digest('hex');
  return `${timestamp}.${sig}`;
}

export function validateSessionCookie(value: string): boolean {
  const [timestamp, sig] = value.split('.');
  if (!timestamp || !sig) return false;
  const expected = createHmac('sha256', SECRET).update(timestamp).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}
