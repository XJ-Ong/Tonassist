import { describe, it, expect, vi, beforeEach } from 'vitest';
import { callGemini } from '@/lib/tools/programme-notes/gemini';

// Set required env vars BEFORE any imports
vi.hoisted(() => {
  process.env.ADMIN_PASSWORD = 'test-admin';
  process.env.SESSION_SECRET = 'test-session-secret';
  process.env.UPSTASH_REDIS_REST_URL = 'https://test-redis.upstash.io';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-redis-token';
  process.env.GEMINI_API_KEY = 'test-api-key';
});

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('callGemini', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns extracted text on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Hello world' }] } }],
      }),
    });

    const result = await callGemini('You are a helpful assistant', 'Say hello');
    expect(result).toBe('Hello world');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('generativelanguage.googleapis.com'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-goog-api-key': 'test-api-key',
        }),
      })
    );
  });

  it('returns null on non-OK response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => 'Rate limited',
    });

    const result = await callGemini('system', 'user');
    expect(result).toBeNull();
  });

  it('returns null on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await callGemini('system', 'user');
    expect(result).toBeNull();
  });

  it('returns null when response has no candidates', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const result = await callGemini('system', 'user');
    expect(result).toBeNull();
  });

  it('sends responseSchema when provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: '{"key":"value"}' }] } }],
      }),
    });

    const schema = { type: 'object', properties: { key: { type: 'string' } } };
    await callGemini('system', 'user', { responseSchema: schema });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.generationConfig.responseSchema).toEqual(schema);
    expect(body.generationConfig.responseMimeType).toBe('application/json');
  });

  it('uses custom apiKey when provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'result' }] } }],
      }),
    });

    await callGemini('system', 'user', { apiKey: 'custom-key' });

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['x-goog-api-key']).toBe('custom-key');
  });
});
