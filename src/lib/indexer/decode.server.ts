// Decode a Helius enhanced transaction into one or more agent_events rows.
// Server-only.

import {
  extractBurn,
  lamportsReceivedAt,
  lamportsToSol,
  touchesPumpFun,
  type HeliusEnhancedTx,
} from "./helius.server";

export interface DecodedEvent {
  mint: string;
  type:
    | "DEPOSIT_RECEIVED"
    | "BUYBACK_EXECUTED"
    | "BURN_CONFIRMED"
    | "CONFIG_CHANGED"
    | "FAILED_WINDOW"
    | "ANOMALY_DETECTED"
    | "OPERATOR_VERIFIED"
    | "SWAP_EXECUTED"
    | "X402_PAYMENT_RECEIVED"
    // AEON Execution Primitives
    | "ESCROW_CREATED"
    | "ESCROW_RELEASED"
    | "ESCROW_CANCELED"
    | "BOND_DEPOSITED"
    | "BOND_SLASHED"
    | "RECEIPT_CREATED"
    // Wave 1b — failure decoder negative-event taxonomy.
    | "FAILED_BUYBACK_WINDOW"
    | "PROMISED_BUYBACK_NOT_SETTLED"
    | "X402_PAYMENT_REVERTED"
    | "WINDOW_MISSED";
  severity: "info" | "warn" | "critical" | "success";
  signature: string;
  slot: number | null;
  occurredAt: string; // ISO
  amountSol: number;
  amountToken: number;
  raw: Record<string, unknown>;
}

export interface AgentLookup {
  mint: string;
  depositAddress: string | null;
}

/**
 * Decode a single enhanced tx into 0..N events for known agents.
 * `agents` maps depositAddress → mint (optional) and we also key by mint
 * for burn detection.
 */
export function decodeTx(
  tx: HeliusEnhancedTx,
  agents: AgentLookup[],
): DecodedEvent[] {
  const events: DecodedEvent[] = [];
  const sig = tx.signature ?? "";
  const slot = tx.slot ?? null;
  const occurredAt = tx.timestamp
    ? new Date(tx.timestamp * 1000).toISOString()
    : new Date().toISOString();

  if (!sig) return events;

  // 1. Deposits — native SOL into a known deposit address.
  for (const a of agents) {
    if (!a.depositAddress) continue;
    const lamports = lamportsReceivedAt(tx, a.depositAddress);
    if (lamports > 0) {
      events.push({
        mint: a.mint,
        type: "DEPOSIT_RECEIVED",
        severity: "info",
        signature: sig,
        slot,
        occurredAt,
        amountSol: lamportsToSol(lamports),
        amountToken: 0,
        raw: { source: tx.source ?? null, description: tx.description ?? null },
      });
    }
  }

  // 2. Burns — SPL Token burn for any known mint.
  const burn = extractBurn(tx);
  if (burn) {
    const known = agents.find((a) => a.mint === burn.mint);
    if (known) {
      events.push({
        mint: known.mint,
        type: "BURN_CONFIRMED",
        severity: "success",
        signature: sig,
        slot,
        occurredAt,
        amountSol: 0,
        amountToken: burn.amount,
        raw: { source: tx.source ?? null },
      });
    }
  }

  // 3. Buybacks — pump.fun-touching tx that moves SOL out and tokens of a known mint in.
  if (touchesPumpFun(tx)) {
    for (const a of agents) {
      const tokensIn = (tx.tokenTransfers ?? [])
        .filter((t) => t.mint === a.mint)
        .reduce((acc, t) => acc + (t.tokenAmount ?? 0), 0);
      if (tokensIn > 0) {
        // SOL spent by fee payer
        const solOut = (tx.nativeTransfers ?? [])
          .filter((t) => t.fromUserAccount === tx.feePayer)
          .reduce((acc, t) => acc + (t.amount ?? 0), 0);
        events.push({
          mint: a.mint,
          type: "BUYBACK_EXECUTED",
          severity: "success",
          signature: sig,
          slot,
          occurredAt,
          amountSol: lamportsToSol(solOut),
          amountToken: tokensIn,
          raw: { source: tx.source ?? "PUMP_FUN" },
        });
      }
    }
  }

  // 4. Failed tx that touched pump.fun for a known mint → ANOMALY.
  if (tx.transactionError && touchesPumpFun(tx)) {
    for (const a of agents) {
      const involves = (tx.tokenTransfers ?? []).some((t) => t.mint === a.mint);
      if (involves) {
        events.push({
          mint: a.mint,
          type: "ANOMALY_DETECTED",
          severity: "warn",
          signature: sig,
          slot,
          occurredAt,
          amountSol: 0,
          amountToken: 0,
          raw: { error: String(tx.transactionError) },
        });
      }
    }
  }

  return events;
}
