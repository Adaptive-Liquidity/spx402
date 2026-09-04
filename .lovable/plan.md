# Homepage: from clean to award-grade

The current landing page is well-structured but visually flat: the hero sits on near-black with large empty gaps, the grade caliper reads as a thin stripe dominated by ungraded subjects, the metric row is four plain numbers, and the live tape shows fourteen near-identical rows of "0.00 SOL". The fix is not more decoration — it is depth, hierarchy, proportion, and a few moments of real craft. Palette, fonts and layout language stay locked: obsidian-emerald ground, ledger gold hairlines, Sora over Manrope, full-width bands.

## 1. Give the hero physical depth

- Layered ground instead of flat black: a wide emerald horizon wash low in the band, a subtle vertical vignette, and the guilloche engraving raised to a visible-but-quiet level so the surface reads as engraved plate rather than empty space.
- Tighten vertical rhythm. The gap between the sub-headline and the console, and between console and metrics, is currently oversized on desktop; compress it so the whole hero (badge → headline → console → metrics) lands in one screen at 1280x800 with the tape teasing at the fold.
- Headline: reduce to two typographic weights rather than three tones, add a faint gold underglow behind the third line so "We read the ledger." carries the emphasis rather than competing with line one.
- Add a slow, near-imperceptible drift to the specular highlight so the plate feels alive even without pointer movement. Reduced motion turns it off.

## 2. Fix the grade caliper so it flatters the truth

Today 608 of 612 subjects are SPX404, so the bar is one long dim segment and reads like a bug. Reframe it honestly and beautifully:

- Split into two zones: a **graded** span (AAA→D) rendered at full fidelity with etched arcs, and an **ungraded / awaiting evidence** span, visually separated by a heavier gold division mark and labelled as such.
- Give the graded zone a minimum readable width so four graded agents still render as legible marks.
- Caption becomes two-part: "N graded · M awaiting evidence" — the honest empty-state story becomes part of the design instead of an accident.

## 3. Metrics: instruments, not text

- Each cell gets a hairline coordinate frame, tabular figures at a larger size, and a small unit/context line.
- Zero-value metrics (Services probed: 0) render as a dimmed "awaiting first probe" state rather than a bald 0, so the row never looks broken.
- Add a thin sparkline or bar under "Settlements verified" derived from the tape data already loaded — no new query.

## 4. Live tape: make it feel live

- Cap the homepage tape at 8 rows with a soft fade at the bottom edge and a "Open the full tape" mechanical tab.
- Suppress the visual repetition: value column right-aligned tabular, dim rows under a threshold, and give the newest row a gold hairline flash on arrival.
- Chrome the panel like a terminal head: live pulse, event counter, and the last-updated timestamp.

## 5. Down-page: rhythm and contrast

- Alternate band grounds (plate / deep / plate) with hairline dividers so the page breathes instead of scrolling as one dark sheet.
- Section headers get a numbered index mark (01 … 07) in the hairline frame — a reading spine for the whole page.
- "Fifteen failure patterns" becomes a single dense engraved plate with a hover cursor rule, not fifteen equal boxes.
- Grade taxonomy rows gain a proportional score track so the eight grades read as a scale, not a table.
- API block gets a real terminal frame with syntax-toned JSON and a copy affordance.
- Closing band: full-width horizon aperture reversing the hero gesture, one gold action.

## 6. Craft details that separate good from award-winning

- Consistent focus rings and keyboard affordances (the `⌘K` console already works — surface it in the header too).
- Hairline hover behaviour everywhere instead of card lift; no element moves more than 2px.
- Text balance on all headlines, no orphan words at any breakpoint.
- Mobile: hero recomposed to a single column with the caliper collapsing to a compact scale strip; tap targets ≥44px.
- Full reduced-motion pass: every animation resolves to the finished frame.

## Technical notes

- Work stays in `src/routes/index.tsx`, `src/components/spx/{Hero,GradeDial,QueryConsole,Guilloche,LiveTapeHero,Aperture}.tsx` and `src/styles.css`. New tokens only where the current scale lacks a value; components keep using semantic tokens, no raw hex.
- Motion remains CSS-only (`clip-path`, transform/filter, `cubic-bezier(0.16, 1, 0.3, 1)`); no animation library.
- Glass via Tailwind `backdrop-blur`/`backdrop-saturate` utilities only.
- No changes to scoring math, decoders, cron pipelines, loaders or API responses. No new queries — the caliper, sparkline and tape all read data the page already loads.
- Verified with `bunx tsgo --noEmit`, the full test suite, and screenshots at 390 / 834 / 1280 widths plus a reduced-motion pass.
