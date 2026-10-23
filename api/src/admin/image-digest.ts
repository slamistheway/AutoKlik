import { createHash } from 'crypto';
import { downloadImage } from '../object-storage';

// Read only validated object keys from our configured bucket.
export async function imageDigest(url: string): Promise<string | null> {
  if (!/^ad-images\/[a-zA-Z0-9_.-]+$/.test(url) || url.includes('..')) return null;
  try {
    const data = await downloadImage(url);
    return createHash('sha256').update(data).digest('hex');
  } catch { return null; }
}
