import { createHash } from 'crypto';
import { createReadStream } from 'fs';
import { lstat } from 'fs/promises';
import { join } from 'path';

// Hash local uploads only. Never fetch seller-provided URLs or traverse directories.
export async function imageDigest(url: string): Promise<string | null> {
  if (!/^ad-images\/[a-zA-Z0-9_.-]+$/.test(url) || url.includes('..')) return null;
  try {
    const path = join(process.cwd(), 'public', url);
    const file = await lstat(path);
    if (!file.isFile() || file.isSymbolicLink() || file.size > 20 * 1024 * 1024) return null;
    const digest = createHash('sha256');
    for await (const chunk of createReadStream(path)) digest.update(chunk);
    return digest.digest('hex');
  } catch { return null; }
}
