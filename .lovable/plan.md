# Hero + Homepage: Award-Grade Treatment

Goal: make the first five seconds unforgettable, then carry that craft down the whole landing page so it reads as one authored experience rather than a stack of sections. The design language stays exactly as chosen — deep emerald surfaces, ledger gold reserved for grades and actions, Sora over Manrope, full-width bands. Nothing new is invented about the product; every claim stays tied to what the ledger actually shows.

## The hero, rebuilt as a moment

1. **A curtain-raise on load.** A brief, one-time opening sequence: the ticker line snaps in, the eyebrow pill lights, then the headline arrives line by line with the gold line last and a faint sweep of light across it. Under a second in total, never repeated on navigation, fully skipped for anyone who prefers reduced motion.
2. **A living backdrop.** Behind the headline, a slow emerald aura plus a very faint engraved grid that drifts with the cursor. It should feel like glass over a terminal, not like a particle demo.
3. **Numbers that count themselves in.** The four stat cells (agents indexed, settlements verified, services probed, active facilitators) roll up from zero once, in sequence, with the gold hairline underlining each as it settles.
4. **One signature visual.** A live grade dial rendered beside or behind the search — the real distribution of grades we already hold — so the hero itself is evidence, not decoration.
5. **The search as the hero's centre of gravity.** Larger field, gold focus ring that breathes, a rotating set of real example subjects as placeholder hints, and a clear "or browse the leaderboard" escape hatch.
6. **Scroll invitation.** A quiet gold cue at the base of the hero that fades the moment scrolling starts.

## Carrying it through the page

Applied section by section so each band earns its scroll:

- **Section rhythm.** Every band gets an eyebrow, a hairline rule, and consistent vertical air. Alternating alignment (centred, then left with a wide right column) so the eye keeps moving.
- **Staggered reveals.** Grid cells enter in sequence rather than all at once — 60–80ms apart, direction matched to reading order.
- **The proof chain becomes a sequence.** The five settlement steps light one after another as they enter view, with the connecting rule drawing itself between them.
- **The failure panel gets teeth.** The fifteen failure patterns render as a dense, monospaced plate that highlights row by row — the most "terminal" moment on the page.
- **Cards with physics.** Consistent lift, a border that warms to gold, and a soft inner glow on hover; the same feel on every card so the page has one hand behind it.
- **Live tape.** Keep it alive but calmer: new rows slide in with a brief gold flash, older rows dim toward the bottom edge.
- **Pricing and audiences.** Tighter columns, one clearly recommended tier, and the same hairline framing used in the hero.
- **Closing band.** A full-width, quiet finale — large type, single gold action, the aura returning at low intensity to bookend the page.
- **Perceived speed.** Everything above the fold renders immediately; heavier panels below fade in as they approach. Reduced-motion users get the full layout with no movement at all.

## Technical notes

- All motion lives in the existing shared layer in `src/styles.css` plus the `Reveal` component; no animation library is added.
- The hero is extracted from `src/routes/index.tsx` into `src/components/spx/Hero.tsx` with the intro sequence, aura, cursor-reactive grid, count-up stats and grade dial as siblings, so the route file returns to a readable list of bands.
- New shared pieces: `CountUp`, `GradeDial` (fed by the existing leaderboard query — no new tables or endpoints), `SectionHeader`, and a `Stagger` wrapper around `Reveal` for index-based delays.
- Every animation is gated behind `prefers-reduced-motion` and the intro runs once per session.
- Scoring math, decoders, cron pipelines, API responses and all copy claims are untouched; the only copy changes are placeholder hints and the scroll cue.
- Verified with typecheck, the full test suite, and screenshots at phone, tablet and desktop widths.
