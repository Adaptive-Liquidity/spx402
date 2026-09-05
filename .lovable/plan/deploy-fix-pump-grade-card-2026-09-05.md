# Deploy fix + Pump grade card

Two jobs: get `main` building again, and make every agent page share as one terminal card. No product, brand, or copy changes beyond what is listed here.

## 1. Make main deployable

The repo carries both `bun.lockb` and `package-lock.json`, and CI runs `npm ci` — that combination is what turns the pipeline red.

- Standardise on **bun** (scripts already shell out to `bun run` for the grade scripts, and the sandbox toolchain is bun).
- Delete `package-lock.json`, regenerate `bun.lockb` from the current `package.json`.
- Update `.github/workflows/ci.yml` and `pr.yml`: `oven-sh/setup-bun` + `bun install --frozen-lockfile`, and `bun run lint / typecheck / test / build` in place of the npm steps.
- Point `typecheck` at the project's fast typechecker so local and CI agree.
- No version bumps. Anchor, React, TanStack, decoders, program IDs, and `decoderLive` flags are untouched.

Gate: fresh install, clean typecheck, full test suite green.

## 2. The Pump grade card

One card definition, rendered three ways: on the dossier page, as the share image, and reused by the existing badge route.

```text
$TICKER
SPX D              UNVERIFIED
Last buyback       11d ago
Last burn          11d ago
Buybacks           3
Failed windows     2
spx402.com/agent/<mint>
```

Rules baked into the renderer:

- Grade and colour come from the live score. `SPX D` and `SPX404` render in `#C4453A`; everything else in bone/metal. No price, no "safe", no "buy", no escrow counts.
- Operator chip reads `UNVERIFIED` unless the wallet signature is on record, then `VERIFIED`.
- Missing on-chain data prints `NONE` (dates) or `0` (counts). Nothing is inferred or invented.

### Where it appears

- **Dossier** (`/agent/:mint`): the card renders at the top of the page as a square block, with a **Share** control beneath it — copy link plus native share sheet where the browser supports it.
- **Share image**: `/api/public/og/<mint>` gains a 1200x630 rendition of the same card, plus a square variant.
- **Badge route**: the existing `/api/public/badge/<mint>.svg` switches to the same card layout so there is a single source of truth.
- Page metadata: `og:title` becomes `$TICKER · SPX D · last buyback 11d`, and the leaf route carries `og:image` / `twitter:image` pointing at the card.

### One technical decision worth naming

The current share image is SVG. **X and Slack do not unfurl SVG** — an SVG card will silently show nothing, which fails the "Slack/Twitter unfurl shows the card" acceptance test. The previous PNG renderer (`@cf-wasm/og`) was removed because its WebAssembly startup crashed every page on the edge runtime, so bringing it back is not an option.

Plan: write a small dependency-free PNG encoder (raw pixel buffer + `node:zlib` deflate, both supported on the edge) with an embedded monospace bitmap font scaled up. A terminal card is grid text on a flat background — exactly what this can draw crisply, with zero WebAssembly and no new packages. The SVG route stays for in-page embeds; the PNG route serves the unfurl tags.

## 3. Homepage

Only one line changes: the eyebrow becomes `Live · Solana · Pump buybacks`. The three-line headline, the query field, and every other band stay exactly as they are.

## 4. Done when

- Fresh install, typecheck, and the full test suite all pass, with CI green on a single lockfile.
- `/agent/<real pump mint>` shows the card with a real last-buyback age (or `NONE`).
- Pasting that URL into Slack or X unfurls the card image.
- No new marketing claims anywhere.

## Files touched

`package.json`, `bun.lockb`, `package-lock.json` (deleted), `.github/workflows/{ci,pr}.yml`, new `src/lib/grade-card.ts` (shared card model) and `src/lib/png.server.ts` (encoder + font), `src/components/spx/GradeCard.tsx`, `src/components/spx/ShareCard.tsx`, `src/routes/agent.$mint.tsx`, `src/routes/api.public.og.{$subject}[.]svg.ts`, new PNG route, `src/routes/api.public.badge.{$mint}[.]svg.ts`, `src/routes/__root.tsx` (drop the site-wide share image so agent pages can set their own), `src/components/spx/Hero.tsx`.
