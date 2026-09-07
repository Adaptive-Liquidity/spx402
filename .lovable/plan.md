# Tier 3 — the machine-readable instrument

Tier 1 and Tier 2 finished the human-facing terminal. Tier 3 makes SPX402 legible to the other audience: AI agents, LLM crawlers, and third-party sites embedding our grades. Same design lock — no new palette, type, hero copy, scoring, or pricing. Most of the plumbing already exists (MCP endpoint, x402 manifest, badge subscriptions with on-chain attestations); Tier 3 finishes, exposes, and documents it.

## 1. llms.txt — the site, readable by a model

- Add `/llms.txt`: a short, curated map of SPX402 for language models — what we are, the one-line methodology, the four hubs, the canonical URLs, the public JSON feeds, and the pay-per-call resources with prices.
- Add `/llms-full.txt`: the same map plus the full methodology text, the grade band definitions, the anomaly taxonomy, and the scoring/confidence explanation, all verbatim from the existing methodology page so there is exactly one wording.
- Both are served as plain text with cache headers, generated from the existing copy constants — never a hand-maintained second copy that can drift.
- `robots.txt` and the sitemap reference them.

## 2. agent-card.json — machine discovery

- Add `/.well-known/agent-card.json` (A2A-style agent card): identity, description, provider, documentation URL, the skills we expose (grade lookup, tape read, facilitator registry, evidence bundle), input/output schemas, and the payment terms.
- It points at the two existing machine surfaces rather than duplicating them: `/.well-known/x402` for paid resources and `/api/public/mcp` for tool access.
- Repeats the standing policy verbatim: strictly pay-per-call, no free tier on paid resources, no sponsored gas.

## 3. MCP server — finish and publish

The endpoint already answers `initialize`, `tools/list`, `tools/call`, and a `GET` descriptor. Tier 3 makes it usable without inside knowledge — the existing POST JSON-RPC contract and the GET descriptor stay exactly as they are.

- Add two tools, both mapping only to data the site already shows publicly: agent evidence summary (hashes and counts, not the paid bundle) and operator lookup. No private fields, no new data exposure.
- Add a connection panel on `/build/docs`: the endpoint URL, a copy-paste Claude/Cursor config block, the tool list with one-line descriptions, and the rate limit. Uses the existing `CopyBlock` — no new primitives.
- Tests: one per tool asserting the JSON-RPC shape and that no private field leaks, plus a regression test that POST JSON-RPC still answers.

## 4. Badge system — verifiable end to end

Subscriptions, tiers, and EAS attestations already exist. What is missing is the public proof loop:

- A public verification view for a subject's attestations: UID, kind, grade, score, transaction hash, attester, timestamp, each linking to Base. Built from existing primitives only — `PageHeader`, `DataTable`, the standard stage width. No new layout language.
- The badge SVG embeds a link to that view, so anyone seeing a badge can check it without trusting us.
- Embed snippet on `/build/badge`: copy-paste `<img>` and iframe markup with the honest-grade rule shown next to it, verbatim.
- Lapsed/cancelled state renders an explicitly degraded badge (monitoring inactive), never a stale grade presented as current.
- If the dossier is touched to add the verification link, `LAST INDEXED` must render via `formatRelative` or "indexer lagging" — never raw seconds.

## 5. Housekeeping this tier picks up

- Keyboard: `⌘K` / `Ctrl+K` stays the global palette binding. `/` is handled only while the homepage query field is focused. No new global `/` binding, no second owner of `⌘K`.
- `robots.txt` adds targeted allows for exactly `/api/public/mcp`, `/.well-known/*`, `/llms.txt`, `/llms-full.txt`. `Disallow: /api/` stays — the rest of the API surface is not opened.
- Sitemap gains the routes added since it was last touched.

## Technical notes

- New routes: `src/routes/llms[.]txt.ts`, `src/routes/llms-full[.]txt.ts`, `src/routes/[.]well-known/agent-card[.]json.ts`. All are TanStack file routes returning `Response` directly.
- Text surfaces are generated from existing copy constants (methodology copy, `ENDPOINT_PRICES`, `NAV_HUBS`) — no new voice, no second wording that can drift from the pages.
- Attestation reads use the existing public server function in `src/lib/badge.functions.ts`; no new table, no new grant.
- Cache: `public, max-age=300, s-maxage=3600, stale-while-revalidate=86400` on the static text/JSON surfaces; attestation view is dynamic with a short s-maxage.
- Verification: `bun run typecheck && bun run test`; live-fetch `/llms.txt`, `/llms-full.txt`, `/.well-known/agent-card.json`, `/api/public/mcp`; screenshots at 1280 and 390 of the `/build/docs` MCP panel and the badge verification view. Then stop.

## Out of scope

No restyling of any kind: no palette, type, hero copy, scoring, or pricing changes. Base Tier 3 strategy items (ERC-7715 spend permissions, Talent Protocol Builder Score) stay in their own plan.
