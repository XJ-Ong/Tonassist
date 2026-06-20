import { redis } from '@/lib/redis';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL_CORRECTION = 'llama-3.3-70b-versatile';
const MODEL_QA_DRAFT = 'meta-llama/llama-4-scout-17b-16e-instruct';
const TIMEOUT_MS = 30_000;
const normalise = (s: string) => s.trim().toLowerCase();

interface GroqResponse {
  choices: { message: { content: string } }[];
}

async function callGroq(systemPrompt: string, userMessage: string, model: string = MODEL_CORRECTION): Promise<string | null> {
  try {
    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      }),
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
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  const arrayStart = s.indexOf('[');
  const arrayEnd = s.lastIndexOf(']');
  if (arrayStart !== -1 && arrayEnd > arrayStart) {
    return s.slice(arrayStart, arrayEnd + 1);
  }
  return s.trim();
}

function tryParseJsonArray(raw: string): string[] | null {
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

export async function correctMetadata(rawStrings: string[]): Promise<{ data: Map<string, string>; failed: boolean }> {
  const results = new Map<string, string>();
  const uncached: { index: number; raw: string }[] = [];

  for (let i = 0; i < rawStrings.length; i++) {
    const raw = rawStrings[i];
    const cached = await redis.get<string>(`programme-notes:correction:${normalise(raw)}`);
    if (cached) {
      results.set(raw, cached);
    } else {
      uncached.push({ index: i, raw });
    }
  }

  if (uncached.length === 0) {
    console.log('[groq] Correction: all strings cached, skipping Groq call');
    return { data: results, failed: false };
  }

  console.log(`[groq] Correction: ${uncached.length} strings to correct (model: ${MODEL_CORRECTION})`);
  const systemPrompt = `You are a classical music metadata expert. You will be given a JSON array of strings, each being a composer name or piece title as entered by a non-expert user. Return a JSON array of the same length with each string corrected to its canonical form:
- Expand abbreviated composer names to their full conventional English form (e.g. "E.Grieg" → "Edvard Grieg", "F. Chopin" → "Frédéric Chopin", "J.S. Bach" → "Johann Sebastian Bach").
- Fix obvious spelling errors in piece titles and composer names.
- Preserve the original language of piece titles — do not translate them.
- If you are not certain about a correction, return the original string unchanged.
- Return only the JSON array. No explanations.`;

  const response = await callGroq(systemPrompt, JSON.stringify(uncached.map((u) => u.raw)));

  if (response) {
    const corrected = tryParseJsonArray(response);
    if (corrected && corrected.length === uncached.length) {
      for (let i = 0; i < uncached.length; i++) {
        results.set(uncached[i].raw, corrected[i]);
      }
      await Promise.all(
        uncached.map((u, i) =>
          redis.set(`programme-notes:correction:${normalise(u.raw)}`, corrected[i])
        )
      );
      return { data: results, failed: false };
    }
    console.error('[groq] Failed to parse correction response');
  }

  console.warn('[groq] Correction fallback: using raw strings for', uncached.length, 'entries');
  for (const u of uncached) results.set(u.raw, u.raw);
  return { data: results, failed: true };
}

export async function qaIntroductions(introductions: string[]): Promise<{ data: string[]; failed: boolean }> {
  if (introductions.length === 0) return { data: [], failed: false };
  console.log(`[groq] QA: ${introductions.length} introductions to proofread (model: ${MODEL_QA_DRAFT})`);
  const systemPrompt = `You are a copy editor. You will be given a JSON array of short music programme note texts written by non-expert users. For each text, fix spelling errors, grammar issues, punctuation mistakes, and improper casing. Do not change meaning, style, or voice. Do not add or remove sentences. Return unchanged text if no issues found. Return only a JSON array of the same length. No explanations.`;

  const response = await callGroq(systemPrompt, JSON.stringify(introductions), MODEL_QA_DRAFT);
  const corrected = response ? tryParseJsonArray(response) : null;
  if (corrected && corrected.length === introductions.length) return { data: corrected, failed: false };
  console.warn('[groq] QA fallback: using original introductions for', introductions.length, 'entries');
  return { data: introductions, failed: true };
}

export async function draftIntroductions(performers: { name: string; pieces: string; composers: string }[]): Promise<{ data: string[]; failed: boolean }> {
  if (performers.length === 0) return { data: [], failed: false };
  console.log(`[groq] Draft: ${performers.length} introductions to draft (model: ${MODEL_QA_DRAFT})`);
  const systemPrompt = `You are writing a short programme note for a community piano performance event. You will be given a JSON array of objects, each with a performer name, piece title(s), and composer(s). Write a 2–4 sentence introduction for each from the performer's perspective (first person: "I", "my", "me"). The performer is introducing their own piece to the audience. Use a warm, accessible tone. Return only a JSON array of strings. No explanations.`;

  const response = await callGroq(systemPrompt, JSON.stringify(performers), MODEL_QA_DRAFT);
  const drafts = response ? tryParseJsonArray(response) : null;
  if (drafts && drafts.length === performers.length) {
    return { data: drafts.map((d) => `${d} (drafted by AI)`), failed: false };
  }
  console.warn('[groq] Draft fallback: leaving introductions empty for', performers.length, 'performers');
  if (response) console.warn('[groq] Draft raw response (first 500 chars):', response.slice(0, 500));
  return { data: performers.map(() => ''), failed: true };
}
