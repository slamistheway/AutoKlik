# Application table RLS

All 24 tables in `src/db/schema.ts` enable RLS. There are no direct-client
policies: access goes through NestJS and its Better Auth sessions, participant
checks, ownership checks, and staff guards. Supabase Auth UUID ownership policies
would not match this application's numeric user IDs.

The API connection must be the table owner or a role with BYPASSRLS. RLS is not
forced on owners. This preserves the current server access model; it does not
add per-user isolation to privileged API queries. Never expose DATABASE_URL or
server credentials to clients. Keep the Supabase Data API disabled if unused.

## Apply to an existing database

Review the target project and run `sql/enable-rls.sql` in its Supabase SQL Editor.
It changes RLS flags on application tables only, in one transaction. It does not
change Supabase-managed `auth` or `storage` tables, delete rows, or create client
access policies. All application tables must exist before running it.

For the existing Drizzle push workflow, `npx drizzle-kit push` also picks up the
schema RLS flags. Review its complete proposed changes first. Avoid replaying the
old migration history just to enable RLS; migrations 0023 and 0024 overlap.

Before applying, use the API's database connection to check its role:

```sql
SELECT current_user, rolsuper, rolbypassrls
FROM pg_roles WHERE rolname = current_user;

SELECT tablename, tableowner, rowsecurity
FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
```

After applying, verify `rowsecurity` is true for all application tables and
inspect any existing policies:

```sql
SELECT tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname = 'public';
```

Expected for a fresh deployment: no application table policies. Existing policies
are not deleted by this script and must be reviewed separately. Verify public ad
listing, login, private messaging and admin access through the API afterward.

RLS covers row operations; it does not restrict TRUNCATE or database roles that
bypass it. Keep browser roles unprivileged and avoid exposing unused Data APIs.
