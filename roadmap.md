# Roadmap

## Active: Tier 4 — observe, then activate
Lock: no restyle, no seeded rows, no scoring change unless published on /methodology first.
Probe data stays displayed, never scored.

### 4A Observe (closes without a customer)
- [ ] Lane liveness on /live/status: OBSERVING / QUIET / STALLED from last non-empty result (empty cron != operational; prober with last probe = never is STALLED)
- [ ] Diagnose each empty lane vs one live tx (Solana x402, Base/EVM, registry, backfill); fix Base RPC 401 and fail loud on boot; QUIET if chain is genuinely quiet
- [ ] Scheduled import of known x402 directories / facilitator endpoints so services-known can leave 0
- [ ] Mystery Shopper: publish prober wallet + budget on /live/status and /methodology before first paid probe; probe log page (who, paid, response, verdict)
- [ ] Dossier: one "why this grade" line naming the missing evidence class (LAST INDEXED via formatRelative / "indexer lagging")

### 4B Activate (separate exit)
- [ ] Self-serve claim on operator dossier: prove wallet -> monitoring (badge/alerts stay paid, pricing unchanged)
- [ ] Shareable "you are being graded" card for indexed agents
- [ ] Public traction line: calls / USDC / payers (zero is honest)

### Close criteria
4A: status truthful per lane; >=1 probe recorded OR status says STALLED/unfunded; services-known explained; why-this-grade ships.
4B: claim flow works end to end. 4A not blocked on signup; neither blocked on fresh tape if honest state is QUIET.
Verify: bun run typecheck && bun run test + a live row or an honest QUIET/STALLED.

## Done
- Tier 1 (instrument), Tier 2 (nav/dossier/auth/palette), Tier 3 (llms.txt, agent-card.json, MCP, badge verification)
