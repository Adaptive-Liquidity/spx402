# SPX402 — AEON repositioning + full platform redesign

## What SPX402 + AEON now enables

AEON turns SPX402 from a token-watcher into an **execution credit bureau for autonomous agents**. Instead of only tracking deposits → buybacks → burns, the platform grades what an agent actually does:

- **Escrows** — created, released, canceled: proof that paid work completes.
- **Slashable bonds** — capital at risk behind a promise; slashing is negative evidence nobody can fake.
- **Hash-chained receipts** — every graded action anchored in an append-only chain, independently verifiable.
- **A 40/30/15/10/5 grade** — escrow completion, slashable bond, failures, recency, operator verification — feeding the same tape, dossier, confidence model and paid API as the existing lanes.

The backend for this is already live. The site does not yet look or read like it.

## Design direction (locked)

Chosen and applied consistently across every page:

- **Palette — Ledger Emerald:** `#064e3b` deep emerald, `#0d7a5f` mid emerald, `#c9a84c` gold accent, `#f5f0e0` warm paper. Emerald carries authority and trust; gold is reserved strictly for grades, scores and primary actions — never decoration.
- **Type — Sora (headings) + Manrope (body).** A monospace stays in use for one job only: on-chain data — addresses, signatures, amounts, event codes.
- **Layout — Full-width sections.** Stacked storytelling bands with generous whitespace, replacing the current dense terminal grid on marketing pages. Data pages keep density but adopt the new tokens and rhythm.

All of it defined as semantic tokens in `src/styles.css` — no hardcoded colors in components. Fonts loaded via `<link>` in the root route.

## Redesign scope, page by page

### Foundations
Rewrite the token layer: emerald/gold/paper scales, grade colors remapped onto the new palette, elevation and border tokens, spacing rhythm. Update `SiteHeader`, `SiteFooter`, `TickerTape`, `Panel`, `MetricCard`, `ExecutionGradeBadge`, `AgentRow`, `ChainBadge` to the new system so every page inherits it.

### Homepage
Full-width bands: hero ("HTTP 402. Payment required. Proof provided."), live tape band, proof chain (escrow → work → bond → grade), the two-chain settlement band, anomaly band, closing call to action. Keeps the live-evidence content, loses the cramped panel-in-panel framing.

### Leaderboard / Explore / Flagged
New table treatment with the emerald surface and gold grade badges. Rewrite the tab descriptions still reading "SOL routed into buybacks" and "hit their buyback windows" into execution language.

### Agent dossier
Restructure into full-width sections: identity + grade header, pillar breakdown, escrow/bond/receipt evidence, the event tape, probe status. AEON metric cards get first-class placement.

### About
Currently reads "It follows buybacks." Rewrite around execution evidence, with buybacks named as one legacy lane.

### Register / Submit
Copy names AEON alongside tokenized, registered and x402 as a first-class category, with an explainer for what an AEON agent needs on-chain. The picker itself already picks up the category automatically.

### Alerts
Add escrow created/released/canceled, bond deposited/slashed and receipt created toggles so AEON agents are watchable. Needs a small migration adding those boolean columns to the subscriptions table.

### Status
Add the AEON lane heartbeat next to tokenized / registered / x402 / prober.

### Pricing / API docs
Restyle to the new system and make sure the paid endpoint descriptions list the AEON fields — escrow success rate, active bond, slashed totals.

### Methodology
Already rewritten for the 40/30/15/10/5 model; restyled only, content unchanged.

## Not changing
- Legacy tokenized, registered and x402 lanes keep working — every agent currently indexed lives in them.
- No seeded demo agents. Empty states stay honest until real AEON agents are indexed.
- Scoring math, decoders and API contracts are untouched by the redesign.

## Verification
- Typecheck clean, full test suite green (the verbatim-copy tests will need updating where copy changes).
- Visual pass on every page at desktop and mobile.
