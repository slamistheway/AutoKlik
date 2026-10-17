This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/ad-posted-successfully.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

### Ad page SEO

Ad pages are rendered on the server at /ad/:id/:title. Existing numeric URLs redirect to the current title URL. Set SITE_URL to the public HTTPS website origin in production so canonical, social and structured-data URLs use your domain. The localhost default is for development only. Set API_URL for the server-accessible API origin if it differs from NEXT_PUBLIC_API_URL (the public API/image origin). The sitemap index is available at /sitemap.xml.

Responses are private and not cached because owners can access hidden listings. Hidden ads remain unavailable to other visitors and have noindex metadata. API failures return HTTP 503 with Retry-After rather than a misleading missing-listing response.

The existing API ad-fetch limits still apply. Anonymous SSR requests share the frontend server IP at the API; review trusted proxy/rate-limit configuration before a high-traffic deployment. This feature does not change those limits.

### Sitemap

- `/sitemap.xml` indexes the homepage sitemap and paginated ad/seller sitemaps. `/robots.txt` advertises the index using the same configured site origin.
- `/sitemap-pages.xml` contains the homepage. `/sitemap-ads.xml?page=1` and `/sitemap-sellers.xml?page=1` each contain up to 1,000 public records, with every page listed in the index. These feeds are separate from the 30-result customer listing endpoint.
- Only active, unexpired ads from active sellers are included. Hidden, sold, expired, removed and restricted-seller listings are excluded, as are private/account/checkout routes, search results and legacy numeric ad URLs. Seller entries require at least one eligible ad.
- Ad URLs use the existing canonical title-slug helper. Ad modification dates come from stored update dates; dates are omitted for seller profiles and the homepage rather than fabricated.
- Set `SITE_URL` to your public HTTPS origin before deployment (`NEXT_PUBLIC_SITE_URL` is the fallback; localhost is for development). `API_URL` selects the server-accessible API origin, falling back to `NEXT_PUBLIC_API_URL` and then localhost:3001. Request host headers and user credentials are never used to generate sitemap content.
- XML responses allow five minutes of shared-cache freshness. API failures or invalid upstream data return 503 with Retry-After and no-store, never a silently truncated sitemap. The sitemap introduces no database migration.
- Verify with `node test/sitemap.cjs` in this folder. The isolated API integration test in `api/test/admin.integration.cjs` also verifies the feed has no 30-ad cap, excludes restricted/private records, validates pagination and returns only public sitemap fields.

### Live messaging and blocking

Conversation unread badges already exist. Authenticated live updates now refresh messages, read receipts and unread counts through `/users/message-events`, with five-second polling retained for recovery. The browser shares one stream between the inbox and navbar and reconnects automatically. Streams recheck the session every 30 seconds; no message content or tokens are included in event payloads.

API instances use PostgreSQL LISTEN/NOTIFY with a dedicated pooled connection. The database connection must support session-based LISTEN (use a direct or session-pooled connection, not transaction pooling); reverse proxies must allow streaming without buffering. Existing message/image endpoints still enforce authentication and conversation membership.

Apply the reviewed API migration `0020_user_blocks` after earlier pending migrations before using blocking. It adds directed account blocks; either participant's block prevents both text and image sending, including direct API calls. Only the owner can remove a block. Existing messages remain accessible for history and reporting. Block and send operations serialize per participant pair to prevent concurrent sends from bypassing a completed block.

Verify browser transport with `node test/live-messages.cjs` here, and API permissions/events with `npx jest --runInBand messaging-safety message-events` in `api`. Applying migrations to the live/local development database requires separate approval.

### Complete search and saved searches

`/search` applies the full filter form through `/ads/search`: category/subcategory, text, brands/models, price/year/mileage/power/engine-capacity ranges, condition, counties, buy/lease, seller type, fuel, transmission, colors and doors (`5+` means at least five). Apply filters explicitly; sort and page changes preserve applied filters. URLs restore filters on refresh/back, chips remove individual values, and filter changes reset pagination. The API returns items, total, page, pageSize and totalPages (24 items by default; maximum 60), with deterministic sorting and null values last. `/ads/all` retains its homepage array format and 30-item limit.

Migration `0021_complete_search` adds nullable `ads.engine_size` in cc, saved searches and search alerts. Engine capacity is also supported by ad posting/draft persistence and editing. Existing ads have unknown engine capacity until edited and will not match a capacity range; cargo volume remains separate. Apply this migration after preceding migrations before using the new features.

Signed-in users can save up to 25 named searches, reopen them, pause/resume alerts or delete them from the search page. Saving uses the applied filters, not unsaved form edits, and omits pagination/sorting. In-app notifications refresh every 30 seconds while the app is visible and catch up on return. They match public, unexpired ads created after the search was saved, exclude the user's own ads and deduplicate each search/ad pair without resetting read state. Resuming alerts catches up on matching ads posted while paused. No background email or push service is configured. Search deletion removes its alerts; account erasure also removes saved searches.

Check with `node test/search-state.cjs` here and `npx jest --runInBand search-filters saved-searches` in `api`. `node test/search.integration.cjs` in `api` verifies the actual migrations and PostgreSQL filter/pagination/alert/ownership behavior in a temporary schema inside a transaction that always rolls back; it never changes application tables.
