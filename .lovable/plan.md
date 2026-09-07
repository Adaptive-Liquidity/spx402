# Making SPX402 feel like one finished blue-chip product

The palette, typefaces and voice stay exactly as they are. What separates this site from a Bloomberg/Stripe-grade product today is not taste — it's **consistency and finish**. Right now every page was designed slightly differently, and the eye reads that as "assembled", not "engineered".

## What's actually inconsistent (measured, not guessed)

- **Four different page widths** across routes: `1400px`, `1200px`, `1100px`, `900px`, plus a scatter of `max-w-3xl` / `2xl` / `xl` for text. Content edges don't line up when you move between pages.
- **Four different page-title sizes** (`text-2xl`, `3xl`, `4xl`, `5xl`) used as top-level headings, so the same rank of page shouts at different volumes.
- **The primary button is hand-written 17 separate times** as raw utility classes instead of one component — meaning padding, hover and focus states drift page to page.
- **Section rhythm varies**: some pages use `py-8`, some `py-12`, some `py-16`, some `py-24`, with no rule tying spacing to hierarchy.
- **Two visual languages coexist**: the homepage's cinematic band system (spine numbers, guilloché, aperture) and the flat utility pages (methodology, build, dashboard) that share none of it.

## The work, in three passes

### Pass 1 — One grid, one scale, one set of controls

- One page frame everywhere: a single max width for data/terminal pages, a single narrower measure for reading pages, identical gutters at desktop, tablet and phone. Every page edge lines up.
- One type scale: a page title size, a section title size, a subsection size, body, and the mono label. Applied to every route so rank is readable at a glance.
- One vertical rhythm tied to hierarchy: major band, section, subsection — three spacing values, no free-hand numbers.
- Real components for the controls that repeat: primary action, secondary action, ghost/link action, panel, section header, stat cell, table. Every existing hand-written copy is replaced by these, so hover, focus ring, disabled and keyboard states become identical everywhere.

### Pass 2 — Blue-chip finish

- **Focus and keyboard states**: one visible amber focus ring on every interactive element, skip-to-content link, correct heading order per page. Institutional products are judged on this.
- **Loading and empty states**: skeletons that match the shape of the real content instead of layout jumps; one honest empty-state component with the same voice everywhere ("no print", "not yet returned").
- **Numbers behave like a terminal**: tabular figures, aligned decimals, one time format (UTC), one address-truncation rule, one grade chip. No page invents its own.
- **Tables and rows**: one density, one hover, one sticky header, one sort affordance across leaderboard, registry, tape, operators and dashboard.
- **Motion discipline**: one duration and one easing token, reveal-on-scroll only for major bands, everything respecting reduced-motion. Nothing bounces.
- **Chrome**: the header condenses on scroll with a hairline rule; the footer becomes a proper site index (product, data, trust, developers, company) rather than a link row. Trust surfaces — Methodology, Corrections, Genesis Record, Status — get a fixed home in the footer.

### Pass 3 — The house style extends to every page

The homepage's engraved language (numbered band spines, hairline rules, engraved panels, the aperture crop) is applied — quietly — to the interior pages so Methodology, Registry, Build, Agent dossiers and the Dashboard read as chapters of one document. Interior pages get a consistent page header block: eyebrow, title, one-line standfirst, and a status/meta strip. Every route gets a real page-level meta line (last indexed, version, coverage) where the backend already returns one.

## Explicitly not in scope

No palette change, no typeface change, no copy rewrite, no new claims, no scoring/decoder/API changes, no route or URL changes. Data honesty rules stay: nothing renders a grade, verification or count that the backend didn't return.

## Technical section

- Add tokens to `src/styles.css` under `@theme` for spacing rhythm, container widths, motion duration/easing, and focus ring; expose them as `@utility` classes (`stage`, `stage-narrow`, `band`, `section`, `focus-ring`).
- New primitives in `src/components/spx/`: `PageHeader`, `ActionButton` (primary/secondary/ghost variants via `cva`), `StatCell`, `SectionHeading`, `Skeleton` shapes, plus adoption of the existing `Panel`, `DataTable`, `EmptyState`, `StatusChip`, `DetailSection`.
- Replace the 17 inline `border-amber/80 bg-amber/10 px-…` buttons and all ad-hoc `max-w-*` page wrappers with the primitives above, route by route.
- Formatting helpers centralised: `formatUtc`, `truncateAddress`, `formatSol`, `formatUsd` — one implementation, used everywhere numbers or addresses render.
- Verification each pass: `bunx tsgo --noEmit`, `bun test` (the 8 network-dependent failures stay out of scope), every route returns 200, and a visual check at 1280px and 390px.

## Suggested order

Pass 1 first — it produces the largest perceived jump for the least risk. Pass 2 next. Pass 3 last, page by page, starting with Methodology, Registry and the Agent dossier since those are the pages an evaluator actually reads.
