import { redis } from '@/lib/redis';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL_CORRECTION = 'llama-3.3-70b-versatile';
const MODEL_QA = 'llama-3.3-70b-versatile';
const MODEL_DRAFT = 'meta-llama/llama-4-scout-17b-16e-instruct';
const TIMEOUT_MS = 30_000;
const normalise = (s: string) => s.trim().toLowerCase();

interface GroqResponse {
  choices: { message: { content: string } }[];
}

async function callGroq(systemPrompt: string, userMessage: string, model: string = MODEL_CORRECTION, maxTokens: number = 4096, options?: { apiKey?: string; reasoningEffort?: 'default' | 'none' }): Promise<string | null> {
  try {
    const body: Record<string, unknown> = {
      model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    };
    if (options?.reasoningEffort) body.reasoning_effort = options.reasoningEffort;

    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${options?.apiKey ?? process.env.GROQ_API_KEY}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error('[groq] API request failed:', res.status, await res.text());
      return null;
    }
    const data: GroqResponse = await res.json();
    return data.choices[0]?.message?.content ?? null;
  } catch (error) {
    console.error('[groq] API call failed:', error);
    return null;
  }
}

function stripJsonFences(raw: string): string {
  let s = raw.trim();
  // Try to extract content from ``` fences (may appear anywhere in the response)
  const fenceMatch = s.match(/```(?:json)?\s*\n([\s\S]*?)\n\s*```/);
  if (fenceMatch) s = fenceMatch[1].trim();
  // Find the first [ and last ] to isolate the JSON array
  const arrayStart = s.indexOf('[');
  const arrayEnd = s.lastIndexOf(']');
  if (arrayStart !== -1 && arrayEnd > arrayStart) {
    return s.slice(arrayStart, arrayEnd + 1);
  }
  return s;
}

function tryParseJsonArray(raw: string): string[] | null {
  const cleaned = stripJsonFences(raw);
  const tryParse = (s: string): string[] | null => {
    try {
      const parsed = JSON.parse(s);
      if (!Array.isArray(parsed)) return null;
      if (parsed.every((item) => typeof item === 'string')) return parsed;
      if (parsed.every((item) => Array.isArray(item) && item.length === 1 && typeof item[0] === 'string')) {
        return parsed.map((item: string[]) => item[0]);
      }
      return null;
    } catch {
      return null;
    }
  };
  const result = tryParse(cleaned);
  if (result) return result;
  const fixed = cleaned
    .replace(/,\s*([\]}])/g, '$1')
    .replace(/\n/g, ' ')
    .replace(/\\(?![\"\\\/bfnrtu])/g, '');
  return tryParse(fixed);
}

function tryParseJsonObjectArray(raw: string): unknown[] | null {
  const cleaned = stripJsonFences(raw);
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  const fixed = cleaned
    .replace(/,\s*([\]}])/g, '$1')
    .replace(/\n/g, ' ')
    .replace(/\\(?![\"\\\/bfnrtu])/g, '');
  try {
    const parsed = JSON.parse(fixed);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return null;
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
    console.log('[groq] Correction: all pairs cached, skipping Groq call');
    return { data: results, failed: false };
  }

  console.log(`[groq] Correction: ${uncached.length} pairs to correct (model: ${MODEL_CORRECTION})`);
  const systemPrompt = `You are a classical music metadata expert. You will be given a JSON array of objects, each with a "composer" and "piece" field. For each pair, return a corrected version:
- Expand abbreviated composer names to their full conventional English form (e.g. "E.Grieg" → "Edvard Grieg", "F. Chopin" → "Frédéric Chopin").
- Fix obvious spelling errors in composer names and piece titles.
- Preserve the original language of piece titles — do not translate them.
- Correct only the smallest possible change that makes the text accurate. If multiple valid corrections exist, choose the one that differs least from the original. Do not substitute a different but more famous work.
- Return a JSON array of objects with the same structure, each containing the corrected "composer" and "piece" fields. No explanations.`;

  const input = uncached.map((u) => ({ composer: u.pair.composer, piece: u.pair.piece }));
  const response = await callGroq(systemPrompt, JSON.stringify(input), MODEL_CORRECTION, 4096);

  if (response) {
    const parsed = tryParseJsonObjectArray(response);
    if (parsed && parsed.length === uncached.length) {
      let valid = true;
      for (let i = 0; i < uncached.length; i++) {
        const item = parsed[i];
        if (item && typeof item === 'object' && 'composer' in item && 'piece' in item) {
          const corrected: MusicPair = { composer: String((item as Record<string, unknown>).composer), piece: String((item as Record<string, unknown>).piece) };
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
    console.error('[groq] Failed to parse correction response');
  }

  console.warn('[groq] Correction fallback: using original pairs for', uncached.length, 'entries');
  for (const u of uncached) {
    const key = pairKey(u.pair.composer, u.pair.piece);
    results.set(key, u.pair);
  }
  return { data: results, failed: true };
}

export async function qaIntroductions(introductions: string[]): Promise<{ data: string[]; failed: boolean }> {
  if (introductions.length === 0) return { data: [], failed: false };
  console.log(`[groq] QA: ${introductions.length} introductions to proofread (model: ${MODEL_QA})`);
  const systemPrompt = `You are a copy editor. You will be given a JSON array of short music programme note texts written by non-expert users. For each text, fix spelling errors, grammar issues, punctuation mistakes, and improper casing. Do not change meaning, style, or voice. Do not add or remove sentences. Return unchanged text if no issues found. Return only a JSON array of the same length. No explanations.`;

  const response = await callGroq(systemPrompt, JSON.stringify(introductions), MODEL_QA, 8192, { apiKey: process.env.GROQ_API_KEY_QA });
  const corrected = response ? tryParseJsonArray(response) : null;
  if (corrected && corrected.length === introductions.length) return { data: corrected, failed: false };
  console.warn('[groq] QA fallback: using original introductions for', introductions.length, 'entries');
  if (response) console.warn('[groq] QA raw response (first 500 chars):', response.slice(0, 500));
  return { data: introductions, failed: true };
}

export async function draftIntroductions(performers: { name: string; pieces: string; composers: string }[]): Promise<{ data: string[]; failed: boolean }> {
  if (performers.length === 0) return { data: [], failed: false };
  console.log(`[groq] Draft: ${performers.length} introductions to draft (model: ${MODEL_DRAFT})`);
  const systemPrompt = `You are writing a short programme note for a community piano performance event. You will be given a JSON array of objects, each with a performer name, piece title(s), and composer(s). Write a 2–4 sentence introduction for each from the performer's perspective (first person: "I", "my", "me"). The performer is introducing their own piece to the audience. Use a warm, accessible tone. Return only a JSON array of strings. No explanations.`;

  const response = await callGroq(systemPrompt, JSON.stringify(performers), MODEL_DRAFT, 8192);
  const drafts = response ? tryParseJsonArray(response) : null;
  if (drafts && drafts.length === performers.length) {
    return { data: drafts.map((d) => `${d} (drafted by AI)`), failed: false };
  }
  console.warn('[groq] Draft fallback: leaving introductions empty for', performers.length, 'performers');
  if (response) console.warn('[groq] Draft raw response (first 500 chars):', response.slice(0, 500));
  return { data: performers.map(() => ''), failed: true };
}
