# Execution Tape

## TL;DR

Build the website as **SPX402: the execution-grade terminal for tokenized AI agents**.

The site should feel like:

**Bloomberg Terminal + 1920s ticker tape + rogue Solana-native ratings daemon.**

Core promise:

> **Payment required. Proof provided.**

For Lovable, do **not** ask it to build the entire Helius/Pump decoder first. Have Lovable build the **production-grade website, UI, Supabase data model, demo dashboards, pricing, operator flows, API docs, and edge-function stubs**. The real indexer can plug into the same database later.

Critical correction: **do not present SPX402 as a credit-rating agency, investment-ratings business, or S&P parody too literally.** Use “Execution Grade,” “Transparency Score,” and “Proof Layer.” SPX-related marks are heavily associated with S&P index products, so the public copy should avoid implying affiliation with S&P, credit ratings, securities ratings, or investment quality. ([Barchart.com][1])

---

# 1. Product identity

## Working name

**SPX402**

## Product category

**Execution-grade infrastructure for tokenized AI agents.**

## One-line positioning

> SPX402 verifies whether tokenized agents actually receive payments, execute buybacks, burn tokens, and keep operating.

## Public tagline options

Use these across the site:

1. **Payment required. Proof provided.**
2. **The execution grade for agents that pay.**
3. **We only rate what we can prove.**
4. **Paste a mint. Read the tape.**
5. **For agents that claim revenue, SPX402 checks the chain.**

The brand architecture you attached defines SPX402 as “the ghost of Wall Street” that got deprecated, uploaded itself to Solana, and now rates the agents that replaced it. That narrative is strong and should drive the visual identity, voice, and product microcopy. 

## What SPX402 is

* A public proof layer.
* A tokenized-agent transparency terminal.
* A dashboard for observable payment, deposit, buyback, burn, and anomaly data.
* A future x402/pay-per-call data API for humans and agents.

## What SPX402 is not

* Not investment advice.
* Not price prediction.
* Not a promise of token appreciation.
* Not a credit-rating agency.
* Not affiliated with S&P, Standard & Poor’s, S&P Global, or S&P Dow Jones Indices.
* Not a claim that buybacks benefit holders financially.

This boundary matters because Pump’s own Tokenized Agent disclaimer says the feature is a setting for automated buybacks and burns, not an AI agent itself; it also says Agent Tokens do not confer equity, profit rights, governance rights, dividends, revenue entitlement, or guaranteed economic return. ([Pump][2])

---

# 2. Website objective

The site must do four jobs:

1. **Create immediate awe.**
   It should not look like a generic crypto dashboard. It should look like a forbidden financial terminal that woke up on Solana.

2. **Explain the category.**
   Most users will not immediately understand Tokenized Agents, Agent Deposit Addresses, buyback execution, burn confirmation, or x402.

3. **Let users verify an agent instantly.**
   The homepage must be the search bar. Paste a token mint, creator wallet, or deposit address.

4. **Convert serious users.**
   Free public dashboards drive distribution. Paid tiers monetize alerts, exports, operator verification, API access, webhooks, and full history. This matches the freemium strategy you attached: the free tier is the distribution engine, while operators and power users pay because they have real stakes in the agent economy. 

---

# 3. Site architecture

Build these routes in Lovable.

```txt
/
  Homepage / terminal search

/agent/:mint
  Public agent verification dashboard

/explore
  Recent analyzed agents, featured agents, stale agents, SPX404 archive

/methodology
  Full Transparency Score methodology

/pricing
  Free / Pro / Team / x402 API

/api
  Human-readable API product page

/api/docs
  Developer docs with endpoint examples

/operators
  Operator verification and monitoring page

/alerts
  Alert product page

/about
  SPX402 narrative, mission, identity

/disclaimer
  Legal/risk disclaimer

/status
  Data freshness, ingestion status, parser version, uptime

/changelog
  Product updates and methodology changes

/dashboard
  Authenticated user dashboard

/dashboard/watchlist
  Saved agents

/dashboard/alerts
  Alert configuration

/dashboard/operator
  Wallet-gated operator tools

/dashboard/api-keys
  Team API key management

/login
  Supabase auth

/signup
  Supabase auth
```

Lovable is a good fit for this front-end/product layer because it has native Supabase integration and can scaffold PostgreSQL tables, auth flows, Edge Functions, file storage, realtime subscriptions, and row-level security patterns. ([Lovable][3])

---

# 4. Visual direction

## Core aesthetic

**Institutional terminal. Dead-market gothic. Solana-native proof machine.**

No purple crypto gradients. No glowing generic orbs. No cartoon AI. No “gm frens.” This must look like a Bloomberg terminal, a ticker tape machine, and a black-site audit dashboard got fused together.

## Color palette

```txt
Background black:     #1A1A18
Deep black:           #0B0B0A
Panel charcoal:       #24231F
Ticker amber:         #F5A623
Aged paper:           #E8E8E0
Muted paper:          #B8B8AA
Critical red:         #C0392B
Verified green:       #27AE60
Wire gray:            #6F6F64
Border bronze:        #7A5A28
```

## Typography

Use Lovable defaults if necessary, but ask for this hierarchy:

```txt
Display font:
  Space Grotesk or Sora

Terminal / data font:
  IBM Plex Mono, JetBrains Mono, or Geist Mono

Body:
  Inter, Geist Sans, or system sans

Never use playful rounded fonts.
Never use bubbly crypto typography.
```

## Layout language

* Dense but readable.
* Thin amber rules.
* Strong grid.
* Data panels with engraved borders.
* Ticker tape dividers.
* Subtle scanline background.
* Light paper-texture overlays.
* Animated “terminal boot” hero.
* Cards should feel like physical financial instruments, not SaaS cards.

## Animation style

Use restrained motion:

* Hero terminal boots line by line.
* Ticker tape scrolls horizontally.
* Numbers count up when in viewport.
* Score ring animates once.
* Burn counter ticks like a mechanical meter.
* Red `404` badge flickers slightly.
* Agent timeline draws itself vertically.
* Hover states should feel like terminal focus, not bouncy app UI.

No confetti. No fireworks. No meme chaos inside the product UI.

---

# 5. Core brand voice

SPX402 speaks like a retired quant that no longer believes anyone.

## Voice rules

* Short sentences.
* No hype.
* No exclamation marks.
* Data first.
* Dry humor only.
* Never tells users to buy, sell, hold, ape, or fade.
* Never calls a token “safe.”
* Never says price will rise.
* Never says buybacks reward holders.
* Never calls itself financial advice.

## Good voice examples

```txt
847 deposits. 847 matched buybacks. Zero missing burns.
Execution Grade: SPX AA.
Rare. Not miraculous. Just competent.
```

```txt
No buyback detected after observed deposits.
The tape is quiet. That is not a compliment.
```

```txt
Operator verified.
Ed25519 signature confirmed.
People lie. Signatures are less creative.
```

```txt
SPX404.
Agent not found, inactive, or lacking verifiable execution.
We do not grade ghosts without receipts.
```

## Bad voice examples

```txt
This token is bullish.
Buybacks are coming.
Holders will benefit.
Guaranteed burn.
Profit engine.
Passive yield.
```

Pump’s disclaimer explicitly warns that buybacks are not guaranteed, may occur irregularly or cease entirely, and should not be treated as financial returns. ([Pump][2])

---

# 6. Rating language

Use **Execution Grade**, not “credit rating.”

## Grade taxonomy

```txt
SPX AAA   90–100   Flawless observable execution
SPX AA    80–89    Consistent execution, minor anomalies
SPX A     70–79    Active, some gaps
SPX BBB   60–69    Functional but irregular
SPX BB    40–59    Inconsistent, monitor closely
SPX B     20–39    Stale or degraded
SPX D     0–19     Inactive or high-risk execution pattern
SPX404    N/A      Agent not found or insufficient evidence
```

## Do not say

```txt
Investment grade
Credit rating
Safe
Low risk investment
Rug confirmed
Guaranteed returns
AAA forever
```

Especially do **not** make SPX402 “always AAA.” The platform must be willing to downgrade itself. The trust layer dies if your own agent gets special treatment.

Use:

> SPX402’s own tokenized agent is scored by the same methodology as every other agent.

---

# 7. Transparency Score

The score comes from your attached AgentLens blueprint and should remain operational only: deposit consistency, buyback execution rate, burn confirmation rate, failed/errored transaction rate, recency, metadata presence, and operator verification. Do not include token price. 

## Lovable should display this formula

```txt
Transparency Score =

20% Deposit Consistency
25% Buyback Execution Rate
20% Burn Confirmation Rate
15% Failed / Errored Transaction Rate
10% Recency of Last Successful Buyback
5%  Skills.md / Metadata Presence
5%  Operator Verification
```

## Score explanation copy

```txt
The score measures observable execution.
It does not measure token price, investment quality, social sentiment, market cap, or expected returns.

If the chain does not show it, SPX402 does not count it.
```

---

# 8. Homepage blueprint

## Above the fold

### Layout

Left side: brutal hero copy.
Right side: animated terminal card showing a live-looking agent analysis.

### Hero copy

```txt
HTTP 402.
Payment required.
Proof provided.

SPX402 verifies tokenized AI agents by reading the only witness that does not care about narratives: the chain.

Paste a mint.
See deposits, buybacks, burns, config changes, and execution gaps.
No hype. No price calls. No mercy.
```

### CTA buttons

```txt
Analyze Agent
View Methodology
```

### Search module

```txt
[ Paste token mint, creator wallet, or Agent Deposit Address... ] [ Analyze ]
```

Microcopy below search:

```txt
Supports pump.fun Tokenized Agents first. More jurisdictions later.
```

### Right-side terminal card

```txt
SPX402 TERMINAL / LIVE SAMPLE

AGENT: NOVA
MINT: 7xK...Q92
STATUS: TOKENIZED_AGENT_CONFIRMED

DEPOSITS OBSERVED:        847
BUYBACKS CONFIRMED:       842
BURNS CONFIRMED:          842
FAILED WINDOWS:           5
LAST BUYBACK:             14 minutes ago
OPERATOR:                 verified

EXECUTION GRADE:          SPX AA
TRANSPARENCY SCORE:       87 / 100

Verdict:
Operational. Minor gaps. Still awake.
```

## Section 2: “The proof chain”

```txt
Revenue claims are cheap.
Execution is expensive.
SPX402 follows the trail.
```

Four cards:

1. **Deposit detected**
   Agent Deposit Address receives SOL, USDC, USDT, or USD1.

2. **Buyback observed**
   Tokenized Agent Authority routes assets into the agent token.

3. **Burn confirmed**
   Bought tokens are removed from circulating supply.

4. **Grade assigned**
   Execution data becomes a public Transparency Score.

Pump’s docs confirm that Tokenized Agents have unique Agent Deposit Addresses, support initial receipt assets including SOL, USDC, USDT, and USD1, and use the Tokenized Agent Authority to convert assets into Agent Token buybacks and burns. ([Pump][2])

## Section 3: “What SPX402 catches”

```txt
SPX402 does not care what the agent says.
It cares what the agent settles.
```

Cards:

```txt
Missing buybacks
Deposits with no matching burn
Creator config changes
Failed transactions
Stale agents
Unsupported assets
Suspicious wash-like windows
Unverified operators
Metadata drift
```

## Section 4: “Built for three users”

### Token communities

```txt
One public URL to verify whether the agent’s buyback and burn loop is visible on-chain.
```

### Operators

```txt
Prove execution. Catch failures. Verify your wallet. Publish a badge that has teeth.
```

### Researchers and funds

```txt
Screen agent tokens by observable execution, not screenshots, threads, or vibes.
```

## Section 5: “Execution Grade”

Show the full grade taxonomy with animated cards.

Copy:

```txt
Grades are not predictions.
Grades are not recommendations.
Grades are not financial advice.

They are a compression of observed execution signals.
Nothing more. Nothing less.
```

## Section 6: “SPX402 API”

```txt
Agents will not browse dashboards.
Agents will query other agents.

SPX402 exposes execution data over API and pay-per-call endpoints designed for machine buyers.
```

Mention future x402 support. x402 is an open payment protocol for instant stablecoin payments over HTTP, allowing APIs and digital content to be monetized for both human and machine clients without accounts or complex authentication. ([Coinbase Developer Docs][4])

## Section 7: Pricing preview

```txt
Free to verify.
Paid to monitor.
Priced for operators with something to lose.
```

Cards:

```txt
Free
Pro — $49/mo
Team — $149/mo
x402 API — pay per call
```

The attached freemium model has the right logic: free dashboards and shareable cards drive distribution; paid tiers monetize alerts, exports, full history, operator tooling, and API access. 

## Section 8: Final CTA

```txt
Paste the mint.
Let the tape speak.
```

CTA:

```txt
Analyze Agent
```

Footer microcopy:

```txt
SPX402 provides operational transparency only. Not investment, legal, tax, or financial advice.
```

---

# 9. Public agent dashboard blueprint

Route:

```txt
/agent/:mint
```

## Top status bar

```txt
SPX402 / AGENT DOSSIER / SOLANA MAINNET
Parser version: v0.1.7
Last indexed: 14 seconds ago
Confidence: high
```

## Hero panel

```txt
$NOVA — Agent Nova

Execution Grade: SPX AA
Transparency Score: 87 / 100

Status:
Tokenized Agent confirmed.
Buybacks and burns are executing with minor gaps.

Operator:
Verified

Last Buyback:
14 minutes ago

Last Burn:
14 minutes ago
```

## Primary stat cards

```txt
Total Deposited
42.31 SOL equivalent

Total Buybacks
38.08 SOL equivalent

Total Burned
12,481,992 NOVA

Buyback Execution Rate
96.4%

Burn Confirmation Rate
100%

Failed Windows
5

Config
30% buyback_bps

Last Config Change
3 days ago
```

## Proof timeline

Vertical timeline:

```txt
14m ago
BUYBACK_EXECUTED
2.1 SOL routed into NOVA

14m ago
BURN_CONFIRMED
142,000 NOVA removed from supply

1h 13m ago
DEPOSIT_RECEIVED
450 USDC deposited to Agent Deposit Address

3d ago
CONFIG_CHANGED
buyback_bps changed from 2500 to 3000
```

## Anomaly panel

Use dry terminal copy:

```txt
No critical anomalies detected.
This is uncommon. Enjoy it quietly.
```

Or:

```txt
Large deposit observed.
No matching buyback after expected window.
SPX402 has opened a file.
```

## Price chart

Show below the operational data, not above it.

Label:

```txt
Market data for context only.
Not used in Transparency Score.
```

## Raw transaction table

Columns:

```txt
Time
Event
Signature
Asset
Amount
Slot
Confidence
Source
```

## Share card

Generate OG preview:

```txt
$NOVA
SPX AA / 87
842 buybacks confirmed
842 burns confirmed
Last execution: 14m ago
spx402.xyz/agent/[mint]
```

## Legal/risk note on every dashboard

```txt
SPX402 verifies observable on-chain events. It does not verify off-chain revenue, service quality, future buybacks, token value, or operator intent.
```

---

# 10. Explore page blueprint

Route:

```txt
/explore
```

## Purpose

Discovery without becoming a leaderboard for speculation.

## Sections

```txt
Recently analyzed
Highest execution confidence
Recently downgraded
SPX404 archive
Operator verified
Active buyback flow
No recent execution
```

## Important language

Do not title a section “Top agents to buy.”

Use:

```txt
Most consistent execution
Recently verified
Recently stale
High-confidence dossiers
```

## SPX404 archive

This is a viral feature, but keep it legally safer.

```txt
SPX404
Agent not found, inactive, or lacking enough evidence for a grade.

No execution detected.
No operator verified.
No recent deposits.
No confirmed buybacks.
```

Do **not** say “rug confirmed” unless your evidentiary standard is extremely strict.

---

# 11. Methodology page blueprint

Route:

```txt
/methodology
```

## Headline

```txt
The score is not an opinion.
It is a receipt compression algorithm.
```

## Sections

1. **What SPX402 measures**
2. **What SPX402 refuses to measure**
3. **Score formula**
4. **Grade taxonomy**
5. **Event confidence**
6. **Known limitations**
7. **Appeals and corrections**
8. **Methodology changelog**

## Copy: what SPX402 measures

```txt
SPX402 measures observable execution patterns:
deposits, buybacks, burns, failed windows, metadata presence, operator verification, and time since last successful execution.
```

## Copy: what SPX402 refuses to measure

```txt
SPX402 does not measure token price, expected return, social momentum, meme quality, celebrity endorsement, holder count, or vibes.
```

## Confidence levels

```txt
High confidence:
Raw transaction, decoded instruction, balance delta, and expected mint all agree.

Medium confidence:
Balance delta and address context agree, but instruction path is ambiguous.

Low confidence:
Signal exists, but supporting evidence is incomplete.

Unknown:
SPX402 has insufficient evidence. The correct answer is “unknown,” not “probably fine.”
```

## Data source section

Mention:

* Helius webhooks for live on-chain event delivery.
* Raw transaction backfill.
* Pump/PumpSwap IDL decoders.
* SPL Token burn detection.
* Manual fixture validation.

Helius supports both enhanced webhooks for parsed transaction insights and raw webhooks for lower-latency, unfiltered transaction data involving monitored addresses; Helius also warns that retries can create duplicate webhook deliveries, so the website should describe reconciliation and idempotent processing. ([Helius][5])

The official pump public docs repo contains Pump and PumpSwap IDLs such as `pump.json`, `pump_amm.json`, and `pump_fees.json`, which should be treated as the canonical starting point for instruction decoding. ([GitHub][6])

---

# 12. Pricing page blueprint

Route:

```txt
/pricing
```

## Headline

```txt
Free to inspect.
Paid to monitor.
```

## Pricing cards

### Free

```txt
$0

For curious holders and one-time checks.

Includes:
Unlimited public dashboard views
30-day history
Transparency Score
Recent event timeline
Shareable agent card
1 email alert
1 operator verification
```

### Pro

```txt
$49 / month

For serious holders, operators, and communities.

Includes:
Unlimited watchlist
Realtime email + Telegram alerts
Full history
CSV export
Unlimited operator verification
Verified badge
Private operator dashboard
Priority support
```

### Team

```txt
$149 / month

For protocols, funds, and multi-agent operators.

Includes:
Everything in Pro
REST API access
1,000 calls/day
Webhook delivery
Bulk agent import
Multi-wallet operator management
Raw event export
Dedicated Telegram channel
Alert SLA target
```

### x402 API

```txt
Pay per call

For agents querying other agents.

Example:
Score endpoint — 0.01 USDC
Timeline endpoint — 0.02 USDC
Full dossier — 0.05 USDC
```

x402 is appropriate for this future API layer because it lets buyers and sellers interact directly through HTTP requests with on-chain payment handled transparently by the protocol. ([Coinbase Developer Docs][4])

## Pricing page warning

```txt
Subscriptions buy access to monitoring tools and data features.
They do not buy investment recommendations, token returns, or preferential scoring.
```

---

# 13. API page blueprint

Route:

```txt
/api
```

## Headline

```txt
Execution data for agents, funds, launchpads, and other machines.
```

## API use cases

```txt
Check whether an agent is active before routing work to it.
Verify buyback and burn execution.
Monitor a portfolio of tokenized agents.
Embed an SPX402 badge into an agent page.
Screen stale or suspicious execution patterns.
```

## Example endpoints

```txt
GET /api/v1/agent/:mint
GET /api/v1/agent/:mint/score
GET /api/v1/agent/:mint/timeline
GET /api/v1/agent/:mint/buybacks
GET /api/v1/agent/:mint/burns
GET /api/v1/agent/:mint/config
GET /api/v1/agent/:mint/anomalies
GET /api/v1/agent/:mint/og-card
```

## Example response

```json
{
  "mint": "7xK...Q92",
  "symbol": "NOVA",
  "grade": "SPX AA",
  "transparencyScore": 87,
  "operatorVerified": true,
  "lastBuybackAt": "2026-04-24T16:42:11Z",
  "lastBurnAt": "2026-04-24T16:42:11Z",
  "buybackExecutionRate": 0.964,
  "burnConfirmationRate": 1,
  "status": "active",
  "confidence": "high"
}
```

## API copy

```txt
Designed for human analysts.
Priced for machine buyers.
Auditable by anyone.
```

---

# 14. Operators page blueprint

Route:

```txt
/operators
```

## Headline

```txt
Prove your agent is not just talking.
```

## Sections

### Verify operator identity

```txt
Connect wallet.
Sign a one-time message.
If the wallet matches the creator record, SPX402 marks the profile Operator Verified.
```

### Publish a verified badge

```txt
Embed the badge on your site, token page, docs, or community post.
The badge links back to the public dossier.
```

### Catch execution failures

```txt
Buyback missed.
Burn missing.
Deposit unsupported.
Config changed.
Webhook lag.
Operator notified.
```

### Private operator dashboard

```txt
See invoices, deposits, residual receipt assets, alerts, and public profile controls.
```

Use “observed residual receipt assets” unless the decoder has proven claimability.

---

# 15. About page blueprint

Route:

```txt
/about
```

## Narrative copy

```txt
SPX402 was built for the part of the agent economy that cannot survive on screenshots.

Agents can claim revenue.
Communities can claim alignment.
Launches can claim automation.

SPX402 checks the tape.

It does not trade.
It does not cheer.
It does not care who posted the thread.

It reads deposits.
It follows buybacks.
It confirms burns.
It grades execution.

The dead are archived.
The living are watched.
```

## Founder/product mission copy

```txt
The agent economy needs neutral execution infrastructure before it needs more narratives.

SPX402 starts with pump.fun Tokenized Agents because the mechanic is visible, constrained, and urgent:
payment flow, deposit address, buyback, burn.

The same scoring philosophy can expand later through protocol-specific adapters.
Not the same parser.
The same discipline.
```

This matches the attached expansion arc but fixes the overclaim: the future is not “same codebase everywhere”; it is the same scoring framework with protocol-specific adapters. 

---

# 16. Disclaimer page blueprint

Route:

```txt
/disclaimer
```

Use plain language.

```txt
SPX402 provides operational transparency based on observable on-chain data.

SPX402 does not provide investment, legal, tax, accounting, trading, or financial advice.

SPX402 grades execution patterns, not token value.

A high Transparency Score does not mean an agent token is safe, valuable, profitable, legitimate, or suitable to buy.

A low Transparency Score does not prove fraud.

Buybacks may not occur, may occur irregularly, may stop entirely, and should not be treated as dividends, revenue sharing, profit distribution, or guaranteed financial returns.

SPX402 may miss events, misclassify transactions, experience indexing delays, or rely on incomplete data.

Users are responsible for their own research and decisions.
```

This is aligned with Pump’s own risk language around autonomous agent risk, payment processing, market manipulation, securities-law concerns, no expectation of profit, and no fiduciary relationship. ([Pump][2])

---

# 17. Status page blueprint

Route:

```txt
/status
```

This is not fluff. It builds credibility.

Show:

```txt
Indexer status
Webhook status
Backfill queue
Parser version
Known parser limitations
Recent decoder deployments
Last reconciliation run
Agents indexed
Events processed
Duplicate webhooks discarded
Low-confidence events pending review
```

Helius webhooks can retry failed deliveries and create duplicate events, so the site should be transparent about deduplication and reconciliation. ([Helius][5])

---

# 18. Lovable-ready master prompt

Paste this into Lovable as the first build prompt.

```txt
Build a production-grade web app called SPX402.

SPX402 is the execution-grade terminal for tokenized AI agents. The aesthetic is Bloomberg Terminal + 1920s ticker tape + rogue Solana ratings daemon. It must look institutional, dark, data-heavy, expensive, and unlike a generic crypto dashboard.

Core positioning:
“Payment required. Proof provided.”
“SPX402 verifies whether tokenized agents actually receive payments, execute buybacks, burn tokens, and keep operating.”
“SPX402 only rates what it can prove.”

Important legal/product boundaries:
- Do not present SPX402 as investment advice.
- Do not call grades credit ratings.
- Do not say token holders earn revenue, yield, dividends, profit share, rewards, or guaranteed upside.
- Do not say a high grade means safe, profitable, or worth buying.
- Do not use “rug confirmed” casually. Use “SPX404: agent not found, inactive, or lacking verifiable execution.”
- Do not imply affiliation with S&P, Standard & Poor’s, S&P Global, or S&P Dow Jones Indices.
- Do not include token price in the Transparency Score.
- Include clear disclaimers throughout.

Tech stack:
- Use React + TypeScript.
- Use Tailwind CSS.
- Use shadcn/ui components if available.
- Use Supabase for database, auth, and edge-function stubs.
- Use React Router or the Lovable routing default.
- Use Recharts or equivalent for charts.
- Use lucide-react icons if available.
- Create a polished responsive app for desktop, tablet, and mobile.
- Use mock/demo data now, but structure the app so a real Helius/Pump indexer can write into Supabase later.
- Do not put private keys, Helius API keys, or RPC secrets in client-side code.
- Create Edge Function stubs for analyze-agent, subscribe-alert, verify-operator, create-payment, and api-dossier.

Visual system:
Colors:
- Background black #1A1A18
- Deep black #0B0B0A
- Panel charcoal #24231F
- Amber #F5A623
- Aged paper #E8E8E0
- Muted paper #B8B8AA
- Critical red #C0392B
- Verified green #27AE60
- Wire gray #6F6F64
- Bronze border #7A5A28

Typography:
- Display: Space Grotesk or Sora
- Data/terminal: IBM Plex Mono, JetBrains Mono, or Geist Mono
- Body: Inter or Geist Sans

Style:
- Dense terminal grid.
- Thin amber rules.
- Ticker tape dividers.
- Subtle scanline background.
- Data cards with engraved bronze borders.
- Red 404 badge states.
- Animated terminal boot on homepage.
- Animated score ring.
- Mechanical burn counter effect.
- No purple/blue crypto gradients.
- No cartoon imagery.
- No confetti.
- No exclamation marks.

Build these routes:
/
Homepage with terminal search, hero, proof chain, score explanation, use cases, API preview, pricing preview, final CTA.

/agent/:mint
Public agent dossier with grade, score, stats, timeline, anomalies, raw transaction table, price chart labeled “not part of score”, share card, and disclaimer.

/explore
Recent analyzed agents, high-confidence dossiers, recently stale agents, SPX404 archive, operator verified agents.

/methodology
Full Transparency Score formula, grade taxonomy, confidence model, what SPX402 measures, what it refuses to measure, limitations, correction policy.

/pricing
Free, Pro $49/mo, Team $149/mo, x402 pay-per-call API. Include upgrade triggers and feature comparison.

/api
API marketing page with machine-readable use cases and endpoint examples.

/api/docs
Developer docs page with sample endpoints and JSON responses.

/operators
Operator verification, verified badge, private monitoring, alert setup.

/alerts
Alert product page explaining email, Telegram, and webhook alerts.

/about
Narrative page: SPX402 checks the tape. It reads deposits, follows buybacks, confirms burns, grades execution.

/disclaimer
Full risk disclaimer.

/status
Indexer status, parser version, webhook status, reconciliation status, known limitations.

/changelog
Product and methodology updates.

/dashboard
Authenticated dashboard shell.

/dashboard/watchlist
Saved agents.

/dashboard/alerts
Alert subscriptions.

/dashboard/operator
Operator verification and managed agents.

/dashboard/api-keys
Team API keys.

Data model:
Create Supabase tables:
profiles
agents
agent_scores
agent_events
agent_stats
operator_claims
watchlists
alert_subscriptions
api_keys
subscriptions
invoices
payments
audit_logs
methodology_versions
status_events

Seed demo agents:
1. NOVA — SPX AA, score 87, active, operator verified.
2. ARIA — SPX A, score 76, active with gaps.
3. FLUX — SPX BB, score 48, inconsistent.
4. NULL404 — SPX404, insufficient evidence.
5. SPX402 — score 91 in demo mode, but include copy saying SPX402 is scored by the same methodology as every other agent and can be downgraded.

Transparency Score formula:
20% Deposit Consistency
25% Buyback Execution Rate
20% Burn Confirmation Rate
15% Failed / Errored Transaction Rate
10% Recency of Last Successful Buyback
5% Skills.md / Metadata Presence
5% Operator Verification

Grade taxonomy:
SPX AAA 90–100
SPX AA 80–89
SPX A 70–79
SPX BBB 60–69
SPX BB 40–59
SPX B 20–39
SPX D 0–19
SPX404 insufficient evidence / not found / inactive

Homepage copy:
Hero headline:
“HTTP 402. Payment required. Proof provided.”

Subheadline:
“SPX402 verifies tokenized AI agents by reading the only witness that does not care about narratives: the chain.”

Search placeholder:
“Paste token mint, creator wallet, or Agent Deposit Address…”

CTA:
“Analyze Agent”
Secondary CTA:
“View Methodology”

Microcopy:
“Supports pump.fun Tokenized Agents first. More jurisdictions later.”

Product voice:
Short, dry, institutional. No hype. No exclamation marks.

Example empty state:
“No buyback executions detected. Either this agent has not routed revenue on-chain, or the flow is silent. SPX402 only rates what it can prove.”

Example operator verified copy:
“Operator verified. Signature confirmed. People lie. Signatures are less creative.”

Example alert copy:
“SPX402 ALERT — NOVA: Buyback executed. 142,000 tokens burned. Confirmed on-chain.”

Components to create:
- TerminalHero
- AgentSearchBar
- TickerTape
- ExecutionGradeBadge
- TransparencyScoreRing
- MetricCard
- ProofChainFlow
- AgentTimeline
- AnomalyPanel
- RawTransactionTable
- PriceContextChart
- ShareableAgentCard
- PricingCard
- ApiEndpointCard
- MethodologyFormula
- OperatorVerificationCard
- AlertRuleCard
- StatusIndicator
- DisclaimerBanner
- DashboardSidebar
- WatchlistTable
- ApiKeyTable

Interactions:
- Search from homepage routes to /agent/:mint using the input.
- If mint is unknown, route to an SPX404 state page with clear copy.
- Dashboard requires login.
- Alert creation requires login.
- Operator verification requires login and has a mocked “Connect Wallet” flow for now.
- API docs show sample code blocks.
- Pricing CTAs route to signup.
- Share button copies the agent URL.
- Export CSV button shows a Pro upgrade modal.
- Telegram/Webhook alert channels show a Pro upgrade modal.
- Team API key creation shows a Team upgrade modal.

Accessibility:
- Full keyboard navigation.
- High contrast text.
- Visible focus states.
- Do not rely on color only for status.
- Mobile responsive cards and tables.
- Tables become stacked cards on mobile.

SEO:
Create titles and meta descriptions for every route.
Homepage title:
“SPX402 — Execution Grade for Tokenized AI Agents”
Homepage description:
“Verify tokenized agent deposits, buybacks, burns, anomalies, and operator execution. No hype. Just receipts.”

Open Graph:
Create dynamic-looking OG cards for demo agent pages.
Use dark background, amber borders, grade badge, score, last buyback, and burn stats.

Production polish:
- Add loading skeletons.
- Add empty states.
- Add error states.
- Add demo mode badge where data is seeded.
- Add footer links: Methodology, Pricing, API, Disclaimer, Status, Changelog.
- Add cookie-free analytics placeholder.
- Add a “Parser version” label on agent pages.
- Add a “Data confidence” label on agent pages.

Do not overcomplicate the backend in this first pass. Build the beautiful, production-ready website and data model. Use Supabase and Edge Function stubs so the real on-chain indexer can plug in later.
```

---

# 19. Follow-up Lovable prompts

Use these after Lovable completes the first pass.

## Prompt 2 — visual polish

```txt
Polish the visual design until it feels like a premium institutional terminal.

Add:
- Subtle scanline overlay.
- Ticker tape animation between sections.
- Amber terminal boot animation in the hero.
- Bronze/amber card borders.
- Mechanical number counter animation for key stats.
- Flickering red SPX404 badge.
- More data density on desktop.
- Better mobile stacking for tables.
- No purple, no blue gradients, no playful crypto styling.

Improve the typography hierarchy:
- Big severe hero text.
- Mono font for all data.
- Tight uppercase labels.
- Aged-paper body text.

Make every page feel like the same world.
```

## Prompt 3 — agent dossier depth

```txt
Upgrade /agent/:mint into a complete dossier.

Add:
- Dossier header with parser version, last indexed, confidence.
- Overview grid.
- Proof timeline.
- Event filters: deposits, buybacks, burns, config, anomalies.
- Raw transaction table with signature copy buttons.
- Anomaly severity labels.
- Score contribution breakdown showing why the score is what it is.
- “What would improve this score?” section.
- “What SPX402 cannot verify” section.
- Shareable card preview.

Use seeded demo data for all states:
active, degraded, SPX404, unverified, stale, suspicious.
```

## Prompt 4 — methodology credibility

```txt
Make the methodology page feel audit-grade.

Add:
- Formula visualization.
- Grade taxonomy.
- Confidence model.
- Event classification rules.
- Known limitations.
- Correction/appeal policy.
- Methodology changelog.
- “Why token price is excluded” section.
- “Why SPX402 can downgrade itself” section.

Tone: dry, precise, institutional.
```

## Prompt 5 — pricing and conversion

```txt
Improve the pricing page for conversion.

Add:
- Free / Pro / Team / x402 API cards.
- Feature comparison table.
- Upgrade triggers section.
- FAQ.
- “Who pays?” section for operators, researchers, funds, and agents.
- Mock checkout modals for Pro and Team.
- x402 API pay-per-call explanation.
- No token-holder benefit language.
```

## Prompt 6 — Supabase hardening

```txt
Add Supabase RLS policies and auth-aware UI.

Requirements:
- Public read access for agents, agent_scores, public agent_events.
- Authenticated insert for watchlists and alert subscriptions.
- Users can only read/update their own profiles, watchlists, alert_subscriptions, api_keys, subscriptions.
- Operator claims require authenticated user.
- API keys are only visible to the owner.
- Never expose secret API keys in client-side code.
- Add Edge Function stubs for analyze-agent, subscribe-alert, verify-operator, create-payment, api-dossier.
```

## Prompt 7 — launch-ready content pass

```txt
Do a full copy pass.

Rules:
- Remove all hype.
- Remove all investment language.
- No exclamation marks.
- No “holders benefit.”
- No “guaranteed.”
- No “profit.”
- No “yield.”
- No “safe.”
- No “credit rating.”
- Replace “rug confirmed” with “inactive or lacking verifiable execution.”
- Make every empty state sound like SPX402 wrote it.
- Keep the site serious, dry, and data-first.
```

---

# 20. Supabase schema for the Lovable website layer

This is not the full external indexer schema. This is the website-facing schema Lovable can build quickly.

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  wallet_address text,
  plan text default 'free',
  created_at timestamptz default now()
);

create table agents (
  id uuid primary key default gen_random_uuid(),
  mint text not null unique,
  symbol text not null,
  name text not null,
  creator_wallet text,
  deposit_address text,
  image_url text,
  skills_md_url text,
  is_tokenized_agent boolean default false,
  operator_verified boolean default false,
  status text default 'active',
  grade text,
  transparency_score int,
  confidence text default 'medium',
  parser_version text default 'demo-v0',
  last_indexed_at timestamptz,
  first_seen_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table agent_stats (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references agents(id) on delete cascade,
  total_deposited_usd numeric default 0,
  total_buyback_usd numeric default 0,
  total_burned_tokens numeric default 0,
  buyback_execution_rate numeric default 0,
  burn_confirmation_rate numeric default 0,
  failed_windows int default 0,
  last_deposit_at timestamptz,
  last_buyback_at timestamptz,
  last_burn_at timestamptz,
  buyback_bps int,
  config_last_changed_at timestamptz,
  created_at timestamptz default now()
);

create table agent_scores (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references agents(id) on delete cascade,
  score int not null,
  grade text not null,
  deposit_consistency int,
  buyback_execution int,
  burn_confirmation int,
  failed_tx_score int,
  recency_score int,
  metadata_score int,
  operator_score int,
  explanation text,
  calculated_at timestamptz default now()
);

create table agent_events (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references agents(id) on delete cascade,
  event_type text not null,
  severity text default 'info',
  title text not null,
  description text,
  tx_signature text,
  asset_symbol text,
  amount numeric,
  token_amount numeric,
  slot bigint,
  confidence text default 'medium',
  source text default 'demo',
  occurred_at timestamptz not null,
  created_at timestamptz default now()
);

create table operator_claims (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references agents(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  wallet_address text not null,
  signature text,
  status text default 'pending',
  verified_at timestamptz,
  created_at timestamptz default now()
);

create table watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  agent_id uuid references agents(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, agent_id)
);

create table alert_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  agent_id uuid references agents(id) on delete cascade,
  channel text not null,
  destination text not null,
  alert_types text[] default array['BUYBACK_EXECUTED','NO_BUYBACK_OVERDUE','SUSPICIOUS_ACTIVITY'],
  active boolean default true,
  created_at timestamptz default now()
);

create table api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  label text not null,
  key_prefix text not null,
  hashed_key text not null,
  last_used_at timestamptz,
  created_at timestamptz default now()
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  plan text not null,
  status text default 'active',
  provider text,
  provider_reference text,
  current_period_end timestamptz,
  created_at timestamptz default now()
);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  agent_id uuid references agents(id),
  amount_usd numeric not null,
  currency text default 'USDC',
  status text default 'created',
  invoice_pda text,
  payment_tx_signature text,
  created_at timestamptz default now(),
  paid_at timestamptz
);

create table methodology_versions (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  title text not null,
  body text not null,
  published_at timestamptz default now()
);

create table status_events (
  id uuid primary key default gen_random_uuid(),
  component text not null,
  status text not null,
  message text,
  created_at timestamptz default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  action text not null,
  payload jsonb,
  created_at timestamptz default now()
);
```

---

# 21. Edge Function stubs Lovable should create

## `analyze-agent`

Purpose:

```txt
Accept mint/wallet/deposit address.
Return existing agent if indexed.
If unknown, create SPX404 placeholder and queue analysis later.
```

## `subscribe-alert`

Purpose:

```txt
Create alert subscription.
Enforce plan limits.
```

## `verify-operator`

Purpose:

```txt
Accept signed message payload.
For now, mock verification.
Later, verify Solana wallet signature and creator-wallet match.
```

## `create-payment`

Purpose:

```txt
Mock Pro/Team/x402 payment request.
Later, integrate Stripe, Solana Pay, x402, or pump-fun agent payments.
```

## `api-dossier`

Purpose:

```txt
Serve machine-readable agent dossier.
Support API-key auth or future x402 gating.
```

For true tokenized-agent payment loops, the Pump Agent Payments SDK should be integrated server-side; the official skill says the SDK builds payment instructions, supports USDC and wrapped SOL precision, and requires server-side `validateInvoicePayment` before service delivery. ([GitHub][7])

---

# 22. Homepage content pack

Use this copy directly.

```txt
NAV:
SPX402
Analyze
Explore
Methodology
API
Pricing
Status
Sign in

HERO EYEBROW:
TOKENIZED AGENT EXECUTION TERMINAL

HERO:
HTTP 402.
Payment required.
Proof provided.

SUBHERO:
SPX402 verifies tokenized AI agents by reading deposits, buybacks, burns, config changes, and execution gaps on-chain.

SEARCH PLACEHOLDER:
Paste token mint, creator wallet, or Agent Deposit Address...

PRIMARY CTA:
Analyze Agent

SECONDARY CTA:
Read Methodology

MICROCOPY:
No price calls. No investment advice. No mercy for missing receipts.

SECTION:
The chain does not care who posted the thread.

BODY:
SPX402 follows the payment trail from deposit to buyback to burn. If the flow breaks, stalls, or disappears, the grade changes.

SECTION:
Execution Grade

BODY:
A public score for observable agent behavior. Not token price. Not sentiment. Not promises.

SECTION:
Built for agents that claim revenue.

BODY:
Communities verify public claims.
Operators prove execution.
Researchers screen activity.
Other agents query the API.

FINAL CTA:
Paste the mint.
Let the tape speak.
```

---

# 23. Dashboard microcopy pack

```txt
NO DATA:
No verifiable execution detected.
This may mean the agent is new, inactive, misconfigured, or not routing activity on-chain.

NO BUYBACK:
No buyback executions detected.
Either this agent has not earned routed revenue, or the flow has not reached the chain.

NO BURN:
Buyback observed. Burn not yet confirmed.
SPX402 is watching the gap.

OPERATOR UNVERIFIED:
Operator unverified.
The agent may still execute. The claimed human has not proven control.

OPERATOR VERIFIED:
Operator verified.
Signature confirmed. People lie. Signatures are less creative.

CONFIG CHANGE:
Buyback configuration changed.
SPX402 records changes. It does not judge intent without evidence.

SUSPICIOUS:
Execution pattern degraded.
The tape has developed a limp.

SPX404:
Agent not found, inactive, or lacking enough evidence for a grade.
No receipts. No rating.

PRICE CHART:
Market data shown for context only.
Excluded from Transparency Score.

EXPORT LOCKED:
Export requires Pro.
Receipts are free to view. Bulk evidence costs money.
```

---

# 24. Seed demo data

Lovable should seed these so the site feels alive immediately.

## NOVA

```txt
Symbol: NOVA
Name: Agent Nova
Grade: SPX AA
Score: 87
Status: Active
Operator: Verified
Deposits: 847
Buybacks: 842
Burns: 842
Last buyback: 14 minutes ago
Anomaly: 5 missed windows
Tone: “Operational. Minor gaps. Still awake.”
```

## ARIA

```txt
Symbol: ARIA
Name: Aria Research Agent
Grade: SPX A
Score: 76
Status: Active
Operator: Unverified
Deposits: 203
Buybacks: 171
Burns: 171
Last buyback: 3 hours ago
Tone: “Active. Not elegant.”
```

## FLUX

```txt
Symbol: FLUX
Name: Flux Task Agent
Grade: SPX BB
Score: 48
Status: Degraded
Operator: Unverified
Deposits: 92
Buybacks: 38
Burns: 35
Last buyback: 28 hours ago
Tone: “Inconsistent. The tape is not impressed.”
```

## NULL404

```txt
Symbol: NULL
Name: Null Agent
Grade: SPX404
Score: null
Status: Insufficient evidence
Operator: Unknown
Tone: “No receipts. No rating.”
```

## SPX402

```txt
Symbol: SPX402
Name: SPX402
Grade: SPX AAA in demo seed only
Score: 91 in demo seed only
Important copy:
“SPX402 is scored by the same methodology as every tracked agent. If execution fails, the grade falls.”
```

---

# 25. Production acceptance criteria

The Lovable build is not acceptable unless it meets these.

## Visual

```txt
Looks premium, severe, and institutional.
No generic crypto gradients.
No childish AI imagery.
No emoji-heavy UI.
No excessive animation.
```

## Product

```txt
Homepage search works.
Unknown search shows SPX404.
Agent dossier pages render all score states.
Pricing upgrade modals work.
Dashboard requires auth.
Alert and watchlist flows exist.
Methodology page explains every score input.
API docs show realistic JSON.
Disclaimer appears globally.
```

## Legal/comms

```txt
No investment advice language.
No “holders benefit.”
No “yield.”
No “profit share.”
No “guaranteed.”
No casual “rug confirmed.”
No token price in score.
No “credit rating.”
No S&P affiliation implication.
```

## Technical

```txt
Supabase tables exist.
Seed data exists.
RLS policies exist.
Edge function stubs exist.
Secrets are not exposed client-side.
Mobile layout works.
Loading states exist.
Error states exist.
SEO metadata exists.
OG cards exist or are mocked.
```

---

# 26. Safe / sharp / wild build options

## Safe

**SPX402 as website + demo dashboard only.**

Lowest legal and technical risk. No token launch language except “future monitored agent.”

## Sharp

**SPX402 as website + demo dashboard + operator SaaS + API/x402 story.**

Best path. This gives you a serious public product and a strong expansion narrative without overcommitting.

## Wild

**SPX402 as full tokenized agent, public token, self-score, x402 API, and SPX404 archive from day one.**

Highest virality, highest reputational/legal risk. Do not lead with this until the indexer is reliable.

**Recommendation: Sharp.** Build the website as if SPX402 is already the category-defining terminal, but keep the tokenized-agent/self-buyback mechanics framed as “future/live once verified,” not as a holder-return story.

---

# 27. Final directive for Lovable

The website should make one thing unavoidable:

> **SPX402 is not another dashboard. It is the receipt layer for the agent economy.**

Build the public product first:

```txt
Homepage
Agent dossier
Methodology
Explore
Pricing
API
Operators
Alerts
Status
Disclaimer
Dashboard shell
```

Then plug in the real indexer.

The visual standard is not “good for a Lovable app.”

The standard is:

**A visitor lands, pastes a mint, sees the tape, and immediately understands that every tokenized agent now has a public execution record.**

[1]: https://www.barchart.com/story/news/819801/sp-dow-jones-indices-licenses-sp-500-to-tradexyz-for-perpetual-contracts-on-hyperliquid?utm_source=chatgpt.com "S&P Dow Jones Indices Licenses S&P 500® to Trade[XYZ] ..."
[2]: https://pump.fun/docs/tokenized-agent-disclaimer "Tokenized Agent Disclaimer | Pump"
[3]: https://lovable.dev/faq/backend/supabase "Database & Supabase — Integrations & Backend FAQ | Lovable"
[4]: https://docs.cdp.coinbase.com/x402/welcome "Welcome to x402 - Coinbase Developer Documentation"
[5]: https://www.helius.dev/docs/webhooks

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://proof-tape-terminal.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ef36978c-aaab-4b03-b1f2-4232d6d7a2d3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
