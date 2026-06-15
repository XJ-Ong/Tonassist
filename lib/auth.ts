const SECRET = process.env.SESSION_SECRET!;
const encoder = new TextEncoder();

async function hmacSign(message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function createSessionCookie(): Promise<string> {
  const timestamp = Date.now().toString();
  const sig = await hmacSign(timestamp);
  return `${timestamp}.${sig}`;
}

export async function validateSessionCookie(value: string): Promise<boolean> {
  const [timestamp, sig] = value.split('.');
  if (!timestamp || !sig) return false;
  try {
    const key = await crypto.subtle.importKey('raw', encoder.encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const sigBytes = new Uint8Array(sig.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
    return await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(timestamp));
  } catch {
    return false;
  }
}
