# SPEC.md — Deploy Fix + Pump Grade Card

Specification for the two completed workstreams: (1) making `main` deployable on a single package manager, and (2) the Pump grade card as the single share object rendered three ways. No product, brand, or copy changes beyond what is listed.

---

## 1. Objectives & User Journey

### 1.1 Deploy fix
- **Objective:** CI and fresh installs build green on one lockfile. The repo previously carried both `bun.lockb` and `package-lock.json` while CI ran `npm ci`, which is what turned the pipeline red.
- **Journey:** A contributor clones the repo, runs `bun install --frozen-lockfile`, and `bun run lint / typecheck / test / build` all pass locally and in CI, identically.

### 1.2 Pump grade card
- **Objective:** Every agent dossier shares as one terminal card — the same facts, byte-for-byte, whether seen on the page, in a Slack/X unfurl, or embedded as a badge.
- **Journey:** A visitor opens `/agent/<mint>`, sees the grade card at the top of the page, taps **Share** (copy link, or the native share sheet where supported), and pastes the URL anywhere — the unfurl shows the card image with grade, operator status, and last-buyback age.
- **Honesty contract:** nothing is invented. Missing on-chain data prints `NONE` (dates) or `0` (counts). No price, no "safe", no "buy", no escrow counts on the card.

---

## 2. Technical Architecture

### 2.1 Deploy fix
- Standardised on **bun** (scripts already shelled out to `bun run`; the sandbox toolchain is bun).
- `package-lock.json` deleted; `bun.lockb` is the single lockfile.
- `.github/workflows/ci.yml`, `pr.yml`, `fixtures.yml` use `oven-sh/setup-bun@v2` + `bun install --frozen-lockfile`, then `bun run lint / typecheck / test / build`.
- No dependency version bumps. Anchor, React, TanStack, decoders, program IDs, and `decoderLive` flags are untouched.

### 2.2 Data model — `src/lib/grade-card.ts`
Single source of truth, built from the existing `Agent` type (`src/lib/agents.ts`):

```text
GradeCardModel
  ticker     string            "$TEST" (from agent.symbol, falls back to $AGENT)
  mint       string            agent identifier, never truncated
  grade      string            e.g. "SPX B", "SPX D", "SPX404"
  danger     boolean           true for SPX D / SPX404 → blood red #C4453A
  operator   "VERIFIED" | "UNVERIFIED"   (agent.operatorVerified)
  rows       [{label, value}]  Last buyback, Last burn, Buybacks, Failed windows
  url        string            "spx402.com/agent/<mint>"
  lastBuyback string           age label, e.g. "11d ago" or "NONE"
```

- `buildGradeCard(agent, now)` — derives the model. Last buyback/burn ages come from the newest matching on-chain events (`BUYBACK_EXECUTED`/`SWAP_EXECUTED`, `BURN_CONFIRMED`); stored relative labels are a fallback only when they carry a real value (`—`, empty, "never" all collapse to `NONE`).
- `ageLabel(iso, now)` — `Nm ago` / `Nh ago` / `Nd ago` / `NONE`. Never guesses.
- `unindexedCard(subject)` — fallback for a subject never indexed: `$AGENT · SPX404 · UNVERIFIED`, all rows `NONE`/`0`.
- `cardShareTitle(card)` — `$TICKER · SPX D · last buyback 11d ago`.
- `cardImageUrl(mint)` — `https://spx402.com/api/public/card/<mint>.png`.
- `CARD_COLORS` — the flat palette shared by all renderers (page/panel/line/bone/mute/metal/blood).

### 2.3 Renderers — one model, three renditions
```text
                 buildGradeCard(agent)
                          │
        ┌─────────────────┼──────────────────┐
        ▼                 ▼                  ▼
  GradeCard.tsx      svg.ts            png.server.ts
  (dossier page,     (badge 600×600,   (1200×630 og:image,
   square HTML)       og/*.svg embeds)  1080×1080 ?square=1)
```

- **`src/components/spx/GradeCard.tsx`** — the on-page square card; `danger` drives the critical-red rail and grade colour; URL row truncates visually (page only — a mint is never truncated in images).
- **`src/components/spx/ShareCard.tsx`** — Share control beneath the card: copy link + `navigator.share` where available.
- **`src/lib/card/svg.ts`** — pure-SVG renderer, same layout; used by the badge and `/api/public/og/<subject>.svg` routes.
- **`src/lib/card/png.server.ts`** — dependency-free indexed-PNG encoder: raw pixel buffer + `node:zlib` deflate (both edge-supported), embedded monospace bitmap font (`src/lib/card/font.ts`). No WASM, no image library, no top-level await. The footer shrinks its type until the full mint fits — identifiers are never clipped.

### 2.4 Routes
| Route | Purpose |
|---|---|
| `GET /api/public/card/<subject>.png` | 1200×630 raster; `?square=1` → 1080×1080. Rate-limited, `Cache-Control: public, max-age=300, s-maxage=3600, stale-while-revalidate=86400` |
| `GET /api/public/og/<subject>.svg` | Vector rendition for embeds; rate-limited, same cache posture |
| `GET /api/public/badge/<mint>.svg` | 600×600 embed badge, same card layout; 5-min edge cache, 1h SWR |
| `/agent/<mint>` | Dossier: card + Share control at top; head metadata per below |

All three image endpoints share one flow: rate limit → `fetchAgent(subject)` → `buildGradeCard` or `unindexedCard` → render. Unknown subjects return a valid `SPX404` card, never an error image.

### 2.5 Security & runtime constraints
- **Edge runtime:** the PNG renderer exists because the previous `@cf-wasm/og` engine (satori/resvg WASM) initialised with a top-level await that nitro hoisted into the shared SSR chunk, 500-ing every page. Constraint: no WASM, no top-level await, only `node:zlib`-class built-ins in card rendering.
- **SVG does not unfurl:** X/Slack/Discord/LinkedIn ignore SVG share images, so `og:image`/`twitter:image` point at the PNG route; SVG serves in-page embeds only.
- **Rate limiting:** all public image endpoints pass through `enforceRateLimit(RATE_LIMITS.badge)` and return the limit headers.
- **Metadata hygiene:** `__root.tsx` carries no global `og:image`/`twitter:image` (removed) so agent pages set their own; the dossier leaf sets canonical + og:url self-referentially.

### 2.6 Homepage
One line only: the hero eyebrow reads `Live · Solana · Pump buybacks`. The three-line H1 (`Agents lie. The ledger doesn't.`), query console, and all other bands are untouched.

---

## 3. Acceptance Criteria

**Deploy fix**
1. Fresh clone: `bun install --frozen-lockfile` succeeds; only `bun.lockb` exists.
2. `bunx tsgo --noEmit` clean; full vitest suite green; CI green on bun.

**Grade card**
3. `/agent/<real pump mint>` renders the card with a real last-buyback age, or `NONE` when no event exists.
4. Grade colour: `SPX D` and `SPX404` render in `#C4453A`; all other grades in bone/metal.
5. Operator chip reads `UNVERIFIED` unless the wallet signature is on record, then `VERIFIED`.
6. Missing on-chain data prints `NONE` (dates) or `0` (counts) — never inferred values, prices, or claims.
7. Pasting a dossier URL into Slack or X unfurls the PNG card (`og:title` = `$TICKER · SPX D · last buyback 11d ago`; `og:image` = the PNG route).
8. The badge SVG and OG SVG render the same facts as the page card.
9. A full-length mint fits inside the image footer without truncation.
10. A never-indexed subject returns a valid `SPX404` card from every image endpoint (HTTP 200).
11. No new marketing claims anywhere; homepage changes are limited to the eyebrow line.

---

## 4. Step-by-Step Task Breakdown (as executed)

1. **Lockfile unification** — delete `package-lock.json`, regenerate `bun.lockb`, verify `bun install --frozen-lockfile`.
2. **CI migration** — rewrite `ci.yml`, `pr.yml`, `fixtures.yml` to `oven-sh/setup-bun@v2` + bun scripts; no version bumps.
3. **Gate check** — `tsgo --noEmit` clean; `vitest run` green.
4. **Card model** — `src/lib/grade-card.ts`: `GradeCardModel`, `CARD_COLORS`, `ageLabel`, `buildGradeCard`, `cardShareTitle`, `cardImageUrl`, `unindexedCard`.
5. **Bitmap font** — `src/lib/card/font.ts`: monospace glyph table + `textWidth`.
6. **PNG renderer** — `src/lib/card/png.server.ts`: indexed-palette canvas, CRC32/chunk writer, deflate encoder, card layout, footer auto-shrink.
7. **SVG renderer** — `src/lib/card/svg.ts`: same layout and palette.
8. **Page components** — `GradeCard.tsx`, `ShareCard.tsx` (copy + native share).
9. **Image routes** — `api.public.card.{$subject}.png.ts`, `api.public.og.{$subject}.svg.ts`; rewire `api.public.badge.{$mint}.svg.ts` to the shared layout; rate limits + cache headers on all three.
10. **Dossier integration** — `agent.$mint.tsx`: card + Share control at top, per-page `og:image`/`twitter:image`/canonical, `og:title` from `cardShareTitle`.
11. **Root cleanup** — remove the site-wide share image from `__root.tsx`.
12. **Homepage eyebrow** — `Live · Solana · Pump buybacks`.
13. **Hardening pass** — move `unindexedCard` into `grade-card.ts` (single definition, no cross-route imports); URL auto-shrink so mints never truncate.
14. **Tests** — `src/lib/__tests__/grade-card.test.ts`: age labels, NONE/0 fallbacks, danger grades, verified operator, share title, image URL, valid PNG at both sizes (signature, IHDR dimensions, IEND), SVG fact content. 171 tests green, typecheck clean.
15. **Live verification** — PNG, square PNG, badge, and OG endpoints return 200; dossier pages carry correct share tags.

---

## Technical details (for reviewers)

- Files: `package.json`, `bun.lockb`, `.github/workflows/{ci,pr,fixtures}.yml`, `src/lib/grade-card.ts`, `src/lib/card/{font.ts,svg.ts,png.server.ts}`, `src/components/spx/{GradeCard,ShareCard,Hero}.tsx`, `src/routes/agent.$mint.tsx`, `src/routes/api.public.card.{$subject}[.]png.ts`, `src/routes/api.public.og.{$subject}[.]svg.ts`, `src/routes/api.public.badge.{$mint}[.]svg.ts`, `src/routes/__root.tsx`, `src/lib/__tests__/grade-card.test.ts`.
- Known limitation: the on-page HTML card truncates a long URL visually (CSS `truncate`); only the image renderers guarantee the full mint, since unfurls are the canonical share surface.
