# SPX402 Design System Lock

Locked rules for the SPX402 + AEON website. Any new page, component or route must
conform. Changing a rule here is a deliberate design decision, not a per-page choice.

Palette, typefaces and voice are out of scope for this document — they are already
locked in `src/styles.css` (`@theme`) and must not be altered.

---

## 1. Page widths (containers)

Two frames only. Never write an ad-hoc `max-w-*` on a page wrapper.

| Utility        | Max width | Gutters                  | Use for |
| -------------- | --------- | ------------------------ | ------- |
| `stage`        | 82rem     | `clamp(1rem, 4vw, 3rem)` | Terminal / data / product pages: Registry, Leaderboard, Agent dossier, Dashboard, My Agents, Wallets, Income Routing, API, Live, Tape |
| `stage-narrow` | 52rem     | `clamp(1rem, 4vw, 3rem)` | Reading / trust documents: Methodology, Corrections Policy, Genesis Record, AEON Agents, Register Agent, About, Legal |

- Inner measure for long-form body copy: `max-w-[68ch]` inside `stage-narrow`.
- `max-w-*` is still allowed **inside** a frame for a single column or card, never as the page wrapper.

## 2. Title hierarchy

One rank per role, applied identically on every route.

| Role               | Class |
| ------------------ | ----- |
| Page eyebrow       | `label-amber` |
| Page title (h1)    | `font-display text-3xl font-bold tracking-tight text-paper lg:text-4xl` |
| Standfirst         | `mt-3 max-w-[60ch] text-lg text-paper-muted` |
| Section title (h2) | `font-display text-2xl font-bold text-paper` |
| Subsection (h3)    | `font-display text-lg font-semibold text-paper` |
| Body               | `text-sm leading-relaxed text-paper-muted` (`text-base` in documents) |
| Small metadata     | `font-mono text-[11px] text-wire` |
| Mono label         | `label-mono` |

- The homepage hero is the single exception and may run larger.
- Exactly one `<h1>` per route; heading levels never skip.
- Hub tab pages use the compact `PageHeader` title rank so the data stays above the fold.

## 3. Spacing rhythm

Four named values. No free-hand `py-8 / py-12 / py-16 / py-24` on layout containers.

| Utility      | Value                        | Use for |
| ------------ | ---------------------------- | ------- |
| `band`       | `clamp(4rem, 9vw, 8rem)` block padding | Major homepage / marketing bands |
| `section`    | `clamp(2.5rem, 5vw, 4rem)` block padding | Standard page section |
| `subsection` | `2rem` top margin            | Grouped content inside a section |
| `stack`      | `1.25rem` gap                | Internal card / list spacing |

Page wrappers are `stage section` or `stage-narrow section`.

## 4. Buttons

`ActionButton` (`src/components/spx/ActionButton.tsx`) is the only action control.
Never hand-write `border-amber/80 bg-amber/10 px-… uppercase tracking-widest` again.

| Variant     | Meaning |
| ----------- | ------- |
| `primary`   | The one committing action on the screen (amber fill on hover) |
| `secondary` | Alternative navigation or a second action (bronze outline) |
| `ghost`     | Tertiary / inline action, no border |
| `danger`    | Destructive or flag action (critical outline) |

Sizes: `sm`, `md` (default), `lg`. Every variant defines default, hover, active,
disabled, loading and keyboard-focus states. `loading` disables the control and shows a
spinner without changing width. Renders as `<button>`, or as a router `Link` when given
`to`, or an anchor when given `href`.

## 5. Tables

`DataTable` is the only table. Every data surface uses it: Registry, Leaderboard,
evidence timeline, API usage, My Agents, Wallets, Income Routing, Corrections.

- One density: `px-3 py-2.5`, minimum 44px row height.
- Header: mono uppercase `text-[10px]`, sticky, hairline bottom border.
- Hover `bg-panel-deep`; selected `ring-1 ring-inset ring-amber/50`.
- Sort affordance: caret in the header cell; sort state lives in URL search params.
- Numeric columns right-aligned and tabular.
- Below `sm`, rows stack into label/value cards — never horizontal scroll on phones.
- An empty table renders `EmptyState`, never a bare "no rows" string.

## 6. Status chips

`StatusChip` is the only status renderer; the vocabulary lives in
`src/lib/registration/status.ts`. Tones: `neutral`, `pending`, `verified`, `warning`,
`failure`, `unknown`.

- Unverified never borrows verified styling; provisional never borrows graded styling.
- Grade is rendered only by `ExecutionGradeBadge`.
- An unknown or missing status resolves to the `unknown` tone — it never disappears.

## 7. Empty, loading and error states

- **Empty** — `EmptyState` only. Calm and trust-building, second sentence explains why:
  - "No agents qualify yet. SPX402 only ranks agents after verified evidence meets the public floor."
  - "No evidence returned yet. This agent is tracked, but SPX402 has not indexed qualifying activity."
  - "This agent is private. It can be configured, verified, and tested before publication."
- **Loading** — `Skeleton` shaped like the real content (table rows, dossier card,
  evidence timeline, wizard, wallet panel, document). Never a centred "Loading…" line,
  never a layout jump.
- **Error** — one plate: what failed, that the chain is fine, a retry action and a link
  to Status. Never a raw exception message as the headline.

## 8. Formatting

All in `src/lib/format.ts`. No page implements its own.

| Helper              | Rule |
| ------------------- | ---- |
| `formatUtc`         | `YYYY-MM-DD HH:MM UTC`, always UTC, never browser locale |
| `formatRelative`    | `11d ago`, `4h ago`, `NONE` when absent |
| `truncateAddress`   | first 4 + `…` + last 4 |
| `formatTxSignature` | first 6 + `…` + last 6 |
| `formatSol`         | up to 4 dp, trailing zeros trimmed, ` SOL` suffix |
| `formatUsd`         | `$` + thousands separators, 2 dp under $1,000 |
| `formatBps`         | integer + ` bps` |
| `formatScore`       | integer, or `—` when null |
| `formatPercent`     | 1 dp + `%` |
| `formatCount`       | thousands separators, tabular |

Numbers use tabular figures and aligned decimals. Missing values print `NONE` or `—`,
never `0`, and never a guess.

## 9. SPX402 Wallet naming

Public copy says **SPX402 Wallet**, **Agent Wallet**, **Payment Wallet** or
**Income Wallet**. "x402 wallet" is not public-facing language.

Developer and API surfaces may say x402, with this line available verbatim:

> SPX402 Wallets may use x402-compatible payment rails internally. Public users do not
> need to manage x402 directly.

Protocol nouns (`x402_service`, x402 facilitators, the x402 Bazaar, the x402 spec) keep
their names in technical contexts.

## 10. Motion

- Tokens: `--motion-fast: 150ms`, `--motion: 240ms`, `--ease: cubic-bezier(0.2, 0, 0, 1)`.
- Reveal-on-scroll for major bands only, once — never for rows, chips or tables.
- No bounce, no parallax, no particles, no decorative loops.
- Under `prefers-reduced-motion: reduce` everything collapses to no transform and no
  animation.

## 11. Focus and accessibility

- One focus treatment: the `focus-ring` utility (2px amber outline, 2px offset), on
  every interactive element. Never `outline-none` without a replacement.
- Skip-to-content link is the first focusable element on every page.
- Exactly one `<main>` per page, in the root layout.
- Icon-only controls carry `aria-label`. Status is never conveyed by colour alone.

## 12. Data honesty (public/private)

Backend-owned; never derived, defaulted or invented on the client:

verification · grade · score · decoded events · event count · evidence-floor status ·
attestation · wallet ownership · income routing · fee routing · issuer interest ·
correction history · public/private state · mainnet status

When a value is absent, render an explicit state — **pending**, **unavailable**,
**not returned**, **waiting for evidence**, **private**, **not yet graded** — through
`StatusChip` or `EmptyState`. Never a plausible-looking placeholder, sample row, demo
agent, example grade or example attestation.

Private agents never appear on public routes, public APIs, sitemaps, or share/OG
artwork.
