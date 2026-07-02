import { redis } from '@/lib/redis';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODEL = 'gemini-3.1-flash-lite';
const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 1;
const normalise = (s: string) => s.trim().toLowerCase();

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

interface CallGeminiOptions {
  apiKey?: string;
  maxOutputTokens?: number;
  responseSchema?: object;
}

export async function callGemini(
  systemPrompt: string,
  userMessage: string,
  options: CallGeminiOptions = {}
): Promise<string | null> {
  const { apiKey, maxOutputTokens = 4096, responseSchema } = options;

  const generationConfig: Record<string, unknown> = {
    maxOutputTokens,
    responseMimeType: 'application/json',
  };
  if (responseSchema) generationConfig.responseSchema = responseSchema;

  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
    generationConfig,
  };

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(`${GEMINI_API_BASE}/${MODEL}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey ?? process.env.GEMINI_API_KEY ?? '',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }

      const data: GeminiResponse = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
    } catch (error) {
      if (attempt < MAX_RETRIES) {
        console.warn(`[gemini] Request failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying automatically...`);
      } else {
        console.error('[gemini] Request failed after retry:', error);
        return null;
      }
    }
  }

  return null;
}

function safeParseArray(raw: string): string[] | null {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every((x) => typeof x === 'string') ? parsed : null;
  } catch {
    return null;
  }
}

function safeParseObjectArray(raw: string): Record<string, unknown>[] | null {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every((x) => typeof x === 'object' && x !== null) ? parsed : null;
  } catch {
    return null;
  }
}

interface MusicPair {
  composer: string;
  piece: string;
}

function pairKey(composer: string, piece: string): string {
  return `${normalise(composer)}|${normalise(piece)}`;
}

export async function correctMetadata(pairs: MusicPair[]): Promise<{ data: Map<string, MusicPair>; failed: boolean }> {
  const results = new Map<string, MusicPair>();
  const uncached: { index: number; pair: MusicPair }[] = [];

  for (let i = 0; i < pairs.length; i++) {
    const p = pairs[i];
    const key = pairKey(p.composer, p.piece);
    const raw = await redis.get(`programme-notes:correction:${key}`);
    if (raw) {
      const cached: MusicPair = typeof raw === 'string' ? JSON.parse(raw) : raw;
      results.set(key, cached);
    } else {
      uncached.push({ index: i, pair: p });
    }
  }

  if (uncached.length === 0) {
    console.log('[gemini] Correction: all pairs cached, skipping API call');
    return { data: results, failed: false };
  }

  console.log(`[gemini] Correction: ${uncached.length} pairs to correct`);
  const systemPrompt = `You are a classical music metadata expert. You will be given a JSON array of objects, each with a "composer" and "piece" field. For each pair, return a corrected version:
- Expand abbreviated composer names to their full conventional English form (e.g. "E.Grieg" → "Edvard Grieg", "F. Chopin" → "Frédéric Chopin").
- Fix obvious spelling errors in composer names and piece titles.
- Preserve the original language of piece titles — do not translate them.
- Correct only the smallest possible change that makes the text accurate. If multiple valid corrections exist, choose the one that differs least from the original. Do not substitute a different but more famous work.
- Return a JSON array of objects with the same structure, each containing the corrected "composer" and "piece" fields. No explanations.`;

  const input = uncached.map((u) => ({ composer: u.pair.composer, piece: u.pair.piece }));
  const response = await callGemini(systemPrompt, JSON.stringify(input), {
    maxOutputTokens: 4096,
    responseSchema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          composer: { type: 'string' },
          piece: { type: 'string' },
        },
        required: ['composer', 'piece'],
      },
    },
  });

  if (response) {
    const parsed = safeParseObjectArray(response);
    if (parsed && parsed.length === uncached.length) {
      let valid = true;
      for (let i = 0; i < uncached.length; i++) {
        const item = parsed[i];
        if (item && 'composer' in item && 'piece' in item) {
          const corrected: MusicPair = { composer: String(item.composer), piece: String(item.piece) };
          const key = pairKey(uncached[i].pair.composer, uncached[i].pair.piece);
          results.set(key, corrected);
        } else {
          valid = false;
          const key = pairKey(uncached[i].pair.composer, uncached[i].pair.piece);
          results.set(key, uncached[i].pair);
        }
      }
      if (valid) {
        await Promise.all(
          uncached.map((u) => {
            const key = pairKey(u.pair.composer, u.pair.piece);
            const corrected = results.get(key)!;
            return redis.set(`programme-notes:correction:${key}`, corrected);
          })
        );
      }
      return { data: results, failed: false };
    }
    console.error('[gemini] Failed to parse correction response');
  }

  console.warn('[gemini] Correction failed after retry, using original pairs for', uncached.length, 'entries');
  for (const u of uncached) {
    const key = pairKey(u.pair.composer, u.pair.piece);
    results.set(key, u.pair);
  }
  return { data: results, failed: true };
}

export async function qaIntroductions(introductions: string[]): Promise<{ data: string[]; failed: boolean }> {
  if (introductions.length === 0) return { data: [], failed: false };
  console.log(`[gemini] QA: ${introductions.length} introductions to proofread`);
  const systemPrompt = `You are a copy editor. You will be given a JSON array of short music programme note texts written by non-expert users. For each text, fix spelling errors, grammar issues, punctuation mistakes, and improper casing. Do not change meaning, style, or voice. Do not add or remove sentences. Return unchanged text if no issues found. Return only a JSON array of the same length. No explanations.`;

  const response = await callGemini(systemPrompt, JSON.stringify(introductions), {
    maxOutputTokens: 8192,
    responseSchema: { type: 'array', items: { type: 'string' } },
  });
  const corrected = response ? safeParseArray(response) : null;
  if (corrected && corrected.length === introductions.length) return { data: corrected, failed: false };
  console.warn('[gemini] QA failed after retry, using original introductions for', introductions.length, 'entries');
  if (response) console.warn('[gemini] QA raw response (first 500 chars):', response.slice(0, 500));
  return { data: introductions, failed: true };
}

export async function draftIntroductions(performers: { name: string; pieces: string; composers: string }[]): Promise<{ data: string[]; failed: boolean }> {
  if (performers.length === 0) return { data: [], failed: false };
  console.log(`[gemini] Draft: ${performers.length} introductions to draft`);
  const systemPrompt = `You are writing a short programme note for a community piano performance event. You will be given a JSON array of objects, each with a performer name, piece title(s), and composer(s). Write a 2–4 sentence introduction for each from the performer's perspective (first person: "I", "my", "me"). The performer is introducing their own piece to the audience. Use a warm, accessible tone. Return only a JSON array of strings. No explanations.`;

  const response = await callGemini(systemPrompt, JSON.stringify(performers), {
    maxOutputTokens: 8192,
    responseSchema: { type: 'array', items: { type: 'string' } },
  });
  const drafts = response ? safeParseArray(response) : null;
  if (drafts && drafts.length === performers.length) {
    return { data: drafts.map((d) => `${d} (drafted by AI)`), failed: false };
  }
  console.warn('[gemini] Draft failed after retry, leaving introductions empty for', performers.length, 'performers');
  if (response) console.warn('[gemini] Draft raw response (first 500 chars):', response.slice(0, 500));
  return { data: performers.map(() => ''), failed: true };
}
