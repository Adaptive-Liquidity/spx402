// Generalized DEX swap decoder.
// Server-only.
//
// Where the original `decode.server.ts` is mint-centric (matches token
// transfers against known mints to produce BUYBACK_EXECUTED), this decoder
// is wallet-centric: given a list of executor wallets, it emits SWAP_EXECUTED
// for any DEX swap they participate in.
//
// Supported sources (matched via Helius `source` field):
//   - JUPITER, RAYDIUM, ORCA, METEORA, PHOENIX, LIFINITY, PUMP_AMM, PUMP_FUN
//
// We attribute the swap to the wallet that paid the fee and received tokens
// in/out. amountSol = absolute SOL delta on the wallet during the tx.

import {
  lamportsToSol,
  type HeliusEnhancedTx,
} from "./helius.server";

const DEX_SOURCES = new Set([
  "JUPITER",
  "JUPITER_AGGREGATOR_V6",
  "RAYDIUM",
  "RAYDIUM_AMM",
  "RAYDIUM_CLMM",
  "ORCA",
  "ORCA_WHIRLPOOLS",
  "METEORA",
  "PHOENIX",
  "LIFINITY",
  "PUMP_AMM",
  "PUMP_FUN",
]);

export interface SwapEvent {
  executorWallet: string;
  signature: string;
  slot: number | null;
  occurredAt: string;
  amountSol: number;
  amountToken: number;
  source: string;
  raw: Record<string, unknown>;
}

/**
 * Decode any DEX swap activity for the given executor wallets in this tx.
 * Returns one event per (wallet, tx) pair where the wallet is involved.
 */
export function decodeSwapTx(
  tx: HeliusEnhancedTx,
  executorWallets: string[],
): SwapEvent[] {
  const out: SwapEvent[] = [];
  const sig = tx.signature ?? "";
  if (!sig) return out;
  if (executorWallets.length === 0) return out;

  const source = (tx.source ?? "").toUpperCase();
  if (!DEX_SOURCES.has(source)) return out;

  const slot = tx.slot ?? null;
  const occurredAt = tx.timestamp
    ? new Date(tx.timestamp * 1000).toISOString()
    : new Date().toISOString();

  for (const wallet of executorWallets) {
    // Net SOL movement on the wallet (in - out, signed).
    let lamportsDelta = 0;
    for (const t of tx.nativeTransfers ?? []) {
      if (t.toUserAccount === wallet) lamportsDelta += t.amount ?? 0;
      if (t.fromUserAccount === wallet) lamportsDelta -= t.amount ?? 0;
    }
    // Net token movement on the wallet across all mints (sum of |amount|).
    let tokenAbs = 0;
    let touched = false;
    for (const t of tx.tokenTransfers ?? []) {
      if (t.toUserAccount === wallet || t.fromUserAccount === wallet) {
        touched = true;
        tokenAbs += Math.abs(t.tokenAmount ?? 0);
      }
    }
    // Wallet must actually be in the tx, either as fee payer or as a
    // counter-party in a transfer.
    const isPayer = tx.feePayer === wallet;
    if (!touched && !isPayer) continue;

    out.push({
      executorWallet: wallet,
      signature: sig,
      slot,
      occurredAt,
      amountSol: lamportsToSol(Math.abs(lamportsDelta)),
      amountToken: tokenAbs,
      source,
      raw: { source, description: tx.description ?? null },
    });
  }
  return out;
}
