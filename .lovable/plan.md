# Page-by-page quality pass — blue-chip standard

I inspected every public page at 1280px and measured how tall each one renders. The pattern is consistent: the information is right, the *presentation* is not disciplined. Three problems repeat everywhere.

## The three systemic problems

**1. Every list renders in full.** Explore renders all 660 agents as tall cards — the page is 74,297px, roughly 40 screens. The tape renders 200 events — 9,382px. Methodology is 11,271px with no way to jump. Nothing paginates, nothing virtualizes, nothing offers a density control.

**2. Every tabbed page has two headers.** Live, Registry and Build each show a hub header (eyebrow + title + blurb + tabs), and then the tab content immediately repeats an eyebrow + big headline + blurb. Roughly 400px of stacked restatement before any data, on every one of those thirteen pages.

**3. Empty and placeholder states read as breakage.** The leaderboard shows every category chip with a count of 0 and an empty board, with no explanation that the quality gate is what's filtering them out. Explore rows show "SWAP ACTIVITY —" and "LAST ACTIVITY —" for nearly every agent, so a third of each row's width carries nothing.

## What changes, page by page

### Shared shell
- Hub headers collapse to a single compact band: title + tabs on one line, blurb only on the hub's default tab. Tab pages drop their duplicate eyebrow/H1/blurb and open with a tight page title plus the toolbar.
- One shared toolbar pattern for every data page: filters, count, density toggle, and result range in a single sticky row.
- One shared table primitive with fixed column widths, zebra rows, sticky header, and a compact/comfortable density switch — used by tape, explore, flagged, operators, leaderboard.
- Loading skeletons in table shape instead of a centred "Loading…" line.

### Live — tape
Paginate at 50 rows with prev/next in the URL (so a page of tape stays shareable), a running total, and a "jump to newest" control. Row height drops to compact. Target height: under 3,000px from 9,382px.

### Registry — explore
Replace the tall card rows with the dense table. Show 50 per page with pagination and a sortable score/grade column. Empty metric columns (swap activity, last activity) collapse when the whole page has no values, instead of printing a column of dashes. Target: under 3,000px from 74,297px.

### Registry — leaderboard
When the gate empties a board, say so in place: the count of agents excluded and by which rule, with a one-click "show everything" that goes to Explore pre-filtered. Category chips reading 0 get muted rather than presented as choices.

### Registry — flagged / operators
Same table primitive, same toolbar, pagination. Flagged gets the reason for each flag as a column rather than only on the dossier.

### Live — pulse / status
Status is 4,485px of stacked lane panels. Group into a summary strip (all lanes, one line each, colour-coded) with details expandable per lane. Pulse gets the same compact treatment.

### Build — endpoints
The reference is 5,942px of unbroken code walls. Add a sticky endpoint index down the left with anchor links, collapse response examples behind a toggle showing the shape by default, and give each endpoint a consistent header block (method, path, auth, tier, rate limit).

### Build — API / preflight / badge / alerts / register
Tighten to the shared toolbar and card rhythm; each becomes one screen of purpose plus its form or console, with supporting detail below the fold rather than above it.

### Methodology
Add a sticky table of contents and collapse the pillar deep-dives, keeping the 40/30/15/10/5 summary and the grade table always visible.

### Home, About, Pricing
Structurally sound. Home gets its band spacing normalised to the same rhythm; Pricing gets the comparison rendered as one table instead of stacked cards; About stays as is.

### Footer and header
The footer still lists the old flat page names in three columns and duplicates the hub nav. Reduce to the four hubs plus legal. In the header, "Sign in" and "Open terminal" sitting side by side is one action too many — keep one primary.

## Accessibility and correctness pass
Every table gets real `<table>` semantics with scope'd headers; every icon-only control gets a label; focus rings become visible on the dark surface; tab lists get proper roles and arrow-key movement; colour is never the only carrier of grade meaning (the grade letter already accompanies it — verify everywhere).

## Not changing
Scoring, decoders, API contracts, copy voice, the Ledger Emerald palette and typography, and every existing URL and redirect.

## Verification
Re-measure every page height after the pass, typecheck clean, full test suite green (verbatim-copy tests updated only where a heading legitimately moves), and a visual pass at 1280px and 390px.
