# Fewer pages, same information — a professional information architecture

Right now the site has 24 public pages competing for attention in a 9-item top menu. Nothing gets deleted in this plan: every table, tool, and piece of copy stays. It gets regrouped into five destinations with tabs, so visitors always know where they are and never have to guess which of four similar pages holds what they want.

## The new shape

```text
Terminal   /                 the query console and live tape (unchanged)
Live       /live             Tape · Pulse · System status
Registry   /registry         Leaderboard · Explore · Flagged · Operators
Build      /build            API & docs · Preflight · Badge · Alerts · Register
Methodology/methodology      unchanged (it is the credibility document)
About      /about            Story · Changelog · Disclaimer
```

Top menu becomes six items: Terminal, Live, Registry, Build, Methodology, About — plus Pricing and the account button on the right.

## What merges into what

- **Live** — the tape, the pulse feed of score changes and failures, and the system/status board become three tabs of one page. They are all "what is happening right now".
- **Registry** — leaderboard, explore, flagged, and operators are four views of the same list of subjects, so they become four tabs over one shared, already-cached dataset. This also makes moving between them instant.
- **Build** — everything a developer or operator does: API overview, endpoint reference, preflight checker, live badge, alerts, and agent registration. Each stays a full section, reached by a tab.
- **About** — the story, changelog, and disclaimer are short pages; they become sections of one page with in-page links.
- Untouched: the homepage, methodology, pricing, agent dossiers, operator profiles, service pages, tape event pages, embeds, dashboards, sign-in/sign-up, and every API route.

## Nothing breaks for anyone linking to us

Each retired address keeps working: `/tape`, `/pulse`, `/status`, `/leaderboard`, `/explore`, `/flagged`, `/operators`, `/api`, `/preflight`, `/badge`, `/alerts`, `/register`, `/changelog`, `/disclaimer` all redirect permanently to the right tab of the new page. Existing search rankings and shared links carry over.

## Design quality that comes with it

- One consistent page frame: title band, one-line explanation, tab strip, content — instead of six different layouts.
- Tab state lives in the address bar, so a filtered view is still a shareable link.
- Footer trimmed to three short columns matching the new grouping.
- Mobile menu drops from nine items to six with a second level, so it stops scrolling.

## Technical notes

- New layout routes `live.tsx`, `registry.tsx`, `build.tsx` rendering `<Outlet />`, with the existing page bodies moved into `*.index.tsx` / tab leaves; old route files become `redirect()` stubs (permanent) so `routeTree.gen.ts` stays valid and no link literal breaks.
- Tabs are real child routes (`/registry/flagged`, `/live/pulse`), not client-only state — each keeps its own `head()` title, description, og:title and og:description, so SEO improves rather than regresses.
- Registry tabs share the one slim agent-index fetch already added in the performance pass; no extra queries.
- `NAV_ITEMS`, `SiteHeader`, `MobileNav`, `SiteFooter` updated to the six-item structure.
- Sitemap regenerated from the new canonical paths; retired paths excluded.
- Acceptance: typecheck clean, full test suite green, every old URL returns a 301 to its new home, and every new page returns 200 with unique metadata.
