// Helius webhook + Enhanced Transactions helpers.
// Server-only — never import from client code.

import { createHmac, timingSafeEqual } from "crypto";

export const PUMPFUN_PROGRAM_ID = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
export const SPL_TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const SPL_TOKEN_2022_PROGRAM_ID = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

/**
 * Verify the HMAC-SHA256 signature Helius sends on the
 * `authorization` header (configured in the webhook dashboard as a
 * shared secret). We compare against `HELIUS_WEBHOOK_SECRET`.
 *
 * Helius sends the secret as a plain bearer token in the Authorization
 * header — so we accept either an exact match (legacy) or an HMAC of
 * the raw body, whichever matches first. This makes the route robust
 * to either webhook configuration style.
 */
export function verifyHeliusSignature(authHeader: string | null, rawBody: string): boolean {
  const secret = process.env.HELIUS_WEBHOOK_SECRET;
  if (!secret || !authHeader) return false;

  // 1. Plain shared-secret style (Authorization: <secret>)
  try {
    const a = Buffer.from(authHeader);
    const b = Buffer.from(secret);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  } catch {
    /* fall through */
  }

  // 2. HMAC style (Authorization: sha256=<hex>)
  const sig = authHeader.startsWith("sha256=") ? authHeader.slice(7) : authHeader;
  try {
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------
// Helius Enhanced Transactions decoded shape (subset we care about)
// Docs: https://docs.helius.dev/webhooks-and-websockets/parsed-transaction-types

export interface HeliusTokenTransfer {
  fromUserAccount?: string;
  toUserAccount?: string;
  fromTokenAccount?: string;
  toTokenAccount?: string;
  mint?: string;
  tokenAmount?: number;
  tokenStandard?: string;
}

export interface HeliusNativeTransfer {
  fromUserAccount?: string;
  toUserAccount?: string;
  amount?: number; // lamports
}

export interface HeliusInstruction {
  programId?: string;
  parsed?: {
    type?: string;
    info?: Record<string, unknown>;
  };
  data?: string;
  accounts?: string[];
  innerInstructions?: HeliusInstruction[];
}

export interface HeliusEnhancedTx {
  signature?: string;
  slot?: number;
  timestamp?: number; // unix seconds
  type?: string;
  source?: string;
  description?: string;
  fee?: number;
  feePayer?: string;
  nativeTransfers?: HeliusNativeTransfer[];
  tokenTransfers?: HeliusTokenTransfer[];
  instructions?: HeliusInstruction[];
  events?: Record<string, unknown>;
  transactionError?: unknown;
}

export const LAMPORTS_PER_SOL = 1_000_000_000;

export function lamportsToSol(lamports: number | undefined | null): number {
  if (!lamports || Number.isNaN(lamports)) return 0;
  return lamports / LAMPORTS_PER_SOL;
}

/**
 * Walk an Enhanced Tx and find the first SPL Token Burn instruction.
 * Returns mint + amount if found.
 */
export function extractBurn(tx: HeliusEnhancedTx): { mint: string; amount: number } | null {
  const all = flattenInstructions(tx.instructions ?? []);
  for (const ix of all) {
    if (ix.programId !== SPL_TOKEN_PROGRAM_ID && ix.programId !== SPL_TOKEN_2022_PROGRAM_ID)
      continue;
    const t = ix.parsed?.type?.toLowerCase();
    if (t !== "burn" && t !== "burnchecked") continue;
    const info = ix.parsed?.info ?? {};
    const mint = (info.mint as string | undefined) ?? "";
    const amountRaw =
      (info.amount as string | undefined) ??
      (info.tokenAmount as { amount?: string } | undefined)?.amount;
    const amount = amountRaw ? Number(amountRaw) : 0;
    if (mint) return { mint, amount };
  }
  return null;
}

function flattenInstructions(ixs: HeliusInstruction[]): HeliusInstruction[] {
  const out: HeliusInstruction[] = [];
  for (const ix of ixs) {
    out.push(ix);
    if (ix.innerInstructions?.length) {
      out.push(...flattenInstructions(ix.innerInstructions));
    }
  }
  return out;
}

/**
 * Find the largest native-SOL transfer landing in `address`.
 * Returns lamports received, or 0.
 */
export function lamportsReceivedAt(tx: HeliusEnhancedTx, address: string): number {
  let total = 0;
  for (const t of tx.nativeTransfers ?? []) {
    if (t.toUserAccount === address && typeof t.amount === "number") {
      total += t.amount;
    }
  }
  return total;
}

/**
 * Tx involves the Pump.fun program?
 */
export function touchesPumpFun(tx: HeliusEnhancedTx): boolean {
  if (tx.source?.toLowerCase().includes("pump")) return true;
  const all = flattenInstructions(tx.instructions ?? []);
  return all.some((ix) => ix.programId === PUMPFUN_PROGRAM_ID);
}

/**
 * Extract every distinct SPL mint that appears in a Pump.fun-touching tx.
 * Used by the webhook to surface NEW mints into candidate_agents so the
 * verifier can decide if they qualify as real tokenized agents.
 *
 * We only return mints when the tx actually touches Pump.fun, so we do not
 * pollute candidates with unrelated SPL transfers.
 */
export function extractPumpFunMints(tx: HeliusEnhancedTx): string[] {
  if (!touchesPumpFun(tx)) return [];
  const mints = new Set<string>();
  for (const t of tx.tokenTransfers ?? []) {
    if (t.mint) mints.add(t.mint);
  }
  // Also pick up burns / mint instructions that didn't show up as transfers.
  const all = flattenInstructions(tx.instructions ?? []);
  for (const ix of all) {
    const info = ix.parsed?.info ?? {};
    const mint = info.mint as string | undefined;
    if (mint) mints.add(mint);
  }
  // Filter out the wrapped-SOL mint (commonly appears in pumpfun swaps).
  mints.delete("So11111111111111111111111111111111111111112");
  return Array.from(mints);
}

// ---------------------------------------------------------------
// Helius RPC helpers (Enhanced Transactions)

const HELIUS_BASE = "https://api.helius.xyz/v0";

export async function fetchEnhancedTxs(signatures: string[]): Promise<HeliusEnhancedTx[]> {
  const key = process.env.HELIUS_API_KEY;
  if (!key || signatures.length === 0) return [];
  const res = await fetch(`${HELIUS_BASE}/transactions?api-key=${key}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ transactions: signatures.slice(0, 100) }),
  });
  if (!res.ok) return [];
  return (await res.json()) as HeliusEnhancedTx[];
}

export async function fetchAddressTxs(
  address: string,
  before?: string,
): Promise<HeliusEnhancedTx[]> {
  const key = process.env.HELIUS_API_KEY;
  if (!key || !address) return [];
  const url = new URL(`${HELIUS_BASE}/addresses/${address}/transactions`);
  url.searchParams.set("api-key", key);
  url.searchParams.set("limit", "50");
  if (before) url.searchParams.set("before", before);
  const res = await fetch(url.toString());
  if (!res.ok) return [];
  return (await res.json()) as HeliusEnhancedTx[];
}
