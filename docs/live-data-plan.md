# SPX402 — Live Data Plan

Goal: replace every piece of mocked or seeded content in the app with
verifiable on-chain data. Below is the full inventory of what is currently
fake, what the real source is, and what we need to build to display it.

---

## 1. Inventory of mock surfaces (today)

| Surface                        | File                                       | Today                                          | Real source                                                              |
| ------------------------------ | ------------------------------------------ | ---------------------------------------------- | ------------------------------------------------------------------------ |
| Agent dossiers (5 demo agents) | `src/lib/agents.ts`, `agents` table        | Hand-seeded NOVA / ARIA / FLUX / NULL / SPX402 | Solana Agent Registry + Pump.fun tokenized agents                        |
| Explore list                   | `src/routes/explore.tsx`                   | Reads `agents` table (seeded)                  | Same table, populated by indexer                                         |
| Agent events timeline          | `agents.events` jsonb                      | Hand-written events                            | Helius webhook → decoded program events                                  |
| Price series                   | `agents.price_series` jsonb                | Random walk                                    | Birdeye / Jupiter price feed                                             |
| Score breakdown                | `agents.score_breakdown`                   | Hand-set numbers                               | Computed by scoring worker (see §5)                                      |
| Operator verified flag         | `agents.operator_verified`                 | Hand-toggled                                   | Ed25519 challenge sign (see §6)                                          |
| Status page components         | `src/routes/status.tsx` const `COMPONENTS` | Hardcoded "operational"                        | Read from internal health table written by indexer heartbeat             |
| Status page stats              | `src/routes/status.tsx` const `STATS`      | Hardcoded numbers                              | Aggregations on `agent_events` and `indexer_runs` tables                 |
| Changelog                      | `src/routes/changelog.tsx` const `ENTRIES` | Hardcoded                                      | Move to a `changelog` table (admin-write, public-read)                   |
| Ticker tape                    | `src/components/spx/TickerTape.tsx`        | Hardcoded headlines                            | Latest 20 events of severity `success` or `critical` from `agent_events` |
| Pricing tier features          | `src/routes/pricing.tsx`                   | Marketing copy — keep                          | n/a                                                                      |
| Methodology weights            | `src/routes/methodology.tsx`               | Documented design — keep                       | n/a                                                                      |
| Disclaimer                     | `src/routes/disclaimer.tsx`                | Legal copy — keep                              | n/a                                                                      |

---

## 2. Real on-chain sources

### a. Solana Agent Registry (Solana Foundation)

- **What it is**: open on-chain protocol giving agents a verifiable identity,
  reputation, and validation surface. Three sub-registries: Identity,
  Reputation, Validation. Cost: 0.009 SOL to register, 0.00001 SOL for
  feedback.
- **What we read**: every registered agent's `AgentIdentity` PDA — agent name,
  capability declarations, A2A card, MCP endpoint, declared wallets.
- **Use for**: agent discovery, identity badge ("Registered on Solana Agent
  Registry"), capability metadata, official wallet address.
- **Docs**: <https://solana.com/agent-registry>

### b. MPL Agent Registry (Metaplex)

- **What it is**: pair of Solana programs (Agent Identity + Agent Tools) that
  bind on-chain identity to MPL Core assets and manage execution delegation.
- **What we read**: identity PDA + executive profiles → who is allowed to
  execute on behalf of an agent asset.
- **Use for**: cross-checking declared operator wallet against the on-chain
  delegated executor; flagging mismatch as `OPERATOR_DRIFT`.
- **SDK**: `@metaplex-foundation/mpl-agent-registry`

### c. Pump.fun Tokenized Agents (buyback + burn)

- **What it is**: on-chain feature that routes agent revenue (SOL/USDC) into
  automatic token buybacks and burns. This is the entire economic substrate
  the SPX402 grade is built on.
- **What we read**: deposits to the Agent Deposit Address, buyback swap
  instructions, SPL Token `Burn` instructions tied to the agent mint, config
  changes (buyback bps, schedule).
- **Use for**: every counter on the dossier — deposit count, buyback count,
  burn count, failed windows, last-buyback timestamp.
- **Docs**: <https://pump.fun/docs/tokenized-agent-disclaimer>

### d. Price + supply data

- **Birdeye** (`/v3/token/list`, `/defi/price_history`) — for symbol, current
  price, OHLC series.
- **Jupiter Price API v2** as fallback — public, no key, less granular.
- **Helius RPC `getTokenSupply`** — for circulating supply diff (post-burn).

### e. Helius (transaction stream)

- **Helius Webhooks** subscribed to: each known Agent Deposit Address, each
  agent mint (for SPL burns), and the Pump.fun program ID (for config
  changes + buyback instructions).
- **Helius Enhanced Transactions API** — backfill + parsed instruction
  decoding so we don't have to write our own IDL decoder for every program.

---

## 3. Database schema we need to add

Already present: `agents`, `profiles`, `watchlist`, `alert_subscriptions`.

To add (next migration, after this plan is approved):

```
agent_events            — append-only log of decoded program events
  id uuid pk
  mint text fk → agents.mint
  type text             — DEPOSIT_RECEIVED | BUYBACK_EXECUTED | BURN_CONFIRMED |
                          CONFIG_CHANGED | FAILED_WINDOW | ANOMALY_DETECTED |
                          OPERATOR_VERIFIED
  severity text         — info | warn | critical | success
  signature text unique — Solana tx signature
  slot bigint
  occurred_at timestamptz
  amount_sol numeric
  amount_token numeric
  raw jsonb             — decoded instruction payload
  parser_version text
  index ON (mint, occurred_at desc)

indexer_runs            — heartbeat for the status page
  id uuid pk
  worker text           — webhook_ingest | backfill | scoring | reconciler
  ok boolean
  ran_at timestamptz
  duration_ms integer
  notes text

operator_challenges     — Ed25519 challenge/response for operator verify
  id uuid pk
  user_id uuid → auth.users
  mint text
  wallet text           — Solana base58 address
  nonce text            — random challenge string
  signed_at timestamptz
  signature text        — base58 signature, NULL until signed

changelog               — replaces hardcoded entries
  id uuid pk
  version text
  released_on date
  type text             — parser | api | dashboard | scoring
  items text[]
```

Public-read on `agent_events` and `changelog`. Service-role-only writes.

---

## 4. Indexer architecture

Three workers, all running as Supabase Edge Functions on a cron / webhook
trigger:

1. **`webhook-ingest`** (HTTP POST from Helius)
   - Verifies Helius signature.
   - Decodes Pump.fun + SPL Token instructions in the payload.
   - Writes one row per relevant instruction into `agent_events`.
   - Updates `agents.last_indexed_seconds`, increments counters, recomputes
     last-buyback / last-burn labels.

2. **`backfill`** (cron, every 10 min)
   - For each known mint, calls Helius Enhanced Transactions for the window
     since `agents.updated_at` to catch anything the webhook missed.

3. **`scoring`** (cron, every 5 min)
   - For each agent, recomputes `score_breakdown` per the methodology
     formula (deposit consistency 20, buyback execution 25, burn
     confirmation 20, failed tx 15, recency 10, metadata 5, operator 5).
   - Writes derived `score`, `grade`, `verdict`, `confidence`.

4. **`reconciler`** (cron, every 30 min)
   - Walks `agent_events` for the last 24h, asserts buyback windows produced
     a burn within tolerance. Emits `FAILED_WINDOW` events when not.
   - Writes a heartbeat to `indexer_runs`.

---

## 5. Required external secrets

Will be requested via the `add_secret` tool when we're ready to build the
indexer:

- `HELIUS_API_KEY` — RPC + webhook signing
- `HELIUS_WEBHOOK_SECRET` — for verifying inbound webhook POSTs
- `BIRDEYE_API_KEY` — price + symbol metadata (optional; Jupiter fallback)

---

## 6. Operator verification flow

1. User connects a Solana wallet on the dossier page.
2. Server-fn issues a one-time nonce string and writes a row into
   `operator_challenges`.
3. User signs the nonce in their wallet (e.g. Phantom, Solflare).
4. Server-fn verifies the Ed25519 signature against the wallet pubkey and
   asserts the wallet matches the agent's declared creator on the Solana
   Agent Registry record.
5. On match: sets `agents.operator_verified = true` and emits an
   `OPERATOR_VERIFIED` event.

---

## 7. Migration plan (order of operations)

1. **Now (this PR):** put visible-but-unclickable "Coming soon" banners on
   features that are not data-backed yet (alerts subscriptions, API key
   issuance), so the public site is honest about scope.
2. **Next:** ship the schema migration in §3.
3. **Then:** wire `webhook-ingest` + `scoring` workers (requires Helius
   secret).
4. **Then:** seed real agents by reading the Solana Agent Registry once,
   filtering to those that also have a Pump.fun tokenized-agent config.
5. **Then:** point Status page, Ticker tape, Changelog, and dossier event
   feeds at the live tables instead of seed JSON.
6. **Then:** flip alerts + API keys from "coming soon" to live.

This document is the source of truth for what "live data" means for SPX402.
Update it whenever a real source is added.
