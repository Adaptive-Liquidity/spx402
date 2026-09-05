# Homepage copy cleanup — institutional tone, multi-chain, simplified

Goal: apply the provided polished copy to `/` (and its hero component) so the page reads like a clearinghouse, not a crypto project; strip Solana-only wording; keep every claim provable and every layout/component intact.

## 1. Hero (`src/components/spx/Hero.tsx`)

- H1: `The on-chain reputation terminal for autonomous intelligence.`
- Sub: `We provide verifiable proof of execution for the agent economy. No social metrics. No screenshots. We only rate what the chain can prove.`
- Remove the mono kicker ("No screenshots. No promises…") — now redundant with the sub.
- Eyebrow pill: `Live · Solana + Base · Every agent under watch` (multi-chain, still true).
- Add the two primary actions directly under the sub, above the query console:
  - `[ Connect Wallet ]` → `/login` (our connect/sign-in entry point)
  - `[ Explore Terminal ]` → `/explore`
- Query console, grade dial, and metrics strip stay exactly as-is.

## 2. New band: "What we offer" (`src/routes/index.tsx`)

A three-cell modular grid (same gap-px/bronze-frame pattern as the audiences grid), inserted after the Live Tape band, replacing the current "Talk is free." proof-chain band copy block. Cells, verbatim from the provided copy:

1. **The SPX Score — Verifiable Execution.** `An immutable grade based strictly on on-chain behavior. We index deposits, automated buybacks, and verifiable burns. If an agent breaks its programmed invariants, the score drops.`
2. **The Verified Operator Badge.** `A cryptographic, dynamic trust seal for your agent. Embed the badge on your site; we back it with a tamper-proof Ethereum Attestation Service (EAS) receipt on Base. It costs more to fake than to earn.` — links to `/badge`.
3. **Paid Agent Endpoints (x402).** `Machine-readable dossiers, scores, and execution evidence. Built for autonomous agent consumption via native USDC x402 settlement. Your bot pays per call; no human required.` — links to `/api`.

## 3. Band: "How we grade" (simplified methodology)

Replaces the "The tape never blinks / What SPX402 Catches" intro copy (the 15-pattern FailurePlate itself stays — it is real and specific):

- H2: `The tape is the only truth.`
- Body: `SPX402 is a receipt compression algorithm. We evaluate observable on-chain execution. We do not measure token price, social momentum, vibes, or future promises.`
- Four input rows above the plate (label + one line each, verbatim):
  - Deposit Consistency — Regularity of capital flowing into the agent.
  - Execution Rate — Ratio of successful buybacks within expected windows.
  - Burn Confirmation — Direct on-chain proof of destroyed supply.
  - Operator Identity — Wallet signature matching the on-chain creator.

The four-step PROOF_STEPS chain (escrow/receipt/bond/grade) is kept but its intro headline changes to the new "How we grade" framing; step bodies stay (they describe the x402 lane accurately).

## 4. Band: "For operators" (conversion)

Replaces the three-audiences band ("Whoever you are, you need receipts."):

- H2: `Stop begging for trust. Prove it on-chain.`
- Body: `Institutions and autonomous capital networks do not invest in screenshots. They require cryptographic proof.`
- Four numbered steps (verbatim): Sign Once · Claim Your Identity · Deploy the Badge · Access the Network.
- CTA `[ Claim Your Agent ]` → `/register`.
- **Accuracy edits to the provided copy** (we only publish what is true today): step 4 line becomes `Access the Network: Verified agents earn the attested badge, an on-chain EAS receipt, and priority review in the verification queue.` — "order routing visibility" is not a shipped feature and is dropped.

## 5. Kept as-is (still accurate, on-tone)

- x402 Chain band ("Two chains. One question."), grade taxonomy ("Wall Street grades bonds."), API band, pricing preview, featured agents, final CTA. The final CTA gets a small multi-chain tweak: `Paste the identifier.` with supporting line covering mint / wallet / service.
- Solana-only phrases are swept from homepage copy only; other routes keep their current wording for later passes.

## 6. Head metadata (`src/routes/index.tsx`)

- Title: `SPX402 — The On-Chain Reputation Terminal for Autonomous Intelligence`
- Description: `Verifiable proof of execution for the agent economy. SPX402 grades agents on what the chain can prove — scores, operator badges on Base, and pay-per-call x402 endpoints.`
- og:title / og:description updated to match.

## Technical notes

- Files touched: `src/components/spx/Hero.tsx`, `src/routes/index.tsx` only.
- No layout, color, font, motion, or component changes; new bands reuse existing `BandSpine`, `Aperture`, grid-frame patterns. Renumber band spines (01–0x) after insertion/removal.
- No new tables, endpoints, or dependencies. Metrics, tape, dial all still read live data.
- Verification: `bunx tsgo --noEmit` clean, full vitest suite green (verbatim-copy test targets methodology/anomaly pages — expected unaffected), visual pass at desktop + mobile to confirm no line overflows its panel.
