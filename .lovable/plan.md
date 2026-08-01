
# Scoring v0.3.0 — Wash-Resistant x402

Implements `SPX402_Wash_Resistant_x402_Scoring_Spec.md` exactly. Only the x402 branch changes; the tokenized and registered branches are frozen.

## Verified current state

- `scoreX402` in `src/lib/indexer/scoring.server.ts` weights raw receipt count (`totalX402Count`), aggregate SOL/USDC, and a `count >= 20 && recency < 24h` confidence bucket — no payer awareness.
- `decode-x402.server.ts` already writes `payerWallet`, `detectionMethod`, `facilitatorId`, and event-level `confidence` into `agent_events.raw` (parser v0.2.0), so the aggregates this spec needs are already on disk.
- The scoring worker (`api.public.cron-scoring.ts`) aggregates `agent_events` per mint but selects only `type, severity, amount_sol, amount_token, occurred_at` — `raw` is not read yet.
- Golden snapshots are inline (`toMatchInlineSnapshot`) inside `scoring.golden.test.ts`; there is one x402 canonical snapshot plus x402 grade/confidence assertions.

## 1. New aggregates (scoring worker)

In `aggregateCounters`, add `raw` to the x402 event selection and compute, over `X402_PAYMENT_RECEIVED` rows:

- `uniquePayers` — distinct non-null `raw.payerWallet`
- `topPayerShare` — max per-payer count / total x402 events (0 when no attributed payers)
- `highConfShare` — `raw.confidence === 'high'` / total
- `selfPaymentCount` — payer equals the agent's `operator_wallet` or `executor_wallet`
- `washFilteredUsdc` / `washFilteredSol` — sums excluding self-payment events
- `hasLegacyUnattributed` — true when any x402 row has null `payerWallet`

Null-payer rows count toward totals and shares' denominators, never toward `uniquePayers`. These flow through `computeRiskScore` into `ScoringInputs` as optional fields (absent ⇒ current behaviour for non-x402 callers).

## 2. `scoreX402` v0.3.0

Replace internals with the spec formula verbatim:

- `weightedCount = highConfCount + 0.5 * mediumConfCount` (derived from `highConfShare` × total)
- `diversityFactor = clamp(1 - topPayerShare, 0.2, 1)`
- `effectiveCount/Usdc/Sol = value * diversityFactor`, volume computed on wash-filtered sums
- `depositConsistency` = `min(uniquePayers,25)/25 * 20` (counterparties, not receipts)
- `buybackExecution` / `burnConfirmation` = same caps as v0.2.0 but on effective values
- `selfPaymentCount > 0` ⇒ grade capped at `SPX BB` via a new `minGrade` helper
- `count === 0` ⇒ `SPX404` preserved

`scoreTokenized` and `scoreRegistered` are untouched.

## 3. Confidence buckets (x402 only)

`high` requires `uniquePayers >= 8` AND `highConfShare >= 0.5` AND `lastIndexedSeconds < 24h`; else `medium` at `count >= 5`; else `low`.

## 4. Verdicts

Diversity-naming strings per spec, including the concentrated-flow verdict when `diversityFactor` hits the floor.

## 5. `WASH_PATTERN_SUSPECTED` anomaly

- New `EventType` in `src/lib/agents.ts` plus dossier label/icon/filter mapping (renders under the existing `anomaly` filter).
- Emitted by the scoring cron when `totalEvents >= 10 && topPayerShare >= 0.8`. Severity `warn`, or `critical` when `selfPaymentCount >= 3`.
- Dedupe: one per `(mint, type, UTC date)` — checked before insert; synthetic signature encodes mint+date so re-runs are idempotent.
- `raw` = `{ topPayerShare, topPayer (truncated), uniquePayers, totalEvents }`.
- Dossier copy: "Receipt flow is concentrated. The tape has developed a limp."
- Heartbeat notes gain `wash_events_emitted=N`.

## 6. Tests first

Add the five synthetic goldens to `scoring.golden.test.ts` before changing `scoreX402`:

1. `wash-loop` vs `honest-service` — inequality asserted in both directions on `depositConsistency` and `buybackExecution`
2. `self-payment-cap` — would-be SPX A capped to SPX BB
3. `single-customer-floor` — 30 receipts / 1 payer, diversity floor 0.2, anomaly trigger shape asserted
4. `legacy-unattributed` — null payers in totals, out of `uniquePayers`
5. `confidence-bucket` — 8 unique payers, `highConfShare` 0.4 ⇒ not `high`

Then regenerate only the x402 inline snapshots. If any tokenized/registered snapshot moves, I stop and report rather than regenerate.

## 7. Surfaces (same deploy)

- **Dossier** (`agent.$mint.tsx`): for x402 agents, a stat row with `Unique payers` and `Top payer share`, read from the persisted confidence/score breakdown fields.
- **/methodology**: v0.3.0 entry — diversity discount, self-payment cap, confidence gate, with the rationale "A service with one customer may be excellent. It has not proven a market."
- **Leaderboard**: no change.

## Technical notes

- Version constants bump to `spx-score-v0.3.0` (already the current `RISK_SCORE_MODEL_VERSION` string — I'll confirm and keep it consistent rather than double-bumping).
- Persisting `uniquePayers` / `topPayerShare` for the dossier requires storing them; I'll put them inside the existing `score_breakdown` JSON column (no migration) unless you prefer real columns.
- Commit message exactly: `scoring v0.3.0: wash-resistant x402 weighting — count counterparties, not transactions`.

## Report on completion

Test pass/skip counts, the x402 snapshot diff summary, and explicit confirmation the other two branches' snapshots are byte-identical.
