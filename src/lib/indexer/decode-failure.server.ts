// Failure decoder.
// Server-only.
//
// The success-path decoders (decode.server.ts, decode-swap.server.ts,
// decode-x402.server.ts) emit one event per *observed* on-chain success.
// This module is the inverse: it emits negative events when the chain
// proves something *failed*.
//
// Two scopes:
//
//   1. Per-tx failure decoders (synchronous, called from the webhook):
//      We can sometimes prove a failure from a single tx — e.g. a
//      pump-touching tx that errored, or an x402-marked tx that errored
//      after the payment was promised. These are written immediately
//      with severity "critical".
//
//   2. Window failure reconcilers (asynchronous, called from cron):
//      Some failures are only visible across a time window — e.g. a
//      DEPOSIT_RECEIVED with no follow-up BUYBACK_EXECUTED inside the
//      cadence tolerance. The reconciler in
//      api.public.cron-failure-reconciler walks recent events and
//      emits PROMISED_BUYBACK_NOT_SETTLED / FAILED_BUYBACK_WINDOW.
//
// Naming convention for negative event signatures (so we never collide
// with the source success tx and so reruns are idempotent via the
// (signature) upsert):
//
//   PROMISED_BUYBACK_NOT_SETTLED  →  `pbns-${depositSig}`
//   FAILED_BUYBACK_WINDOW         →  `fbw-${windowKey}`
//   X402_PAYMENT_REVERTED         →  `x402rv-${txSig}`

import { type HeliusEnhancedTx, touchesPumpFun } from "./helius.server";

export interface PerTxFailureEvent {
  identifier: string; // matches the `mint` column on agents (mint / core asset / wallet)
  type: "X402_PAYMENT_REVERTED";
  severity: "critical";
  signature: string;
  slot: number | null;
  occurredAt: string;
  amountSol: number;
  amountToken: number;
  raw: Record<string, unknown>;
}

const X402_HINTS = /(^|[^a-z])x402([^0-9]|$)|x402-receipt|x402:|"x402"/i;

/**
 * Per-tx x402 reversal detector. Emits one critical event when an
 * executor wallet was the intended recipient of an x402-marked tx that
 * the chain rejected.
 */
export function decodeX402ReversedTx(
  tx: HeliusEnhancedTx,
  executorAgents: Array<{ identifier: string; wallet: string }>,
): PerTxFailureEvent[] {
  const out: PerTxFailureEvent[] = [];
  if (!tx.transactionError) return out;
  const sig = tx.signature ?? "";
  if (!sig) return out;

  const desc = (tx.description ?? "").toLowerCase();
  const source = (tx.source ?? "").toLowerCase();
  const hasMarker = X402_HINTS.test(desc) || X402_HINTS.test(source);
  if (!hasMarker) return out;

  const slot = tx.slot ?? null;
  const occurredAt = tx.timestamp
    ? new Date(tx.timestamp * 1000).toISOString()
    : new Date().toISOString();

  // We tag the event to every executor wallet that was an intended
  // counter-party in the failed tx (fee payer or referenced in transfers).
  const involved = new Set<string>();
  for (const e of executorAgents) {
    if (tx.feePayer === e.wallet) involved.add(e.wallet);
    for (const t of tx.nativeTransfers ?? []) {
      if (t.toUserAccount === e.wallet || t.fromUserAccount === e.wallet) {
        involved.add(e.wallet);
      }
    }
    for (const t of tx.tokenTransfers ?? []) {
      if (t.toUserAccount === e.wallet || t.fromUserAccount === e.wallet) {
        involved.add(e.wallet);
      }
    }
  }
  if (involved.size === 0) return out;

  for (const e of executorAgents) {
    if (!involved.has(e.wallet)) continue;
    out.push({
      identifier: e.identifier,
      type: "X402_PAYMENT_REVERTED",
      severity: "critical",
      // Suffix the wallet so two executors involved in the same failed tx
      // each get their own row without violating the unique signature index.
      signature: `x402rv-${sig}-${e.wallet.slice(0, 8)}`,
      slot,
      occurredAt,
      amountSol: 0,
      amountToken: 0,
      raw: {
        sourceSignature: sig,
        error: String(tx.transactionError),
        source: tx.source ?? null,
      },
    });
  }
  return out;
}

/**
 * Per-tx pump-buyback reversal detector. A tx that touched Pump.fun for a
 * known mint and errored is a strong signal that an attempted buyback
 * never settled. Synchronous; written next to the success-path events.
 */
export function decodePumpBuybackReversedTx(
  tx: HeliusEnhancedTx,
  agents: Array<{ mint: string }>,
): Array<{
  mint: string;
  type: "PROMISED_BUYBACK_NOT_SETTLED";
  severity: "critical";
  signature: string;
  slot: number | null;
  occurredAt: string;
  amountSol: number;
  amountToken: number;
  raw: Record<string, unknown>;
}> {
  const out: ReturnType<typeof decodePumpBuybackReversedTx> = [];
  if (!tx.transactionError) return out;
  if (!touchesPumpFun(tx)) return out;
  const sig = tx.signature ?? "";
  if (!sig) return out;

  const slot = tx.slot ?? null;
  const occurredAt = tx.timestamp
    ? new Date(tx.timestamp * 1000).toISOString()
    : new Date().toISOString();

  for (const a of agents) {
    const involves = (tx.tokenTransfers ?? []).some((t) => t.mint === a.mint);
    if (!involves) continue;
    out.push({
      mint: a.mint,
      type: "PROMISED_BUYBACK_NOT_SETTLED",
      severity: "critical",
      signature: `pbns-${sig}`,
      slot,
      occurredAt,
      amountSol: 0,
      amountToken: 0,
      raw: {
        sourceSignature: sig,
        error: String(tx.transactionError),
        source: tx.source ?? "PUMP_FUN",
      },
    });
  }
  return out;
}
