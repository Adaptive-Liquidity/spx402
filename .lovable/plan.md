## Goal

Add the Base (EVM) settlement lane for x402 alongside the existing Solana lane, exactly per the spec. Detection ships live; nothing is scored from an unproven facilitator. `scoring.server.ts` is not touched.

## Prerequisite

`BASE_RPC_URL` is a new backend secret (Alchemy / QuickNode / public Base RPC). I'll request it via the secure secret form at the start of implementation. Without it the lane builds and tests pass on fixtures, but the cron reports `no_rpc` in its heartbeat rather than pretending to scan.

## Step 1 — Migration (first, standalone)

- `chain text not null default 'solana'` added to `agents`, `candidate_agents`, `agent_events`.
- New `indexer_state (key pk, value, updated_at)` — service-role grants only, RLS on, no public policies.
- Insert the two Base facilitator rows **exactly as written** (`cdp-base`, `payai-base`), empty address, `active: false`, `on conflict do nothing`. The existing `_facilitator_activation_guard` trigger keeps rejecting activation without address + fixture_id — verified after the migration by attempting a fixtureless activation and confirming it raises.
- Addresses stay empty in the migration. Any address arrives later only from the operator's `/supported` endpoint or official docs, then only after a captured fixture.

## Step 2 — `src/lib/indexer/evm.server.ts`

Base RPC helpers, server-only, `BASE_RPC_URL` read inside functions (never module scope, never committed):
- `getLogs({ address, topics, fromBlock, toBlock })` with 2,000-block chunking.
- `getTransactionByHash(hash)` → `{ from, to, input, blockNumber, hash }`.
- `getBlockNumber()`; `getBlockTimestamp(n)` with a per-run cache.
- Cursor read/write against `indexer_state` (`key='evm_x402_cursor'`).
- README/docs note that `BASE_RPC_URL` is required and secret-managed (no `.env` commit).

## Step 3 — `src/lib/indexer/decode-x402-evm.server.ts`

- `EVM_X402_PARSER_VERSION = "v1.0.0-evm"`, `EvmX402Event` and `decodeEvmX402Tx` with the exact signatures from the spec.
- Tier A `facilitator_sender`: sender ∈ `base:` registry AND calldata targets Base USDC `transferWithAuthorization` (EIP-3009) or Permit2 `permitWitnessTransferFrom` → confidence `high`, `facilitatorId` set. Scored.
- Tier B `eip3009_pattern`: valid EIP-3009 call, sender ∉ registry → confidence `low`, `facilitatorId: null`. **Discovery only** — a hard type/route boundary means Tier B events are never returned to the persistence path.
- EVM addresses normalized lowercase. `facilitatorForSender(registry, txFrom)` added to `facilitators.server.ts` (`base:` prefix, lowercase compare).
- Selectors and the `AuthorizationUsed` topic hash are pinned from captured fixtures E1/E2. If capture isn't possible this session, they ship as SKIPPED fixture stubs with explicit reasons per fixture governance — never hand-derived and asserted as verified.

## Step 4 — `src/routes/api.public.cron-scan-x402-evm.ts` (15 min)

Cursor-resumable, secret-gated like the other crons:
1. Cursor from `indexer_state`, default `latest - 5000` on first run.
2. Chunked `eth_getLogs` for `AuthorizationUsed` on Base USDC.
3. Per log → `getTransactionByHash` → `decodeEvmX402Tx`.
4. Tier A → `agent_events` for known agents (`type: 'X402_PAYMENT_RECEIVED'`, `signature = txHash`, idempotent on signature, `chain: 'base'`, detection fields + parser version in `raw`); unknown payees → `candidate_agents` (`identifier_kind: 'executor_wallet'`, `category: 'x402_executor'`, `chain: 'base'`, `discovered_via: 'x402_evm_scan'`).
5. Tier B counted only; any single unknown sender over 50 settlements in a run is named in heartbeat notes as a `discover-facilitators` candidate.
6. Cursor advances **only on a fully successful run**; heartbeat `evm_x402_scan` with `blocks= logs= tierA= tierB= persisted= queued=`.

## Step 5 — Verifier EVM branch

`verifyEvmExecutorWallet(address)` in `verifier.server.ts`: routed when `identifier_kind === 'executor_wallet'` and the address is `0x`-prefixed. Bar is ≥1 Tier A settlement for that payee **in `agent_events`** — a DB query only. No live EVM RPC in the verifier; the indexer is the witness.

## Step 6 — Fixtures E1–E4

`scripts/capture-fixture.ts` gains `--chain base` (verbatim `eth_getTransactionByHash` + `eth_getTransactionReceipt`, same `_fixture` envelope). New `decode-x402-evm.test.ts`:
- E1 CDP/PayAI facilitator `transferWithAuthorization` → Tier A high, payer/payee/amount, `facilitatorId`.
- E2 Permit2 `permitWitnessTransferFrom` via registry facilitator → Tier A.
- E3 (critical guard) non-registry EIP-3009 → Tier B only, low, and an explicit assertion that the persistence path yields zero `agent_events` rows and zero score impact.
- E4 plain USDC `transfer` → zero events.
Any fixture that can't be captured ships SKIPPED with a stated reason; no fabricated payloads.

## Step 7 — Surfaces (same deploy)

- **Dossier:** chain badge (Solana / Base); EVM event rows render `via {facilitator}` identically.
- **`/methodology`:** EVM detection-tier subsection — the two tiers, why there is no memo tier on EVM, why Tier B never scores.
- **`/status`:** both lane heartbeats, EVM cursor block, registry counts per chain. If no Base facilitator is fixture-verified, the page states report-only mode plainly.

## Hard rules honored

- `src/lib/indexer/scoring.server.ts` is not opened or edited; I'll diff score snapshots before/after and confirm byte-identical.
- If no Base facilitator address can be fixture-verified this session, the lane ships **report-only**: detection live, Base registry empty, zero scored Base agents, honest `/status`.
- Non-goals respected: no cross-chain identity linking, no chains beyond Base, no payer scoring.

## Final report

Fixture status per E1–E4, cursor behavior across a forced mid-run failure, both heartbeats, and confirmation that scoring snapshots are unchanged.
