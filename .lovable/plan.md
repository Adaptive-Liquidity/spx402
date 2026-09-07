# Tier 1 — finish the instrument

Implement the existing SPX402 design lock. No redesign. No new palette, type, voice, hero
copy, scoring, decoders or API contracts. No new button, table, empty-state, badge or
header component — wire the primitives that already exist.

Stop after Tier 1. Tier 2 (nav regroup, dossier rebuild, auth restyle, real command
palette) and Tier 3 (llms.txt, agent-card.json, MCP, new badge system) are out of scope.

This brief is the only assignment; every other file under `.lovable/plan/` is ignored.

## 0. Probe

Before touching anything, list which of SiteHeader, SiteFooter, TickerTape/Telemetry,
nav-items, DataTable, DataToolbar, EmptyState, PageHeader, HubLayout are actually rendered
on the live routes, and confirm no replacement is needed. Probe the canonical paths first —
they are likely `/registry/explore` and `/live`, not `/explore` and `/tape`. Existing 301s
stay; no duplicate pages get created.

## 1. One status line

Status renders about three times today. Keep one slim line in the shell.

- Real UTC clock, client-only so there is no hydration mismatch (currently stuck at
  `--:--:--`).
- Freshness from the indexer heartbeat through `formatRelative` / `formatUtc`.
- When stale, print "indexer lagging" — never raw seconds in the millions, which is what
  dossiers show now.
- Touch the layout and the ticker/status component only.

## 2. Trust hygiene

- Remove the public Lovable badge.
- Every footer `href="#"` points at a real route.
- Public-facing badge/embed snippets show `spx402.com`. No global `.xyz` replace; API and
  embed hosts stay as configured unless the string is a user-facing snippet.

## 3. Header

- Search visible in the header.
- Exactly one primary action: Open Terminal signed out, Dashboard signed in.
- Where `Cmd+K` is advertised, it opens the existing AgentSearchBar / search UI. No new
  palette system this pass.

## 4. Explore and Tape

- Both render through `DataTable` + `DataToolbar`, reusing `AgentRow` where it is already
  the row renderer.
- 50 rows per page; `page` and `sort` live in URL search params.
- Columns that would be entirely dashes collapse.
- `EmptyState` says why — the evidence floor — and links to the unfiltered list.
- Page height target under 3,000px (Explore is roughly 74,000px today; Tape dumps 200
  rows).

## 5. Pricing

One comparison table built from the existing plan data. No blank cells — every plan/feature
intersection is a check or a dash.

## 6. Leaderboard and Pulse empty states

Name the quality gate ("0 ranked because the evidence floor is not met"), mute zero-count
filter chips, and link through to Explore.

## 7. Grade histogram (home only)

Scoring does not change. Presentation splits into unsettled / insufficient evidence (404) /
graded, so the home page no longer leads with a single red bar of 647 D that reads as
product failure rather than an empty ledger.

## Enforced rules

One `h1` per route. `stage` / `stage-narrow` only, no ad-hoc `max-w` on page wrappers.
Missing values print `—` or `NONE`, never `0`, never invented sample data. Colour carries
state only; grade is always the letter plus `ExecutionGradeBadge`. Surfaces from background
steps, not shadows. Motion 150–240ms, once, state only, honouring reduced motion. Old
routes are redirected, never deleted. No edits to `src/styles.css` tokens. No new files
under `src/components/spx` unless a required primitive is genuinely missing.

## Verification

- `bun run typecheck && bun run test`.
- Update the verbatim-copy tests only where a heading legitimately moved.
- Screenshots of home, explore, tape, pricing and leaderboard at 1280 and 390.
- Confirm: one status line, working clock, no Lovable badge, Explore and Tape paginated, no
  blank pricing cells.
- Then stop and report files changed plus any leftover live defects.
