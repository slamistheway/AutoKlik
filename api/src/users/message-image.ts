import {BadRequestException} from '@nestjs/common';

export const MAX_MESSAGE_IMAGE_SIZE = 5 * 1024 * 1024;
export type MessageImageUpload = {buffer: Buffer; size: number};

export function validateMessageImage(image: MessageImageUpload): string {
  if (!Buffer.isBuffer(image.buffer) || !image.buffer.length || image.buffer.length > MAX_MESSAGE_IMAGE_SIZE) {
    throw new BadRequestException('Slika mora biti manja od 5 MB.');
  }
  const data = image.buffer;
  if (data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (data.length >= 3 && data[0] === 255 && data[1] === 216 && data[2] === 255) return 'image/jpeg';
  if (data.length >= 12 && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  throw new BadRequestException('Podržane su samo JPEG, PNG i WebP slike.');
}
