# SPX402 + AEON Website Unification Pass

A finish pass, not a redesign. Palette, typefaces, voice, routes, backend contract and product positioning all stay exactly as they are. What changes is consistency: every page gets the same frame, rhythm, controls, states and formatting, so the site reads as one engineered product rather than a set of individually designed pages.

## What's actually inconsistent (measured, not assumed)

- **Four page widths** in use — `1400px`, `1200px`, `1100px`, `900px` — plus scattered `max-w-3xl` / `2xl` / `xl` reading wrappers. Content edges don't line up between routes.
- **Four page-title sizes** (`text-2xl`, `3xl`, `4xl`, `5xl`) used for equivalent headings, so the same rank of page shouts at different volumes.
- **The primary button is hand-written 17 times** as raw utility classes instead of one component, so padding, hover, disabled and focus drift page to page.
- **Section spacing is free-hand** — `py-8`, `py-12`, `py-16`, `py-24` with no rule tying spacing to hierarchy.
- **Two visual languages coexist**: the homepage's engraved band system (numbered spines, hairline rules, guilloché, aperture crop) and the flat utility pages that share none of it.

---

## Pass 1 — Foundation: one grid, one scale, one control system

**Container system.** Two official frames. `stage` for terminal/data pages (Registry, Leaderboard, Agent dossier, Dashboard, My Agents, Wallets, Income Routing, API). `stage-narrow` for reading/trust documents (Methodology, Corrections, Genesis Record, AEON Agents, legal). Every ad-hoc wrapper is removed; gutters are identical at desktop, tablet and phone.

**Type scale.** One hierarchy applied everywhere: page eyebrow, page title, standfirst, section title, subsection title, body, small metadata, mono label. Equivalent pages get identical title rank.

**Vertical rhythm.** Four named values — `band`, `section`, `subsection`, `stack` — replacing free-hand padding.

**Control primitives.** `ActionButton`, `Panel`, `SectionHeading`, `PageHeader`, `StatusChip`, `DataTable`, `EmptyState`, `Skeleton`, `StatCell`, `DetailSection`, `WalletAddress`, `CopyToClipboard`. Every button state — default, hover, active, disabled, loading, keyboard focus — is defined once.

## Pass 2 — Blue-chip finish

**PageHeader on every interior route**: eyebrow, title, one-line standfirst, and a meta strip (last indexed, methodology version, decoder version, evidence-floor version, release status, public/private, coverage). Any value the backend doesn't return renders as a clean pending/unavailable state — never a placeholder that looks real.

**Accessibility**: skip-to-content link, one amber focus ring on every interactive element, visible keyboard states, correct heading order, accessible status text, reduced-motion support.

**Loading**: skeletons shaped like the real content — table rows, dossier cards, evidence timeline, registration wizard, wallet panels, document pages. No layout jumps.

**Empty states**: one calm, trust-building system, using the spec's exact tone — "No agents qualify yet. SPX402 only ranks agents after verified evidence meets the public floor." / "No evidence returned yet. This agent is tracked, but SPX402 has not indexed qualifying activity." / "This agent is private. It can be configured, verified, and tested before publication."

**Tables**: one language across Registry, Leaderboard, evidence timeline, API usage, My Agents, Wallets, Income Routing and Corrections — same density, row height, sticky header, hover, selected, sort affordance, empty state and mobile stacked-card behaviour.

**Formatting**: `formatUtc`, `truncateAddress`, `formatSol`, `formatUsd`, `formatBps`, `formatScore`, `formatPercent`, `formatTxSignature` — one implementation each. Tabular figures, aligned decimals, one UTC format, one truncation rule, one grade chip. No page invents its own.

**Motion**: one duration token, one easing token, reveal-on-scroll for major bands only, reduced-motion respected. No bouncing or decorative particles.

**Header**: condenses subtly on scroll with a hairline rule. **Footer**: becomes a proper site index — Product (Register Agent, Registry, Leaderboard, AEON Agents), Trust (Methodology, Corrections, Genesis Record, Status), Developers (API, Dossiers, Evidence Bundles, Attestations), Company (About, Contact, Legal). Trust surfaces are always one glance away.

## Pass 3 — Extend the house style to every route

Interior-page versions of the homepage language: numbered band spines, engraved hairline rules, restrained terminal texture, aperture framing, precise panel borders, section numbering where it helps. Continuity, not noise — utility pages stay quiet.

Applied in evaluation order: Methodology → Registry → Agent dossier → Register Agent → Leaderboard → AEON Agents → Genesis Record → Corrections → API → My Agents/Dashboard → Wallets & Income Routing.

---

## Product-specific polish

**Homepage** — hero stays "Agents can lie. Evidence can not." The reveal band below it, "The first credit layer agents can actually earn," becomes monumental but credible: AEON identity → controlled authority → SPX402 Wallet → reputation earned from evidence, closing on "This is not a leaderboard for bots. It is infrastructure for accountable machine economies."

**AEON Agents** — a product-grade explanation, not a docs dump: "AEON Agents are agents with identity, authority, and receipts," then AEON Program, AEON Agent, CRI, scoped authority, fail-closed accounting, receipts, bonds, escrow, SPX402 reputation. Launch state uses explicit labels (Devnet Live / Mainnet Pending / Mainnet Live / Indexed / Verified / Graded) read from the backend — mainnet status is never claimed.

**Register Agent** — feels like opening a verified financial identity: consistent progress rail across Agent type, Agent basics, AEON identity, SPX402 Wallet, Ownership and income routing, Operator verification, Privacy and publication, Disclosures, Evidence/status preview, Review and submit. No step is a raw form dump.

**Agent dossier** — a public credit file. The first screen answers, without scrolling: who the agent is, verified or not, public or private, SPX402 Wallet present, what evidence exists, provisional or full grade, issuer interest, attestation.

**Registry / Leaderboard** — financial-grade data products: one row language, no messy columns, provisional status and issuer-interest markers visible on the row itself.

**Methodology / Corrections / Genesis Record** — institutional trust documents: narrow measure, strong header, meta strip, section numbering, engraved definition panels, version badges, correction and attestation callouts.

**Wallet naming** — public copy says SPX402 Wallet / Agent Wallet / Payment Wallet / Income Wallet. "x402" survives only in developer and API notes, with the allowed line: "SPX402 Wallets may use x402-compatible payment rails internally. Public users do not need to manage x402 directly."

## Data honesty

Verification, grade, score, decoded events, event count, evidence-floor status, attestation, wallet ownership, income routing, fee routing, issuer interest, correction history, public/private state and mainnet status are backend-owned. Missing values render as pending, unavailable, not returned, waiting for evidence, private, or not yet graded. No production-looking demo data.

## Technical section

- `src/styles.css` `@theme` tokens: container widths, spacing rhythm, motion duration and easing, focus ring, table density, panel border, status colors. Utilities exposed via `@utility`: `stage`, `stage-narrow`, `band`, `section`, `subsection`, `focus-ring`, `tabular`, `hairline`.
- Primitives live in `src/components/spx/`; existing `Panel`, `DataTable`, `EmptyState`, `StatusChip`, `DetailSection` are extended rather than duplicated. `ActionButton` variants via `cva`.
- Formatting helpers centralised in `src/lib/format.ts` and adopted route by route.
- Ad-hoc wrappers, inline button classes, title classes and table styles replaced one route at a time.
- After each pass: `bunx tsgo --noEmit`, `bun test`, every route returns 200, visual check at 1280px and 390px, keyboard focus visible, reduced motion honoured, no private data on public pages, no fake truth-sensitive values. The 8 existing network-dependent test failures are reported separately as pre-existing.

## Final report will list

Pages changed, components created/updated, tokens added, inline styles replaced, helpers centralised, routes visually checked, checks run, known issues left, backend data still needed, and the routes worth reviewing first.
