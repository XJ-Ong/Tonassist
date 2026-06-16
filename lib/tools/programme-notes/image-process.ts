import { Jimp } from 'jimp';

const SIZE = 400;

export async function processProfilePhoto(inputBuffer: Buffer): Promise<string> {
  const image = await Jimp.read(inputBuffer);
  image.cover({ w: SIZE, h: SIZE });
  const outputBuffer = await image.getBuffer('image/jpeg', { quality: 80 });
  return outputBuffer.toString('base64');
}
