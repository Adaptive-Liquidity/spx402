# SPX402 — Performance & Quality Sweep

A codebase audit confirmed six real performance wins. No product changes, no copy changes, no new features — everything below only makes existing pages and APIs faster and leaner.

## What this fixes, in plain language

1. **The three busiest pages stop re-downloading the whole database.** Today the homepage, leaderboard, and explore page each fetch every agent row — including heavy history blobs — every time you visit, then filter it in the browser. We'll fetch only the columns each page actually shows, cap how much comes down, and share one cached copy between the three pages.
2. **Agent pages load faster for most visitors.** Every agent dossier currently ships a large chart library even though only tokenized agents ever display a chart. We'll load that library only when a chart is actually on screen.
3. **Tape filters stop hitting the database every click.** Changing a filter on the tape page re-queries from scratch each time. We'll route filters through the page address so repeat views come back instantly from cache.
4. **The leaderboard "Movers" tab gets proper caching** instead of an uncached network call on first click.
5. **One public API call gets twice as fast.** The evidence endpoint makes two back-to-back database trips where one combined query works.
6. **The sitemap stops being expensive to generate** on a cache miss — it currently pages through the whole agents table one thousand rows at a time on every cold request.

## What stays untouched

- Public API routes (badge, card, og, verified) — already correctly cached and rate-limited; the audit confirmed they're in good shape.
- All product copy, grading logic, decoders, and the Pump grade card.
- AEON features — confirmed live and shipped, not dead code.

## Technical details

- `src/lib/agents-db.ts:145` — replace `fetchAllAgents()`'s unbounded `select("*")` with per-page column selection: list pages get the columns they render (no `events`, `price_series`, `score_breakdown` blobs); add server-side limit/pagination; the detail route keeps the full row. Share one TanStack Query key with a `staleTime` across `index.tsx:80`, `leaderboard.tsx:43`, `explore.tsx:27` so navigating between them reuses the cache.
- `src/routes/agent.$mint.tsx:61` — move the recharts price chart into a lazily-loaded sub-component (`React.lazy` + `<Suspense>`) rendered only when `isTokenized && priceSeries.length > 0`; removes ~90KB gzip from the initial chunk for non-tokenized agents.
- `src/routes/tape.tsx:76` — model `category`/`severity` filters as route search params (`validateSearch`) and let the loader/`ensureQueryData` refetch; removes the `useEffect` fetch and gains router caching.
- `src/routes/leaderboard.tsx:142` — move the movers fetch into `useQuery`/`ensureQueryData` with a `staleTime` so it's cached and deduped.
- `src/routes/api.public.evidence.$eventId.ts:38` — collapse the two sequential Supabase round trips into one PostgREST embedded query (`agent_events` with `agents!inner(...)`).
- `src/routes/sitemap[.]xml.ts:40` — reuse the admin client instead of building a fresh one per request; switch the agents loop from offset `.range()` pagination to keyset pagination (same pattern as `api.public.verified.ts`).

## Done when

- `bunx tsgo --noEmit` clean and full vitest suite green.
- Homepage, leaderboard, explore, tape, and a sample agent dossier all render identically to before in a live browser check (same data, same layout).
- Network panel confirms: list pages no longer request the full `agents` row set, and a non-tokenized agent page no longer loads the recharts chunk.
