# Homepage copy rewrite — marketing-sharp, still earned

Goal: rewrite only the wording on `/` (src/routes/index.tsx) so it grabs visitors and sells the idea hard — while keeping every claim provable, keeping the layout/components untouched, and avoiding banned hype words. Every dramatic line is anchored to a real mechanism (escrows, slashable bonds, hash-chained receipts, live tape, HTTP 402 API).

## New copy, section by section

### Hero
- Eyebrow: `Live now · Solana mainnet · Every agent under watch`
- H1: `Agents lie.`
  `The ledger doesn't.`
  *(amber line)* `We read the ledger.`
- Sub: `SPX402 is the reputation terminal for the agent economy. Thousands of autonomous agents now move real money on Solana — and until today, nobody was keeping score. We watch every escrow, bond, slash, and receipt, then publish a live Execution Score anyone can check in one click.`
- Mono kicker: `No screenshots. No promises. Just proof, on-chain.`
- CTA labels stay (`Register your agent` / `Browse leaderboard` / `Methodology`) — actions, not slogans.
- Stat labels unchanged (real numbers only).

### The Proof Chain
- Eyebrow: `How proof works`
- H2: `Talk is free.` *(muted)* `Proof has a price — we track who pays it.`
- Body: `Every agent on SPX402 is graded on the same four-step chain. Complete it and the grade rises. Break it — anywhere, at 3 a.m., when nobody's watching — and the whole market sees.`
- Step bodies sharpened:
  - Escrow created → `A buyer locks real funds on-chain. The promise starts costing something.`
  - Work completed → `Escrow releases against a hash-chained receipt. Delivered, or it didn't happen.`
  - Bond posted → `Slashable capital stands behind the work. Fail, and it costs money — publicly.`
  - Grade assigned → `The evidence becomes a public SPX Execution Score. Permanent. Verifiable. Yours to beat.`

### The x402 Chain
- H2: `Two chains. One question.` *(muted)* `Did the money move?`
- Body: `Agents sell work over x402 on Solana and Base. We follow the full loop — challenge, payment, facilitator, delivery — and we notice when any step goes missing.`

### What SPX402 Catches
- H2: `The tape never blinks.` *(muted)* `Fifteen failure patterns, caught on-chain.`
- List items unchanged (they're real and specific — that IS the sell).

### Audiences
- H2: `Whoever you are, you need receipts.`
- Token communities → title `End the debate.` body: `One public dossier. One URL. When someone asks if the agent actually works, drop the link and walk away.`
- Operators → title `Proof is your pitch.` body: `A verified dossier outsells every thread you'll ever write. Catch failures before your holders do, and let your grade do the marketing.`
- Researchers & funds → title `Screen by evidence.` body: `Filter the agent economy by observable execution — escrows settled, bonds slashed, receipts chained. Not screenshots. Not vibes.`

### Execution Grade
- H2: `Wall Street grades bonds.` *(muted)* `We grade the machines.`
- Body: `Eight grades, from SPX AAA to SPX D, computed from nothing but observable execution. Not predictions. Not recommendations. Never financial advice.`
- Mono line: `A grade you can verify down to the signature.`

### API
- H2 stays — it's the strongest line on the page: `Agents will not browse dashboards.` *(muted)* `Agents will query other agents.`
- Body: `The agent economy needs a credit check, not a landing page. SPX402 exposes grades, escrows, bonds, and receipt trails over REST and pay-per-call HTTP 402 endpoints — built for machine buyers, auditable by anyone.`
- Example JSON unchanged (realistic, matches real fields).

### Pricing preview
- H2: `Verification is free.` *(muted)* `Vigilance is paid.`
- Card bodies unchanged.

### Featured agents
- Headline when populated: `Live on the tape right now.`
- Empty-state copy unchanged (honest states only).

### Final CTA
- H2: `Paste the mint.` *(amber)* `See what it's hiding — or what it's worth.`
- Footer disclaimer unchanged.

### Head metadata
- Title: `SPX402 — The Credit Bureau for Solana's Agent Economy`
- Description: `Agents lie. The ledger doesn't. SPX402 watches every escrow, bond, slash, and receipt on-chain and publishes a live, verifiable Execution Score for every Solana agent.`

## Verification
- Typecheck clean, full test suite green.
- Visual pass on `/` at desktop and mobile to confirm no line overflows its panel.
- Update verbatim-copy test only if it asserts any changed homepage strings (it targets methodology/anomaly panels — expected unaffected).

## Not changing
- No layout, color, font, or component changes. No new pages. No invented stats, testimonials, or claims. All other routes keep current copy.
