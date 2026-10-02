export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';


export function getSessionToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('sessionApiToken');
}

export async function getResponseMessage(response: Response, fallback: string) {
  const body: unknown = await response.json().catch(() => null);
  if (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string') {
    return body.message;
  }
  return fallback;
}
