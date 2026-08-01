## Goal

Move x402 settlement detection from "text marker required" to tiered structural detection keyed on a curated, fixture-gated facilitator registry, with methodology and status surfaces updated in the same change.

## 1. New file: `src/lib/indexer/facilitators.server.ts`

Exactly as written in the patch doc:
- `Facilitator` type (`id, name, chain, address, scheme, sourceUrl, fixtureId, active`), `FacilitatorChain = "solana" | "base"`.
- `FACILITATOR_SEED` with `cdp-solana` and `payai-solana`, both `active: false`, empty `address`, `fixtureId: null`.
- `FACILITATOR_REGISTRY_VERSION = "v0.2.0"`.
- `getActiveFacilitators(chain)` — static seed merged with `facilitators` DB rows where `active = true`, DB wins on key, 5-minute isolate cache, DB failure falls back to seed silently.
- `facilitatorForFeePayer(registry, feePayer)`, `facilitatorAddressList(registry)`, `HeliusEnhancedTx` re-export.

## 2. Replace `src/lib/indexer/decode-x402.server.ts`

Full replacement per doc, `X402_PARSER_VERSION = "v0.2.0"`:
- Tier A `facilitator_fee_payer` (confidence `high`) when `tx.feePayer` is in the registry.
- Tier B `memo_marker` (confidence `medium`) — existing `X402_PATTERNS` over description/source/memo instructions, evaluated only when tier A misses.
- Sender map → best-guess `payerWallet` excluding executor and facilitator; skip the facilitator's own inbound flows.
- Emits `detectionMethod`, `confidence`, `facilitatorId`, `payerWallet` and mirrors them plus `parserVersion` into `raw`.
- Signature stays `decodeX402Tx(tx, wallets, opts?)` so `verifier.server.ts` compiles and behaves identically on memo-tier txs. `verifier.server.ts` is not touched.

## 3. `src/routes/api.public.cron-scan-x402.ts`

- Load registry once per invocation; sweep signatures for the Memo programs **and** every active facilitator fee-payer address.
- Exclude facilitator addresses from `collectReceivers` candidates.
- Pass `{ registry }` into `decodeX402Tx`.
- Track recipients as `Map<wallet, detectionMethod>`; tag `discovered_via` as `x402_facilitator_scan` for tier A, `x402_scan` otherwise.
- New `persistSettlementIfKnownAgent(ev)`: on `agents.executor_wallet` hit, insert `agent_events` row (`X402_PAYMENT_RECEIVED`, `info`, signature, occurred_at, amounts, confidence, raw) with signature-based conflict-ignore idempotency.
- Heartbeat notes gain `facilitators=N`.

## 4. Migration: `facilitators` table

Exactly as written — table with `unique (chain, address)`, RLS enabled, public-read policy for `anon`/`authenticated`, writes service-role only, plus `_facilitator_activation_guard()` trigger rejecting `active = true` without `address` + `fixture_id`. GRANTs added alongside (SELECT to anon/authenticated, ALL to service_role) so the public-read policy actually works through the Data API.

## 5. Fixtures B1–B6

Build the six cases in `src/lib/indexer/__tests__/decode-x402.test.ts` against the existing envelope loader:
- B1 SOL settlement, B2 USDC facilitator fee-payer settlement (no memo), B3 SOL facilitator fee-payer settlement (no memo) — tier A, `confidence: high`, `facilitatorId` set, `payerWallet` captured.
- B4 plain transfer, no marker, non-facilitator fee-payer → zero events.
- B5 x402 marker but wrong recipient → zero events for the tracked wallet.
- B6 reverted tx → zero events.

Note on IDs: the fixture-suite doc labelled B2/B3 as `x402_usdc_receipt` / `x402_memo_marker`, while this patch calls B2/B3 the facilitator-tier proofs. I'll keep the existing envelope IDs and add the facilitator-tier assertions the patch requires, so no existing fixture is deleted or weakened.

Capture flow, in order: pull a facilitator address from the operator's official docs (CDP `docs.cdp.coinbase.com/x402`; PayAI's repo/docs) → capture a real settlement tx via `scripts/capture-fixture.ts` → only then insert the row with `active = true` and its `fixture_id`. If no published address plus real settlement can be verified, the registry stays empty/inactive and B2/B3 stay SKIPPED with the reason in the envelope. No invented addresses, no fabricated tx JSON.

## 6. `/methodology`

New subsection "How SPX402 detects x402 settlements": tier A (facilitator fee-payer, high confidence, structural), tier B (memo marker, medium confidence, self-labeling), registry version `v0.2.0`, and the note that the facilitator registry is publicly readable and auditable, with the fixture-gate rule stated.

## 7. `/status`

Add a registry panel: `FACILITATOR_REGISTRY_VERSION`, active facilitator count, and fixture count (rows with a non-null `fixture_id`).

## 8. Dossier chip

Event rows render a `via {facilitatorId}` chip when `raw.facilitatorId` is present.

## Out of scope (explicit)

- No scoring-weight changes; `scoreX402` math untouched. `detectionMethod`/`confidence`/`payerWallet` are collected only.
- `verifier.server.ts` untouched.
- No existing fixture weakened or removed.

## Verification

Run the full fixture suite and report pass/skip/fail counts, list active facilitators with their fixture IDs, and prove the activation guard by attempting a manual `active = true` insert without `fixture_id` and showing the rejection.
