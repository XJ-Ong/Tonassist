import { redis } from '@/lib/redis';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';
const TIMEOUT_MS = 30_000;
const normalise = (s: string) => s.trim().toLowerCase();

interface GroqResponse {
  choices: { message: { content: string } }[];
}

async function callGroq(systemPrompt: string, userMessage: string): Promise<string | null> {
  try {
    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
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
  if (arrayStart > 0) s = s.slice(arrayStart);
  return s.trim();
}

export async function correctMetadata(rawStrings: string[]): Promise<Map<string, string>> {
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

  if (uncached.length === 0) return results;

  const systemPrompt = `You are a classical music metadata expert. You will be given a JSON array of strings, each being a composer name or piece title as entered by a non-expert user. Return a JSON array of the same length with each string corrected to its canonical form:
- Expand abbreviated composer names to their full conventional English form (e.g. "E.Grieg" → "Edvard Grieg", "F. Chopin" → "Frédéric Chopin", "J.S. Bach" → "Johann Sebastian Bach").
- Fix obvious spelling errors in piece titles and composer names.
- Preserve the original language of piece titles — do not translate them.
- If you are not certain about a correction, return the original string unchanged.
- Return only the JSON array. No explanations.`;

  const response = await callGroq(systemPrompt, JSON.stringify(uncached.map((u) => u.raw)));

  if (response) {
    try {
      const corrected: string[] = JSON.parse(stripJsonFences(response));
      if (Array.isArray(corrected) && corrected.length === uncached.length) {
        for (let i = 0; i < uncached.length; i++) {
          results.set(uncached[i].raw, corrected[i]);
        }
        await Promise.all(
          uncached.map((u, i) =>
            redis.set(`programme-notes:correction:${normalise(u.raw)}`, corrected[i])
          )
        );
        return results;
      }
    } catch (error) {
      console.error('[groq] Failed to parse correction response:', error);
    }
  }

  console.warn('[groq] Correction fallback: using raw strings for', uncached.length, 'entries');
  for (const u of uncached) results.set(u.raw, u.raw);
  return results;
}

export async function qaIntroductions(introductions: string[]): Promise<string[]> {
  if (introductions.length === 0) return [];
  const systemPrompt = `You are a copy editor. You will be given a JSON array of short music programme note texts written by non-expert users. For each text, fix spelling errors, grammar issues, punctuation mistakes, and improper casing. Do not change meaning, style, or voice. Do not add or remove sentences. Return unchanged text if no issues found. Return only a JSON array of the same length. No explanations.`;

  const response = await callGroq(systemPrompt, JSON.stringify(introductions));
  if (response) {
    try {
      const corrected: string[] = JSON.parse(stripJsonFences(response));
      if (Array.isArray(corrected) && corrected.length === introductions.length) return corrected;
    } catch (error) {
      console.error('[groq] Failed to parse QA response:', error);
    }
  }
  console.warn('[groq] QA fallback: using original introductions for', introductions.length, 'entries');
  return introductions;
}

export async function draftIntroductions(performers: { name: string; pieces: string; composers: string }[]): Promise<string[]> {
  if (performers.length === 0) return [];
  const systemPrompt = `You are writing short programme notes for a community piano performance event. You will be given a JSON array of objects, each with a performer name, piece title(s), and composer(s). Write a 2–4 sentence programme note for each that briefly introduces the piece and composer. Use a warm, accessible tone for a general music-loving audience. Return only a JSON array of strings. No explanations.`;

  const response = await callGroq(systemPrompt, JSON.stringify(performers));
  if (response) {
    try {
      const drafts: string[] = JSON.parse(stripJsonFences(response));
      if (Array.isArray(drafts) && drafts.length === performers.length) {
        return drafts.map((d) => `${d} (drafted by AI)`);
      }
    } catch (error) {
      console.error('[groq] Failed to parse draft response:', error);
    }
  }
  console.warn('[groq] Draft fallback: leaving introductions empty for', performers.length, 'performers');
  return performers.map(() => '');
}
