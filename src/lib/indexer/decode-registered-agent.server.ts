// Registered-agent diff decoder.
// Server-only.
//
// Wave 1b — Track A (closing the dark-category gap).
//
// The Helius webhook only sees txs that touch known wallets / mints. The
// 130+ MPL-registered agents we have on-chain rarely touch a tracked
// wallet; their observable signal is *change*: a new operator (owner
// pubkey on the AgentIdentity PDA) or a new metadata URI / config blob.
//
// This module is the inverse of the success-tx decoders: it diffs the
// previously-stored snapshot against the freshly-fetched on-chain state
// and emits one event per material change. It is called from the hourly
// `cron-registered-agent-diff` route.
//
// Naming convention for derived signatures (so reruns are idempotent
// against the agent_events `signature` upsert constraint):
//
//   OPERATOR_CHANGED → `opch-${asset}-${slotOrTs}`
//   CONFIG_CHANGED   → `cfgch-${asset}-${slotOrTs}`

export interface RegisteredAgentSnapshot {
  asset: string;
  identityOwner: string | null;
  metadataUri: string | null;
}

export interface RegisteredAgentDiffEvent {
  mint: string; // == asset (the agent identifier)
  type: "OPERATOR_CHANGED" | "CONFIG_CHANGED";
  severity: "warn";
  signature: string;
  slot: null;
  occurredAt: string; // ISO
  amountSol: 0;
  amountToken: 0;
  raw: Record<string, unknown>;
}

/**
 * Diff two registered-agent snapshots. Emits at most one event per change
 * type. Returns an empty array when nothing material changed OR when the
 * previous snapshot has no value to compare against (first observation
 * after we add the snapshot column — no event, just seed).
 */
export function diffRegisteredAgent(
  prev: RegisteredAgentSnapshot,
  next: RegisteredAgentSnapshot,
  observedAt: Date = new Date(),
): RegisteredAgentDiffEvent[] {
  if (prev.asset !== next.asset) return [];
  const out: RegisteredAgentDiffEvent[] = [];
  const ts = observedAt.toISOString();
  const slug = Math.floor(observedAt.getTime() / 1000);

  // OPERATOR_CHANGED — only if we had a prior owner. A null→value transition
  // is the initial seed and does not constitute a change in operator.
  if (
    prev.identityOwner &&
    next.identityOwner &&
    prev.identityOwner !== next.identityOwner
  ) {
    out.push({
      mint: next.asset,
      type: "OPERATOR_CHANGED",
      severity: "warn",
      signature: `opch-${next.asset}-${slug}`,
      slot: null,
      occurredAt: ts,
      amountSol: 0,
      amountToken: 0,
      raw: {
        kind: "registered_agent_diff",
        change: "identity_owner",
        from: prev.identityOwner,
        to: next.identityOwner,
        observed_at: ts,
      },
    });
  }

  // CONFIG_CHANGED — metadata URI flip. Both sides non-null.
  if (
    prev.metadataUri &&
    next.metadataUri &&
    prev.metadataUri !== next.metadataUri
  ) {
    out.push({
      mint: next.asset,
      type: "CONFIG_CHANGED",
      severity: "warn",
      signature: `cfgch-${next.asset}-${slug}`,
      slot: null,
      occurredAt: ts,
      amountSol: 0,
      amountToken: 0,
      raw: {
        kind: "registered_agent_diff",
        change: "metadata_uri",
        from: prev.metadataUri,
        to: next.metadataUri,
        observed_at: ts,
      },
    });
  }

  return out;
}
