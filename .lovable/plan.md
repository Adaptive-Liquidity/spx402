# SPX402 — Launch-Ready, Luxury-Grade Platform

Goal: take the site from "correct but uneven" to a finished, premium product people can sign up for and use today. The design language is already chosen (deep emerald surfaces, gold accents, Sora headings over Manrope body, full-width sections). This plan applies it consistently, closes the unfinished corners, and makes every page feel intentional.

## Where things actually stand

Verified against the live database and the code:

- 612 agents and 303 recorded events — the leaderboard, explore and dossier pages have real material.
- 0 paid services, 0 probe runs, 0 execution receipts — the newest lanes (active verification and AEON receipts) will show empty states until real activity lands.
- 4 registered accounts; sign-in with Google and Apple already works.
- Four areas still say "Coming soon": the account dashboard, its alerts panel, its API keys panel, and the alerts box on an agent's page.
- The top navigation has no mobile menu at all — on a phone, every link except the logo disappears.
- Page sizes are very uneven: the agent dossier is ~1,600 lines and the methodology ~1,000, both built before the new look, while newer pages are lean.

## Phase 1 — Finish what's half-built (blocks launch)

1. **Mobile navigation.** Add a proper slide-in menu with every section, sign-in state, and search. Right now the site is unusable on a phone.
2. **Turn off "Coming soon."** Wire the account dashboard to real data: watchlist, saved agents, alert subscriptions (the storage for AEON event toggles already exists), and API key creation/revocation with usage counts. Replace the placeholder on the agent page with the working alert control.
3. **Empty states with dignity.** Every surface with no data yet (services, probes, receipts) gets a designed explanation of what will appear there and when — never a blank panel or a zero that looks broken.
4. **Error and loading states.** Consistent skeletons and a branded "not found" / "something broke" page across all routes.

## Phase 2 — The luxury pass (page by page)

Applied in this order, each page fully finished before moving on:

1. **Homepage** — tighten the section rhythm, add scroll-triggered reveals, a live ticker treatment that feels alive rather than busy, and one signature visual moment in the hero.
2. **Leaderboard & Explore** — premium table craft: sticky headers, refined row hover, grade chips, sort affordances, filter chips, responsive card view on mobile.
3. **Agent dossier** — the most important page and currently the least designed. Restructure into a clear hierarchy: identity header with grade, an evidence timeline, proof chain, and secondary panels below. Split the file into components while restyling.
4. **Methodology** — long-form editorial treatment: sticky table of contents, generous measure, pull quotes for the scoring weights, version changelog styled as a record.
5. **Tape, Pulse, Operators, Status** — unify panel styling, spacing scale, and the mono label treatment already used elsewhere.
6. **Pricing, API docs, About, Register, Submit, Login/Signup** — marketing-grade layout, real copy, code samples with copy buttons, and trust signals.
7. **Motion and polish layer** — shared entrance animations, hover physics on cards and buttons, focus rings, and reduced-motion support.

## Phase 3 — Launch readiness

- **Accessibility** — keyboard paths, focus order, contrast checks against the emerald palette, alt text on every image and badge.
- **Search preview and sharing** — unique title/description per page, social preview cards, structured data for the agent pages.
- **Performance** — image formats, font loading, lazy panels below the fold; verify the homepage and dossier feel instant.
- **Legal and trust** — terms, privacy, disclaimer refresh, and a visible "how we get our data" link in the footer.
- **Final QA** — full test suite green, typecheck clean, visual pass at phone, tablet and desktop widths on every page, then publish.

## Technical notes

- Design tokens stay in `src/styles.css`; no new colours or fonts are introduced, only usage discipline against the existing emerald/gold/paper scale.
- `src/routes/agent.$mint.tsx` (1,589 lines) and `src/routes/methodology.tsx` (985 lines) get decomposed into `src/components/spx/*` panels during their restyle; behaviour and data contracts stay identical.
- Dashboard work replaces `ComingSoon` usage in `_authenticated.dashboard*.tsx` and `agent.$mint.tsx` with real queries against `watchlist`, `alert_subscriptions`, `api_keys` and `api_usage` — all tables already exist with row-level security.
- Mobile nav added to `src/components/spx/SiteHeader.tsx` using the existing sheet primitive.
- Scoring math, decoders, cron pipelines and public API responses are not touched.
- No demo or seeded agents; empty lanes stay honestly empty.

## Suggested sequencing

Phase 1 is one working block and makes the site launchable. Phase 2 is the bulk of the visual work and can be delivered page by page so you can react as it lands. Phase 3 is the pre-publish checklist.
