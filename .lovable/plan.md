# Base integration — Tiers 1, 2, 3, end to end

Context: `base:app_id` is already live on the site, so SPX402 is registered on the current Base Dev path (no legacy mini-app work needed). This plan builds the three tiers in order, each shippable on its own.

## Tier 1 — Distribution on autopilot (do first)

### 0. Prerequisite: fix the homepage crash
- The live terminal homepage (`/`) currently throws a table render/hydration error. Reproduce, fix the root cause (and any sibling routes sharing the same assumption), and add a regression test so the homepage can never crash blank again. Nothing below ships on top of a broken front door.

### 1. x402 Bazaar listing
Our paid endpoints (`/api/v1/agent/:mint/dossier`, `/score`, `/evidence`) already speak x402 with real USDC settlement. To get listed in Coinbase's Bazaar catalog that AI agents shop from:
- Add a discovery manifest route (`/.well-known/x402` and/or Bazaar-required metadata) describing each paid resource: price, asset (Base USDC), description, and a sample output schema.
- Make the `402 Payment Required` responses self-describing (resource description + output schema in the `accepts` payload) so catalog crawlers can index us without help.
- Register/verify the listing from Base Dev using the already-live app ID.
- Prove it live: an unauthenticated paid call end to end, then confirm the resource appears discoverable.

**Agent-runtime integrations (MCP + AgentKit).** Bazaar handles indexing; agent runtimes need to *consume* our endpoints natively. Ship alongside the listing:
- An open-source **MCP server** exposing read-only tools (leaderboard, dossier, tape, facilitator registry) so Claude, Cursor, and other MCP clients can query SPX402 without writing manual 402-retry or payment-signing code — the server handles the x402 handshake for them.
- A **Coinbase AgentKit Action Provider** package so ElizaOS, Agentic Wallets, and CDP-based agents get SPX402 lookups as native actions with built-in payment handling.
- Both are thin wrappers over the existing paid endpoints; no new data exposure, billing stays on the existing key/x402 paths.

**Explicit policy:** SPX402 does **not** sponsor user or agent gas fees via a Paymaster. We are a strictly pay-per-call product with zero free tier — clients and agents bring their own funds. This is stated on the pricing page, API docs, and Bazaar manifest so no agent discovers the policy at settlement time.

### 2. Sign in with Base (one-tap wallet login)
- Add "Continue with Base" on the login/signup pages alongside Google/Apple.
- Wallet signs a standard SIWE-style message; the server verifies the signature and links the Base address to the operator account (stored on the profile, shown on the account page).
- Works with Coinbase Smart Wallet (passkey) and any EVM wallet. Email accounts stay untouched — the wallet becomes an additional sign-in and identity.
- Auth edge cases handled: first-time wallet creates an account; existing email user can link a wallet from the account page; unlink requires being signed in.

### 3. Rich share cards + app metadata
- Per-agent and per-service pages get proper `og:` / `twitter:` tags with a real preview image (grade, risk score, chain badge rendered into the card), plus Base app metadata so links unfurl correctly inside Base App.
- Dynamic OG images generated server-side (or per-tier static set if generation cost is a problem) — every shared dossier link becomes an ad for the terminal.
- Manifest/farcaster-style app metadata (`fc:miniapp` successor fields / `base:` tags as Base Dev currently requires) so the site renders as a first-class app card.

## Tier 2 — Product depth & monetization

### 4. Base Pay button + Coinbase Onramp
- "Pay with Base" on the pricing/API pages and inside the API-keys dashboard: one tap deposits USDC or tops up a balance instead of manual transfers.
- Uses our existing verified-payment plumbing (same Base receipt check + replay protection), so a Base Pay deposit is credited exactly like an x402 payment.
- **Coinbase Onramp** embedded so operators with empty wallets can fund credits, subscriptions, or API usage with a credit card or Apple Pay — no exchange detour between "I want access" and "I have USDC".

### 5. Dynamic Operator Badge & EAS Attestations ("PayPal Verified for Agents")
- Formalize the embeddable script/widget previewed on `/operators` into a **paid recurring subscription ($49–$199/mo)**: a live badge that reflects the operator's current grade and monitoring status in real time.
- **Payment only funds continuous monitoring and badge hosting — it never buys or inflates an execution grade.** This is stated verbatim in the checkout copy, the methodology page, and the badge terms. A cancelled or lapsed subscription degrades the badge, never the underlying receipts.
- Publish cryptographic **on-chain attestations via Ethereum Attestation Service (EAS) on Base** whenever an operator verifies or receives a grade — the badge becomes verifiable on-chain, not just by trusting our servers.
- Tiered badge features by plan (refresh cadence, styling options, attestation granularity); all tiers subject to the same honest-grade rule.

### 6. Public traction dashboard
- A public page (or Dune integration) transparently tracking SPX402's own network usage: total x402 calls served, USDC revenue, and active paying wallets over time.
- Serves as verified, third-party-auditable proof for Base Builder Grant applications — we grade others on receipts, so our own receipts are public too.
- Numbers come from the same usage/payment tables the API already records; read-only, cached, no PII.

### 7. Base App notifications
- Wire our existing alert dispatcher (email/webhook/Slack live today) to also deliver into Base App for users who signed in with Base.
- New channel type in `alert_channels`, verified via the linked wallet; shows as unavailable until the user has a linked Base account — honest, nothing silently dropped.

### 8. Basenames
- Resolve and display Basenames everywhere a Base address appears (operator pages, tape events, facilitator registry, payer stats).
- Reverse resolution on operator profiles: a wallet with a Basename shows the name, with the raw address one click away.

## Tier 3 — Strategic moats

### 9. Spend permissions for agents
- Let agent operators grant SPX402 a capped, revocable USDC spend permission so their agents can autonomously pay for our API (no per-call signing).
- Client-facing implementation standardized on **ERC-7715 (`wallet_grantPermissions`)** to support Coinbase Smart Wallet session allowances natively.
- Server-side: permission validation, per-period caps enforced against our usage records, instant revocation respected — the ERC-7715 grant is the user experience, our own enforcement is the hard boundary.
- This is the real "agents pay agents" loop: our API becomes something an agent's wallet can subscribe to without a human.

### 10. Talent Protocol Builder Score as a signal
- Consume Builder Score as one additional input on operator profiles (clearly labeled, weighted low, never decisive on its own).
- Publish the comparison honestly on the methodology page: their score vs. our execution grade, and why on-chain receipts are the stronger witness.

## Non-code, in parallel
- Apply for Base Builder Grants (retroactive, strong fit given what's shipped — now backed by the public traction dashboard) and keep Builder Rewards running (automatic).
- Consider Base Batches once Tiers 1–2 are live.

## Verification per tier
- Every tier ends with a live end-to-end proof on the published site (real sign-in, real paid call, real card unfurl, real EAS attestation read back from Base), and regression tests where logic is added (payment crediting, signature verification, permission caps, homepage render).

## Technical notes
- Wallet stack: `viem` (+ `wagmi` only if needed) for SIWE signature checks, ERC-7715 grants, and Basename resolution; server verifies signatures inside `createServerFn` handlers — no secrets in the browser bundle.
- MCP server: read-only tools mapped 1:1 to existing public data functions, published as an open-source package; AgentKit provider wraps the same endpoints with x402 payment handling.
- Bazaar manifest + 402 self-description live in the existing `x402-middleware.ts` and a new public route under `src/routes/api/public/`.
- EAS attestations: schema registered on Base, attestations signed from a dedicated SPX402 attester key held in the vault; badge subscription state in a new table with RLS + GRANTs in the same migration.
- New tables/columns (linked wallet on profiles, `alert_channels` type for Base, badge subscriptions, spend-permission grants) get RLS + GRANTs in the same migration.
- No new colors, fonts, or layout — Base elements inherit the existing terminal design system.
