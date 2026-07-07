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

vi.mock('@/lib/tools/programme-notes/build-pptx', () => ({
  buildPptx: vi.fn().mockResolvedValue(Buffer.from('mock-pptx')),
}));

import { POST } from '@/app/api/tools/programme-notes/build/route';
import { redis } from '@/lib/redis';

const VALID_STYLING = JSON.stringify({
  cover: {
    title: { fontFamily: 'Arial', fontSize: 32, color: 'FFFFFF' },
    subtitle: { fontFamily: 'Arial', fontSize: 22, color: 'FFFFFF' },
    date: { fontFamily: 'Arial', fontSize: 20, color: 'FFFFFF' },
    time: { fontFamily: 'Arial', fontSize: 20, color: 'FFFFFF' },
  },
  performanceOrder: {
    name: { fontFamily: 'Arial', fontSize: 22, color: '333333' },
    composerPiece: { fontFamily: 'Arial', fontSize: 13, color: '555555' },
  },
  individual: {
    name: { fontFamily: 'Arial', fontSize: 20, color: '333333' },
    composer: { fontFamily: 'Arial', fontSize: 13, color: '555555' },
    piece: { fontFamily: 'Arial', fontSize: 13, color: '555555' },
    introduction: { fontFamily: 'Arial', fontSize: 11, color: '444444' },
  },
});

const VALID_PERFORMERS = JSON.stringify([
  { name: 'Alice', pieces: 'Sonata No. 1', composers: 'Beethoven', introduction: 'A beautiful piece.' },
]);

function mockRequest(fd: FormData) {
  return { formData: () => Promise.resolve(fd) } as never;
}

function buildFormData(overrides?: { performers?: string; styling?: string; background?: File }) {
  const fd = new FormData();
  fd.set('background', overrides?.background ?? new File(['bg'], 'bg.jpg', { type: 'image/jpeg' }));
  fd.set('performers', overrides?.performers ?? VALID_PERFORMERS);
  fd.set('styling', overrides?.styling ?? VALID_STYLING);
  fd.set('edition', '16th');
  fd.set('date', '2026-01-01');
  fd.set('time', '19:30');
  return fd;
}

describe('/api/tools/programme-notes/build', () => {
  it('returns 400 for missing required fields', async () => {
    const response = await POST(mockRequest(new FormData()));
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.error).toContain('Missing required fields');
  });

  it('returns 400 for background image exceeding 4.5MB', async () => {
    const bgFile = new File(['bg'], 'bg.jpg', { type: 'image/jpeg' });
    Object.defineProperty(bgFile, 'size', { value: 4.6 * 1024 * 1024 });
    const response = await POST(mockRequest(buildFormData({ background: bgFile })));
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.error).toContain('Background image too large');
  });

  it('returns 400 for invalid performers JSON', async () => {
    const response = await POST(mockRequest(buildFormData({ performers: 'not-json' })));
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid performers JSON');
  });

  it('returns 400 for invalid performers shape (missing name)', async () => {
    const badPerformers = JSON.stringify([{ pieces: 'Sonata', composers: 'Beethoven', introduction: '' }]);
    const response = await POST(mockRequest(buildFormData({ performers: badPerformers })));
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid performers shape');
  });

  it('returns 400 for invalid styling JSON', async () => {
    const response = await POST(mockRequest(buildFormData({ styling: 'not-json' })));
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid styling JSON');
  });

  it('returns 400 for invalid styling shape', async () => {
    const badStyling = JSON.stringify({ cover: {}, performanceOrder: {}, individual: {} });
    const response = await POST(mockRequest(buildFormData({ styling: badStyling })));
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid styling shape');
  });

  it('returns 400 for missing photos', async () => {
    (redis.get as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const response = await POST(mockRequest(buildFormData()));
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.error).toContain('Missing profile photos');
    expect(data.missing).toContain('Alice');
  });
});
