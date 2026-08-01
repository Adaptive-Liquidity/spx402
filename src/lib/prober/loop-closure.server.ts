// Active Prober — loop closure.
//
// SERVER ONLY.
//
// After a paid probe returns 200, the prober's own settlement must appear in
// agent_events through the same facilitator lanes that index everybody else.
// This is the audit: SPX402 is measured by the pipeline it operates.
//
//   1. poll agent_events for the tx signature (90s window)
//   2. on miss, fall back to a direct RPC lookup
//   3. RPC hit + agent_events miss = INDEXER GAP — recorded as a
//      reconciliation signal, never silently swallowed

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { PROBE_CAPS } from "./outcomes";

const POLL_INTERVAL_MS = 5_000;

export interface LoopClosure {
  /** Settlement observed on-chain (via agent_events or RPC fallback). */
  confirmed: boolean;
  /** Milliseconds from first poll to observation. */
  settleMs: number | null;
  /** On-chain yes, agent_events no → the indexer missed it. */
  indexerGap: boolean;
  notes: string;
}

async function inAgentEvents(signature: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("agent_events")
    .select("id")
    .eq("signature", signature)
    .maybeSingle();
  return Boolean(data);
}

async function onChainSolana(signature: string): Promise<boolean> {
  const apiKey = process.env["HELIUS_API_KEY"];
  if (!apiKey) return false;
  try {
    const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${apiKey}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "spx-prober",
        method: "getTransaction",
        params: [signature, { maxSupportedTransactionVersion: 0 }],
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await res.json()) as { result?: unknown };
    return json.result != null;
  } catch {
    return false;
  }
}

async function onChainBase(txHash: string): Promise<boolean> {
  const rpc = process.env["BASE_RPC_URL"];
  if (!rpc) return false;
  try {
    const res = await fetch(rpc, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getTransactionReceipt",
        params: [txHash],
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await res.json()) as { result?: { status?: string } | null };
    return json.result != null;
  } catch {
    return false;
  }
}

export async function confirmProberSettlement(input: {
  txSignature: string;
  chain: string;
  payTo?: string | null;
}): Promise<LoopClosure> {
  const startedAt = Date.now();
  const deadline = startedAt + PROBE_CAPS.settlementWindowMs;

  while (Date.now() < deadline) {
    if (await inAgentEvents(input.txSignature)) {
      return {
        confirmed: true,
        settleMs: Date.now() - startedAt,
        indexerGap: false,
        notes: `loop closed via agent_events (${input.txSignature.slice(0, 12)}…)`,
      };
    }
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    await sleep(Math.min(POLL_INTERVAL_MS, remaining));
  }

  // Window elapsed. Was it on-chain at all?
  const onChain =
    input.chain === "base"
      ? await onChainBase(input.txSignature)
      : await onChainSolana(input.txSignature);

  if (onChain) {
    return {
      confirmed: true,
      settleMs: Date.now() - startedAt,
      indexerGap: true,
      notes: `on-chain confirmed by RPC after ${Math.round((Date.now() - startedAt) / 1000)}s; not in agent_events`,
    };
  }

  return {
    confirmed: false,
    settleMs: null,
    indexerGap: false,
    notes: `no settlement observed within ${PROBE_CAPS.settlementWindowMs / 1000}s`,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
