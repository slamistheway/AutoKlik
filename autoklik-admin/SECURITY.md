# Admin security

Admin login now runs through `/api/session`. The server verifies `/admin/me`
before issuing a host-only, HttpOnly, SameSite=Strict cookie. Production adds
Secure and the `__Host-` prefix. Browser JavaScript receives the staff role, never
the API bearer token. Legacy sessionStorage tokens are removed, so staff must
sign in again after this change. The backend remains responsible for permissions.
Existing API sessions are not bulk-revoked by this frontend migration.

The cookie has a 30-minute absolute lifetime. The UI signs out after 15 minutes
without pointer, keyboard, touch or wheel activity and checks staff access every
30 seconds and when the tab becomes visible. Background timers may be delayed by
the browser; the cookie lifetime is the server-enforced limit. Cookie expiry does
not shorten the API's own session lifetime. Logout attempts API revocation and
clears the cookie even when the upstream API is unavailable. Failed revocation is
reported; the remote session can remain valid until its backend expiry.

The server proxy only forwards `/admin/` routes to the configured API origin. It
blocks redirects and cross-site mutations, limits JSON to 64 KB, strips upstream
cookies, hides unexpected server error details and disables response caching.
Browser requests use same-origin cookies, not Authorization headers. API login
rate limits still apply; the API sees the admin server's IP unless you configure
trusted-proxy handling for your hosting topology. Do not trust arbitrary forwarded
IP headers.

Production requires an HTTPS `NEXT_PUBLIC_API_URL` origin for public ad images.
An optional HTTPS `API_URL` can select the upstream server origin. Set
`ADMIN_ORIGIN=https://admin.example.com` to the actual admin origin when deploying
behind a reverse proxy, so mutation-origin checks use your public URL. No API keys
or session secrets belong in `NEXT_PUBLIC_*` variables. The app must run with a
Next.js server; static export cannot provide these auth routes.

Security headers block framing, embedded objects, inline event handlers and
third-party script/connection origins. Inline Next bootstrap scripts/styles remain
allowed for the existing rendering model; this is not a strict nonce-based CSP.
These changes do not add MFA or replace backend authorization, an access gateway,
or staff audit logs.

Checks: `npm run test:security`, `npx tsc --noEmit`, `npm run lint`,
`npm run build` with production URLs configured, and `npm audit --omit=dev`.
