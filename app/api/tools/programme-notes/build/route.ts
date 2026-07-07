import { NextRequest } from 'next/server';
import { redis } from '@/lib/redis';
import { buildPptx } from '@/lib/tools/programme-notes/build-pptx';
import { sanitiseKey } from '@/lib/tools/programme-notes/utils';
import type { PhotoRecord } from '@/lib/tools/programme-notes/utils';
import type { StylingConfig } from '@/types/programme-notes';

interface BuildPerformer {
  name: string;
  pieces: string;
  composers: string;
  introduction: string;
}

function isValidStyling(obj: unknown): obj is StylingConfig {
  if (typeof obj !== 'object' || obj === null) return false;
  const s = obj as Record<string, unknown>;
  if (!s.cover || !s.performanceOrder || !s.individual) return false;
  const cover = s.cover as Record<string, unknown>;
  const po = s.performanceOrder as Record<string, unknown>;
  const ind = s.individual as Record<string, unknown>;
  return (
    typeof cover.title === 'object' && cover.title !== null &&
    typeof cover.subtitle === 'object' && cover.subtitle !== null &&
    typeof cover.date === 'object' && cover.date !== null &&
    typeof cover.time === 'object' && cover.time !== null &&
    typeof po.name === 'object' && po.name !== null &&
    typeof po.composerPiece === 'object' && po.composerPiece !== null &&
    typeof ind.name === 'object' && ind.name !== null &&
    typeof ind.composer === 'object' && ind.composer !== null &&
    typeof ind.piece === 'object' && ind.piece !== null &&
    typeof ind.introduction === 'object' && ind.introduction !== null
  );
}

function isValidPerformers(arr: unknown): arr is BuildPerformer[] {
  if (!Array.isArray(arr) || arr.length === 0) return false;
  return arr.every(
    (p) =>
      typeof p === 'object' && p !== null &&
      typeof (p as Record<string, unknown>).name === 'string' &&
      typeof (p as Record<string, unknown>).pieces === 'string' &&
      typeof (p as Record<string, unknown>).composers === 'string' &&
      typeof (p as Record<string, unknown>).introduction === 'string'
  );
}

function isValidAiReport(obj: unknown): obj is Record<string, unknown> {
  return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const backgroundFile = formData.get('background') as File | null;
    const performersJson = formData.get('performers') as string | null;
    const stylingJson = formData.get('styling') as string | null;
    const edition = formData.get('edition') as string | null;
    const date = formData.get('date') as string | null;
    const time = formData.get('time') as string | null;
    const timezone = (formData.get('timezone') as string) || 'UTC+8';
    const aiReportJson = formData.get('aiReport') as string | null;

    if (!backgroundFile || !performersJson || !stylingJson || !edition || !date || !time) {
      return Response.json({ error: 'Missing required fields: background, performers, styling, edition, date, and time are all required.' }, { status: 400 });
    }
    if (backgroundFile.size > 4.5 * 1024 * 1024) {
      return Response.json({ error: 'Background image too large. Maximum 4.5MB.' }, { status: 400 });
    }

    let performers: BuildPerformer[];
    try {
      performers = JSON.parse(performersJson);
    } catch {
      return Response.json({ error: 'Invalid performers JSON.' }, { status: 400 });
    }
    if (!isValidPerformers(performers)) {
      return Response.json({ error: 'Invalid performers shape: each performer must have name, pieces, composers, and introduction as strings.' }, { status: 400 });
    }

    let styling: StylingConfig;
    try {
      styling = JSON.parse(stylingJson);
    } catch {
      return Response.json({ error: 'Invalid styling JSON.' }, { status: 400 });
    }
    if (!isValidStyling(styling)) {
      return Response.json({ error: 'Invalid styling shape: expected cover, performanceOrder, and individual sections with TextStyle fields.' }, { status: 400 });
    }

    let aiReport: object | null = null;
    if (aiReportJson) {
      try {
        aiReport = JSON.parse(aiReportJson);
      } catch {
        return Response.json({ error: 'Invalid aiReport JSON.' }, { status: 400 });
      }
      if (!isValidAiReport(aiReport)) {
        return Response.json({ error: 'Invalid aiReport shape: expected a JSON object.' }, { status: 400 });
      }
    }

    // Re-fetch photos from Redis
    const performersWithPhotos: { name: string; pieces: string; composers: string; introduction: string; photoBase64: string }[] = [];
    const missingPhotos: string[] = [];
    for (const performer of performers) {
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

    // Build PPTX
    const bgBuffer = Buffer.from(await backgroundFile.arrayBuffer());
    const bgBase64 = bgBuffer.toString('base64');
    const pptxBuffer = await buildPptx({ performers: performersWithPhotos, backgroundBase64: bgBase64, edition, date, time, timezone, styling });

    // Return binary with headers
    const headers = new Headers({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'Content-Disposition': `attachment; filename="programme-notes-${edition}.pptx"`,
    });
    if (aiReport) {
      headers.set('X-Ai-Report', Buffer.from(JSON.stringify(aiReport)).toString('base64'));
    }

    return new Response(Uint8Array.from(pptxBuffer), { status: 200, headers });
  } catch (error) {
    console.error('[programme-notes:build] Pipeline failed:', error);
    const message = error instanceof Error ? error.message : 'Unexpected server error';
    return Response.json({ error: message }, { status: 500 });
  }
}
