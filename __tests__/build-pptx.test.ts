import { describe, it, expect, vi } from 'vitest';
import { buildPptx } from '@/lib/tools/programme-notes/build-pptx';
import { DEFAULT_STYLING } from '@/lib/tools/programme-notes/default-styling';

// Set required env vars BEFORE any imports
vi.hoisted(() => {
  process.env.ADMIN_PASSWORD = 'test-admin';
  process.env.SESSION_SECRET = 'test-session-secret';
  process.env.UPSTASH_REDIS_REST_URL = 'https://test-redis.upstash.io';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-redis-token';
  process.env.GEMINI_API_KEY = 'test-api-key';
});

const mockPerformers = [
  { name: 'Alice', pieces: 'Sonata No. 1', composers: 'Beethoven', introduction: 'A beautiful piece.', photoBase64: 'dGVzdA==' },
  { name: 'Bob', pieces: 'Clair de Lune', composers: 'Debussy', introduction: 'A dreamy piece.', photoBase64: 'dGVzdA==' },
  { name: 'Charlie', pieces: 'Nocturne Op. 9 No. 2', composers: 'Chopin', introduction: '', photoBase64: 'dGVzdA==' },
];

describe('buildPptx', () => {
  it('produces a buffer without throwing', async () => {
    const buffer = await buildPptx({
      performers: mockPerformers,
      backgroundBase64: 'dGVzdA==',
      edition: '16th',
      date: '2026-01-01',
      time: '19:30',
      timezone: 'UTC+8',
    });
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('creates one slide per performer for individual pages', async () => {
    const buffer = await buildPptx({
      performers: mockPerformers,
      backgroundBase64: 'dGVzdA==',
      edition: '16th',
      date: '2026-01-01',
      time: '19:30',
      timezone: 'UTC+8',
    });
    // OOXML is a zip; each slide entry appears in both local header and central directory
    const slideRefs = buffer.toString('binary').match(/ppt\/slides\/slide\d+\.xml/g) ?? [];
    const slideCount = new Set(slideRefs).size;
    // 3 performers = 1 cover + 1 performance order + 3 individual = 5 slides
    expect(slideCount).toBe(5);
  });

  it('works with styling overrides', async () => {
    const customStyling = {
      ...DEFAULT_STYLING,
      cover: {
        ...DEFAULT_STYLING.cover,
        title: { fontFamily: 'Playfair Display', fontSize: 40, color: 'FF0000' },
      },
    };
    const buffer = await buildPptx({
      performers: mockPerformers,
      backgroundBase64: 'dGVzdA==',
      edition: '16th',
      date: '2026-01-01',
      time: '19:30',
      timezone: 'UTC+8',
      styling: customStyling,
    });
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('works without styling (uses defaults)', async () => {
    const buffer = await buildPptx({
      performers: mockPerformers,
      backgroundBase64: 'dGVzdA==',
      edition: '16th',
      date: '2026-01-01',
      time: '19:30',
      timezone: 'UTC+8',
    });
    expect(buffer).toBeInstanceOf(Buffer);
  });

  it('handles empty introduction gracefully', async () => {
    const performers = [
      { name: 'Test', pieces: 'Piece', composers: 'Composer', introduction: '', photoBase64: 'dGVzdA==' },
    ];
    const buffer = await buildPptx({
      performers,
      backgroundBase64: 'dGVzdA==',
      edition: '1st',
      date: '2026-01-01',
      time: '19:30',
      timezone: 'UTC+8',
    });
    expect(buffer).toBeInstanceOf(Buffer);
  });

  it('handles large font sizes with long names without crashing', async () => {
    const performers = [
      { name: 'Alexandra Konstantinopoulos', pieces: 'Piano Sonata No. 14 in C-sharp minor', composers: 'Ludwig van Beethoven', introduction: 'A very long introduction that will wrap multiple lines when rendered at a large font size.', photoBase64: 'dGVzdA==' },
    ];
    const largeFontStyling = {
      ...DEFAULT_STYLING,
      individual: {
        ...DEFAULT_STYLING.individual,
        name: { fontFamily: 'Arial', fontSize: 60, color: '333333' },
        composer: { fontFamily: 'Arial', fontSize: 40, color: '555555' },
        piece: { fontFamily: 'Arial', fontSize: 40, color: '555555' },
        introduction: { fontFamily: 'Arial', fontSize: 30, color: '444444' },
      },
    };
    const buffer = await buildPptx({
      performers,
      backgroundBase64: 'dGVzdA==',
      edition: '1st',
      date: '2026-01-01',
      time: '19:30',
      timezone: 'UTC+8',
      styling: largeFontStyling,
    });
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });
});
