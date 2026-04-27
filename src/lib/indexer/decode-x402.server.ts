// x402 micropayment receipt decoder.
// Server-only.
//
// x402 is the Linux Foundation HTTP-402 micropayment protocol on Solana.
// Coinbase + Solana + Stripe + Visa back it. Every payment lands as a
// SOL or USDC transfer to a recipient wallet, often with an "x402"-shaped
// memo or instruction.
//
// We use a conservative heuristic to keep false positives low:
//   - Recipient is a known executor wallet AND
//   - The tx description / source / memo references "x402" / "402"
//   - OR the tx contains a Memo program instruction whose payload looks
//     like an x402 receipt header (`x402`, `x402-receipt`, `x402:`).
//
// False negatives are acceptable — anything we miss can be picked up by a
// later sweeper improvement. False positives would inflate scores, which
// is the bigger trust risk.

import { lamportsToSol, type HeliusEnhancedTx } from "./helius.server";

// SPL Memo program ID (v1 + v2 both work; we match either).
const MEMO_PROGRAMS = new Set([
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr", // v1
  "Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo",
]);

const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

const X402_PATTERNS = /(^|[^a-z])x402([^0-9]|$)|x402-receipt|x402:|"x402"/i;

export interface X402Event {
  executorWallet: string;
  signature: string;
  slot: number | null;
  occurredAt: string;
  amountSol: number;   // SOL value of receipt (for SOL receipts)
  amountToken: number; // token amount for USDC receipts (raw units)
  source: string;
  raw: Record<string, unknown>;
}

export function decodeX402Tx(
  tx: HeliusEnhancedTx,
  executorWallets: string[],
): X402Event[] {
  const out: X402Event[] = [];
  const sig = tx.signature ?? "";
  if (!sig || executorWallets.length === 0) return out;

  const slot = tx.slot ?? null;
  const occurredAt = tx.timestamp
    ? new Date(tx.timestamp * 1000).toISOString()
    : new Date().toISOString();

  // 1. Check for x402 marker in description / source / memo.
  const desc = (tx.description ?? "").toLowerCase();
  const source = (tx.source ?? "").toLowerCase();
  let hasMarker = X402_PATTERNS.test(desc) || X402_PATTERNS.test(source);

  if (!hasMarker) {
    // Look for a Memo instruction with x402-shaped payload.
    for (const ix of tx.instructions ?? []) {
      if (!ix.programId || !MEMO_PROGRAMS.has(ix.programId)) continue;
      const memo = (ix.parsed?.info?.memo as string | undefined) ?? "";
      if (memo && X402_PATTERNS.test(memo)) {
        hasMarker = true;
        break;
      }
    }
  }
  if (!hasMarker) return out;

  for (const wallet of executorWallets) {
    // SOL receipt
    let lamportsIn = 0;
    for (const t of tx.nativeTransfers ?? []) {
      if (t.toUserAccount === wallet) lamportsIn += t.amount ?? 0;
    }
    // USDC receipt
    let usdcIn = 0;
    for (const t of tx.tokenTransfers ?? []) {
      if (t.mint === USDC_MINT && t.toUserAccount === wallet) {
        usdcIn += t.tokenAmount ?? 0;
      }
    }
    if (lamportsIn === 0 && usdcIn === 0) continue;
    out.push({
      executorWallet: wallet,
      signature: sig,
      slot,
      occurredAt,
      amountSol: lamportsToSol(lamportsIn),
      amountToken: usdcIn,
      source: tx.source ?? "x402",
      raw: { source: tx.source ?? null, description: tx.description ?? null },
    });
  }
  return out;
}
