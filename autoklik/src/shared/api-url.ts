export function validateApiOrigin(value: string, production = process.env.NODE_ENV === 'production') {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash || (production && url.protocol !== 'https:')) {
        throw new Error('API URL must be an origin without credentials or a path; production requires HTTPS.');
    }
    return url.origin;
}

// A deployed browser must never send credentials to the visitor's localhost.
export const API_BASE_URL = validateApiOrigin(process.env.NEXT_PUBLIC_API_URL ?? (
    process.env.NODE_ENV === 'production' ? (() => { throw new Error('NEXT_PUBLIC_API_URL is required in production.'); })() : 'http://localhost:3001'
));
