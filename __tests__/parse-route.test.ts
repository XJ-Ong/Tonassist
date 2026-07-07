import { describe, it, expect, vi } from 'vitest';

vi.hoisted(() => {
  process.env.ADMIN_PASSWORD = 'test-admin';
  process.env.SESSION_SECRET = 'test-session-secret';
  process.env.UPSTASH_REDIS_REST_URL = 'https://test-redis.upstash.io';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-redis-token';
  process.env.GEMINI_API_KEY = 'test-api-key';
});

vi.mock('@/lib/redis', () => ({
  redis: { get: vi.fn(), set: vi.fn() },
}));

vi.mock('@/lib/tools/programme-notes/gemini', () => ({
  correctMetadata: vi.fn(),
  qaIntroductions: vi.fn(),
  draftIntroductions: vi.fn(),
}));

vi.mock('@/lib/tools/programme-notes/parse-excel', () => ({
  parseExcel: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/tools/programme-notes/sort-performers', () => ({
  sortPerformers: vi.fn().mockReturnValue([]),
}));

import { POST } from '@/app/api/tools/programme-notes/parse/route';

/**
 * jsdom's Request constructor cannot round-trip FormData containing File objects —
 * `request.formData()` hangs forever. We bypass this by constructing a mock
 * NextRequest-like object whose `formData()` resolves directly to our FormData.
 */
function mockRequest(fd: FormData) {
  return { formData: () => Promise.resolve(fd) } as never;
}

describe('/api/tools/programme-notes/parse', () => {
  it('returns 400 for missing required fields', async () => {
    const response = await POST(mockRequest(new FormData()));
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.error).toContain('Missing required fields');
  });

  it('returns 400 for invalid file type (.txt instead of .xlsx)', async () => {
    const fd = new FormData();
    fd.set('xlsx', new File(['data'], 'report.txt', { type: 'text/plain' }));
    fd.set('background', new File(['bg'], 'bg.jpg', { type: 'image/jpeg' }));
    fd.set('edition', '16th');
    fd.set('date', '2026-01-01');
    fd.set('time', '19:30');
    const response = await POST(mockRequest(fd));
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid file type');
  });

  it('returns 400 for background image exceeding 4.5MB', async () => {
    const fd = new FormData();
    fd.set('xlsx', new File(['data'], 'report.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const bgFile = new File(['bg'], 'bg.jpg', { type: 'image/jpeg' });
    Object.defineProperty(bgFile, 'size', { value: 4.6 * 1024 * 1024 });
    fd.set('background', bgFile);
    fd.set('edition', '16th');
    fd.set('date', '2026-01-01');
    fd.set('time', '19:30');
    const response = await POST(mockRequest(fd));
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.error).toContain('Background image too large');
  });
});
