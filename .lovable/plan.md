# Tier 2 — instrument polish

Carry the Tier 1 design lock forward. No new palette, type, voice, hero copy, scoring, decoders, or API contracts. No new button, badge, or table primitives unless genuinely missing. The four workstreams are nav regroup, dossier architecture rebuild, auth restyle, and a real command palette.

## 1. Nav regroup — four hubs

Collapse the flat header into four hubs with dropdowns on desktop and grouped sections in the mobile drawer. The header stays one row: four hub labels plus dropdowns. Search and the single primary CTA do not move.

Every route below already exists — no new route files, no new aliases. Existing URLs stay, and the `/explore` → `/registry/explore` and `/tape` → `/live` 301s remain exactly as they are.

```text
Live                     Registry                       Build                      About
───────────────────────  ─────────────────────────────  ─────────────────────────  ──────────────────────────
Tape         /live       Leaderboard  /registry         API        /build          About        /about
Pulse        /live/pulse Explore      /registry/explore Register   /build/register Methodology  /methodology
Status       /live/status Flagged     /registry/flagged Docs       /build/docs     Corrections  /corrections
                         Operators    /registry/operators Badge    /build/badge    Genesis      /genesis-record
                         AEON Agents  /aeon-agents      Alerts     /build/alerts   Changelog    /about/changelog
                                                        Preflight  /build/preflight Disclaimer  /about/disclaimer
                                                        Pricing    /pricing
```

- Update `src/components/spx/nav-items.ts` to export hub definitions (`HUBS`) plus the flat mobile list.
- Update `src/components/spx/SiteHeader.tsx` to render the four hubs as dropdowns using the existing `dropdown-menu` primitive. Active state follows the current route prefix.
- Update `src/components/spx/MobileNav.tsx` to render the same four hubs as grouped sections, with child links indented under each hub heading.
- Keep the signed-in Dashboard CTA as the single primary action; do not add a user hub this pass.

## 2. Dossier architecture rebuild

Architecture split only. Split the 1,631-line `src/routes/agent.$mint.tsx` into an orchestrator plus four dossier components. No sticky summary, no tabbed redesign, no new sections, no visual redesign beyond the one required fix below. The rendered page must look the same.

New files under `src/components/spx/dossier/`:

- `DossierHero.tsx` — flagged banner, top status bar, title, symbol, grade badge, share actions, and watchlist/alert controls.
- `DossierMetrics.tsx` — score ring, grade badge, score pillars, metric cards, payer diversity, and outcome-contract metrics.
- `DossierEvents.tsx` — category-aware filter chips, event list/table, and event detail rendering.
- `DossierProbe.tsx` — active-prober panel, settle-rate sparkline, and transcript link.

`src/routes/agent.$mint.tsx` keeps:

- `head()` with grade-card OG metadata.
- `loader()` and `VerifyingState`.
- `AgentRoutePage` that renders `<Dossier ... />`.

Helpers to relocate:

- `eventTitleFor`, `eventDescFor`, `rowToAgentEvent`, `mergeEvents`, `EVENT_ICON`, `shortMint`, and `CopyButton` move into `src/components/spx/dossier/` or a shared dossier util so the route file only orchestrates.

Required visual fix:

- Replace the raw `LAST INDEXED {agent.lastIndexedSeconds}s AGO` line with `formatRelative` output, and print "indexer lagging" when the heartbeat is stale (same threshold used by Telemetry).

## 3. Auth restyle — terminal aesthetic

Restyle `src/routes/login.tsx` and `src/routes/signup.tsx` to match the rest of the instrument: dark bronze panels, amber primary actions via `ActionButton`, monospace labels, and the existing status language. No split-screen preview, no marketing copy, no new card language.

- Wrap the form in `panel-engraved` with consistent spacing.
- Replace the raw `<button>` elements with `ActionButton` / `ActionLink`.
- Keep email, password, display-name, wallet, Google, and Apple flows unchanged.
- Form width is `stage-narrow` only. Never `max-w-md` or any ad-hoc width class.
- Add a small terminal-style footer line under each form: parser/scoring versions or the "We never collect keys" note, in the existing `label-mono` style.

## 4. Real command palette — route + agent search

Enhance the existing `⌘K` / `Ctrl+K` dialog so it can jump to routes and fuzzy-find indexed agents. Reuse `AgentSearchBar` and `SearchDialog`; no new palette component, no separate palette system.

- `src/components/spx/SearchDialog.tsx` stays the entry point. `⌘K` / `Ctrl+K` only — no `/` binding — ignored while focus is in an input, textarea, or contenteditable. Closes on `Esc` and on route change, exactly as today.
- Inside the dialog, render `AgentSearchBar` with exactly two suggestion groups and nothing else:
  1. **Routes** — the hub routes from `nav-items.ts`.
  2. **Agents** — fuzzy matches on `symbol`, `name`, and `mint` prefix.
- No actions group, no theme toggle, no copy-mint, no command registry.
- Add `src/lib/agents.functions.ts` with `searchAgents(q, limit)` using `createServerFn` from `@tanstack/react-start`. It queries the existing `agents` table with `ilike` on symbol/name plus a mint-prefix match, returning `{ mint, symbol, name, grade }`.
- Selecting an agent navigates to `/agent/$mint`; selecting a route navigates to that route.
- `AgentSearchBar` used inline on `/registry/explore` keeps its current behavior; suggestions are opt-in via a prop.

## Enforced rules

- One `h1` per route. `stage` / `stage-narrow` only; no ad-hoc `max-w` on page wrappers.
- Missing metrics print `—` or `NONE`, never invented sample data. Real counts of zero stay `0`.
- Grade is always the letter plus `ExecutionGradeBadge`; colour carries state only.
- Motion 150–240ms, once, state only; honour `prefers-reduced-motion`.
- Old routes redirect, never delete. No edits to `src/styles.css` tokens.
- No new files under `src/components/spx` except the dossier split and any genuinely missing primitive.
- No Tier 3 work. No edits to Hero, Guilloche, Aperture, design tokens, or scoring.

## Verification

- `bun run typecheck && bun run test`.
- Update verbatim-copy tests only if headings legitimately moved.
- Screenshots at 1280 and 390 of `/`, `/registry/explore`, `/live`, `/pricing`, `/leaderboard`, `/agent/<known-mint>`, `/login`, and `/signup`.
- Confirm: four hub dropdowns on desktop, grouped mobile drawer, dossier renders identically, auth pages use `ActionButton`, `⌘K` opens the palette and routes/agents navigate.
- Then stop and report files changed plus any leftover live defects.
