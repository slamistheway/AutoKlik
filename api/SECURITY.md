# API security configuration

Production requires `NODE_ENV=production`, an HTTPS `FRONTEND_URL`, and an HTTPS
`ADMIN_URL` if the admin app is deployed. These values must be origins, without
paths, query strings, or credentials. CORS, browser mutation checks, and Better
Auth use the same allowlist. Keep `BETTER_AUTH_URL` set to the public HTTPS API URL.

Cookie-authenticated mutations require an allowed `Origin` header. Bearer clients
can omit Origin; supplying an untrusted Origin is rejected. Keep authentication
secrets and the existing persistent message encryption key outside source control.

Ad and profile uploads accept JPEG, PNG, and WebP signatures, with a 5 MB limit per
file. Files are staged outside the public directory and published under random,
server-generated names and extensions. Signature checks do not replace a full
image decoder or malware scanner. Previously uploaded files are not modified by
this change. Use durable upload storage in production.

JSON and URL-encoded requests are limited to 64 KB. Sensitive responses disable
caching; API and static responses include no-sniff and restrictive content headers.
HTTPS requests receive HSTS. Behind a TLS-terminating proxy, configure trusted
proxy addresses for your actual hosting topology before relying on forwarded IPs
or protocol headers. The API does not blindly trust forwarded headers.

Run `npm run build`, `npm test -- --runInBand`, and `npm audit --omit=dev` before
deployment. Drizzle Kit is a development dependency: migration jobs need dev
dependencies installed. This hardening does not apply migrations, rotate keys,
change staff assignments, or enable admin two-factor authentication.
