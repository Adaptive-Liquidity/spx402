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

The endpoint exists and answers `initialize`, `tools/list`, `tools/call`. Tier 3 makes it usable without inside knowledge:

- Add a `GET /api/public/mcp` descriptor (server info, protocol version, tool list) so a human or crawler hitting the URL sees what it is instead of a method error.
- Add two tools that map to data the site already shows publicly: agent evidence summary (hashes and counts, not the paid bundle) and operator lookup.
- Add a connection panel on `/build/docs`: the endpoint URL, a copy-paste Claude/Cursor config block, the tool list with one-line descriptions, and the rate limit. Uses the existing `CopyBlock` — no new primitives.
- Tests: one per tool asserting the JSON-RPC shape and that no private field leaks.

## 4. Badge system — verifiable end to end

Subscriptions, tiers, and EAS attestations already exist. What is missing is the public proof loop:

- A public verification view for a subject's attestations: UID, kind, grade, score, transaction hash, attester, timestamp, each linking to Base — reachable from the badge itself and from the agent dossier.
- The badge SVG embeds a link to that view, so anyone seeing a badge can check it without trusting us.
- Embed snippet on `/build/badge`: copy-paste `<img>` and iframe markup with the honest-grade rule shown next to it, verbatim.
- Lapsed/cancelled state renders an explicitly degraded badge (monitoring inactive), never a stale grade presented as current.

## 5. Housekeeping this tier picks up

- `⌘K` currently has two owners: the new command palette and the homepage query console. The palette wins globally; the console keeps `/` when it is on screen.
- `robots.txt` gains explicit allows for `/api/public/mcp`, `/.well-known/*`, and the llms files (currently blanket-blocked by `Disallow: /api/`).
- Sitemap gains the routes added since it was last touched.

## Technical notes

- New routes: `src/routes/llms[.]txt.ts`, `src/routes/llms-full[.]txt.ts`, `src/routes/[.]well-known/agent-card[.]json.ts`, plus a `GET` handler on the existing MCP route. All are TanStack file routes returning `Response` directly.
- Text surfaces are generated from shared constants in `src/lib/` (methodology copy, `ENDPOINT_PRICES`, `NAV_HUBS`) so wording and prices cannot drift from the pages.
- Attestation reads use the existing public server function in `src/lib/badge.functions.ts`; no new table, no new grant.
- Cache: `public, max-age=300, s-maxage=3600, stale-while-revalidate=86400` on the static text/JSON surfaces; attestation view is dynamic with a short s-maxage.
- Verification: `bun run typecheck && bun run test`, plus a live fetch of each new URL and a screenshot of the docs MCP panel and the badge verification view at 1280 and 390.

## Out of scope

Base Tier 3 strategy items (ERC-7715 spend permissions, Talent Protocol Builder Score) stay in their own plan. No scoring, decoder, pricing, or design-token changes here.
