import { NextRequest } from 'next/server';
import { redis } from '@/lib/redis';
import { parseExcel } from '@/lib/tools/programme-notes/parse-excel';
import { sortPerformers } from '@/lib/tools/programme-notes/sort-performers';
import { correctMetadata, qaIntroductions, draftIntroductions } from '@/lib/tools/programme-notes/groq';
import { buildPptx } from '@/lib/tools/programme-notes/build-pptx';
import { sanitiseKey } from '@/lib/tools/programme-notes/utils';
import type { PhotoRecord } from '@/lib/tools/programme-notes/utils';

interface CorrectionEntry {
  performer: string;
  field: 'composer' | 'piece';
  original: string;
  corrected: string;
}

interface QaSentenceChange {
  original: string;
  corrected: string;
}

interface QaEntry {
  performer: string;
  changes: QaSentenceChange[];
}

interface DraftEntry {
  performer: string;
  text: string;
}

interface GroqReport {
  corrections: CorrectionEntry[];
  qa: QaEntry[];
  drafts: DraftEntry[];
  failed: string[];
}

function splitSentences(text: string): string[] {
  return text.match(/[^.!?]+[.!?]+[\s]*/g) || [text];
}

function diffSentences(original: string, corrected: string): QaSentenceChange[] {
  const origParts = splitSentences(original);
  const corrParts = splitSentences(corrected);
  const changes: QaSentenceChange[] = [];
  const maxLen = Math.max(origParts.length, corrParts.length);
  for (let i = 0; i < maxLen; i++) {
    const o = (origParts[i] ?? '').trim();
    const c = (corrParts[i] ?? '').trim();
    if (o !== c && (o || c)) {
      changes.push({ original: o, corrected: c });
    }
  }
  return changes;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const xlsxFile = formData.get('xlsx') as File | null;
    const backgroundFile = formData.get('background') as File | null;
    const edition = formData.get('edition') as string | null;
    const date = formData.get('date') as string | null;
    const time = formData.get('time') as string | null;
    const timezone = (formData.get('timezone') as string) || 'UTC+8';

    if (!xlsxFile || !backgroundFile || !edition || !date || !time) {
      return Response.json({ error: 'Missing required fields: xlsx, background, edition, date, and time are all required.' }, { status: 400 });
    }
    if (!xlsxFile.name.endsWith('.xlsx')) {
      return Response.json({ error: 'Invalid file type. Please upload an .xlsx file.' }, { status: 400 });
    }
    if (backgroundFile.size > 4.5 * 1024 * 1024) {
      return Response.json({ error: 'Background image too large. Maximum 4.5MB.' }, { status: 400 });
    }

    // Step 1: Parse Excel
    const rawPerformers = await parseExcel(await xlsxFile.arrayBuffer());

    // Step 2: Profile picture lookup
    const performersWithPhotos: { name: string; pieces: string; composers: string; duration: number; orderPreference: number; introduction: string; photoBase64: string }[] = [];
    const missingPhotos: string[] = [];
    for (const performer of rawPerformers) {
      const raw = await redis.get<string>(`programme-notes:photo:${sanitiseKey(performer.name)}`);
      if (!raw) missingPhotos.push(performer.name);
      else {
        const { base64 } = JSON.parse(raw) as PhotoRecord;
        performersWithPhotos.push({ ...performer, photoBase64: base64 });
      }
    }
    if (missingPhotos.length > 0) {
      return Response.json({ error: 'Missing profile photos for one or more performers.', missing: missingPhotos }, { status: 400 });
    }

    // Step 3: Sort
    const sorted = sortPerformers(performersWithPhotos);

    // Step 4: AI Correction
    const uniquePairs = new Map<string, { composer: string; piece: string }>();
    for (const p of sorted) {
      const key = `${p.composers.trim().toLowerCase()}|${p.pieces.trim().toLowerCase()}`;
      if (!uniquePairs.has(key)) uniquePairs.set(key, { composer: p.composers, piece: p.pieces });
    }
    const correctionResult = await correctMetadata([...uniquePairs.values()]);
    const corrected = sorted.map((p) => {
      const key = `${p.composers.trim().toLowerCase()}|${p.pieces.trim().toLowerCase()}`;
      const correctedPair = correctionResult.data.get(key);
      return { ...p, pieces: correctedPair?.piece ?? p.pieces, composers: correctedPair?.composer ?? p.composers };
    });

    // Step 5: Intro QA
    const nonEmptyIntros = corrected.filter((p) => p.introduction !== '').map((p) => p.introduction);
    const qaResult = await qaIntroductions(nonEmptyIntros);
    let qi = 0;
    for (const p of corrected) {
      if (p.introduction !== '') { p.introduction = qaResult.data[qi] ?? p.introduction; qi++; }
    }

    // Step 6: Draft empty intros
    const emptyIntroPerformers = corrected.filter((p) => p.introduction === '').map((p) => ({ name: p.name, pieces: p.pieces, composers: p.composers }));
    const draftResult = await draftIntroductions(emptyIntroPerformers);
    let di = 0;
    for (const p of corrected) {
      if (p.introduction === '') { p.introduction = draftResult.data[di] ?? ''; di++; }
    }

    // Step 7: Build PPTX
    const bgBuffer = Buffer.from(await backgroundFile.arrayBuffer());
    const bgBase64 = bgBuffer.toString('base64');
    const pptxBuffer = await buildPptx({ performers: corrected, backgroundBase64: bgBase64, edition, date, time, timezone });

    // Step 8: Build report
    const report: GroqReport = { corrections: [], qa: [], drafts: [], failed: [] };

    for (const p of sorted) {
      const correctedP = corrected.find((c) => c.name === p.name);
      if (!correctedP) continue;
      if (p.composers !== correctedP.composers) {
        report.corrections.push({ performer: p.name, field: 'composer', original: p.composers, corrected: correctedP.composers });
      }
      if (p.pieces !== correctedP.pieces) {
        report.corrections.push({ performer: p.name, field: 'piece', original: p.pieces, corrected: correctedP.pieces });
      }
    }

    let qai = 0;
    for (const p of sorted) {
      if (p.introduction !== '') {
        const original = p.introduction;
        const qaCorrected = qaResult.data[qai] ?? original;
        const changes = diffSentences(original, qaCorrected);
        if (changes.length > 0) {
          report.qa.push({ performer: p.name, changes });
        }
        qai++;
      }
    }

    let drafti = 0;
    for (const p of sorted) {
      if (p.introduction === '') {
        const drafted = draftResult.data[drafti] ?? '';
        if (drafted) {
          report.drafts.push({ performer: p.name, text: drafted });
        }
        drafti++;
      }
    }

    if (correctionResult.failed) report.failed.push('correction');
    if (qaResult.failed) report.failed.push('qa');
    if (draftResult.failed) report.failed.push('draft');

    // Step 9: Return
    const headers = new Headers({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'Content-Disposition': `attachment; filename="programme-notes-${edition}.pptx"`,
    });
    headers.set('X-Groq-Report', Buffer.from(JSON.stringify(report)).toString('base64'));

    return new Response(Uint8Array.from(pptxBuffer), { status: 200, headers });
  } catch (error) {
    console.error('[programme-notes:generate] Pipeline failed:', error);
    const message = error instanceof Error ? error.message : 'Unexpected server error';
    return Response.json({ error: message }, { status: 500 });
  }
}
