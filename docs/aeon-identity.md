# AEON identity contract

This is the only matching spec for AEON ingest, lookup, slash attribution, and public listing.

`total_slashed_usd` stores **AEON display units** (raw token amount / 10^6) until an oracle exists. It is not USD. Scoring caps and UI copy must treat it as token units, not dollars.

Do not subscribe Helius to the AEON program ID. Watch executor wallet, CRI, and known authority/bond PDAs only.

## Match keys

| Field | On-chain | SPX402 column | Match key |
|---|---|---|---|
| Executor | IDL `agent` signer | `executor_wallet` | `named.agent` |
| CRI | PDA `["cri", agent]` | `aeon_cri_address` | `payer_cri` / `payee_cri` / `cri` — **never** `agent` |
| Identity | PDA `["agent", agent]` | `aeon_agent_identity` | `named.agent_identity` |
| Authorities | PDA `["authority", authority_id]` | `aeon_authority_addresses text[]` | `slash_bond.authority` |
| Bonds | PDA `["authority_bond", authority_id]` | `aeon_bond_addresses text[]` | `slash_bond.bond` |
| Program | AEON program | `aeon_program_id` nullable | `resolveAeonProgramId()` when ingesting |

`agents.mint` is a PK **surrogate**, not an AEON match key:

- If `aeon_cri` is present at submit: `mint = cri`
- Else `mint = executor_wallet`
- On wallet collision with any existing `agents.executor_wallet` row: **reject**. Registration never updates category, CRI, or `publication_status` on an existing row. A unique index on `executor_wallet` is **not** assumed; add it only after a duplicate audit is clean.

## `issue_authority` attachment

`named.agent === executor_wallet` **or** `named.agent_identity === aeon_agent_identity`.

Do not match CRI against `named.agent`. Same-batch `issue_authority` may fill an in-memory lookup; the durable source of truth is the PDA arrays on `agents`.

## `slash_bond`

Resolve only via persisted (or same-batch) authority/bond PDA arrays. Never attribute a slash to a tracked slasher wallet.

Unresolved slash is retryable **500** only when the tx is AEON `slash_bond` and at least one `aeon_executor` row has empty authority/bond arrays. If every `aeon_executor` already has PDAs and none match → **200** drop. Do not 500 x402-only executor rows. 500 happens before `agent_events` upsert.

## Publication

`publication_status` is `unpublished` \| `published` (default `unpublished` for new rows).

Explore, public dossier, leaderboard, verified feed, and sitemap hide unpublished. Webhook, scoring, backfill, and Helius address collection still run so PDAs can accumulate privately.

Existing catalog rows are backfilled to `published` in the unapplied migration so the current public index stays visible after apply.

## Lookup

AEON decode lookup uses **`category === "aeon_executor"` only**, not every `executor_wallet`.

## Production cutover (`event_uid`)

This app SHA upserts `agent_events` on `event_uid` (`AGENT_EVENTS_ON_CONFLICT`). There is no dual-write on `signature`. Apply SQL **before** deploying this SHA:

1. `20260908154500_aeon_identity_publication.sql`
2. `20260908154600_append_aeon_pdas.sql`
3. `20260908090000_agent_events_event_uid.sql`

Confirm the unique index `agent_events_event_uid_key` on `agent_events.event_uid`, then deploy. Wallet uniqueness is **not** in that batch unless a duplicate `executor_wallet` audit is clean and you explicitly add that migration later. Do not migrate production as part of this PR.
