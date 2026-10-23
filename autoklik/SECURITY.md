# Customer frontend security

Set `NEXT_PUBLIC_API_URL` to the API's HTTPS origin before a production build
(for example, `https://api.example.com`). Production refuses missing, insecure,
credential-bearing or path-bearing API URLs. Restart development after upgrading
Next.js or changing its configuration. API and admin code are separate projects.

The app sets CSP, framing, MIME-sniffing, referrer and browser-permission headers.
Production also enables HSTS. CSP allows inline Next.js bootstrap scripts for
compatibility with the existing static and Pages Router routes; it is not a strict
nonce-based XSS policy. Production disables eval and inline script attributes.
External API connections use the configured origin; OpenStreetMap frames remain
allowed. Ad descriptions and messages remain React text, and JSON-LD text is escaped.

Protected-page guards verify the session with the API. Backend permission checks
remain authoritative. The current bearer session cookie is still JavaScript-readable:
client code cannot make it HttpOnly. Removing that exposure requires a coordinated
server-managed cookie or backend-for-frontend session flow. Secure cookies on HTTPS,
a bounded lifetime and removing sensitive console logging reduce exposure without
claiming to eliminate it. Never put secrets in `NEXT_PUBLIC_*` variables.

Run `npm run test:security`, focused ESLint, `npx tsc --noEmit`, and
`npm audit --omit=dev`. Existing helper modules inside `src/pages/checkout/lib/`
and `src/pages/myProfile/account-api.ts` currently cause Next route-validation
errors; resolve those separately before a production deployment.
