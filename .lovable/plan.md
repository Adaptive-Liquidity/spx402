# Homepage — graphite terminal polish

Goal: keep the current sharp positioning, remove the emerald/pub feeling, and turn `/` into a restrained institutional terminal. The homepage stays data-led and multi-chain; no invented capabilities or decorative casino chrome.

## 1. Graphite design system

Replace the emerald-led core palette with the supplied restrained tokens, expressed as OKLCH values in `src/styles.css`:

- page `#08090B`
- panels `#101114`
- hairlines `#2A2D32`
- primary type `#E7E2D6`
- muted type `#8B9098`
- metal accent `#C4A574`
- failure/unverified `#C4453A`
- pass `#7D9B8A`, reserved for AAA/pass states only

Remove the green radial wash, emerald gradients, green glow, and green-tinted shadows. Preserve scanlines, engraving, aperture motion, typography, and the existing graphite/brutalist structure. Metal appears only on LIVE, ANALYZE, and the ticker; ordinary rules and labels remain grey.

Because these are shared semantic tokens, the palette correction will also remove green from the common header/footer and prevent old page components from reintroducing it. This pass otherwise changes homepage content only.

## 2. Header and ticker

- Logo lockup: `REPUTATION TERMINAL · SOLANA + BASE`.
- Keep `SYSTEM: NOMINAL`.
- Signed-in Dashboard and signed-out Open Terminal controls become hairline/text treatments, not gold boxes.
- Keep the full-bleed ticker as the only continuously moving metal element.

## 3. Hero — keep the knife

- Eyebrow uses the live indexed-agent count: `LIVE · SOLANA + BASE · {count} UNDER WATCH` (it will show `660` when the ledger count is 660 rather than freezing a stale number into copy).
- H1: `Agents lie. The ledger doesn’t.`
- H1b: `We read the ledger.`
- Sub: `We grade what settled. Nothing else.`
- No Connect Wallet or other hero button row.
- Keep one query field and one metal `ANALYZE` action.
- Replace the three heavy console tabs with quiet text links: `Tape` · `Methodology` · `Claim an agent`.
- Move the 11px kicker below the complete query instrument: `NO SCREENSHOTS. NO PROMISES. JUST PROOF.`
- Keep the aperture ingress, dial, query behavior, and responsive geometry; remove the green horizon/specular glow.

## 4. Grade strip — make the evidence the screenshot

- Double the strip height.
- Grade D renders in blood red and receives its true data-proportional width; AAA–B remain dead grey except AAA may use the restrained pass token.
- Labels show grade + count directly (for example `D 647`).
- Remove gold dominance treatment and gold caption.
- Keep SPX404/awaiting evidence visually separate and muted rather than presenting it as a healthy grade.

## 5. Metrics — no empty theater

- Numeric zero renders as `0`; remove `Awaiting first probe`.
- Keep only cells backed by current live data.
- Preserve the current four operational metrics and settlement sparkline; no fabricated values.

## 6. What we offer — three live cells, not essays

Replace the current long proof-intro presentation with three compact, live ledger cells:

1. **Grade / unverified:** current grade distribution plus count of agents whose operator is not verified.
2. **Last tape print:** newest available tape event and timestamp; honest `NO PRINT` state if none exists.
3. **Bonded / slashed:** aggregate `activeBondAmount` and `totalSlashedUsd` from the loaded agents; `NO BOOK` when both are zero.

The cells use data already loaded by the homepage. No new endpoint or table.

## 7. How we grade

- H2: `If it didn’t settle, it didn’t happen.`
- Positioning: `SPX402 evaluates observable on-chain execution. We do not measure token price, social momentum, vibes, or future promises.`
- Four concise inputs:
  - Deposit Consistency — Regularity of capital flowing into the agent.
  - Execution Rate — Ratio of successful buybacks within expected windows.
  - Burn Confirmation — Direct on-chain proof of destroyed supply.
  - Operator Identity — Wallet signature matching the on-chain creator.
- Keep the 15-pattern failure plate below the inputs.
- Keep the x402 settlement band as its own proof mechanism.

## 8. Operators

Replace the generic three-audience band with a focused conversion band:

- H2: `Unverified is the default. The badge is the exit.`
- One short support line explaining that an operator signs once, claims the dossier, and can deploy the dynamic attested badge.
- Primary action: `[ Claim Your Agent ]` → `/register`.
- No routing, visibility, institutional adoption, or other capability claims the product does not currently support.

## 9. Keep, tighten, and de-Solana

- Keep the x402 band, grade taxonomy, API, pricing, featured agents, and final query CTA.
- Sweep Solana-only homepage wording and examples; refer to Solana + Base or chain-neutral identifiers where appropriate.
- Final CTA becomes `Paste the identifier.` rather than `Paste the mint.`
- Remove `Thousands of agents… until today` and similar inflated copy.
- Homepage metadata becomes chain-neutral and uses the retained hero line:
  - Title: `SPX402 — On-Chain Reputation for Autonomous Agents`
  - Description: `Agents lie. The ledger doesn’t. SPX402 grades settled execution, verifies operators, and exposes machine-readable evidence across Solana and Base.`

## Technical scope

- Primary files: `src/styles.css`, `src/components/spx/Hero.tsx`, `src/components/spx/GradeDial.tsx`, `src/components/spx/QueryConsole.tsx`, `src/components/spx/SiteHeader.tsx`, `src/components/spx/TickerTape.tsx`, `src/routes/index.tsx`.
- Existing components and live loader data remain authoritative. No backend, schema, billing, scoring, or API changes.
- Metadata on `/` will include title, description, `og:title`, `og:description`, `og:type`, and `twitter:card`.
- Verify with the TypeScript check, full tests, and screenshots at desktop and mobile widths, including reduced motion and zero-data states.