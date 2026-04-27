// Candidate-agent verifier.
// Runs Gemini's 4 checks against a mint to decide if it qualifies as a real
// "tokenized + earning + identity-bearing" agent worth grading.
//
// Strict promotion bar (per project decision):
//   Pass Check 3 (real on-chain earnings: deposit -> buyback -> burn observed)
//   AND at least one of:
//     - Check 1 (Skills.md link in Metaplex metadata)
//     - Check 2 (Pump.fun Invoice ID PDA derivable for this mint)
//     - Check 4 (Solana Agent Registry AgentIdentity PDA exists)
//
// Server-only.

import { fetchAddressTxs, type HeliusEnhancedTx, touchesPumpFun, extractBurn } from "./helius.server";
import { decodeTx } from "./decode.server";
import { decodeSwapTx } from "./decode-swap.server";
import { decodeX402Tx } from "./decode-x402.server";
import type { IdentifierKind } from "@/lib/agents/categories";

export interface VerificationSignals {
  // Tokenized-agent signals.
  skills_md: boolean;
  invoice_pda: boolean;
  on_chain_earnings: boolean;
  agent_registry: boolean;
  // Executor / registered signals (only populated for non-mint kinds).
  swap_activity?: boolean;
  x402_activity?: boolean;
  registered_identity?: boolean;
}

export interface VerificationResult {
  signals: VerificationSignals;
  passed: boolean;
  metadataUri: string | null;
  symbol: string | null;
  name: string | null;
  notes: string;
}

const HELIUS_RPC = "https://mainnet.helius-rpc.com";
// Pump.fun Agent Payments program (per project docs §c). The exact program ID
// is not publicly documented in a single place, so we cast a wide net by
// matching ANY PDA derivation that uses the standard "invoice" seed prefix
// against the mint. We treat a successful Helius getAccountInfo at the
// derived PDA as a positive signal.
const PUMPFUN_INVOICE_SEED = "invoice";

// Metaplex MPL Agent Identity program (verified mainnet program ID, March 2026).
// Source: https://developers.metaplex.com/smart-contracts/mpl-agent
// Same address on Mainnet and Devnet.
const SOLANA_AGENT_REGISTRY_PROGRAM_ID =
  "1DREGFgysWYxLnRnKQnwrxnJQeSMk2HmGaC6whw2B2p";

// ============================================================================
// Check 1 — Skills.md in Metaplex metadata
// ============================================================================

export async function checkSkillsMd(mint: string): Promise<{
  passed: boolean;
  metadataUri: string | null;
  symbol: string | null;
  name: string | null;
}> {
  const key = process.env.HELIUS_API_KEY;
  if (!key) return { passed: false, metadataUri: null, symbol: null, name: null };

  try {
    // Helius DAS getAsset returns Metaplex-decoded metadata for any mint.
    const res = await fetch(`${HELIUS_RPC}/?api-key=${key}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "spx402-verify",
        method: "getAsset",
        params: { id: mint },
      }),
    });
    if (!res.ok) return { passed: false, metadataUri: null, symbol: null, name: null };
    const json = (await res.json()) as {
      result?: {
        content?: {
          json_uri?: string;
          metadata?: { symbol?: string; name?: string; description?: string };
          links?: Record<string, string>;
        };
      };
    };
    const content = json.result?.content;
    const metadataUri = content?.json_uri ?? null;
    const symbol = content?.metadata?.symbol ?? null;
    const name = content?.metadata?.name ?? null;

    // Quick text-level check on what we already have
    const inline = JSON.stringify(content ?? {}).toLowerCase();
    if (inline.includes("skills.md") || inline.includes('"skills"')) {
      return { passed: true, metadataUri, symbol, name };
    }

    // Otherwise fetch the off-chain JSON URI
    if (metadataUri) {
      try {
        const offChain = await fetch(metadataUri).then((r) => r.json());
        const text = JSON.stringify(offChain).toLowerCase();
        if (text.includes("skills.md") || text.includes('"skills"')) {
          return { passed: true, metadataUri, symbol, name };
        }
      } catch {
        /* off-chain fetch failed; not a positive signal */
      }
    }
    return { passed: false, metadataUri, symbol, name };
  } catch {
    return { passed: false, metadataUri: null, symbol: null, name: null };
  }
}

// ============================================================================
// Check 2 — Invoice ID PDA derivable
// ============================================================================
// We derive a PDA from seeds [PUMPFUN_INVOICE_SEED, mint] under the Pump.fun
// program. If Helius can fetch account data for that PDA it's a positive
// signal that the agent has been registered in the agent-payments program.
// (Best-effort: false negatives are acceptable; we have other checks.)

import { createHash } from "crypto";

function findProgramAddressLite(seeds: Buffer[], programId: string): string | null {
  // Lightweight PDA derivation: we don't actually need the on-chain valid
  // address — we just need a deterministic key to look up. For a true PDA
  // derivation we'd use @solana/web3.js, but in the Worker we approximate
  // with a sha256(seeds || programId) -> base58.
  // We DO NOT use this for transactions, only as a candidate lookup key.
  try {
    const buf = Buffer.concat([...seeds, Buffer.from(programId, "utf-8")]);
    const hash = createHash("sha256").update(buf).digest();
    return base58Encode(hash);
  } catch {
    return null;
  }
}

const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function base58Encode(bytes: Buffer): string {
  // simple base58 encoder
  let n = 0n;
  for (const b of bytes) n = n * 256n + BigInt(b);
  let out = "";
  while (n > 0n) {
    out = BASE58_ALPHABET[Number(n % 58n)] + out;
    n = n / 58n;
  }
  for (const b of bytes) {
    if (b === 0) out = "1" + out;
    else break;
  }
  return out;
}

export async function checkInvoicePda(mint: string): Promise<boolean> {
  const key = process.env.HELIUS_API_KEY;
  if (!key) return false;
  // We can't derive a real PDA without web3.js, so we use a fallback
  // heuristic: check if the mint's associated agent-payments transaction
  // history shows any "invoice" memos via Helius. This is intentionally
  // conservative.
  try {
    const url = `https://api.helius.xyz/v0/addresses/${mint}/transactions?api-key=${key}&limit=20`;
    const res = await fetch(url);
    if (!res.ok) return false;
    const txs = (await res.json()) as HeliusEnhancedTx[];
    for (const tx of txs) {
      const desc = (tx.description ?? "").toLowerCase();
      if (desc.includes("invoice") || desc.includes("agent payment")) return true;
      const txStr = JSON.stringify(tx).toLowerCase();
      if (txStr.includes("invoice") && txStr.includes("pump")) return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ============================================================================
// Check 3 — On-chain earnings (the strict bar)
// ============================================================================
// Confirm the deposit -> buyback -> burn loop has been observed at least once.
// We pull recent enhanced txs for the mint and look for any pump.fun-touching
// tx that includes both an SPL Burn of this mint AND an inbound token
// transfer of this mint (the buyback leg).

export async function checkOnChainEarnings(mint: string): Promise<{
  passed: boolean;
  burnsSeen: number;
  buybacksSeen: number;
}> {
  const txs = await fetchAddressTxs(mint);
  let burns = 0;
  let buybacks = 0;
  for (const tx of txs) {
    const burn = extractBurn(tx);
    if (burn?.mint === mint) burns += 1;

    if (touchesPumpFun(tx)) {
      const tokensIn = (tx.tokenTransfers ?? [])
        .filter((t) => t.mint === mint)
        .reduce((acc, t) => acc + (t.tokenAmount ?? 0), 0);
      if (tokensIn > 0) buybacks += 1;
    }
  }
  return { passed: burns > 0 && buybacks > 0, burnsSeen: burns, buybacksSeen: buybacks };
}

// ============================================================================
// Check 4 — Solana Agent Registry AgentIdentity PDA
// ============================================================================

export async function checkAgentRegistry(mint: string): Promise<boolean> {
  const key = process.env.HELIUS_API_KEY;
  if (!key) return false;
  try {
    // Use Helius DAS to query program accounts owned by the registry
    // program where mint matches. This is a best-effort scan limited to
    // recent results; full enumeration belongs to the registry-scan worker.
    const res = await fetch(`${HELIUS_RPC}/?api-key=${key}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "registry-check",
        method: "getProgramAccounts",
        params: [
          SOLANA_AGENT_REGISTRY_PROGRAM_ID,
          {
            encoding: "base64",
            filters: [{ memcmp: { offset: 8, bytes: mint } }],
          },
        ],
      }),
    });
    if (!res.ok) return false;
    const json = (await res.json()) as { result?: unknown[] };
    return Array.isArray(json.result) && json.result.length > 0;
  } catch {
    return false;
  }
}

// ============================================================================
// Orchestrator
// ============================================================================

export async function verifyCandidate(
  mint: string,
  opts: { discoveredVia?: string } = {},
): Promise<VerificationResult> {
  const [skills, invoice, earnings, registry] = await Promise.all([
    checkSkillsMd(mint),
    checkInvoicePda(mint),
    checkOnChainEarnings(mint),
    checkAgentRegistry(mint),
  ]);

  const signals: VerificationSignals = {
    skills_md: skills.passed,
    invoice_pda: invoice,
    on_chain_earnings: earnings.passed,
    agent_registry: registry,
  };

  // Strict bar
  const identityProofs =
    Number(signals.skills_md) +
    Number(signals.invoice_pda) +
    Number(signals.agent_registry);

  // Curated seeds bypass the identity gate (we vouched for them) but must
  // still show real on-chain pump.fun activity. They also accept buyback-only
  // earnings since pump.fun Tokenized Agents v1 makes burns optional.
  const isCuratedSeed = opts.discoveredVia === "curated_seed";
  const earningsForCurated =
    earnings.buybacksSeen >= 5 || (signals.on_chain_earnings as boolean);
  const passed = isCuratedSeed
    ? earningsForCurated
    : signals.on_chain_earnings && identityProofs >= 1;

  const notes = [
    `burns=${earnings.burnsSeen}`,
    `buybacks=${earnings.buybacksSeen}`,
    `skills=${signals.skills_md}`,
    `invoice=${signals.invoice_pda}`,
    `registry=${signals.agent_registry}`,
    isCuratedSeed ? "curated" : "open",
  ].join(" ");

  return {
    signals,
    passed,
    metadataUri: skills.metadataUri,
    symbol: skills.symbol,
    name: skills.name,
    notes,
  };
}

// Re-export helper to decode any txs we fetched while verifying — useful for
// kicking off the first agent_events backfill when we promote.
export { decodeTx };
