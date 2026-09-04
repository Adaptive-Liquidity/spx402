# SPX402 — end-to-end audit and completion pass

I checked the live site, the published deployment, the database and the scheduled jobs. The site *design* and code are in good shape. The **running system behind it is not**: the public site people can visit is far behind the code, and most of the data pipeline has been failing silently for months.

## What the audit found (verified)

**1. The published site is stale — this is the root blocker.**
`spx402.com/api/public/verified` returns 404, and every newer API address returns the ordinary web page instead of data. Everything built since the last publish — the public verification feed, evidence bundles, embeddable badges, the paid endpoints, the prober lane, the redesign work — exists in the code but is not live for the public.

**2. Most background workers have been failing for months.**
13 schedules fire on time, but in the last 3 hours 147 of their calls came back "unauthorized" and 33 hit the stale site and got a web page back. Only two workers (registry scan, x402 scan) actually completed. Consequence: `agents` has not been updated since 27 April. Scoring, backfill, both reconcilers, candidate verification and the daily snapshot have produced nothing since then.

**3. Grades are missing for almost the whole index.**
612 agents: 12 tokenized ones carry scores, **600 registered agents have score 0** because the scoring worker never ran. The leaderboard, movers and any grade-based claim are effectively running on 12 rows.

**4. Advertised lanes with no data behind them.**
- Active prober / "mystery shopper": `x402_service` and `probe_run` are both empty, there is no probe schedule installed, and no prober keys are configured. The status page presents this lane as a live capability.
- AEON escrow/bond/receipt lane: `aeon_receipts` is empty and no agent is in the AEON category, so every AEON surface renders empty.
- Alerts: no subscriptions exist and there is no delivery path (no email/webhook sender) — subscribing today notifies nobody.
- API keys / paid calls: `api_keys` and `api_usage` are empty, and the paid endpoints are not reachable on the published site at all.
- Operator verification: zero verified operators; `operator_challenges` empty.

**5. Housekeeping.** Three duplicate schedules (`spx402-scan-agent-registry`, `spx402-scan-x402`, `spx402-verify-candidates`) run alongside their `spx-` equivalents, one of them with a shared secret pasted in plain text inside the job.

## The plan

### Phase A — make the live site match the code (unblocks everything)
1. Publish the current build, then re-check each API address on the real domain until they answer with data instead of a web page.
2. Confirm the shared secret the schedulers use matches what production expects; fix the mismatch and re-run one worker by hand to prove it returns success.
3. Delete the three duplicate schedules and remove the plain-text secret from the remaining job.
4. Success test: every worker writes a fresh heartbeat, and `agents` shows an update timestamp from today.

### Phase B — fill the index with real grades
5. Let the scoring worker run across all 612 agents; verify the 600 registered agents receive scores, grades and confidence.
6. Re-run the daily snapshot so movers and trend lines have more than 12 rows to work with.
7. Add a visible freshness guard: if the pipeline goes quiet again, the leaderboard, status page and dossiers say so instead of showing months-old numbers as current.

### Phase C — close each advertised capability, or label it honestly
For each lane below, ship the missing piece; where the piece needs something we don't have, mark it clearly as not yet live rather than implying it works.
8. **Prober lane** — install the 15-minute probe schedule, configure the prober wallet keys, and enumerate real x402 services into the registry so probes have targets. Until keys exist, the status page shows the lane as standing by, not operational.
9. **Alerts** — build the actual delivery step (email through the platform's mail setup) plus a per-user digest, so a subscription produces a message. Until then, alerts stay marked as not yet delivering.
10. **API keys and paid calls** — verify key minting end to end on the live domain, confirm a paid endpoint returns the payment-required response and then real data, and record usage.
11. **AEON lane** — point the indexer at the AEON program and confirm at least one real escrow/bond/receipt lands, so the AEON surfaces stop being empty shells. No demo rows.
12. **Operator verification** — finish the wallet sign-in challenge flow so an operator can actually prove ownership.

### Phase D — final launch sweep
13. Walk every page signed out and signed in, on desktop and phone, confirming no page shows a claim the backend cannot support.
14. Check page titles, descriptions and share previews on every page; run the security scan and the full test suite.
15. Re-publish and re-verify against the real domain.

## Notes

- No new colours, fonts or layout — this is a functionality and truthfulness pass on the design already approved.
- Nothing gets seeded with fake or demo agents; empty stays empty and says so.
- Phases B and C depend on Phase A landing first — until the live site matches the code, nothing else can be verified in production.

## Technical detail

- Workers affected by the 401: `cron-scoring`, `cron-backfill`, `cron-reconciler`, `cron-failure-reconciler`, `cron-verify-candidates`, `cron-score-snapshot`, `cron-registered-agent-diff`, `cron-scan-x402-evm`.
- Auth path to fix: `spx_internal.cron_bearer()` → `Authorization: Bearer` → `checkCronAuth` reading `CRON_SECRET`. `CRON_SECRET` exists as a project secret; unprefixed secrets only reach production on publish, which matches the stale-deploy symptom.
- Prober config expects `PROBER_ENABLED`, `PROBER_SOLANA_KEY` / `PROBER_BASE_KEY` and wallet addresses; none are currently set.
- Duplicate jobs to drop: `spx402-scan-agent-registry`, `spx402-scan-x402`, `spx402-verify-candidates`.
