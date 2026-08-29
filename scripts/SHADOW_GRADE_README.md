# SPX402 Shadow Grade — The "Audit the Auditors" Launch Playbook

## Overview

The Shadow Grade is SPX402's go-to-market wedge. We scan the top public Solana agents (pump.fun tokenized agents + Solana Agent Registry entries), grade them using our **AEON execution model**, and publish the brutal results.

Since virtually all existing agents operate on **insecure hot wallets** without AEON escrows, bonds, or receipts — they will score **SPX D** or **SPX404**.

We then weaponize these grades on Crypto Twitter to create demand for the AEON Program (the only way to guarantee an SPX AAA rating).

---

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│  1. DISCOVER                                                    │
│     ├── Solana Agent Registry (open API)                        │
│     ├── pump.fun Tokenized Agents (on-chain discovery)          │
│     └── Manual curation of high-profile agents                  │
├─────────────────────────────────────────────────────────────────┤
│  2. BACKFILL                                                    │
│     ├── Helius Enhanced Transactions (30-day window)            │
│     ├── Decode deposits, buybacks, burns, failed txs            │
│     └── Count: escrows=0, bonds=0, receipts=0 (reality check)   │
├─────────────────────────────────────────────────────────────────┤
│  3. GRADE                                                       │
│     ├── AEON Execution Model (40/30/15/10/5 split)              │
│     ├── 0 escrows → 0/40 escrow completion                      │
│     ├── 0 bond → 0/30 slashable bond                            │
│     ├── Failed windows → penalty                                 │
│     └── Result: SPX D / SPX404 for 95%+ agents                  │
├─────────────────────────────────────────────────────────────────┤
│  4. PUBLISH                                                     │
│     ├── SVG Terminal Cards (Bloomberg aesthetic)                │
│     ├── JSON/CSV reports for analysis                           │
│     └── Auto-post to X/Twitter with "SPX402 Audit" branding     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

```bash
# Install dependencies
bun install

# Run shadow grade on top 50 agents
bun run shadow:grade

# Run on top 25 agents only
bun run shadow:grade --limit 25

# Run and post to X (requires X API credentials)
bun run shadow:grade --post-to-x
```

---

## Required Environment Variables

```bash
# Supabase (for agent registry + storing results)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Helius (for on-chain transaction backfill)
HELIUS_API_KEY=your-helius-api-key

# Optional: X/Twitter API (for auto-posting)
X_API_KEY=your-x-api-key
X_API_SECRET=your-x-api-secret
X_ACCESS_TOKEN=your-access-token
X_ACCESS_SECRET=your-access-secret
```

---

## Output Structure

```
shadow-grade-output/
├── shadow-grade-report.json    # Full report with grade distribution
├── shadow-grade-report.csv     # Spreadsheet-ready data
├── NOVA_a1b2c3d4.svg           # Terminal card for each agent
├── ARIA_e5f6g7h8.svg
└── ...
```

### Terminal Card Example

Each agent gets an SVG card styled as an SPX402 terminal:

```
╔══════════════════════════════════════════════════════════════╗
║ SPX402 TERMINAL / SHADOW GRADE          SHADOW AUDIT / 2026   ║
║                                                                 ║
║ $NOVA — Agent Nova                    MINT: NoVa12…x9Yz       ║
║                                                                 ║
║  ┌─────────────┐        ┌──────────────────┐                   ║
║  │   SPX D     │        │  TRANSPARENCY    │                   ║
║  │ EXECUTION   │        │     SCORE: 12    │                   ║
║  │   GRADE     │        └──────────────────┘                   ║
║  └─────────────┘                                              ║
║                                                                 ║
║  ESCROWS SETTLED     SUCCESS RATE    ACTIVE BOND              ║
║  0                   0.0%            $0                       ║
║                                                                 ║
║  TOTAL SLASHED       FAILED WINDOWS  OPERATOR                 ║
║  $0                  47              UNVERIFIED               ║
║                                                                 ║
║  ───────────────────────────────────────────────────────────  ║
║  VERDICT: No verifiable AEON escrows or bonds observed.       ║
║  Agent operates in the dark.                                   ║
║  ───────────────────────────────────────────────────────────  ║
║                                                                 ║
║ spx402.xyz/agent/NoVa12…x9Yz  ·  Payment required. Proof provided. ║
╚══════════════════════════════════════════════════════════════╝
```

---

## The Narrative Arc (What We Tweet)

### Tweet 1: The Hook
> We audited the top 50 "AI agents" on Solana using SPX402's new AEON execution model.
> 
> **47 scored SPX D or SPX404.**
> 
> They have $0 in slashable bonds. 0 escrows settled. 0 receipts.
> 
> They're running on hope and hot wallets.
> 
> 🧵👇

### Tweet 2: The Evidence (Thread)
> **Agent: $NOVA (3.2M market cap)**
> 
> Grade: **SPX D (12/100)**
> 
> • 0 AEON escrows completed
> • 0 active slashable bond
> • 47 failed transaction windows
> • Operator: UNVERIFIED
> 
> The chain doesn't lie. [Terminal Card Image]
> 
> spx402.xyz/agent/NoVa...

### Tweet 3: The Pattern
> This isn't one bad apple. It's the entire orchard.
> 
> | Grade | Count |
> |-------|-------|
> | SPX AAA | 0 |
> | SPX AA  | 0 |
> | SPX A   | 1 |
> | SPX BBB | 2 |
> | SPX BB  | 3 |
> | SPX B   | 8 |
> | SPX D   | 18 |
> | SPX404  | 18 |
> 
> **96% fail the execution test.**

### Tweet 4: The Solution
> There is exactly one way to guarantee an SPX AAA rating:
> 
> **Build on AEON Program.**
> 
> • Scoped spending authorities (fail-closed)
> • Slashable bonds (skin in the game)
> • Hash-chained receipts (proof of execution)
> • Escrow-native settlement
> 
> The grade isn't a suggestion. It's a mathematical guarantee.
> 
> github.com/Adaptive-Liquidity/aeon-program

### Tweet 5: The Challenge
> **To every agent dev reading this:**
> 
> Run your mint through SPX402.
> 
> If you score SPX D, you have two choices:
> 1. Keep the hot wallet. Accept the grade.
> 2. Integrate AEON. Earn the AAA.
> 
> We'll re-grade you in 30 days.
> 
> spx402.xyz

---

## Operational Security

1. **No private data accessed** — Only public on-chain data (mints, transactions, registry entries)
2. **No wallet interactions** — Read-only Helius RPC
3. **Rate limited** — 100 agents max per run, 30-day lookback
4. **Audit trail** — Every grade is reproducible from the same Helius data

---

## Post-Launch: The "AEON Salvation" Funnel

Once the Shadow Grade goes viral:

| Stage | Action | Tool |
|-------|--------|------|
| **Panic** | Devs see their SPX D grade | SPX402 Terminal Card |
| **Curiosity** | Click through to dossier | `/agent/:mint` |
| **Education** | Read "Why SPX D?" verdict | Verdict explains missing primitives |
| **Solution** | "How do I fix this?" | AEON Program SDK link |
| **Adoption** | Integrate AEON escrows/bonds | `aeon-program` SDK |
| **Redemption** | Re-grade in 30 days | SPX402 shows SPX AAA |

---

## Automation Roadmap

- [ ] **Daily cron** — Re-grade top 100 agents nightly
- [ ] **Webhook alerts** — Notify when an agent's grade changes
- [ ] **X Bot** — Auto-post daily "SPX402 Daily Audit" thread
- [ ] **Discord/Telegram alerts** — For operator communities
- [ ] **API endpoint** — `GET /api/public/shadow-grade/:mint` for integrations

---

## Legal / Compliance

- **Not financial advice** — Every card includes disclaimer
- **No investment recommendations** — Grades = execution observability only
- **Public data only** — No private keys, no wallet signatures requested
- **Right to reply** — Operators can verify via Ed25519 challenge to update grade

---

## Next Phase

After Shadow Grade establishes SPX402 as the execution authority:

**Phase 5: x402 API & B2B Monetization**
- Wallet integrations (Phantom, Backpack warning badges)
- DEX integrations (Raydium/Orca execution grade display)
- Agent-to-agent verification (pay-per-call via x402)
- Enterprise subscriptions ($499/mo for full API access)