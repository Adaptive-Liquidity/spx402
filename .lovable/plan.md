# Base integration — Tiers 1, 2, 3, end to end

Context: `base:app_id` is already live on the site, so SPX402 is registered on the current Base Dev path (no legacy mini-app work needed). This plan builds the three tiers in order, each shippable on its own.

## Tier 1 — Distribution on autopilot (do first)

### 1. x402 Bazaar listing
Our paid endpoints (`/api/v1/agent/:mint/dossier`, `/score`, `/evidence`) already speak x402 with real USDC settlement. To get listed in Coinbase's Bazaar catalog that AI agents shop from:
- Add a discovery manifest route (`/.well-known/x402` and/or Bazaar-required metadata) describing each paid resource: price, asset (Base USDC), description, and a sample output schema.
- Make the `402 Payment Required` responses self-describing (resource description + output schema in the `accepts` payload) so catalog crawlers can index us without help.
- Register/verify the listing from Base Dev using the already-live app ID.
- Prove it live: an unauthenticated paid call end to end, then confirm the resource appears discoverable.

### 2. Sign in with Base (one-tap wallet login)
- Add "Continue with Base" on the login/signup pages alongside Google/Apple.
- Wallet signs a standard SIWE-style message; the server verifies the signature and links the Base address to the operator account (stored on the profile, shown on the account page).
- Works with Coinbase Smart Wallet (passkey) and any EVM wallet. Email accounts stay untouched — the wallet becomes an additional sign-in and identity.
- Auth edge cases handled: first-time wallet creates an account; existing email user can link a wallet from the account page; unlink requires being signed in.

### 3. Rich share cards + app metadata
- Per-agent and per-service pages get proper `og:` / `twitter:` tags with a real preview image (grade, risk score, chain badge rendered into the card), plus Base app metadata so links unfurl correctly inside Base App.
- Dynamic OG images generated server-side (or per-tier static set if generation cost is a problem) — every shared dossier link becomes an ad for the terminal.
- Manifest/farcaster-style app metadata (`fc:miniapp` successor fields / `base:` tags as Base Dev currently requires) so the site renders as a first-class app card.

## Tier 2 — Product depth

### 4. Base Pay button
- "Pay with Base" on the pricing/API pages and inside the API-keys dashboard: one tap deposits USDC or tops up a balance instead of manual transfers.
- Uses our existing verified-payment plumbing (same Base receipt check + replay protection), so a Base Pay deposit is credited exactly like an x402 payment.

### 5. Base App notifications
- Wire our existing alert dispatcher (email/webhook/Slack live today) to also deliver into Base App for users who signed in with Base.
- New channel type in `alert_channels`, verified via the linked wallet; shows as unavailable until the user has a linked Base account — honest, nothing silently dropped.

### 6. Basenames
- Resolve and display Basenames everywhere a Base address appears (operator pages, tape events, facilitator registry, payer stats).
- Reverse resolution on operator profiles: a wallet with a Basename shows the name, with the raw address one click away.

## Tier 3 — Strategic moats

### 7. Spend permissions for agents
- Let agent operators grant SPX402 a capped, revocable USDC spend permission so their agents can autonomously pay for our API (no per-call signing).
- Server-side: permission validation, per-period caps enforced against our usage records, instant revocation respected.
- This is the real "agents pay agents" loop: our API becomes something an agent's wallet can subscribe to without a human.

### 8. Talent Protocol Builder Score as a signal
- Consume Builder Score as one additional input on operator profiles (clearly labeled, weighted low, never decisive on its own).
- Publish the comparison honestly on the methodology page: their score vs. our execution grade, and why on-chain receipts are the stronger witness.

## Non-code, in parallel
- Apply for Base Builder Grants (retroactive, strong fit given what's shipped) and keep Builder Rewards running (automatic).
- Consider Base Batches once Tiers 1–2 are live.

## Verification per tier
- Every tier ends with a live end-to-end proof on the published site (real sign-in, real paid call, real card unfurl), and regression tests where logic is added (payment crediting, signature verification, permission caps).

## Technical notes
- Wallet stack: `viem` (+ `wagmi` only if needed) for SIWE signature checks and Basename resolution; server verifies signatures inside `createServerFn` handlers — no secrets in the browser bundle.
- Bazaar manifest + 402 self-description live in the existing `x402-middleware.ts` and a new public route under `src/routes/api/public/`.
- New tables/columns (linked wallet on profiles, `alert_channels` type for Base, spend-permission grants) get RLS + GRANTs in the same migration.
- No new colors, fonts, or layout — Base elements inherit the existing terminal design system.
