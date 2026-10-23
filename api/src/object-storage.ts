import { BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';

export type ImageFolder = 'ad-images' | 'pfp';

function location(path: string) {
  const match = /^(ad-images|pfp)\/([a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp))$/.exec(path);
  if (!match) throw new BadRequestException('Neispravna putanja slike.');
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!base || !key) throw new ServiceUnavailableException('Supabase Storage nije konfiguriran.');
  const origin = new URL(base);
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/') {
    throw new ServiceUnavailableException('Neispravan SUPABASE_URL.');
  }
  const bucket = match[1] === 'ad-images'
    ? process.env.SUPABASE_AD_IMAGES_BUCKET || 'ad-images'
    : process.env.SUPABASE_AVATARS_BUCKET || 'avatars';
  return { url: `${origin.origin}/storage/v1/object/${encodeURIComponent(bucket)}/${match[2]}`, bucketUrl: `${origin.origin}/storage/v1/object/${encodeURIComponent(bucket)}`, filename: match[2], key };
}

async function storageRequest(path: string, method: 'GET' | 'POST' | 'DELETE', body?: Buffer, mimeType?: string) {
  const { url, bucketUrl, filename, key } = location(path);
  let response: Response;
  try {
    response = await fetch(method === 'DELETE' ? bucketUrl : url, {
      method,
      headers: { apikey: key, ...(!key.startsWith('sb_secret_') ? { Authorization: `Bearer ${key}` } : {}), ...(method === 'DELETE' ? { 'Content-Type': 'application/json' } : mimeType ? { 'Content-Type': mimeType, 'x-upsert': 'false' } : {}) },
      body: method === 'DELETE' ? JSON.stringify({ prefixes: [filename] }) : body ? new Uint8Array(body) : undefined,
      signal: AbortSignal.timeout(30000),
      redirect: 'error',
    });
  } catch {
    throw new ServiceUnavailableException('Supabase Storage nije dostupan.');
  }
  if (response.status === 404 || (!response.ok && await response.clone().json().then(value => String(value.statusCode) === '404', () => false))) {
    if (method === 'DELETE') return response;
    throw new NotFoundException('Slika nije pronađena.');
  }

  if (!response.ok) {
    const details = await response.text();
    console.error('Supabase Storage error:', {
      method,
      status: response.status,
      details,
    });

    throw new ServiceUnavailableException(
        'Supabase Storage zahtjev nije uspio.',
    );
  }

  return response;
}

export async function uploadImage(path: string, data: Buffer, mimeType: string) {
  await storageRequest(path, 'POST', data, mimeType);
}

export async function downloadImage(path: string): Promise<Buffer> {
  const response = await storageRequest(path, 'GET');
  return Buffer.from(await response.arrayBuffer());
}

export async function deleteImage(path: string) {
  await storageRequest(path, 'DELETE');
}
