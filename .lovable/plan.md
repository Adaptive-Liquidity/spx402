# SPX402 — End-to-end completion, hardening, and efficiency

Current state from this review: 152 tests passing, backend security scan clean (one warning previously dismissed), caching already on the badge/evidence/verified endpoints, API-key tiers with daily quota and x402 keyless payment enforced in one middleware. Three roadmap items remain open and need your input; the rest below is work I can do without you.

## Phase 1 — Close the three open items (needs your decisions)

1. **Keyless pay-per-call** — the paid endpoints advertise pay-as-you-go but no receiving wallet is configured, so they answer "not enabled". Need a Base USDC receiving address; then flip the switch and run a live paid call end to end.
2. **Email + SMS alerts** — webhook and Slack deliver today. Email and text are shown as unavailable. Need a verified sending domain (email) and a sending number (SMS) before they can be turned on honestly.
3. **Active prober** — the mystery-shopper lane is built with a daily spend cap but is off. Needs a funded wallet and your explicit go-ahead, since it spends real money on each probe.

## Phase 2 — Security hardening (no new decisions needed)

- **Retire bootstrap admin endpoints.** The vault-seeding endpoint is a self-service rotation surface protected only by a shared secret; convert it to a one-time-use path or remove it now that secrets are seeded.
- **Uniform rate limiting on unauthenticated endpoints.** Quota exists for API-key traffic, but the free public surfaces (badge, evidence, verified feed, embed) have no per-caller ceiling — only cache. Add a lightweight per-IP token bucket with a shared helper, and cap response sizes/pagination on every list endpoint.
- **Cron endpoint audit.** Confirm every cron route rejects on missing/short secret, uses constant-time comparison, and returns no internal error text.
- **Replay/abuse review on payment verification.** Re-verify the on-chain payment check for amount, recipient, chain, and freshness window, with a test for each rejection path.
- **Secret hygiene pass.** Confirm no unprefixed secret is read at module scope and no server-only module is reachable from the browser bundle.

## Phase 3 — Efficiency and reliability

- **Query and index review** on the hottest paths (leaderboard, tape, agent dossier, operator page): confirm indexes match the actual filters/sorts and collapse any N+1 reads into single queries or views.
- **Edge caching everywhere it is safe** — leaderboard, pulse, operator pages, and the public JSON feeds get explicit cache headers with stale-while-revalidate; anything session-dependent gets no-store.
- **Cron cost control** — batch/resume-aware scanners with a per-run time budget so a backlog never runs a job past its window; record run duration and rows processed per run.
- **Health surface** — extend the status page with last successful run and lag per pipeline (Solana scan, Base scan, scoring, reconciler, alerts, prober) so a stalled job is visible without digging.

## Phase 4 — Enhancements worth building

- **Public MCP server** (read-only): leaderboard, agent dossier, live tape, facilitator registry, service lookup. Free distribution channel; write/billable actions stay behind existing API keys and x402.
- **Operator self-service depth**: claim flow polish, per-agent alert defaults, and a usage/billing view showing calls, quota, and spend in one place.
- **Diff/regression alerts on scoring**: notify when an agent's grade moves a band, with the evidence link that caused it.
- **Decoder coverage push**: the confidence model currently discounts registered-agent (0.3) and x402 (0.6) coverage. Shipping the pending config/operator-change and refund decoders raises real confidence rather than the displayed number.

## Technical notes

- Rate limiting: shared helper in `src/lib/http/`, backed by a Postgres counter table keyed by (bucket, window) with grants and RLS, applied in the same place as the existing quota middleware so responses keep the `X-RateLimit-*` header shape.
- Cache policy: `public, max-age=60, s-maxage=300, stale-while-revalidate=3600` for feeds; `immutable` for content-addressed evidence; `private, no-store` for anything under `_authenticated`.
- Pipeline health: one `pipeline_runs` view over existing run tables, read by the status page through a public read-only server function.
- MCP: AI SDK MCP server route under `src/routes/api/public/`, tools mapped 1:1 to existing public data functions — no new data exposure.

## Suggested order

Phase 2 first (security is the only category with real downside), then Phase 3, then Phase 4. Phase 1 unblocks as soon as you supply the wallet address, sending domain/number, and prober go-ahead.
