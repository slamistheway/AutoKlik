export function validateApiOrigin(value: string, production = process.env.NODE_ENV === 'production') {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash || (production && url.protocol !== 'https:')) {
    throw new Error('The API URL must be an origin without credentials or paths; production requires HTTPS.');
  }
  return url.origin;
}

export function publicApiOrigin() {
  const value = process.env.NEXT_PUBLIC_API_URL;
  if (!value && process.env.NODE_ENV === 'production') throw new Error('NEXT_PUBLIC_API_URL is required in production.');
  return validateApiOrigin(value ?? 'http://localhost:3001');
}
