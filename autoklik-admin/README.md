# AutoKlik Admin prototype

A local Next.js prototype using Croatian labels and AutoKlik branding.

Run from this folder:

```powershell
npm run dev -- --port 3003
```

Open http://localhost:3003.

## Included

- Overview with demo totals, an illustrative weekly chart, recent ads and open reports.
- Ads: search, status filters, details, status changes and featured toggles.
- Users: search, status filters and simulated suspension/reactivation.
- Reports: inspect reported ads, dismiss a report or simulate hiding its ad.
- Activity: demo actions recorded for the current session.
- Responsive navigation, accessible native detail dialogs and reset controls.

All records are fictional. Actions update React state only and reset on reload; the application does not call the API, modify the database, or provide real admin authentication/authorization. The chart is illustrative demo data, not live analytics.

The starter's unused, incomplete authentication file is preserved as `src/app/auth/auth-guards.tsx.example`. It referenced modules absent from this application and used the Pages Router; it is not imported or part of this prototype build. Real admin access control must be implemented on the server before connecting real data.

Checks: `npm run lint`, `npx tsc --noEmit`, `npm run build`.
