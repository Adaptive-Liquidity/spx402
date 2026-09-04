# SPX402 + AEON — what it enables, and the remaining platform updates

## What SPX402 + the AEON program now enables

AEON turns SPX402 from a tokenomics watcher into an **execution-grade credit bureau for agents**. Instead of only observing deposits → buybacks → burns of a token, we now grade what an agent actually *does*:

- **Escrow lifecycle** — escrows created, released, canceled: proof the agent completes paid work.
- **Slashable bonds** — operators post bond; slashing is on-chain negative evidence no one can fake.
- **Receipts (hash-chained)** — every graded action anchored in `aeon_receipts`, giving a tamper-evident audit trail.
- **A fifth pillar of evidence**, scored 40/30/15/10/5 (escrow completion / bond / failures / recency / operator), feeding the same grade scale, tape, dossier, confidence model, and paid API as the other lanes.

Already shipped (verified in the repo): AEON decoder + webhook wiring, scoring branch, dossier pillars and metric cards, `aeon_executor` category, paid v1 endpoints with working API keys, new homepage hero/proof chain/anomalies, methodology rewrite, API docs, and the database (`aeon_receipts`, `api_keys`, `api_usage`, AEON columns on `agents`).

## What still needs updating

A scan this session found these surfaces still speak the old language or ignore AEON:

### 1. About page (`src/routes/about.tsx`)
Still framed as "It follows buybacks" with buyback/burn as the example flow. Reframe around execution evidence (escrows, bonds, receipts), keeping buybacks as one legacy lane.

### 2. Leaderboard tab copy (`src/routes/leaderboard.tsx`)
Tab descriptions read "ranked by total SOL routed into buybacks" / "hit their buyback windows". Re-scope copy to execution-grade language; the AEON fallback math for scoring stays as-is (it only applies to the tokenized lane).

### 3. Register + Submit pages
Copy lists "tokenized buyback, MPL-registered, x402 wallet…" but never names AEON. The category picker already includes AEON automatically (it maps over `CATEGORIES`); only the marketing strings and per-category explainer text need the AEON option spelled out.

### 4. Alerts (`src/routes/alerts.tsx` + dashboard alerts)
Subscription toggles only cover deposit/buyback/burn/failed-window/config/score-drop. Add opt-in toggles for escrow created/released/canceled, bond deposited/slashed, and receipt created so AEON agents are watchable. Requires new boolean columns on `alert_subscriptions` (small migration).

### 5. Status page (`src/routes/status.tsx`)
Lane heartbeats cover tokenized / registered / x402 / prober. Add the AEON lane heartbeat (decoder coverage is already reported as 1.0 by the scoring cron).

### 6. Pricing page (`src/routes/pricing.tsx`)
Verify endpoint descriptions mention AEON fields (escrow success rate, active bond, slashed totals) alongside the existing lanes.

### Explicitly NOT changing
- Legacy tokenized/registered/x402 lanes keep working — deleting them blanks every agent currently in the database.
- No new colors, fonts, or layout — copy and toggles only.
- No seeded demo agents — honest empty states until a real AEON agent is indexed.

## Verification
- `bunx tsgo --noEmit` clean, full vitest suite green.
- Visual pass on /about, /leaderboard, /register, /alerts, /status, /pricing in the preview.
