## Active Prober Lane ("mystery shopper")

SPX402 becomes an x402 *buyer* so it can measure what passive indexing can't: whether an endpoint challenges correctly, settles after payment, and delivers after settling. Probe data is collected and displayed only — **never scored** in this wave.

Lane ships with `PROBER_ENABLED=false`: all code live, challenge probes runnable, settlement probes gated until `PROBER_SOLANA_KEY` / `PROBER_BASE_KEY` are added and funded. `/status` shows the lane as "armed, unfunded" rather than faking activity.

### 1. Migration (first, alone)
- `x402_service` and `probe_run` exactly as specced, plus a `slug` column on `x402_service` (unique, encoded host+path, e.g. `api.example.com~v1~weather`) to address the service page.
- Public read on both (transparency is the point), service-role writes only. Index `probe_run(service_id, ran_at desc)`.

### 2. Service enumeration
Confirmed current state: `agent_events` holds **zero** x402 rows, but `candidate_agents` holds **22** payees discovered via `x402_facilitator_scan`. So the settlement-lane seed reads both sources — Tier A payees in `agent_events` *and* x402 candidate payees — and inserts them `probe_tier='address-only'` with no URL. Plus a manual admin insert path, and a one-off directory-import script (not a cron).

### 3. `src/lib/prober/` server module
- **Challenge probe** (free): GET with UA `SPX402-Probe/1.0 (+https://spx402.com/methodology)`, parse `PAYMENT-REQUIRED` v2 header or v1 JSON body, validate scheme/network/asset/amount/payTo/facilitator, cross-check payTo against the dossier wallet, emit `CONFIG_DRIFT` on mismatch.
- **Settlement probe**: official x402 client SDKs only — `x402-fetch` + `viem` for Base, the Solana x402 client for the PayAI-style flow. No hand-rolled signing.
- **Outcome ladder** as a pure classifier function: `no_402 | timeout | malformed_challenge | challenge_valid | over_cap | payment_rejected | settled_no_delivery | delivery_unverified | settled`. Records `verify_ms`, `settle_ms`, `tx_signature`, `delivered`.

### 4. Self-probe validation (before any scheduling)
1. Build `/api/public/x402-selftest` — a real x402-paywalled endpoint at $0.001 settling to an SPX treasury wallet. SPX402 becomes its own first probed service, dogfooded in public.
2. Point the prober at it, confirm the full ladder end-to-end.
3. Then one probe against a live third-party service to prove the signing path works against a foreign implementation.

Both steps require funded keys, so they are **deferred** to the flip-the-flag session. Until then the self-test endpoint ships and is reachable, and the settlement path is covered by synthetic tests only.

### 5. Cron + safety
`api.public.cron-probe-services`, every 15 min, batch cap 50/run, queue drains across runs. Head tier: challenge hourly, settlement every 6h. Tail: challenge hourly, settlement weekly-sampled.
- Per-probe cap $0.05 → skip and log `over_cap`.
- Daily budget $10 → `PROBER_BUDGET_HALT` anomaly, lane halts, surfaced on `/status`.
- Wallet-drain tripwire: balance drop >20% without matching `probe_run` rows → critical anomaly.
- No retries. A failed probe is data.
- Heartbeat `prober`: `challenge_probes= settlement_probes= settled= failed= spend_usd= queue_depth=`.

### 6. Loop closure
After a 200, poll `agent_events` for 90s looking for the prober's own settlement via the facilitator lanes. Miss → RPC/facilitator fallback lookup, and the indexer gap is recorded as a reconciliation signal. The prober audits SPX402's own lanes.

### 7. `PROBE_DIVERGENCE`
Pure function, unit-tested: warn when probe settle-rate − organic settle-rate > 0.25 over ≥14 days. Synthetic unit tests for **every** outcome-ladder value.

### 8. Surfaces (same deploy)
- Dossier: "Last probed: …" line + 30-day settle-rate sparkline for matched services.
- `/service/$slug`: full public probe transcript.
- `/methodology`: "Active verification" section — tiers, prober wallet addresses, spend caps, divergence signal, and the explicit "probe data is not yet scored" statement.
- `/status`: prober lane heartbeat, daily spend, budget-breaker state, disabled-state notice.

### Hard rules honored
- `scoring.server.ts` untouched; snapshots byte-identical (verified by re-running the fixture suite).
- Prober self-identifies. No covert probing.
- Every payment reconstructible from `probe_run` + on-chain data.
- Keys are server-only secrets, never client, never in fixtures.

### Deliverable at end of this wave
Probe counts by outcome (challenge-only until funded), budget-breaker test result via synthetic spend injection, confirmation that snapshots are unchanged, and an explicit statement that the self-probe loop-closure proof is pending key funding.
