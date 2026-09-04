# SPX402 AEON Execution Grade — completion pass

## What the audit found

The brief assumes "the backend is done, the database is seeded, this is a copy swap." Half of that is true.

**Already in the repo (verified):**
- AEON scoring branch with the exact 40/30/15/10/5 weights, grade thresholds and verdict copy (`src/lib/indexer/scoring.server.ts`)
- AEON on-chain decoder for escrow / bond / receipt instructions, program `TcZ9MKNw4eGvoe3K75e4M3zCwZCzEsb6WvrS8LqNgdm` (`src/lib/indexer/decode-aeon.server.ts`), wired into the Helius webhook
- Agent dossier already branches on AEON primitives: escrow/bond metric cards, new pillars, escrow/bond filter chips, AEON event descriptions
- The three paid v1 endpoints (score / dossier / evidence), the x402 + API-key paywall middleware, the API key management endpoint
- `scripts/shadow-grade.ts` and the pricing page copy

**Missing (verified against the live database and file tree):**
- The `20260829*` migrations were never applied. The `agents` table has none of `aeon_cri_address`, `total_slashed_usd`, `active_bond_amount`, `escrow_success_rate`, `total_escrows_completed`, `total_escrows_failed`.
- Tables `aeon_receipts`, `api_keys` and `api_usage` do not exist. The paywall middleware and the key endpoint query tables that aren't there, so every paid call fails.
- No NOVA / ARIA / FLUX / NULL404 / SPX Oracle rows. Current agents are the old tokenized and registered ones.
- Homepage still reads "Register. Get scored. Climb the tape." with the deposit → buyback → burn proof chain and buyback-flavoured anomaly list.
- Methodology page is still the buyback/x402 document.

Net effect today: the AEON code paths are dead. Nothing can populate them, so every agent renders through the legacy tokenomics path.

## Plan

### 1. Database (the actual blocker)
One migration adding the six AEON columns to `agents`, plus the `aeon_receipts` hash-chain table and the `api_keys` / `api_usage` tables the paywall already expects. Public read where the rest of the site is public read; keys and usage scoped to their owner; grants on every new table.

### 2. Event taxonomy
Allow `ESCROW_CREATED`, `ESCROW_RELEASED`, `ESCROW_CANCELED`, `BOND_DEPOSITED`, `BOND_SLASHED`, `RECEIPT_CREATED` through the event type constraint and the shared TypeScript union so decoded AEON events can actually be stored and shown on the tape.

### 3. Scoring pipeline
Feed the new columns into the scoring cron so `category = 'aeon_executor'` agents are graded by the AEON branch, and register `aeon_executor` in the shared category list so it appears in filters and tabs alongside Tokenized / Registered / x402.

### 4. Homepage
New hero: "HTTP 402. Payment required. Proof provided." with the escrows / bonds / slashes / receipts subcopy. Proof chain becomes Escrow Created → Work Completed → Bond Posted → Grade Assigned. Anomaly list becomes missing escrow releases, bonds slashed, receipts missing, operator unverified. No colour, font or layout changes.

### 5. Methodology
Rewrite around the 40/30/15/10/5 formula, the grade table, the confidence model, what SPX402 measures and refuses to measure, why price is excluded, and the self-downgrade clause. Existing chain and prober sections stay.

### 6. API docs
Table of the three paid endpoints with their USDC prices and the AEON fields each returns, plus the dual auth story (HTTP 402 or API key).

### 7. Demo agents — decision needed
Project memory says SPX402 never seeds off-chain or unverified agents; honest empty states only. The brief wants five demo rows. Default in this plan: **no seeded demo agents.** The AEON surfaces render honest empty states until a real AEON agent is indexed, and I verify the UI by pointing the shadow-grade script at real data. Say the word and I'll seed the five instead, labelled as demo.

## Old lanes

Kept as a fallback, not deleted. Agents with AEON primitives get the escrow/bond cards and pillars; the existing tokenized, registered, x402 and prober agents keep working as they do now. Deleting those paths would blank out every agent currently in the database.

## Verification
- Full test suite green
- A real agent page renders through the AEON branch once a row carries primitives
- A paid endpoint returns 402 with a quote, then 200 after payment / with a key
