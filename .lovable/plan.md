## Goal

Bring the UI up to the backend reality (facilitator registry, wash-resistant scoring v0.3.0, EVM/Base lane, active prober, fixture suite) as a **frontend-only** pass. No worker, decoder, scoring, cron, or migration changes.

## Current state (verified this session)

- Homepage hero stats are partly static: agent count is live, `Buybacks confirmed` is derived, `5m` reconcile cadence is hardcoded. There is one proof chain (deposit → buyback → burn → grade) and one flat "What SPX402 catches" list.
- Dossier already has a chain badge, `via {facilitatorId}` chips on settlement rows, and a `ProbeStrip`. Missing: chip tooltip text per spec, payer diversity row, the four anomaly copy blocks, legacy-attribution note, ADDRESS-ONLY fallback.
- `/service/$slug` exists (Wave 5) with transcript table + sparkline; needs the spec header line and CONFIG_DRIFT history.
- Explore has grade-band chips only. Leaderboard has no chain/payer/facilitator columns.
- Methodology is fully static and **links to** the registry rather than rendering it; it has no loader.
- Status has a prober lane and a 24h telemetry panel, but not the per-lane heartbeat board.
- Live table state right now: `facilitators` 3 rows (1 active, Solana; 2 Base inactive), `x402_service` 0, `probe_run` 0, Base events 0. So the Base lane, prober, and probe surfaces must render their honest empty/disabled states — that is the default view today, and it must look deliberate.

## Data plumbing

Extend read-only helpers only (`src/lib/live-data.ts`, `src/lib/prober-data.ts`, plus a new `src/lib/registry-data.ts`):

- `fetchHomeStats()` — agents indexed, settlements verified split by `agent_events.chain`, services probed (`x402_service` count + distinct probed), active facilitators.
- `fetchPayerDiversity(mint)` — unique payers, top-payer share, high-confidence share derived from `agent_events.raw` payer + `detection_method`, plus a count of pre-v0.2.0 rows for the legacy note.
- `fetchFacilitatorRegistry()` — already have `fetchFacilitators()`; add per-chain active counts and registry version.
- `fetchLaneHeartbeats()` — group `indexer_runs` by worker into the six lanes with last run, ok state, duration, and the Base cursor / prober budget parsed from `notes`.
- `fetchFixtureCoverage()` — counts by suite section from the fixture modules; if not derivable client-side, expose via a read-only server route `/api/public/fixture-coverage` (read-only, no worker changes).
- Ticker source extended to `X402_PAYMENT_RECEIVED` (high-confidence only), `WASH_PATTERN_SUSPECTED`, `CONFIG_DRIFT`, and `settled_no_delivery` probe runs, formatted `[BASE] X402 SETTLED 0.01 USDC via PayAI · 1.8s`.

## New components (`src/components/spx/`)

`ChainBadge`, `FacilitatorChip`, `PayerDiversityStat`, `ProbeStatusPanel`, `SettleRateSparkline`, `LaneHeartbeatCard`, `FacilitatorRegistryTable`, `FixtureCoverageTable`, `BudgetGauge`, `ServiceTranscriptTable`, `ProofChainX402` — all in the existing engraved-bronze/amber terminal language, mono numerals, no gradients, no emoji. The dossier's inline chip/strip/sparkline code is refactored into these so there is one implementation each.

## Page work

1. **Homepage** — live hero stat row (4 stats, SOL/BASE split); `ProofChainX402` section under the existing chain with header *"Two chains. One question. Did it settle."*; four new catch cards (wash-concentrated receipt flow, facilitator config drift, delivery without settlement, probe/organic divergence); extended ticker.
2. **Dossier** — chain badge styling per spec (SOL amber / BASE bronze outline), facilitator chip tooltip *"Detected by facilitator fee-payer match · confidence high · parser v0.2.0"*, payer diversity row with the v0.3.0 sub-caption, `ProbeStatusPanel` with ADDRESS-ONLY fallback (*"Settlement observed. Endpoint not yet probed."*), the four anomaly copy blocks verbatim, legacy note.
3. **/service/$slug** — spec header `SERVICE TRANSCRIPT · probed by SPX402 · wallet {truncated}`, advertised price/facilitator/payTo (linked to dossier when matched), 30-day outcomes table, sparkline, CONFIG_DRIFT history.
4. **Explore + Leaderboard** — chain / category / grade band / operator-verified / wash-flagged / probed filters; leaderboard gains chain badge, unique-payer column, `via` chip, and the x402 score tooltip *"Diversity-discounted per methodology v0.3.0."*; section headers stay non-speculative.
5. **Methodology** — restructure into the 8 numbered sections with version tags, add a loader so section 6 renders the `facilitators` table from the database (add/remove a row and the page changes), full prober wallet addresses, fixture coverage counts, version changelog, and the verbatim sentences (*"A service with one customer may be excellent. It has not proven a market."*, *"Probe data is displayed. It is not yet scored."*, *"Anyone can audit who we trust."*, *"Every decoder claim above is pinned to captured mainnet transactions."*).
6. **Status** — six `LaneHeartbeatCard`s from `indexer_runs` (solana settlement, base settlement + cursor, prober + `BudgetGauge`, scoring, verifier, reconcilers), registry version + per-chain active counts, fixture count, parser versions; breaker card copy *"Prober halted at daily budget. Discipline is the product."*

## Honest states

All five render with exact labels: `REPORT-ONLY — detection live, registry empty` (status + methodology), `DISABLED — awaiting operator keys` (status prober), `ADDRESS-ONLY` (dossier), `PROBER_BUDGET_HALT` (status + ticker), `legacy — predates payer attribution` (dossier). With today's data, three of these are the live state, not a hypothetical.

## Invariants

No touching `scoring.server.ts`, decoders, crons, or migrations. No unlabeled mock data — empty tables render empty states. Legal copy discipline preserved: no investment language, no "safe"/"yield"/"guaranteed"/"credit rating", no S&P implication, price excluded from scores, disclaimer links intact. Final voice pass: zero exclamation marks in new copy.

## Verification

`bunx vitest run` + typecheck, then a Playwright walk of `/`, a dossier, `/service/...`, `/explore`, `/leaderboard`, `/methodology`, `/status` at desktop and mobile widths, checking each honest state renders and confirming a facilitators-row change moves the methodology table. Report per page which table each element reads from, plus anything stubbed and why.
