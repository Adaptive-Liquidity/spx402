# Homepage: Institutional Ledger Specification & Final Build Polish

Structural depth, typographic precision and calibrated feedback across the landing experience, holding the locked design language: obsidian-emerald ground, ledger gold hairlines, Sora over Manrope, full-width architectural bands.

## 1. Global framing and foundations

- **Coordinate spine.** Fixed vertical hairlines pinned at the desktop content bounds, with a 5px gold registration mark (`+`) at every intersection where a section rule crosses a margin.
- **Telemetry pill.** Persistent fixed top-right readout: `SYSTEM: NOMINAL · UTC 00:00:00` in 10px monospace.
- **Anti-banding grain.** Fixed repeating 64x64 SVG micro-grain at 1.5% opacity, `pointer-events: none`, overlay blend — kills gradient banding on the deep emerald surfaces.
- **Numeric precision.** `font-feature-settings: "tnum" on, "zero" on` on all figures and hashes; `text-rendering: geometricPrecision` and antialiasing on headings for hairline sharpness on dark ground.

## 2. Hero: horizon aperture and physical depth

- **Monolithic ingress, zero stagger.** 0–180ms: a single gold hairline expands from centre to bounds on `cubic-bezier(0.16, 1, 0.3, 1)`. 180–650ms: it cleaves into top and bottom perimeter rules and the headline, console and caliper reveal through one synchronized `clip-path: inset()` expansion.
- **Text settlement.** Headline resolves from `blur(6px)` to `0` with optical scale 1.02 → 1.00. No per-line pop-in.
- **Physical ground.** Wide emerald horizon wash low in the band plus a vertical vignette; guilloche engraving set to a quiet tactile baseline with a 12s ambient specular drift that disables under reduced motion.
- **Rhythm.** Compress the gaps between badge, headline, console and metrics so the full hero deck fits 1280x800 with the live tape header teasing above the fold. Headline drops to two weights; line three carries a localized gold back-glow.

## 3. Grade caliper: partitioned evidence

- Track splits into two structural zones: a **graded arc** (AAA→D) in high-fidelity etched segments with gold index ticks, guaranteed a minimum 15% of track width so small pools stay legible; and an **awaiting evidence** reserve band, darkened and fine-hatched, separated by a distinct gold notch rule.
- Caption becomes a two-state readout: `N graded · M awaiting evidence`.
- Hovering an arc shows an inline micro-popover with grade density and verified settlement volume, with no layout shift.

## 4. Query console: centre of gravity

- Sits on the caliper's chord line, framed with cold glass bevels (light top edge, dark bottom edge).
- Placeholder cycles real ledger paths by horizontal wipe, not opacity fade. `[ ⌘K ]` engraved into the right perimeter.
- Focus drops outer shadow entirely for a sharp gold inner perimeter highlight plus a collimated 1px vertical beam cast down into the metric band.

## 5. Metrics: instruments, not text

- Four stat cells in hairline coordinate brackets with micro corner ticks.
- Values render immediately as tabular figures with a single 0.5px dampening snap.
- Zero-value metrics suppress the raw `0` and render a dimmed, letter-spaced `AWAITING FIRST PROBE`.
- A 24px high-density SVG bar sparkline sits under *Settlements verified*, computed from the tape payload already loaded — no extra request.

## 6. Live tape: high-frequency settlement feed

- Terminal header chrome: pulsing status dot with polling interval, aggregate event counter, UTC arrival stamp.
- Truncate to 8 rows with a 40px linear fade to the page ground and an anchored mechanical tab: `[ OPEN FULL REPOSITORY TAPE ↗ ]`.
- Values right-aligned in tabular mono; zero-value rows dropped to 40% opacity to push noise back; new arrivals flash a 1px gold hairline border for 150ms before settling.

## 7. Down-page cadence

- Alternating plate grounds (obsidian → plate emerald → obsidian) separated by continuous hairline rules.
- Numbered ledger spine on section headers (`01 // ENGINE`, `02 // TAXONOMY`, …); dividers draw in via scroll-linked `scaleX()`.
- **Diagnostic plate.** The fifteen failure patterns consolidate from grid cards into one monolithic monospaced board; hovering a row activates a crosshair guide rule and highlights the row metadata in sharp phosphor.
- **Proportional taxonomy.** Grade taxonomy becomes a continuous scale bar with proportional threshold cutoffs instead of a disconnected table.
- **Terminal API block.** Industrial frame, syntax-toned JSON, copy action swapping the icon for a gold verification tick with a 150ms container border flash.
- **Finale.** Closing band mirrors the hero: full-width guilloche plate, converging hairlines, one ledger-gold action.

## 8. Mobile and safeguards

- Under 768px: guilloche frequency steps down to avoid moiré on high-DPI screens; caliper collapses to a linear status ribbon with 44px minimum tap bounds; hero drops to one column without clipping the coordinate borders.
- Every transition wrapped in `prefers-reduced-motion`; aperture, drift and wipe resolve instantly to final values with zero layout shift.
- Async loading falls back to an obsidian wireframe plate with a single sweeping gold scanner hairline rather than generic skeletons.

## 9. Technical scope

- Files: `src/routes/index.tsx` (band sequencing), `src/components/spx/Hero.tsx`, `GradeDial.tsx`, `QueryConsole.tsx`, `LiveTapeHero.tsx`, new `FailurePlate.tsx`, and `src/styles.css` (spring tokens, grain overlay, hairline utilities).
- Zero new dependencies: native CSS keyframes, SVG paths and existing Tailwind utilities only. No Three.js, no Framer Motion.
- New colour values (including the phosphor accent used on failure-row hover) are added as tokens in `src/styles.css`; components keep using semantic tokens, never raw hex.
- No changes to scoring math, decoders, cron pipelines, loaders or API responses. Caliper, sparkline and tape all read data the page already loads.
- Verification: `bunx tsgo --noEmit`, the full unit/component suite, and visual passes at 390 / 834 / 1280 plus a reduced-motion pass.
