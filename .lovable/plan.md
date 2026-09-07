# Make the instrument finished — Tier 1 / 2 / 3

The design system is not the problem. Palette, graphite terminal, gold/cream type, voice,
grade language and hero copy stay exactly as they are. The live site is behind that lock
and reads unfinished. This plan closes that gap only.

Out of scope: new palette, light mode, 3D, token, AEON cinematic site, purple, glass,
particles, gamification, "top agents to buy".

## Tier 1 — it currently looks unfinished

1. **One status line.** The status readout appears three times; keep one slim line. Real
   UTC clock (no stuck `--:--:--`) and honest freshness — `14s ago`, or `indexer lagging`
   when the last index is stale. Fix dossier last-indexed rendering (currently prints raw
   seconds in the millions).
2. **Remove the public Lovable badge.** Every footer `#` link points at a real route.
   Badge and embed snippets use `spx402.com`, not `spx402.xyz`.
3. **Header:** search plus one primary action. `Cmd+K` actually opens — it is advertised
   today with nothing behind it.
4. **Explore and Tape become tables.** `DataTable`, 50 rows per page, sort and page in the
   URL, columns that would be all dashes collapse. Page height target under 3,000px
   (Explore is ~74,000px today; Tape dumps 200 rows).
5. **Pricing:** one complete comparison table, no blank cells.
6. **Empty states name the gate.** "0 ranked because the evidence floor is not met — see
   all indexed agents in Explore." Leaderboard and Pulse read broken without this.
7. **Grade histogram** splits unsettled / insufficient evidence / graded instead of leading
   with one red bar of 647 D. Today it reads "the product failed" rather than "the ledger
   is empty".

Verify: `bun run typecheck && bun run test`, plus screenshots of home, explore, tape and
pricing at 1280 and 390.

## Tier 2 — Linear / Bloomberg class

- **Nav:** Terminal · Live · Registry · Build · Methodology · About. Pricing and account
  sit on the right. One link per section — the hub tab bars already do the second level.
- **Compact hub header** so data sits above the fold; the current dual header costs about
  400px of restatement before any data.
- **Command palette:** jump to a page, or paste a mint/wallet/PDA and go straight to it.
- **Same primitives everywhere** — `PageHeader`, `stage`, `EmptyState` on About, Pricing,
  Register, Build, login/signup and the dossier, which never passed the lock.
- **Dossier order:** identity → pillars → evidence. Copy-mint control, explorer link,
  honest confidence chip.
- **Accessibility:** `focus-ring` on everything focusable, skip link first, real `<table>`
  markup, 44px targets, and `prefers-reduced-motion` honoured by the ticker, aperture and
  404 flicker.

## Tier 3 — once the instrument works

- Query console as the product: paste a mint, wallet or PDA from any page, skeleton to
  dossier in under 300ms.
- Evidence notes read like a rating file, not a blog post.
- Embeddable SVG badge an operator will actually put on a pump page.
- Machine surface: `llms.txt`, `agent-card.json`, MCP — we own the grade, not another
  explorer.
- Shareable filtered views: grade, chain and category all live in the URL.

## Enforced look-and-feel rules

- Surfaces come from background steps, never shadows. Colour carries state and risk only.
- Tabular numbers throughout. Missing values print `—` or `NONE`, never `0`.
- Motion 150–240ms, once, state changes only.

## Technical notes

- `nav-items.ts` becomes the single grouped source for header, drawer and footer.
- Command palette uses the existing `cmdk` Command component in a Dialog, bound to `Cmd+K`
  and `/`, with a mint/address branch that routes to `/agent/$mint`.
- Explore already paginates server-side; Tape moves to the same `DataTable` + `Pager` +
  `validateSearch` shape, so sort and page are shareable URLs.
- Freshness comes from the existing indexer heartbeat; the clock renders client-only to
  avoid a hydration mismatch.
- Router `defaultPreload: "intent"` so section links feel instant.
- Verification each tier: typecheck, full vitest run, and a Playwright pass at 1280 and
  390 checking for console errors and page height.
