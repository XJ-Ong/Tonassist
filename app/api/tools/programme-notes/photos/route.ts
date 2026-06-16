import { NextRequest } from 'next/server';
import { redis } from '@/lib/redis';
import { processProfilePhoto } from '@/lib/tools/programme-notes/image-process';
import { sanitiseKey } from '@/lib/tools/programme-notes/utils';

export async function GET() {
  try {
    const keys: string[] = [];
    let cursor: string | undefined;
    do {
      const result = await redis.scan(cursor ?? 0, { match: 'programme-notes:photo:*', count: 100 });
      cursor = result[0] as unknown as string;
      keys.push(...(result[1] as string[]));
    } while (cursor && cursor !== '0');

    if (keys.length === 0) return Response.json({ photos: [] });

    const raws = await redis.mget<string[]>(...keys);
    const photos = raws
      .filter((raw): raw is string => raw !== null)
      .map((raw) => {
        const { name, base64 } = JSON.parse(raw);
        return { name, base64: `data:image/jpeg;base64,${base64}` };
      });
    return Response.json({ photos });
  } catch (error) {
    console.error('[programme-notes:photos] GET failed:', error);
    return Response.json({ error: 'Failed to fetch photos' }, { status: 500 });
  }
}

const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10MB

function validatePhoto(photo: File): string | null {
  if (!photo.type.startsWith('image/')) return 'Photo must be an image file.';
  if (photo.size > MAX_PHOTO_SIZE) return 'Photo too large. Maximum 10MB.';
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const name = formData.get('name') as string | null;
    const photo = formData.get('photo') as File | null;
    if (!name || !photo) {
      return Response.json({ error: 'Missing required fields: name and photo are required.' }, { status: 400 });
    }
    const validationError = validatePhoto(photo);
    if (validationError) {
      return Response.json({ error: validationError }, { status: 400 });
    }
    const buffer = Buffer.from(await photo.arrayBuffer());
    const base64 = await processProfilePhoto(buffer);
    await redis.set(`programme-notes:photo:${sanitiseKey(name)}`, JSON.stringify({ name, base64 }));
    return Response.json({ name, base64: `data:image/jpeg;base64,${base64}` }, { status: 201 });
  } catch (error) {
    console.error('[programme-notes:photos] POST failed:', error);
    return Response.json({ error: 'Failed to upload photo' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const formData = await request.formData();
    const name = formData.get('name') as string | null;
    const photo = formData.get('photo') as File | null;
    if (!name || !photo) {
      return Response.json({ error: 'Missing required fields: name and photo are required.' }, { status: 400 });
    }
    const validationError = validatePhoto(photo);
    if (validationError) {
      return Response.json({ error: validationError }, { status: 400 });
    }
    const buffer = Buffer.from(await photo.arrayBuffer());
    const base64 = await processProfilePhoto(buffer);
    await redis.set(`programme-notes:photo:${sanitiseKey(name)}`, JSON.stringify({ name, base64 }));
    return Response.json({ name, base64: `data:image/jpeg;base64,${base64}` });
  } catch (error) {
    console.error('[programme-notes:photos] PUT failed:', error);
    return Response.json({ error: 'Failed to update photo' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { name } = await request.json();
    if (!name) return Response.json({ error: 'Missing required field: name.' }, { status: 400 });
    await redis.del(`programme-notes:photo:${sanitiseKey(name)}`);
    return Response.json({ ok: true });
  } catch (error) {
    console.error('[programme-notes:photos] DELETE failed:', error);
    return Response.json({ error: 'Failed to delete photo' }, { status: 500 });
  }
}
