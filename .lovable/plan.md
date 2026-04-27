# Expand SPX402 to the full Solana agent economy

## Why this needs to happen

Today SPX402 indexes one signal: pump.fun buybacks against an SPL mint. That caps us to a single early vertical. The Solana agent economy is much wider — registered MPL agents (with on-chain identity but often no token), x402 payment receipts (every machine-to-machine API call leaves a chain trail), and copy-trading executors. We have the infrastructure (Helius ingestion, verifier, scoring, leaderboards). We need to widen the inputs and broaden what an "agent" is.

The user already approved the scope as "full expansion" and explicitly scoped seeding to "Solana Agent Registry + anything related to x402." That keeps us inside Solana-native, on-chain-verifiable territory — not random ElizaOS/Virtuals wallets we can't audit.

---

## What "Solana agent" means after this upgrade

Three identity classes, all first-class:

1. **Tokenized agent** — has an SPL mint (today's model, e.g. pump.fun Tokenized Agents). Identified by `mint`.
2. **Registered agent** — has an MPL Core asset + AgentIdentity PDA in the Metaplex Agent Registry. Identified by `core_asset` (the MPL Core asset address).
3. **Executor agent** — operates from a Solana wallet doing real on-chain work (x402 receipts, swaps, task fees) without a token or registry record. Identified by `executor_wallet`.

All three live in one `agents` table keyed on a generic `identifier` with a typed `identifier_kind` discriminator. Existing rows keep their mint as identifier.

---

## What we found while researching (corrects Grok's draft)

- The real **Solana Agent Registry** is the **Metaplex MPL Agent Registry**, not the placeholder program ID our current scanner uses.
  - Agent Identity program: `1DREGFgysWYxLnRnKQnwrxnJQeSMk2HmGaC6whw2B2p`
  - Agent Tools program: `TLREGni9ZEyGC3vnPZtqUh95xQ8oPqJSvNjvB7FGK8S`
  - PDA derivation: `["agent_identity", <core_asset>]`
  - SDK: `@metaplex-foundation/mpl-agent-registry`
- **x402** is now a Linux Foundation project (Coinbase + Solana + Stripe + Visa), Solana-native, agent-to-agent micropayments via SOL/USDC. Every payment leaves an on-chain transfer + receipt → a clean signal we can index for "agent revenue."
- Our existing `cron-scan-agent-registry.ts` is wired to the wrong program ID, which is exactly why "0 accounts" was reported in the previous loop. Fixing this alone unlocks discovery.

---

## Scope of this build (one wave, three pillars)

### Pillar A — Identity model upgrade (schema)

Single migration to make the platform agent-kind-aware without breaking anything:

- `agents.identifier` (text, NOT NULL) — the on-chain primary key. Backfilled from `mint` for existing rows.
- `agents.identifier_kind` (text, NOT NULL, default `'mint'`) — `'mint' | 'core_asset' | 'executor_wallet'`.
- `agents.category` (text, NOT NULL, default `'tokenized_buyback'`) — `'tokenized_buyback' | 'registered_agent' | 'x402_executor' | 'copy_trader' | 'task_executor' | 'general'`.
- `agents.executor_wallet` (text, nullable) — wallet that actually does the work (deposit recipient for tokenized; built-in agent wallet for MPL; the wallet itself for executor-class).
- `agents.core_asset` (text, nullable) — MPL Core asset for registered agents.
- Same fields mirrored on `candidate_agents` so the verifier can route by kind.
- Keep `agents.mint` for backwards compat, but make it nullable. All public read code reads `identifier`/`identifier_kind`.

### Pillar B — Indexing the new signals

Three new event types in `agent_events.type`:

- `SWAP_EXECUTED` — generalized swap (Jupiter / Raydium / Orca / pump.fun) attributed to the executor wallet. Carries `amount_sol` and `amount_token`.
- `X402_PAYMENT_RECEIVED` — SOL/USDC inflow to an executor wallet that matches an x402 transfer pattern.
- `TASK_COMPLETED` — placeholder schema for future Validation Registry CPI parsing (no decoder this wave; reserved so we don't migrate again).

Decoder updates (`src/lib/indexer/decode.server.ts`):

- Generalize the buyback branch from "pump.fun-only" to "any DEX swap by an executor wallet → SWAP_EXECUTED, plus the existing pump.fun-buyback specialization for tokenized agents."
- Add x402 receipt heuristic: USDC/SOL transfer with a memo or instruction that matches the x402 pattern, addressed to a known executor wallet.
- Backwards-compatible: tokenized agents keep emitting `BUYBACK_EXECUTED` exactly as today.

New scanner: `cron-scan-mpl-agent-registry.ts` (replaces the broken placeholder route):

- Calls `getProgramAccounts` against the **real** Agent Identity program ID.
- For each account, extracts the bound MPL Core asset and (best-effort) the built-in agent wallet.
- Inserts into `candidate_agents` with `identifier_kind='core_asset'`, `category='registered_agent'`, `discovered_via='mpl_registry_scan'`.
- The old `cron-scan-agent-registry` route stays, but is rewritten to point at the correct program. (We keep the URL stable so the existing pg_cron job continues to fire.)

### Pillar C — Scoring + UI

Category-aware scoring (`src/lib/indexer/scoring.server.ts`):

- Keep current tokenized-agent math (deposit→buyback→burn, plus the fee-buyback branch I just shipped).
- Add a `registered_agent` branch: weights identity (registry PDA exists), execution (swap/x402 volume on the executor wallet), reliability (failed-tx rate), velocity (recency).
- Add an `x402_executor` branch: weights x402 receipt volume + count, reliability, identity (operator-verified bonus).
- Each branch returns the same `{total, breakdown, grade, verdict, confidence}` shape so dossier and leaderboard rendering don't change.

UI surfaces:

- `/leaderboard` gets category tabs across the top — **All / Tokenized / Registered / x402 / Executors** — each running its own ranked slice. The existing 3 sub-tabs (Earners / Consistent / Recent) stay underneath.
- `/explore` keeps grade filters but adds a category chip row above them.
- Dossier (`agent.$mint.tsx`) — rename route to `agent.$id.tsx` accepting any `identifier`. Shows the right "kind" badge ("Tokenized Agent" / "Registered Agent" / "x402 Executor"), the right metrics block (buybacks vs swap volume vs x402 volume), and a category-appropriate verdict.
- Homepage: the featured tape mixes top agents across categories instead of tokenized-only.
- `/register` — add a category selector + identifier-kind hint ("Mint / MPL Asset / Wallet"). Auto-detect when possible.

### Pillar D — Seeding (honest, on-chain-verified)

No hallucinated lists. We seed from sources we can verify on-chain right now:

1. **Re-run the fixed MPL registry scanner** with the correct program ID. Whatever's there gets queued automatically. (If `getProgramAccounts` returns 0, that's the truth and we publish "0 registered agents in the index yet — be the first.")
2. **Top tokenized agents stay seeded** as-is (the 12 already in the table, with the 2 quality ones surfaced).
3. **x402 seed list** — start by indexing every x402 transfer in the last 7 days from public Solana mainnet, group by recipient wallet, and queue any wallet with ≥ 3 receipts as an `x402_executor` candidate. The verifier confirms.
4. **No copy-trader / task-executor / generic ElizaOS seeding this wave** — those need real decoders before they earn a grade. They appear as empty categories with "first verified X agent registers here" CTAs (current pattern from Wave 3).

Trust position holds: every seed entry has an on-chain origin we can point a Solana Explorer link at.

---

## Explicitly out of scope (kept in the Phase 2 backlog)

- Copy-trade PnL benchmarking (still needs swap parser + benchmark wallet logic; we now have the swap decoder, but PnL math is its own project).
- Validation Registry CPI parsing for `TASK_COMPLETED`.
- Wave B paid registration flow (deferred until the broader leaderboard is populated, per user direction).
- Migrating ElizaOS / Virtuals / OpenClaw agents — out until they ship public on-chain identity we can verify (we are not seeding off-chain or unverified entries).

---

## Risks and the calls we're making

- **Schema migration touches the central table.** We do it as one additive migration with safe defaults so no existing surface breaks during deploy. All read code is updated in the same pass.
- **The MPL Agent Registry may genuinely be empty on mainnet right now.** If so, we publish that fact transparently rather than pretend to index a category. The infrastructure being in place is what unlocks the next 90 days of growth.
- **x402 indexing is heuristic** for v1 (memo + transfer pattern). False positives will be low-grade by construction (1–2 receipts won't promote past `low` confidence).
- **No decoder for non-DEX agent activity yet** — copy-traders and task executors will only appear as empty registration funnels until their decoders ship. This preserves "we only rate what we can prove."

---

## Files touched

Database:
- One additive migration: identifier model + category + executor wallet + core asset + indexes.
- Backfill `identifier = mint`, `identifier_kind = 'mint'`, `category = 'tokenized_buyback'` for current 12 rows.

New code:
- `src/lib/indexer/scoring/registered-agent.ts` — branch for registry-class scoring.
- `src/lib/indexer/scoring/x402-executor.ts` — branch for x402-class scoring.
- `src/lib/indexer/decode-swap.server.ts` — generalized DEX swap decoder.
- `src/lib/indexer/decode-x402.server.ts` — x402 receipt heuristic.
- `src/routes/api.public.cron-scan-mpl-agent-registry.ts` — real MPL scanner (correct program IDs).
- `src/routes/api.public.cron-scan-x402.ts` — recent x402 receipt sweeper.
- `src/lib/agents/categories.ts` — category metadata + display helpers (single source of truth).

Edited:
- `src/lib/indexer/decode.server.ts` — call into the swap + x402 decoders, keep tokenized branch.
- `src/lib/indexer/verifier.server.ts` — route to the right verification check by `identifier_kind`.
- `src/lib/indexer/scoring.server.ts` — dispatch to category-specific branch.
- `src/routes/api.public.cron-scan-agent-registry.ts` — point at correct program ID, keep route URL stable.
- `src/routes/api.public.cron-scoring.ts` — pass category through.
- `src/routes/api.public.cron-verify-candidates.ts` — route by `identifier_kind`.
- `src/lib/agents-db.ts` + `src/lib/agents.ts` — surface `identifier`, `identifierKind`, `category`, `executorWallet`, `coreAsset` on the public `Agent` shape; quality gates updated.
- `src/routes/leaderboard.tsx` — category tabs across the top.
- `src/routes/explore.tsx` — category chips above grade chips.
- `src/routes/agent.$mint.tsx` → keep file (still works for mint-style URLs) but loader resolves by `identifier`. Conditional rendering by `identifierKind`.
- `src/routes/index.tsx` — featured tape mixes categories.
- `src/routes/register.tsx` — category + identifier-kind selectors.

Cron:
- New pg_cron entry to call `cron-scan-mpl-agent-registry` hourly.
- New pg_cron entry to call `cron-scan-x402` every 30 min.

---

## What "done" looks like

- `/leaderboard` shows category tabs. Tokenized still has the 2 quality agents surfaced today; Registered + x402 tabs either show real entries (if any are on mainnet now) or an honest "indexing live, none qualifying yet — be the first" empty state.
- A new `/agent/<core-asset>` URL renders an MPL-registered agent dossier with the right metric panel (no buyback graph; instead, executor-wallet swap volume + x402 receipts).
- `/register` lets an operator submit a mint, an MPL Core asset, OR an executor wallet, and the verifier picks the right path.
- Existing tokenized agents keep showing exactly the data they show today — zero regression.
- The "we only rate what we can prove" trust line is unchanged: every category lists only on-chain-verified entries, and empty categories say so honestly.

After this lands, **then** we can revisit Wave B (paid registration) with a leaderboard that actually represents the whole Solana agent economy.
