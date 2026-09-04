# Hero + Homepage: Architectural Horizon Aperture

Goal: an award-grade landing page that opens as one continuous mechanical gesture rather than a sequence of items popping in. No SaaS cascade, no retro-terminal tropes. The palette and type stay locked — obsidian emerald ground, ledger gold hairlines, Sora over Manrope — and every number on the page stays tied to what the ledger actually holds.

## The hero, rebuilt as one gesture

1. **Monolithic ingress — zero stagger.** Nothing moves position. At load, a single 1px gold hairline extends from the exact centre of the hero to both edges. At ~180ms it cleaves into an upper and lower rule that expand outward like a wide-format film aperture, revealing headline, console and dial through one synchronized clip — not six separate entrances. Whole gesture lands under 850ms with no layout shift.
2. **Text inscription, not fade-in.** The headline converges optically: scale 1.02 → 1.00 with blur 6px → 0px in the same 400ms. It should read as stamped into dense banknote paper, never as sliding text.
3. **Backdrop: micro-engraved banknote field.** Deep obsidian-emerald ground with a fine vector guilloche of non-repeating hairlines at ~4% opacity. Mouse movement tilts a specular highlight across the engraving — no floating glow orb.
4. **Signature visual: the viewfinder dial.** One oversized 180° grade caliper that physically cradles the search bar, with grade buckets demarcated as etched arcs and tick marks. It reads live grade distribution from the data we already hold, and the dominant grade casts a soft gold caustic onto the rim of the console. The search sits on the dial's chord line, over a frosted optical-crystal slab so the ticks refract behind it.
5. **Metrics: instant tabular registration.** No odometer. Real values appear fully formed as the aperture completes, in tabular figures, each cell settling with a single sub-pixel dampening snap while its label tightens its letter-spacing — instant, accurate, uncompromising.
6. **Search: heavyweight ledger query console.** Wide-stance command bar framed in the same hairline coordinate system as the band. A `/` or `⌘K` hint cut into the right border as an engraved brass pill. Placeholder examples change by horizontal slide — old query exits left in condensed tracking, new one enters from the right behind a soft gold cursor. "Browse the leaderboard" becomes a mechanical tab integrated into the console's bottom border, not floating text.

## Carrying the language down the page

- **Coordinate framing replaces card lifts.** Sections and cards are defined by hairline rules that extend and retract on hover, with internal glass refraction — no generic translate-up hover.
- **Aperture, not cascade.** Each band reveals through a single clip expansion from its own median rule; grids inside a band open together, never one cell at a time.
- **Proof chain as a caliper track.** The five settlement steps read as marks along one drawn rule rather than five separate cards arriving in turn.
- **Failure patterns as a ledger plate.** The fifteen patterns render as one dense engraved plate with a hairline cursor sweeping the active row.
- **Live tape, calmer.** New rows register with a single gold hairline flash; older rows recede toward the plate edge.
- **Pricing and audiences.** Same hairline coordinate frame, one recommended tier, tabular figures throughout.
- **Closing band.** The aperture reverses at low intensity — the horizon hairline returns to bookend the page under a single gold action.
- **Discipline.** Everything above the fold is present at first paint; motion only reveals, never fetches. Reduced-motion users get the finished frame with zero animation.

## Technical notes

- Motion is CSS-only: `clip-path: inset()` aperture, transform/filter convergence, `cubic-bezier(0.16, 1, 0.3, 1)` throughout, driven by a single `hero-ingress` state class plus CSS custom-property delays. No animation library. The existing `Reveal` stagger stays available for lower-priority page furniture but is replaced by an `Aperture` wrapper on the homepage.
- New components in `src/components/spx/`: `Hero.tsx` (ingress choreography, guilloche field, metrics registration), `GradeDial.tsx` (SVG caliper, arcs and ticks, fed by the existing leaderboard/grade query — no new tables or endpoints), `QueryConsole.tsx` (framed search, brass keyboard pill, ghost-typist placeholder, leaderboard tab), `Aperture.tsx` (per-band clip reveal).
- The guilloche is an inline SVG pattern at low opacity with a CSS specular layer moved by pointer position through custom properties — no canvas, no per-frame JS layout work.
- Glass uses Tailwind `backdrop-blur`/`backdrop-saturate` utilities only; no hand-written vendor-prefixed `backdrop-filter`.
- Gold, obsidian and emerald values are added as tokens in `src/styles.css` only where the current scale lacks them; components keep using semantic tokens, never raw hex.
- Scoring math, decoders, cron pipelines and API responses are untouched. Copy changes limited to placeholder examples and the console's tab label.
- Verified with typecheck, the full test suite, and screenshots at phone, tablet and desktop widths, plus a reduced-motion pass.
