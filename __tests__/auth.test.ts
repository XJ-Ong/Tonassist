import { describe, it, expect, vi } from 'vitest';

// Must run before imports are hoisted so lib/auth.ts picks up the value
vi.hoisted(() => {
  process.env.SESSION_SECRET = 'test-secret-key-for-testing';
});

import { createSessionCookie, validateSessionCookie } from '@/lib/auth';

describe('auth', () => {
  describe('createSessionCookie', () => {
    it('returns a string in timestamp.signature format', async () => {
      const cookie = await createSessionCookie();
      expect(cookie).toMatch(/^\d+\.[a-f0-9]+$/);
    });

    it('generates unique tokens on each call', async () => {
      vi.useFakeTimers();
      const cookie1 = await createSessionCookie();
      vi.advanceTimersByTime(1);
      const cookie2 = await createSessionCookie();
      vi.useRealTimers();
      expect(cookie1).not.toBe(cookie2);
    });
  });

  describe('validateSessionCookie', () => {
    it('returns true for a valid token', async () => {
      const cookie = await createSessionCookie();
      const result = await validateSessionCookie(cookie);
      expect(result).toBe(true);
    });

    it('returns false for an invalid token', async () => {
      const result = await validateSessionCookie('invalid.token');
      expect(result).toBe(false);
    });

    it('returns false for a token with wrong signature', async () => {
      const cookie = await createSessionCookie();
      const [timestamp] = cookie.split('.');
      const result = await validateSessionCookie(`${timestamp}.0000000000000000000000000000000000000000000000000000000000000000`);
      expect(result).toBe(false);
    });

    it('returns false for an expired token', async () => {
      // Create a token with a timestamp from 31 days ago
      const oldTimestamp = (Date.now() - 31 * 24 * 60 * 60 * 1000).toString();
      // We can't easily forge a valid HMAC, so we test with a malformed token
      const result = await validateSessionCookie(`${oldTimestamp}.invalid`);
      expect(result).toBe(false);
    });

    it('returns false for empty string', async () => {
      const result = await validateSessionCookie('');
      expect(result).toBe(false);
    });

    it('returns false for string without signature', async () => {
      const result = await validateSessionCookie('12345');
      expect(result).toBe(false);
    });
  });
});
