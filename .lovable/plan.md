# Exhaustive page-by-page quality pass

The earlier structural work landed: old flat addresses now forward to the new hubs, Explore paginates, and Live and Registry pages share one page header and table. What is left is the last mile — the pages that never got the treatment, and a page-by-page verification sweep so nothing is claimed done without being looked at.

## What is inconsistent today

- Nine pages use the shared page header. The rest still hand-roll their own title block, so heading size, spacing and the width of the text column drift from page to page: About, Pricing, Changelog, Disclaimer, Register, and all four Build pages.
- Page widths are mixed — some pages are set to a 3-column reading width, some to a 4, most to the site standard. Side by side they look like different products.
- The signed-in area (dashboard, agents, wallets, alerts, API keys, watchlist, account) never went through any pass at all.
- The detail pages — agent dossier, operator, service, single tape event, login/signup — also never went through it.

## The work

**1. One header, one width, everywhere.** Every page adopts the shared header (eyebrow, title, standfirst, optional status line) and the standard page width. Reading-heavy pages keep a narrower text column, but as the documented narrow variant rather than a one-off number.

**2. Finish the untouched pages.**
- About, Changelog, Disclaimer: shared header, consistent section rhythm, long text collapsed into expandable sections where it runs past a screen.
- Pricing: the plan comparison rendered as one table rather than stacked cards, with the current plan marked when signed in.
- Register: shared header, and the wizard framed like the rest of the site instead of floating on the page.
- Build (overview, docs, badge, alerts, preflight): consistent purpose-then-console layout, sticky index already on docs extended to the rest where the page is long.

**3. Signed-in area.** Same header, same table, same empty states as the public side. Every list gets a real empty state that says what to do next instead of a bare "none". Loading shows the table shape, not a centred word.

**4. Detail pages.** Agent dossier, operator, service and tape event get a common detail layout: identity block at top, evidence below, actions in a fixed place. Login and signup get a proper framed card and matching titles.

**5. Empty, loading and error states audited everywhere.** One pattern, three states, on every page that loads data — including the reason a list is empty when a rule is what emptied it.

**6. Accessibility and polish sweep.** Real table semantics, labels on icon-only controls, visible focus outline on the dark surface, keyboard movement across tabs, and grade meaning never carried by colour alone.

## Verification (this is the point of the pass)

Every public and signed-in page is opened at 1280px and 390px, screenshotted, and checked against a fixed list: header present and correct, width standard, no duplicated title, states covered, no console error, page title and description unique and accurate. The result is a table of every page with pass/fail per item, and nothing is reported complete until every row passes.

Also run: typecheck clean, full test suite green, and the eight known network-dependent test failures confirmed as pre-existing and unchanged.

## Not changing

Scoring, decoders, API contracts, the wording of claims, the Ledger Emerald palette and typography, and every existing address and redirect.
