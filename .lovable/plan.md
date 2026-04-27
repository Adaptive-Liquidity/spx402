
# SPX402 v2 — Execution Evidence & Reputation Primitive

## What this plan is (and what it replaces)

This is the v2 roadmap for SPX402, incorporating the full external review (ChatGPT systems-architect critique). It supersedes every prior wave plan in this conversation and in `.lovable/plan.md`.

**Two non-negotiable shifts from v1:**

1. The **Execution Tape** is the canonical evidence ledger of the platform — not a homepage retention feature. Every grade, attestation, and (eventually) slash must be explainable from it.
2. The **Failure Decoder** moves to Wave 1b. Without negative-event detection, scoring is dishonest, attestations are misleading, and bonding is dangerous. Everything else is gated on this.

**Positioning shift:**

> SPX402 is the execution reputation layer for autonomous agents, x402 services, and crypto operators.

Not a Solana-only rating site. The wedge: *"Before an agent pays an API, delegates to an executor, or trusts an operator, check the tape."*

---

## Production reality (verified just now)

| Metric | Current state | Implication |
|---|---|---|
| Tokenized agents | 12 verified, 303 events (all `BUYBACK_EXECUTED`) | Decoder works for the original category. Zero failure events ever recorded. |
| Registered agents (MPL) | **130 verified, 0 events** | Wave A scanner succeeded — but the decoder for this category doesn't exist yet. The whole category is dark. |
| Candidate agents | 516 pending core_assets | The verifier pipeline is healthy. |
| x402 executors | 0 verified, 0 events | x402 scanner shipped, no verified subjects yet. |

This sharpens the critique: the binding gap isn't "we can't see failures." It's "we have 130 supposedly-verified agents we cannot say *anything* substantive about." Fixing the decoder gap is the bottleneck on every later wave.

---

## Hierarchy of trust (the rule that orders everything)

```text
Evidence first
  ↓
Scores second
  ↓
Attestations third
  ↓
Adapters (x402, ERC-8004) fourth
  ↓
Bonds fifth
  ↓
Slashing last
```

Any wave that violates this order doesn't ship.

---

## Revised wave map

```text
Wave 1a  Live Execution Tape          — the ledger UI + permalinks
Wave 1b  Failure Decoder + Registered/x402 decoders — close the dark-category gap
Wave 1c  Evidence Bundle API          — every event independently verifiable
Wave 2   Risk-score / Confidence split — honesty in the math
Wave 3   Pulse, Movers, Operator pages — retention + accountability
Wave 4   Verified API + Embeds + Methodology — distribution
Wave 5   SAS attestations              — Solana-native primitive
Wave 5b  ERC-8004 + x402 Bazaar adapters — cross-ecosystem hook
Wave 6   Bond program (devnet)         — skin in the game, no real $
Wave 7   Bond program (mainnet)        — gated on audit + clean decoder data
Wave 8   Cross-chain VAA mirror        — only when external demand exists
```

---

## Wave 1a — Live Execution Tape (the ledger)

**Mental shift:** the tape is the canonical public evidence stream. Every row is permanent, linkable, and machine-readable:

```text
subject → declared intent → observed event → parser version → raw evidence
        → classification → score impact → attestation impact → bond impact
```

**Surfaces:**
- `LiveTapeHero.tsx` on `/` — visceral animated view of the last N events. Realtime via Supabase Realtime on `agent_events`.
- `/tape` — canonical paginated, filterable ledger (by category, severity, subject).
- `/tape/$eventId` — permalink for every single event.
- Every dossier, leaderboard row, and grade badge gets a "see evidence" link into `/tape?subject=<id>`.

No new event types yet — just the UI layer over what already exists.

## Wave 1b — Decoders that close the dark-category gap

This is the foundation everything else rests on. Three decoder tracks ship together:

**Track A: Registered-agent decoder** *(new — closes the 130-agent gap)*
The 130 verified MPL-registered agents currently emit zero events. A new `decode-registered-agent.server.ts` watches their `executor_wallet` for:
- `SWAP_EXECUTED` (already partially built in `decode-swap.server.ts`)
- `X402_PAYMENT_RECEIVED` (already partially built in `decode-x402.server.ts`)
- `OPERATOR_CHANGED` (executor wallet rotation observed via MPL Core)
- `CONFIG_CHANGED` (registry metadata diff)

Wire these into the webhook handler so all 130 registered agents start producing events.

**Track B: Failure decoder** *(critical — unblocks honest scoring)*
New `decode-failure.server.ts` + `cron-failure-reconciler` (every 10 min). Initial events:
- `FAILED_BUYBACK_WINDOW` — tokenized agent with declared cadence has deposits in window with no confirmed buyback
- `PROMISED_BUYBACK_NOT_SETTLED` — `DEPOSIT_RECEIVED` followed by errored outflow tx
- `X402_PAYMENT_REVERTED` — x402 settlement tx errored after quote issued
- `WINDOW_MISSED` — generic missed-cadence event

**Track C: Negative-event taxonomy lands as schema** (decoders shipped incrementally over time):
```text
INTENT_DECLARED, QUOTE_ISSUED, PAYMENT_REQUESTED, PAYMENT_SETTLED,
TASK_STARTED, TASK_FULFILLED, TASK_VERIFIED, TASK_FAILED, REFUND_ISSUED,
WINDOW_MISSED, CONFIG_CHANGED, OPERATOR_CHANGED, KEY_ROTATED,
BOND_STAKED, BOND_WITHDRAW_REQUESTED, BOND_SLASHED,
ATTESTATION_ISSUED, ATTESTATION_REVOKED
```

**Indexer health surface** ships in this wave too — `/status` exposes per-decoder lag, parser version, and last-seen timestamp per event type per category. Without this, downstream consumers cannot tell "no failures observed" from "decoder is broken."

## Wave 1c — Evidence Bundle API

Every event becomes independently verifiable:

```text
GET /api/public/evidence/:event_id
{
  "event_id": "...",
  "subject": { "type": "...", "id": "...", "operator_wallet": "..." },
  "type": "BUYBACK_EXECUTED",
  "severity": "success",
  "occurred_at": "...",
  "tx_signature": "...",
  "slot": 123456789,
  "raw_tx_hash": "sha256:...",
  "decoded_by": "spx-parser-v0.1.7",
  "score_before": 82, "score_after": 84,
  "confidence_before": 0.71, "confidence_after": 0.74,
  "attestation_id": null,    // populated from Wave 5
  "bond_impact": null         // populated from Wave 6
}
```

Plus `GET /api/public/agent/:subject/evidence` returning a Merkle root over the event window — used as `evidence_root` in attestations.

## Wave 2 — Risk-score / Confidence split

v1 conflated these. Critique was right. Fix:

```text
risk_score = how good or bad the subject appears (0..100, → grade)
confidence = how much evidence supports that conclusion (0..1)
```

**Confidence inputs (no `grade_factor` — that was the bug):**
```text
+ evidence_depth                  (event count, log-scaled)
+ observation_window              (days since first event, capped at 90)
+ recency                         (decays from last event)
+ parser_coverage                 (fraction of expected event types observed)
+ failure_detector_coverage       (are failure decoders live for this category?)
+ identity_resolution_strength    (how well subject is anchored — Wave 5b)
+ data_source_health              (indexer lag, webhook uptime)
− unresolved_anomaly_penalty
```

A two-day-old agent with 2 buybacks gets `score 75, confidence 0.18`. UI must show both. Low-confidence A grades render as **outlined** badges, distinct from filled high-confidence A. This single visual distinction kills the "looks good = is good" trap.

Pure functions: `src/lib/scoring/risk-score.ts`, `src/lib/scoring/confidence.ts`. Versioned via `methodology_version` string baked into every score row.

## Wave 3 — Pulse, Movers, Operator identity

- `agent_score_snapshots(subject_id, score, confidence, grade, methodology_version, taken_at)` — daily cron.
- `/pulse` — chronological feed of score deltas, new attestations, new failure events.
- Leaderboard `Movers (24h)` tab.
- `/operator/$wallet` — verified operator profiles, multi-agent history, aggregate trust, slash record (empty until Wave 6).
- Watchlist + alert subscriptions wired to the tape.

## Wave 4 — Verified API + Embeds + Methodology

- `GET /api/public/verified` — paginated, filterable list with grade, score, confidence, bond status.
- `/embed/$subject` — iframe widget (badge + last-5 events + confidence chip).
- `/methodology` — **versioned, public**: score model, event taxonomy, parser versions, known blind spots, false-positive policy, appeal policy, freshness SLA, schema changelog, retroactive scoring policy. Without this, no protocol gates funds on us.
- Aggressive CDN caching (`s-maxage=300, stale-while-revalidate=3600`) on `/api/public/badge/*` and `/api/public/verified` — closes the rate-limit gap from earlier audit.

## Wave 5 — SAS attestations (hardened schema)

Issuer keypair: `SPX_ATTESTATION_KEYPAIR` (requested at this wave, not now).

`cron-attest` runs after `cron-scoring`, mints/updates an attestation when score crosses a hysteresis threshold or bond state changes. Every attestation is **expirable and revocable**.

```json
{
  "schema": "spx.reputation.v1",
  "subject": {
    "type": "solana_mint | solana_wallet | x402_endpoint | erc8004_agent",
    "id": "<canonical-id>",
    "chain_accounts": ["solana:<addr>", "eip155:8453:<addr>"],
    "operator_wallet": "solana:<addr>"
  },
  "category": "tokenized_buyback | registered_agent | x402_executor",
  "grade": "SPX_A",
  "score": 78,
  "confidence": 0.84,
  "observation_window": { "from": 1730000000, "to": 1731328800 },
  "events": {
    "total": 142, "success": 138, "failure": 2, "warning": 2,
    "by_type": { "BUYBACK_EXECUTED": 120, "FAILED_BUYBACK_WINDOW": 1 }
  },
  "bond": { "bonded": false },
  "methodology": {
    "score_model": "spx-score-v0.3.1",
    "confidence_model": "spx-confidence-v0.2.0",
    "parser_version": "spx-parser-v0.1.7"
  },
  "evidence": {
    "evidence_root": "<merkle-root>",
    "evidence_uri": "https://spx402.com/api/public/agent/<id>/evidence",
    "latest_event_hash": "<hash>"
  },
  "issuer": "spx402.sol",
  "issued_at": 1731328800,
  "expires_at": 1733928800,
  "revocable": true
}
```

## Wave 5b — ERC-8004 + x402 Bazaar adapters (the cross-ecosystem hook)

This is what makes SPX agent-reputation infrastructure instead of a Solana site. ERC-8004 explicitly defines a reputation registry slot — SPX fills it as a validator/reputation issuer. x402 Bazaar already exposes "trust signals from on-chain activity" — SPX provides the deeper independent feed.

**Subject identity becomes polymorphic.** Migration adds `subject_type`/`subject_id` columns alongside legacy `mint`, kept backward-compatible. New subject types onboarded:
- `x402_endpoint` — payable HTTPS API URL, scored on settlement reliability
- `erc8004_agent` — keyed on `(chain_id, registry_addr, agent_id)` tuple
- `operator_wallet` — formalized

**New endpoints:**
```text
GET  /api/public/agent/:subject/reputation.json     # canonical feed
GET  /api/public/x402/trust-signal/:endpoint        # x402 Bazaar consumer
POST /api/public/erc8004/feedback-bundle            # ERC-8004 feedback issuance
```

**x402 trust-signal payload** designed for the Bazaar wedge:
```json
{
  "subject_type": "x402_endpoint",
  "endpoint": "https://api.example.com/weather",
  "pay_to": "solana:...",
  "risk_score": 84,
  "confidence": 0.76,
  "grade": "SPX_A",
  "successful_settlements": 397,
  "failed_settlements": 3,
  "refund_rate": 0.01,
  "evidence_uri": "https://spx402.com/api/public/agent/.../evidence",
  "methodology_version": "spx-score-v0.3.0"
}
```

Aspirational discovery surface: an MCP server (`spx-reputation`) exposing `lookup_subject`, `get_reputation`, `subscribe_alerts` so agent runtimes call SPX directly.

## Wave 6 — Bond program (devnet only)

Anchor program `spx_reputation_bond` on devnet. Real UX, fake money. Unlocks the full narrative without any audit risk.

**Mechanics:**
- Bond PDA derived from `(subject_id, operator_wallet)`. Stores `amount, asset, grade_floor, status, withdraw_unlock_at, slash_history`.
- Mirror table `agent_bonds` for fast reads (source of truth = on-chain PDA).
- `BondPanel.tsx` on dossier shows stake, grade pledge, slash history.
- `cron-slash-monitor` watches `agent_events` for `critical` severity on bonded subjects with a **72h grace + appeal window** — operator can rectify before slash submission.
- Slashed funds route to `spx_insurance_pool` PDA.

**Authorities — separated from day one (resolves v1 contradiction):**
```text
SAS_ISSUER_KEYPAIR              → signs attestations only
SPX_BOND_SLASH_AUTHORITY        → submits slash transactions only
SPX_BOND_PROGRAM_UPGRADE        → upgrades program only
SPX_EMERGENCY_PAUSE_KEYPAIR     → can pause slashing, cannot slash
SPX_INSURANCE_POOL_AUTHORITY    → manages pool, cannot slash
```
On devnet all five can be single-sig hot keys. **None are reused.**

**Insurance pool claims (designed, not shipped on devnet):**
- v1 devnet: funds held as public loss reserve, not spendable by SPX.
- Mainnet target: affected counterparties claim with proof of failed task/payment via public dispute window.
- Documented in `/methodology` as "pool exists, claims process pending — funds locked."

## Wave 7 — Bond program (mainnet) — **gated, not scheduled**

Hard go/no-go gates. **No timeline.** Ships when these are all green:

- [ ] Failure decoder has produced ≥ 30 days of labeled negative-event data
- [ ] Published false-positive benchmark (manual sample audit) with rate ≤ 2%
- [ ] All five authority keys migrated to hardware-backed multisig (3-of-5 minimum for slash authority)
- [ ] External audit of `spx_reputation_bond` complete, all critical/high findings resolved
- [ ] Emergency pause tested via tabletop exercise on devnet
- [ ] Public appeal/dispute window codified in `/methodology` (≥ 7 days between slash notice and execution)
- [ ] Insurance pool claims policy published
- [ ] At least one external protocol committed to consuming bonded reputation

## Wave 8 — Cross-chain VAA mirror (demand-pulled, not pushed)

**Read track (cheap, ships with Wave 5b):** `/api/public/agent/:subject/reputation.json` consumed via Chainlink Functions or app-layer integration. **Not** Wormhole Queries — those need on-chain SPX state, which doesn't exist until Wave 6+.

**Write track (gated):** Wormhole VAA publisher emits on grade/bond changes for subjects whose state is on-chain. Receiving contracts on Base/ETH verify the VAA. Build only when at least one external protocol commits to consuming. Premature deployment burns gas for nobody.

---

## Visual identity (Mythic-Tech) — design layer, not critical path

Egyptian Blue / Gold / Bronze tier accents on grade A+ surfaces, sacred-geometry watermark behind the tape, medal-style `MedalBadge` replacing `ExecutionGradeBadge`. Lands between Wave 1c and Wave 2 as a design system pass. Never ships before the underlying ledger is honest.

---

## What we are explicitly NOT building

- Multi-chain agent *indexing*. SPX stays Solana-native for inputs; only attestations and reputation feeds go cross-ecosystem.
- Community voting on slash decisions. Programmatic, debounced, with appeal window. No token.
- Speculative SPX token. Bond is SOL or USDC.
- Off-chain reputation imports (X followers, Discord roles). We rate what the chain can prove.
- Generic graph-reputation competition with OpenRank. Our wedge is execution-backed, payment-backed, failure-aware, stake-backed reputation.
- Language like "credit rating," "investment grade," "guaranteed safe," "insured," "certified secure." Avoidable legal risk. We use "execution reputation," "observed reliability," "evidence-backed trust signal."

---

## Hard go/no-go gates (recap)

| Before… | …these must be true |
|---|---|
| Wave 5 (SAS attestations) | event schema stable, parser versions tracked, score/confidence split shipped, evidence bundle API live, registered-category decoder producing events |
| Wave 6 (bonded devnet) | failure decoder emits real negative events for ≥ 14 days, slash simulation passes, operator notification flow works, false-positive review process documented |
| Wave 7 (mainnet bond) | all 8 gates above |
| Wave 8 write track | ≥ 1 external protocol committed, SPX bond state on-chain, VAA payload schema finalized, replay protection implemented |

---

## Technical artifacts summary

**New tables (across all waves):**
- `agent_score_snapshots(subject_id, score, confidence, grade, methodology_version, taken_at)`
- `agent_attestations(subject_id, sas_credential, attested_score, attested_confidence, attested_at, expires_at, revoked_at, evidence_root, tx_signature)`
- `agent_bonds(subject_id, operator_wallet, amount, asset, grade_pledge, status, slash_history jsonb, created_at)` — mirror of on-chain PDA
- `methodology_versions(version, published_at, changelog jsonb)`
- Subject polymorphism: add `subject_type`, `subject_id` columns alongside legacy `mint`, with a backwards-compat view

**New cron routes:**
- `cron-failure-reconciler` (Wave 1b)
- `cron-score-snapshot` (Wave 3)
- `cron-attest` (Wave 5)
- `cron-slash-monitor` (Wave 6, devnet-gated)

**New on-chain artifacts:**
- SAS attestation issuer (Wave 5)
- `spx_reputation_bond` Anchor program (Wave 6 devnet → Wave 7 mainnet post-audit)
- Insurance pool PDA (Wave 6)

**New components / routes:**
- `LiveTapeHero.tsx`, `ConfidenceChip.tsx`, `MedalBadge.tsx`, `BondPanel.tsx`, `EvidenceTimeline.tsx`, `FailureEventCard.tsx`
- `src/routes/tape.tsx`, `src/routes/tape.$eventId.tsx`
- `src/routes/pulse.tsx`, `src/routes/operator.$wallet.tsx`, `src/routes/embed.$subject.tsx`
- `src/routes/methodology.tsx` (rewrite to versioned, public-evidence form)
- New API routes: `api.public.evidence.$eventId.ts`, `api.public.agent.$subject.reputation.ts`, `api.public.x402.trust-signal.$endpoint.ts`, `api.public.erc8004.feedback-bundle.ts`, `api.public.verified.ts`

**Pure functions:**
- `src/lib/scoring/risk-score.ts`
- `src/lib/scoring/confidence.ts`
- `src/lib/scoring/bond-eligibility.ts`
- `src/lib/identity/subject.ts` (canonical subject resolution + CAIP-10 helpers)

**New decoders in `src/lib/indexer/`:**
- `decode-registered-agent.server.ts` — Wave 1b (closes the 130-agent dark-category gap)
- `decode-failure.server.ts` — Wave 1b
- `decode-bond.server.ts` — Wave 6

**Secrets requested at the right wave (not now):**
- Wave 5: `SPX_ATTESTATION_KEYPAIR`
- Wave 6: `SPX_BOND_SLASH_AUTHORITY`, `SPX_BOND_PROGRAM_UPGRADE`, `SPX_EMERGENCY_PAUSE_KEYPAIR`, `SPX_INSURANCE_POOL_AUTHORITY` (four separate keys — least privilege is non-negotiable)

---

## Recommended starting move: ship Wave 1a + 1b together

This is "SPX402 Build Packet #1" from the external review. One implementation pass produces:

**1a — Live Execution Tape**
- `LiveTapeHero` on `/`
- `/tape` ledger view
- `/tape/$eventId` permalinks
- Realtime via Supabase Realtime on `agent_events`

**1b — Decoder closure**
- `decode-registered-agent.server.ts` (closes the 130-agent gap — these become live in the tape)
- `decode-failure.server.ts` v0 + `cron-failure-reconciler`
- Negative-event taxonomy lands as schema
- Indexer health surface on `/status`

**Why this pair:** the tape is empty/boring without registered-agent events flowing in (only 12 of the 142 verified subjects produce events today). Shipping 1a alone makes the homepage *look* alive but reveals only one category. Shipping 1a+1b together turns the tape into a real cross-category live feed AND starts the 30-day clock for honest negative-event data — which is the binding constraint on every later wave.

After this lands, Wave 1c (Evidence API) and Wave 2 (score/confidence split) follow immediately and unlock Wave 5.

---

## Wave status

- ✅ **Wave 1a** — `LiveTapeHero` on `/`, `/tape`, `/tape/$eventId`, Supabase Realtime on `agent_events`.
- ✅ **Wave 1b** — `decode-registered-agent` wired (executor + core_asset webhook subs), `decode-failure.server.ts` + `cron-failure-reconciler` (10m), negative-event taxonomy in `EventType` union, `/status` decoder coverage panel.
- ✅ **Wave 1c** — Evidence Bundle API. `GET /api/public/evidence/:eventId` (per-event, with `raw_tx_hash`, score/grade/confidence at publish, `decoded_by`). `GET /api/public/agent/:subject/evidence` (30d window, per-leaf hashes, Merkle `evidence_root` for Wave 5 attestations). Canonical-JSON + sha256 helpers in `src/lib/evidence/hash.server.ts`. Tape permalink + dossier link out to JSON.
- ✅ **Wave 2** — `src/lib/scoring/risk-score.ts` + `src/lib/scoring/confidence.ts` (pure). `agents.confidence_score`, `methodology_version`, `confidence_model_version`, `confidence_breakdown` columns. Outlined-vs-filled `ExecutionGradeBadge` driven by confidence; numeric chip on dossier.
- ✅ **Wave 3** — `agent_score_snapshots` table (mint, score, confidence_score, grade, methodology versions, taken_at) + daily `cron-score-snapshot` worker (00:05 UTC via pg_cron). `/pulse` chronological feed (score deltas + failure/critical events, last 7d). Leaderboard "Movers (24h)" tab driven by snapshot deltas. `/operator/$wallet` profiles (multi-agent aggregate score/confidence/grade/buyback SOL, recent execution feed). Operator-profile link surfaced from agent dossier when an executor wallet is present. SiteHeader nav now exposes Tape + Pulse.
- ⏭ **Next: Wave 4** — `GET /api/public/verified` paginated/filterable feed, `/embed/$subject` iframe widget, versioned `/methodology` rewrite (with blind spots / appeal / SLA), CDN caching headers on badge + verified endpoints. Unblocks Wave 5 SAS attestations.

