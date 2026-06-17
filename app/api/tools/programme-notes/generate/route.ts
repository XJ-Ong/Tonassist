import { NextRequest } from 'next/server';
import { redis } from '@/lib/redis';
import { parseExcel } from '@/lib/tools/programme-notes/parse-excel';
import { sortPerformers } from '@/lib/tools/programme-notes/sort-performers';
import { correctMetadata, qaIntroductions, draftIntroductions } from '@/lib/tools/programme-notes/groq';
import { buildPptx } from '@/lib/tools/programme-notes/build-pptx';
import { sanitiseKey } from '@/lib/tools/programme-notes/utils';
import type { PhotoRecord } from '@/lib/tools/programme-notes/utils';

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
    const rawStrings = [...new Set([...sorted.map((p) => p.pieces), ...sorted.map((p) => p.composers)])];
    const corrections = await correctMetadata(rawStrings);
    const corrected = sorted.map((p) => ({ ...p, pieces: corrections.get(p.pieces) ?? p.pieces, composers: corrections.get(p.composers) ?? p.composers }));

    // Step 5: Intro QA
    const nonEmptyIntros = corrected.filter((p) => p.introduction !== '').map((p) => p.introduction);
    const qaResults = await qaIntroductions(nonEmptyIntros);
    let qi = 0;
    for (const p of corrected) {
      if (p.introduction !== '') { p.introduction = qaResults[qi] ?? p.introduction; qi++; }
    }

    // Step 6: Draft empty intros
    const emptyIntroPerformers = corrected.filter((p) => p.introduction === '').map((p) => ({ name: p.name, pieces: p.pieces, composers: p.composers }));
    const drafts = await draftIntroductions(emptyIntroPerformers);
    let di = 0;
    for (const p of corrected) {
      if (p.introduction === '') { p.introduction = drafts[di] ?? ''; di++; }
    }

    // Step 7: Build PPTX
    const bgBuffer = Buffer.from(await backgroundFile.arrayBuffer());
    const bgBase64 = bgBuffer.toString('base64');
    const pptxBuffer = await buildPptx({ performers: corrected, backgroundBase64: bgBase64, edition, date, time, timezone });

    // Step 8: Return — convert to Uint8Array for Response body compatibility
    return new Response(Uint8Array.from(pptxBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="programme-notes-${edition}.pptx"`,
      },
    });
  } catch (error) {
    console.error('[programme-notes:generate] Pipeline failed:', error);
    const message = error instanceof Error ? error.message : 'Unexpected server error';
    return Response.json({ error: message }, { status: 500 });
  }
}
