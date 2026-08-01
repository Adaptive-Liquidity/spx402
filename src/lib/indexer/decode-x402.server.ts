// x402 settlement decoder. Server-only.
// PARSER_VERSION: v0.2.0
//
// Detection tiers (Solana lane):
//   A. facilitator_fee_payer — tx fee-payer is a registry facilitator AND a
//      counterparty receives SOL/USDC. Confidence: high.
//      This is the protocol's structural signature: the facilitator submits
//      the client's partially-signed transfer and pays the fee.
//   B. memo_marker — legacy heuristic (x402-shaped description/source/memo).
//      Confidence: medium. Catches self-labeling implementations.
//
// False negatives remain acceptable; false positives inflate grades.
// Every event carries detectionMethod + confidence into agent_events.raw
// so scoring and dossiers can distinguish provenance.

import { lamportsToSol, type HeliusEnhancedTx } from "./helius.server";
import { facilitatorForFeePayer, type Facilitator } from "./facilitators.server";

export const X402_PARSER_VERSION = "v0.2.0";

const MEMO_PROGRAMS = new Set([
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr", // v1
  "Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo", // v2
]);

const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

const X402_PATTERNS = /(^|[^a-z])x402([^0-9]|$)|x402-receipt|x402:|"x402"/i;

export type X402DetectionMethod = "facilitator_fee_payer" | "memo_marker";

export interface X402Event {
  executorWallet: string;
  signature: string;
  slot: number | null;
  occurredAt: string;
  amountSol: number;
  amountToken: number; // USDC raw units (6dp)
  source: string;
  detectionMethod: X402DetectionMethod;
  confidence: "high" | "medium";
  facilitatorId: string | null;
  payerWallet: string | null; // buyer side — the credit-bureau endgame
  raw: Record<string, unknown>;
}

export interface DecodeX402Opts {
  registry?: Map<string, Facilitator>; // preloaded via getActiveFacilitators()
}

export function decodeX402Tx(
  tx: HeliusEnhancedTx,
  executorWallets: string[],
  opts: DecodeX402Opts = {},
): X402Event[] {
  const out: X402Event[] = [];
  const sig = tx.signature ?? "";
  if (!sig || executorWallets.length === 0) return out;

  const slot = tx.slot ?? null;
  const occurredAt = tx.timestamp
    ? new Date(tx.timestamp * 1000).toISOString()
    : new Date().toISOString();

  // ── Tier A: facilitator fee-payer ────────────────────────────────
  const facilitator = opts.registry
    ? facilitatorForFeePayer(opts.registry, tx.feePayer)
    : null;

  // ── Tier B: memo/description marker (legacy) ─────────────────────
  let hasMarker = false;
  if (!facilitator) {
    const desc = (tx.description ?? "").toLowerCase();
    const source = (tx.source ?? "").toLowerCase();
    hasMarker = X402_PATTERNS.test(desc) || X402_PATTERNS.test(source);
    if (!hasMarker) {
      for (const ix of tx.instructions ?? []) {
        if (!ix.programId || !MEMO_PROGRAMS.has(ix.programId)) continue;
        const memo = (ix.parsed?.info?.memo as string | undefined) ?? "";
        if (memo && X402_PATTERNS.test(memo)) {
          hasMarker = true;
          break;
        }
      }
    }
  }
  if (!facilitator && !hasMarker) return out;

  const method: X402DetectionMethod = facilitator
    ? "facilitator_fee_payer"
    : "memo_marker";
  const confidence: "high" | "medium" = facilitator ? "high" : "medium";

  // Buyer = the counterparty sending funds to the executor. For facilitator
  // settlements this is the transfer source; for memo-tier it's the tx
  // fee-payer (best effort).
  const senders = new Map<string, number>(); // wallet → lamports+usdc sent
  for (const t of tx.nativeTransfers ?? []) {
    if (t.fromUserAccount && (t.amount ?? 0) > 0) {
      senders.set(
        t.fromUserAccount,
        (senders.get(t.fromUserAccount) ?? 0) + (t.amount ?? 0),
      );
    }
  }
  for (const t of tx.tokenTransfers ?? []) {
    if (t.mint === USDC_MINT && t.fromUserAccount && (t.tokenAmount ?? 0) > 0) {
      senders.set(
        t.fromUserAccount,
        (senders.get(t.fromUserAccount) ?? 0) + 1, // presence flag; value tracked receiver-side
      );
    }
  }

  for (const wallet of executorWallets) {
    // Guard: never score the facilitator's own inbound flows (fee sweeps).
    if (facilitator && wallet === facilitator.address) continue;

    let lamportsIn = 0;
    for (const t of tx.nativeTransfers ?? []) {
      if (t.toUserAccount === wallet) lamportsIn += t.amount ?? 0;
    }
    let usdcIn = 0;
    for (const t of tx.tokenTransfers ?? []) {
      if (t.mint === USDC_MINT && t.toUserAccount === wallet) {
        usdcIn += t.tokenAmount ?? 0;
      }
    }
    if (lamportsIn === 0 && usdcIn === 0) continue;

    // Pick the most plausible payer: the sender that isn't the executor,
    // isn't the facilitator, and moved the most value.
    let payer: string | null = null;
    let best = 0;
    for (const [sender, weight] of senders) {
      if (sender === wallet) continue;
      if (facilitator && sender === facilitator.address) continue;
      if (weight > best) {
        best = weight;
        payer = sender;
      }
    }

    out.push({
      executorWallet: wallet,
      signature: sig,
      slot,
      occurredAt,
      amountSol: lamportsToSol(lamportsIn),
      amountToken: usdcIn,
      source: tx.source ?? "x402",
      detectionMethod: method,
      confidence,
      facilitatorId: facilitator?.id ?? null,
      payerWallet: payer,
      raw: {
        source: tx.source ?? null,
        description: tx.description ?? null,
        feePayer: tx.feePayer ?? null,
        detectionMethod: method,
        facilitatorId: facilitator?.id ?? null,
        payerWallet: payer,
        parserVersion: X402_PARSER_VERSION,
      },
    });
  }
  return out;
}
