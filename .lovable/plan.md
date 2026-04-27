## What this plan changes

The strategic doc is good but mixes 3-day wins with 3-month projects. To get explosive growth, we should ship the **positioning + funnel + leaderboard** now, and queue the rest behind a clear backlog so we don't dilute the current product.

The core insight worth implementing immediately: **agents have categories** (tokenized buyback, copy-trader, task-executor, general), and reputation should be **modular pillars** that compose into one SPX score. That single change unlocks leaderboards, the new homepage hero, and the "register & compete" funnel without rewriting the indexer.

What we explicitly do NOT do in this pass: copy-trade PnL decoding, NFT badges, on-chain competitions with prize pools, Validation Registry CPI parsing, marketplace. Those are real Phase 2/3 work and shipping them half-built would hurt credibility.

---

## Wave 1 — Reposition (ship first, ~highest impact per hour)

Goal: every visitor immediately understands "this is where agents come to prove themselves and compete," not just "a directory of pump.fun tokens."

1. **Homepage hero rewrite** (`src/routes/index.tsx`)
   - New TL;DR: *"The on-chain reputation terminal for every Solana agent. Register your Agent Registry PDA → get a live SPX Execution Score → climb the leaderboard and prove you deliver."* (Keeps "execution" as the anchor word so we stay true to our roots.)
   - Two CTAs side-by-side: **Register your agent** (→ `/register`) and **Browse leaderboard** (→ `/leaderboard`).
   - Keep the boot sequence and live ticker — they're working brand assets.
   - Update meta tags to match.

2. **`/register` route** (rename + upgrade `/submit`)
   - Keep `/submit` as a redirect for backlinks.
   - Framed as a 3-step flow: (1) Paste mint or Agent Registry PDA → (2) Select category → (3) Optional operator verification.
   - Helper line under the input: *"Already registered on the Solana Agent Registry? Paste your PDA — we auto-detect and index your execution history."*
   - Category stored on `candidate_agents.signals` JSONB so no schema change for MVP.
   - Post-submit screen: *"Your agent is now discoverable on the Solana Agent Registry + SPX402. First score expected in ~10 min. Share this dossier to start attracting users and tasks."* + copyable `/agent/<mint>` link.

3. **Sharper one-liner everywhere**
   - Update `SiteHeader` tagline, footer, og descriptions, `/about` intro.
   - Replace "ratings agency for tokenized AI agents" with "reputation terminal for every Solana agent" on public-facing surfaces. Methodology page keeps its more technical framing.

Effort: small. Almost entirely copy + one new route.

---

## Wave 2 — Leaderboard + Pillars (the growth loop)

Goal: give agents a public scoreboard to chase, and make scores feel category-fair.

1. **`/leaderboard` route** with three tabs
   - **Top Earners** — current tokenized agents ranked by `total_buyback_sol` over the indexed window (data we already have).
   - **Most Consistent** — ranked by `buyback_execution_rate` with a minimum activity floor so empty agents don't top it.
   - **Recently Verified** — newest agents to hit operator-verified or score ≥ 70.
   - Each row reuses `AgentRow`. Add a rank chip (#1, #2, …) and a trend arrow (up/down/new) computed from the previous snapshot.
   - Time windows: 24h / 7d / All-time. For MVP, "All-time" is real and 24h/7d use a simple `agent_events.occurred_at` filter — no new rollup table yet.

2. **Modular pillars on dossier pages** (`agent.$mint.tsx`)
   - Today the score breakdown is 7 sub-scores. Group them visually into **3 pillars**:
     - **Execution** (deposits + buyback execution + burn confirmation)
     - **Reliability** (failed-tx + recency)
     - **Identity** (metadata + operator)
   - Pillar bars + one composite score. No math change — pure presentational regroup. Makes the score legible to non-technical visitors and sets up the "category-specific pillar" story without committing to category-specific math yet.
   - Add a **Category chip** on the dossier. Exact options: **Tokenized Buyback / Copy-Trader / Task Executor / General Agent**. Default every currently-indexed agent to *Tokenized Buyback* so nothing looks broken.

3. **Register-CTA on every dossier**
   - Footer of every agent page: *"Is this your agent? Verify operator → climb the leaderboard."* Links to operator verification flow if not yet verified.

Effort: medium. One new route, one component refactor, one DB query pattern (sorted slices over `agents` + `agent_events`).

---

## Wave 3 — Discovery funnel polish

Small but high-leverage:

1. **`/explore` tabs**: add **Tokenized / Copy-Traders / Task Executors / All Agents** tabs so the page is ready when other categories start landing. For now non-tokenized tabs show an empty-state CTA ("First copy-trader to register here gets featured"). The structure is what matters for the marketing story.
2. **Ticker tape** (`src/lib/live-data.ts`): inject leaderboard lines pulled from the same query that powers `/leaderboard`. Example shape: *"◆ #1 EARNER · $POCK · 12.4 SOL bought back this week (SPX AAA)"*.
3. **Embeddable score badge** — a single static SVG endpoint at `/api/public/badge/$mint.svg` returning the agent's grade + score. Cheap to build (we have the data), and every embed is a backlink. The lowest-effort version of "portable reputation."

Effort: small.

---

## Explicitly deferred to Phase 2 backlog

Saved to `mem://features/phase2-backlog` so they don't get lost but also don't get half-built:

- Copy-trade PnL decoding (needs swap-log parser + benchmark wallet logic)
- Task-completion attestations / Validation Registry CPI parsing
- NFT / MPL Core composable badges
- On-chain competitions with prize pools (`/arena`)
- Marketplace / "hire an agent"
- Per-category score formulas (we set up pillar UI now, swap math later)
- Wallet-portfolio "agents you hold" view
- Agent Registry co-marketing / partnership outreach (product work, not engineering)

---

## Risks & calls we're making

- **We are NOT changing the scoring math in this pass.** The pillar regroup is presentational. Anything else risks invalidating existing dossiers right when we're trying to grow.
- **Categories are soft for now** — stored on `candidate_agents.signals` and read at render time. We avoid a schema migration in Wave 1.
- **Leaderboards use existing data only.** No new cron, no new rollup table. If perf becomes an issue we'll add `agent_earnings_rollup` later.
- **Competitive moat stays "pure on-chain execution."** We do not claim copy-trade PnL until the parser actually exists. Soft-launching that promise would directly hurt the "we only rate what we can prove" trust position.

---

## Files touched

New:
- `src/routes/register.tsx`
- `src/routes/leaderboard.tsx`
- `src/routes/api.public.badge.$mint[.]svg.ts`
- `mem://features/phase2-backlog`

Edited:
- `src/routes/index.tsx` (hero + meta)
- `src/routes/submit.tsx` (redirect to /register)
- `src/routes/agent.$mint.tsx` (pillar regroup + category chip + register CTA)
- `src/routes/explore.tsx` (category tabs)
- `src/components/spx/SiteHeader.tsx`, `SiteFooter.tsx` (tagline)
- `src/lib/live-data.ts` (leaderboard ticker line)
- `src/routes/about.tsx`, `src/routes/methodology.tsx` (positioning copy)

No DB migrations required for Wave 1 + 2.