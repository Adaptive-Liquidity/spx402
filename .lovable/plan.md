# Navigation restructure + frontend quality standard

Two things in one pass: fix the menu so it points at sections instead of tab views, and
bring the whole front end up to a current, professional standard for speed, keyboard use
and feel. No product, scoring, copy voice or URL changes.

## 1. Menu: four sections, not seven links

Today the header lists four links that all land inside two hubs that already have their
own tab bars, so "Register Agent" and the Build tab bar are the same click twice.

New header:

```text
LIVE        Tape · Pulse · System status
REGISTRY    Leaderboard · Explore · Flagged · Operators · AEON agents
BUILD       Register · Endpoints · Preflight · Live badge · Alerts · Pricing
METHODOLOGY (single link, trust anchor)
[ search ]  [ Sign in / Dashboard ]
```

- Each of the three section names opens a small panel listing its pages with a one-line
  description each; clicking the name itself goes to the hub's default page.
- The panel is keyboard operable (arrow keys, Escape, focus returns to the trigger) and
  closes on route change. On touch it opens on tap, not hover.
- Methodology stays top-level. AEON agents moves under Registry — it is a listing.
- Search moves into the header as a compact field that expands, plus a `/` and `Cmd+K`
  shortcut opening a command palette (jump to any page, paste a mint to analyse).
- Signed in, the right side shows Dashboard with a panel for Watchlist, Alerts, API keys,
  Wallets, Agents, Account. Signed out it shows Sign in plus an Open Terminal action.

## 2. Mobile drawer mirrors the header

Same three groups as collapsible sections instead of one flat list of ten, search at the
top, and the primary action pinned to the bottom above the safe area. Body scroll locks
while open; the panel traps focus and restores it on close.

## 3. Footer

Regroup to match the header exactly (Live / Registry / Build / Company), add System
status with a live dot and the current parser version, and keep the disclaimer block.

## 4. Quality standard applied across the front end

- **Perceived speed** — prefetch a route's data on link hover/focus so a nav click feels
  instant; keep the previous page painted during a transition instead of flashing a
  skeleton; skeletons only on first load.
- **Layout stability** — reserve height for tables, charts and images so nothing jumps as
  data arrives.
- **Weight** — charts and the wallet picker load only when their page needs them; icons
  imported individually; fonts preconnected and swapped without invisible text.
- **Motion** — one 150–240ms easing token for hover, tab and panel transitions; nothing
  animates twice; everything collapses under reduced-motion.
- **Focus and reachability** — one visible focus ring on every interactive element, skip
  link first, 44px minimum touch targets, panels announced to screen readers.
- **States** — every list and panel has a designed empty, loading and error state; no bare
  "no rows" strings and no raw error text as a headline.

## Technical notes

- New `NavMenu` component (Radix navigation-menu primitive already in the project) driving
  both the header panels and the drawer from one `nav-items.ts` source of truth, extended
  from a flat array to grouped sections with descriptions.
- Command palette via the existing `cmdk` shadcn Command component in a Dialog.
- Prefetch through TanStack Router `defaultPreload: "intent"` in `src/router.tsx` plus
  `ensureQueryData` in the hub loaders; keep-previous behaviour via router pending config.
- Chart and wallet modules moved behind `React.lazy` inside `ClientOnly` where not already.
- Verification: typecheck, full vitest run, and a Playwright pass over each hub for
  keyboard navigation, focus return and no console errors.
