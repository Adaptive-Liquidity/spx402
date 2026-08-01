# Activate the PayAI Solana facilitator (x402 Tier A)

Goal: flip x402 Tier A detection from "truthfully inactive" to live, backed by two real captured settlement fixtures.

## 1. Registry seed

`src/lib/indexer/facilitators.server.ts` — update the `payai-solana` row:
- `address: "2wKupLR9q6wXYppw8Gr2NvWxKBUqm4PPJKkQfoxHDBg4"`
- `sourceUrl: "https://docs.payai.network/x402/reference"`
- `fixtureId: "x402-facilitator-settlement-01"`
- `active: true`
- Replace the "no published address" comment with the provenance note (PayAI docs `extra.feePayer`, cross-checked against QuickNode's x402-rails guide and the operator's `/supported` endpoint).

The registry-seed test already asserts that any active row has a non-empty address and a non-null `fixtureId`, so this stays gated.

## 2. Capture the two fixtures

Write a one-off local capture flow (not committed as a permanent script):
1. `getSignaturesForAddress` for the fee payer via Helius RPC.
2. Pull enhanced transactions in batches; select
   - **(a)** one with an inbound USDC `transfer_checked`/token transfer to a non-facilitator third-party wallet, and
   - **(b)** one with an inbound native SOL transfer to a third-party wallet.
3. Run `scripts/capture-fixture.ts --id x402-facilitator-settlement-01 --signature <usdc sig>` and `--id x402-facilitator-settlement-02 --signature <sol sig>`, with `--expect` populated from the actual tx: `executorWallets` (the recipient), `amountToken`/`amountSol`, `facilitatorId: "payai-solana"`, `facilitatorAddress`, `facilitatorSourceUrl`, `payerWallet`.

Note on naming: the loader requires the file name, envelope `id`, and test id to match, so B2/B3 become the new ids rather than keeping the old filenames.

## 3. Wire tests

`src/lib/indexer/__tests__/decode-x402.test.ts`:
- Point the B2 case at `x402-facilitator-settlement-01` and the B3 case at `x402-facilitator-settlement-02`.
- Both now take the tier-A branch: `detectionMethod === "facilitator_fee_payer"`, `confidence === "high"`, `facilitatorId === "payai-solana"`, `parserVersion === "v0.2.0"`.
- Keep B3's asymmetry assertion: same tx with **no** registry yields zero events (proving detection comes from the fee payer, not a marker). If the captured SOL tx happens to also carry an x402 marker, I will pick a different signature rather than weaken the assertion.
- Delete the two stub envelopes that are being replaced.

## 4. Database row + guard proof

- Insert into `public.facilitators`: id `payai-solana`, chain `solana`, address as above, scheme `exact`, `source_url`, `fixture_id = 'x402-facilitator-settlement-01'`, `active = true`.
- Verify the activation guard by attempting an `active = true` insert with a null `fixture_id` and confirming it raises; then confirm the good row persists.

## 5. Discovery script

New `scripts/discover-facilitators.ts` (dry-run, local only):
- Hardcoded base URL list starting with `https://facilitator.payai.network`.
- `GET {base}/supported`, filter `kinds` where `network`/`kind` starts with `solana`, print `extra.feePayer`, scheme, and a proposed **inactive** registry row (JSON) plus the capture command needed to activate it.
- Never writes files, never touches the DB, never activates.

## 6. Docs

`src/routes/methodology.tsx` — in the x402 detection section, state that facilitator addresses are taken from operator documentation and cross-checked against each operator's `/supported` endpoint, and that a row only goes active once a settlement fixture is captured.

## 7. Verification and report

- `bunx vitest run` — report pass/skip counts and confirm B2/B3 now pass.
- Trigger `spx-scan-x402` and read the `indexer_runs` heartbeat note, expecting `facilitators=1`.
- Check `/status`'s Facilitator Registry panel shows 1 active.

## Technical notes / risks

- Capture requires `HELIUS_API_KEY` in the sandbox. If it is not readable from the build environment, I will stop and ask rather than fabricate a transaction — envelope-only stubs stay `SKIPPED` in that case.
- If the fee payer's recent history has no qualifying inbound SOL transfer to a third party, I will page further back through signatures before considering B3 uncapturable.
