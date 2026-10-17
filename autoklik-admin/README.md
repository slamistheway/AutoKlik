# AutoKlik Admin

Live staff dashboard and ad moderation using the existing NestJS API and PostgreSQL database. New ads still publish immediately. Paid promotion is deferred.

## Run

Start the API from `api` with `npm run start:dev`. Start this app with `npm run dev -- --port 3003` and open http://localhost:3003.

The browser API base defaults to http://localhost:3001. Set `NEXT_PUBLIC_API_URL` before building to change it. Set API `ADMIN_URL` to the admin origin (default http://localhost:3003) for CORS and authentication origin checks. Keep existing authentication and encryption environment variables configured. No new dependencies are required.

## Database activation

Review migrations `0016_admin_moderation.sql` through `0019_erasure_file_cleanup.sql` in `api/drizzle`. Apply migrations using the project's normal Drizzle migration process after confirming the target database and pending migrations. Back up the target before deployment. The implementation has been tested in a separate transactional schema; application tables have not been migrated by this change.

Every existing and newly registered account defaults to `user`. After identifying an existing account and obtaining approval, assign its `users.role` to `admin` or `moderator` using a parameterized database operation. No first account is automatically promoted and there is no public role-assignment endpoint. Both staff roles can moderate ads and ordinary user/dealer accounts. Only admins can assign roles, require a password reset, erase accounts, change blocklists, resolve escalated reports or decide appeals. Moderators cannot change staff accounts; staff cannot change their own access, and an active admin must remain. Role revocation is checked on every API request.

Do not launch the updated API against an unmigrated database: ad and user queries now reference the new columns. Restart the API after migration.

## Included

- Real totals, new ads/users/messages, active ads, sold/expired counts, hourly/day/week/month views, recent staff activity, pending ads, open reports, reported messages and recent registrations. Charts group by UTC; creation timestamps respect the database timezone. A day shows 24 hourly buckets, a week 7 daily buckets, and a month 30 daily buckets, including the current bucket.
- Search ads by ID, title, VIN or seller; filter status, brand, seller, dates and open reports. Server pagination uses 25 ads per page.
- Approve, reject, request changes, remove, restore and place an ad in the review queue; required reasons and destructive-action confirmations; atomic bulk approve/remove. Putting an ad into review hides it. New ads are never put into review automatically.
- Persistent details drawer with all editable ad fields, feature/pin controls, photo removal, seller's other ads, report history and decisions. Edit/photo operations reject stale versions. Removal hides an ad; restoration renews an expired ad for the existing 3-day period. Owners cannot override a staff restriction through their status endpoint, but can edit the ad to address requested changes.
- Pins sort first in the public newest-ad listing and the featured listing. A pin does not make an ineligible ad public.
- Duplicate VIN and identical-file SHA-256 detection, with an indexing action for old local uploads. It does not detect visually similar/recompressed/cropped images. External, missing, symlinked or oversized files are skipped and reported as unindexed; no external URLs are fetched.
- Persisted reports and resolve/dismiss notes. Report intake: authenticated `POST /reports` with `{ "targetType": "ad" | "user" | "message", "targetId": 123, "reason": "..." }`. A message reporter must participate in its conversation. Public report controls exist on ad and seller pages and received chat messages. New messages are checked for risky payment requests, credential requests, shortened links and suspicious URL hosts. Signals create reports without automatically rejecting messages or punishing accounts. Historical encrypted messages are not scanned. Staff can open only a reported message, with a required reason and a transactional access audit. The endpoint does not expose unrelated conversation messages or attachments.
- Transactional audit records with actor, time, reason and before/after values. Photo removal detaches the database image row and updates the preview; it does not erase files from disk or CDN caches.

## User management and safety

- The user screen now reads live records with search, role/status/dealer/date filters and 25-row pagination. Profile drawers show ad/message/report counts, confirmed violations, sanctions, ads, report history, login/logout history, session metadata and staff decisions. Passwords and session tokens are never returned.
- Suspension and bans revoke sessions and are checked during new sign-ins and authenticated requests. Public ads from restricted sellers are hidden through query eligibility; their stored ad status is preserved for reactivation. Registration and authentication enforce normalized exact-match email/phone/IP blocklists. IPv4-mapped IPv6 addresses and formatted phone numbers are normalized; CIDR blocks are not supported.
- Force-reset revokes sessions and requires the user to complete the existing email password-reset flow. It does not send an unsolicited email; successful reset clears the requirement. Existing email-provider configuration is still required for that recovery flow.
- Seller verification, badges, database roles and dealer approval/profile edits are persistent. Users submit business profiles at /dealer-application; approval exposes business details and dealer badges on the public seller profile. Editing an approved business profile puts it back into review.
- Reports support escalation and required resolution notes, optional confirmed-violation marking and an atomic hide-ad-and-resolve action. Repeat-offender lists count at least two confirmed violations, not unverified reports. Queue shortcuts include open and escalated reports.
- Banned/suspended users can submit a password-verified appeal at /appeal without starting a session. Appeals are rate-limited; admins accept or reject with a note. Acceptance removes the account restriction, while independent blocklists and password-reset requirements still apply.
- Admin erasure requires a reason, current version and exact username confirmation. It removes identity/authentication records, ads/drafts/saves and authored message content/attachments, while retaining an anonymous relational user row and other participants' messages. Linked reports/audit snapshots are scrubbed. Local uploaded photos/avatars that are no longer referenced are queued for cleanup. Shared files are preserved; filesystem failures remain queued and can be retried from Safety > Blocklists. Backups, CDN caches and unrelated external logs are outside this application workflow.
- No source database migration, real account restriction, role promotion, deletion or email delivery was performed during development. Tests use an isolated schema and explicitly mock upload-file deletion. Browser checks use a fixture-only login and do not test the password provider itself.

The unused authentication example remains unconnected.

## Limits

Historical sale timestamps were never stored and are not fabricated. Sales are tracked from new status changes onward. Expiry counts describe currently expired ads whose deadline falls inside the selected period; renewing an ad removes it from that count. The total user metric excludes anonymous erased-account tombstones. It remains distinct from a count of active accounts.

Report/activity views show up to 100 records, seller context up to 50 ads and new-user context up to 20 users; queue counts cover all matching records. Duplicate matches show up to 100 candidates.

## Verification

- `npm run lint`, `npx tsc --noEmit`, `npm run build` in this app.
- `npm run build` and focused Jest tests in `api`.
- `node test/admin.integration.cjs` from `api`: requires a local PostgreSQL URL and local socket access. Creates a uniquely named schema inside a transaction, verifies migrations and HTTP permission checks, ad/user moderation, filters, duplicates, photos, reports, periods, session enforcement, blocklists, appeals, encrypted scam detection, logged message review, erasure and audit records, then rolls everything back. Does not alter application tables.
- Optional `node test/admin.integration.cjs --ui` exposes a test-only API at 127.0.0.1:3012 for two minutes. Its fixture login is deliberately mocked; this is not a production entry point. Use a separate admin dev server with `ADMIN_BUILD_DIR=.next-admin-check`, `NEXT_PUBLIC_API_URL=http://127.0.0.1:3012`, port 3003. The separate directory leaves an existing dev server alone.

Current repository-wide checks also expose unrelated existing failures: the API registration validation test expects `password: "short"` to fail in `validateInput`, while the current registration path validates passwords in its service; the main frontend TypeScript check reports six generated Pages Router validator errors for checkout library files and `myProfile/account-api`. The focused admin checks and isolated integration check pass. The existing owner photo editor has a Next.js image warning.
