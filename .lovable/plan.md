## Pre-Wave-5 audit

I checked waves 1a → 4 against the plan and against live DB state. Three categories of gap:

- **Critical (blocks Wave 5):** the failure-reconciler and score-snapshot crons have never produced data because their auth header is wrong.
- **Material (decoder coverage):** the 320 registered/x402 agents still emit zero events. Wave 1b said "Track A closes the 130-agent gap" — only ⅔ of Track A is wired.
- **Cosmetic (deferred is fine):** a few items in the plan are explicitly Wave 5+ scope.

I'd recommend fixing the critical + material items before Wave 5. They take one focused pass and they're the difference between attestations that mean something and attestations issued over an empty event log.

---

## Critical — fix before Wave 5

### 1. Failure-reconciler & score-snapshot crons are silently 401-ing

**Evidence I pulled from the DB:**
- `cron.job` shows both jobs scheduled correctly (every 10 min and 00:05 daily) but their auth header reads `current_setting('app.cron_secret', true)`, which returns `NULL` — that GUC has never been set on this project.
- The other three crons (registry-scan, x402-scan, verify-candidates) hardcode the working bearer and are running fine — `indexer_runs` shows hundreds of heartbeats from them and zero from the failure reconciler.
- `agent_score_snapshots` is **empty** (0 rows, 0 mints). Wave 3's whole movers feed depends on this table — the leaderboard "Movers (24h)" tab silently returns `[]` today.

**Fix:** rewrite the two cron job commands to use the same hardcoded bearer the other three use (`SPX402CONTROL3140$`), via a small migration that reschedules them. Then trigger one manual run of each and confirm rows land.

### 2. Backfill the missing snapshots

Once cron #2 is unblocked, run a one-shot backfill so the leaderboard Movers tab and `/pulse` score-delta entries have something to compare against. Insert one snapshot row per scored agent at "now" so the next daily run has a baseline.

---

## Material — Track A of Wave 1b is half-shipped

### 3. Registered-agent decoder coverage

Plan says Track A watches `executor_wallet` for **four** event types. Today we ship **two**:

| Event | Status |
|---|---|
| `SWAP_EXECUTED` | wired in webhook |
| `X402_PAYMENT_RECEIVED` | wired in webhook |
| `OPERATOR_CHANGED` | not implemented |
| `CONFIG_CHANGED` | type exists in `EventType` union, no decoder |

DB confirms it: 320 registered agents, **0 events** for that category. The decoders we shipped target the Solana wallet activity but pump-style registered agents rarely touch x402 or pump swaps directly — most of their observable signal is `OPERATOR_CHANGED` (executor wallet rotation) and `CONFIG_CHANGED` (registry metadata diff).

**Fix:**
- Add `decode-registered-agent.server.ts` that diffs the latest scanned MPL Core asset against the previously-stored snapshot and emits `OPERATOR_CHANGED` / `CONFIG_CHANGED`.
- Run it from the existing `cron-scan-agent-registry` worker (already runs hourly) so we don't add a new cron.
- This finally lights up the 130-agent dark category in the tape.

### 4. Wave 1b "indexer health surface" is partial

`/status` exists but it doesn't break out **per-decoder lag** or **last-seen timestamp per event-type per category** — it shows worker heartbeats. Plan called this out as the thing that lets consumers tell "no failures observed" from "decoder is broken."

**Fix:** add a small panel to `/status` that pivots `agent_events` on `(category, type)` and shows last-seen timestamp + count for the last 24h. ~40 lines.

---

## Cosmetic / explicitly deferred — leave for later

These are listed in the plan but explicitly belong to later waves; they're not gaps:

- Wave 1c `score_before` / `score_after` per event — plan says "Wave 3 ships snapshots which will let us compute deltas." We'd backfill once item #2 above is healthy.
- Wave 2 `identity_resolution_strength` confidence input — explicitly tagged "Wave 5b" in the plan.
- Wave 3 `/pulse` "new attestations" entries — Wave 5.
- Wave 3 watchlist+alerts wired to the tape — alerts table exists, dispatch worker is Wave 5+ scope.
- Wave 4 paginated badge endpoint caching — already shipped with `s-maxage=300, swr=3600`.

---

## Technical changes (for the record)

1. **Migration**: `cron.unschedule('spx-failure-reconciler')` + `cron.unschedule('spx-score-snapshot-daily')`, then re-schedule both with the same hardcoded bearer pattern as the working crons.
2. **One-shot SQL**: `INSERT INTO agent_score_snapshots (mint, score, confidence_score, grade, methodology_version, confidence_model_version) SELECT mint, score, confidence_score, grade, methodology_version, confidence_model_version FROM agents WHERE score IS NOT NULL;` to seed a baseline.
3. **New decoder**: `src/lib/indexer/decode-registered-agent.server.ts` exporting `diffRegisteredAgent(prev, next): DecodedEvent[]` that returns `OPERATOR_CHANGED` / `CONFIG_CHANGED` rows.
4. **Wire**: call it from `cron-scan-agent-registry` after the upsert, comparing the previous row to the new one.
5. **`/status` panel**: read-only query over `agent_events` grouped by `(category, type)` for the last 24h, plus a "decoder coverage" badge (green if last-seen < 1 day for the expected type set, amber if stale).
6. **Plan + memory updates**: bump `.lovable/plan.md` Wave 1b/3 status notes, add a one-liner memory under `mem://features/wave-1b-decoder-completeness.md`.

After this lands we go into Wave 5 with: real failure events flowing, daily snapshots accumulating, all four agent categories producing observable events, and `/status` honest about decoder health — which is exactly the bar the plan sets for shipping attestations.
