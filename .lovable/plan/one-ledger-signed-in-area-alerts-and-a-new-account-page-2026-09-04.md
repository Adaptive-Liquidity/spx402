# One Ledger: Signed-In Area, Alerts, and a New Account Page

The homepage now reads like an engraved instrument — coordinate spine, numbered bands, bracketed metrics, hatched calipers, terminal tape. The signed-in area still looks like an early admin panel: flat tiles, plain tab strip, bare "Loading…" text. This brings the operator terminal, both alert surfaces, and a brand-new Account page up to the same standard, using only the design language already built. No new colours, fonts, or layout systems.

## The operator shell

The frame every signed-in page sits inside gets rebuilt as a ledger header:

- A masthead reading `OPERATOR TERMINAL` with the account name, a live UTC readout, and a small status line (agents watched · alerts armed · keys active) so the shell itself reports state.
- The tab strip becomes a numbered register — `01 OVERVIEW`, `02 WATCHLIST`, `03 ALERTS`, `04 API KEYS`, `05 ACCOUNT` — with the active tab marked by a gold caliper notch rather than a filled block. Horizontally scrollable on phones, never wrapped into a stack.
- Corner registration marks and the same hairline rules used on the homepage, so the page visibly belongs to the same document.
- Sign-out moves into a quiet bracketed control at the far right of the masthead.
- The "Authenticating…" and "Sign in required" states get the same treatment instead of centred plain text.

## Overview

- The three counters become bracketed instrument cells matching the homepage metric row — tabular figures, a caption, and a hairline bracket — with a genuine skeleton pulse while loading instead of an ellipsis.
- Each cell carries a one-line reading beneath it (for example "3 armed · 0 muted"), and clicks through to its section.
- The welcome panel becomes a numbered band with the account identity set as a monospaced record line, plus the three actions restyled as caliper buttons.
- Adds a compact "recent activity" strip listing the newest tape events for watched agents; when nothing is watched it says so plainly rather than showing a fake chart.

## Watchlist

- Table restyled to match the leaderboard: engraved header row, alternating hairlines, tabular numerals, right-aligned figures, grade badges aligned in a fixed column.
- Row hover reveals a crosshair and the remove control, so the row is quiet until touched.
- Below 900px the table reflows into stacked record cards instead of a squeezed 12-column grid.
- Empty state becomes a proper plate — bracketed frame, "NO AGENTS UNDER WATCH", and one clear route into the Explorer.

## Alerts — signed-in

- Each subscription becomes an engraved record: agent identity on the left, channel chips, and an armed/muted state marked by a status dot rather than colour alone.
- The event toggles are grouped into two labelled registers, `AEON EXECUTION` and `LEGACY LANES`, laid out as a checkbox matrix with monospaced event codes beside the human labels.
- The channel row (Email / Telegram / Webhook) shows availability honestly: connected channels active, unconnected ones marked as pending rather than looking clickable.
- Add-subscription control becomes a terminal input line consistent with the homepage query console.

## Alerts — public page

- Same band structure as the homepage: numbered spine, section rule, headline pair.
- The sample alerts become tape-style specimens in a monospaced frame with a severity marker, reading like real dispatches rather than quote cards.
- Channels become a three-cell instrument row; the event coverage list becomes a two-register grid mirroring the signed-in page, so the marketing page and the real product visibly match.

## Account (new page)

New tab at `/dashboard/account`, wired into the register as `05 ACCOUNT`:

- **Identity** — display name (editable), email, account created date, and user reference shown as a monospaced record with copy control.
- **Security** — change password with confirmation, plus a note on when it was last changed. Errors and successes reported inline in the same voice as the rest of the terminal.
- **Access** — current plan tier, what it entitles, and a link to Pricing; key count with a link to API Keys.
- **Danger** — sign out everywhere, and a clearly separated, confirm-gated account deletion request that states plainly what happens to watchlists and keys.

All writes go through the existing account system; nothing new is stored.

## API keys

Not in the request, but it shares the same shell and would look broken beside the rest: the key table, tier selector, and one-time secret reveal get the same engraved table and caliper-button treatment. No behaviour changes.

## Not changing

Scoring, decoders, alert delivery logic, database schema, API contracts, and the public marketing pages already redesigned. No new colours, fonts, or layout systems — everything reuses tokens and components already in the design system.

## Technical notes

- Shell rebuilt in `src/routes/_authenticated.tsx`; new leaf `src/routes/_authenticated.dashboard.account.tsx` with its own `head()` metadata.
- Reuse existing primitives (`Panel`, `EmptyState`, `MetricCard`, `CopyButton`, `ExecutionGradeBadge`, `Reveal`) and the homepage CSS components (`band-spine`, `metric-cell`, `metric-bracket`, `caliper-*`, `plate-ground`, `spine-*`). Any genuinely new class is added under `@layer components` in `src/styles.css`; no `tailwind.config.js`.
- Profile and password updates via `supabase.auth.updateUser`; deletion request recorded through the existing account flow rather than a client-side delete.
- Verification: typecheck, full test suite (151 currently passing), and a visual pass at 390px, 768px, and 1280px including reduced-motion.
