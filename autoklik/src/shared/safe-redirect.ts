export function safeReturnUrl(value: unknown): string {
    if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020\u007f]/.test(value)) return '/';
    try {
        const base = 'https://autoklik.invalid';
        const url = new URL(value, base);
        // Check decoded paths too: routers can decode escaped separators.
        if (url.origin !== base) return '/';
        let decoded = url.pathname;
        for (let depth = 0; depth < 5; depth++) {
            decoded = decodeURIComponent(decoded);
            if (decoded.startsWith('//') || /[\\\u0000-\u0020\u007f]/.test(decoded)) return '/';
            if (!decoded.includes('%')) break;
            if (depth === 4) return '/';
        }
        return `${url.pathname}${url.search}${url.hash}`;
    } catch { return '/'; }
}
