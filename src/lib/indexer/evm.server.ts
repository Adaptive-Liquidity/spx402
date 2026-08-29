// Base (EVM) RPC helpers for the x402 settlement lane. Server-only.
//
// Ingestion is LOG-FIRST, never block-first: `eth_getLogs` on the USDC
// contract filtered to the EIP-3009 `AuthorizationUsed` topic gives every
// settlement cheaply; each log is then resolved to its transaction for the
// sender + calldata.
//
// BASE_RPC_URL is a REQUIRED backend secret (Alchemy / QuickNode / any Base
// mainnet JSON-RPC endpoint). It is read inside functions — never at module
// scope — and is never committed to the repository.

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const BASE_CHAIN_ID = 8453;

// Base mainnet USDC (native, Circle-issued).
// Pinned by fixture E1: `tx.to` of a captured settlement must equal this.
export const BASE_USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";

/** Conservative chunk size — provider `eth_getLogs` range limits vary. */
export const LOG_CHUNK_BLOCKS = 2000;

export const EVM_CURSOR_KEY = "evm_x402_cursor";

export interface EvmLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string; // hex
  transactionHash: string;
  logIndex: string;
}

export interface EvmTx {
  from: string;
  to: string;
  input: string;
  hash: string;
  blockNumber: number;
}

export class EvmRpcError extends Error {}

function rpcUrl(): string {
  const url = process.env.BASE_RPC_URL;
  if (!url) {
    throw new EvmRpcError("BASE_RPC_URL is not configured — the Base lane cannot scan without it.");
  }
  return url;
}

export function hasBaseRpc(): boolean {
  return Boolean(process.env.BASE_RPC_URL);
}

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(rpcUrl(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) {
    throw new EvmRpcError(`${method} → HTTP ${res.status}`);
  }
  const body = (await res.json()) as { result?: T; error?: { message: string } };
  if (body.error) throw new EvmRpcError(`${method} → ${body.error.message}`);
  return body.result as T;
}

const hex = (n: number): string => `0x${n.toString(16)}`;

export async function getBlockNumber(): Promise<number> {
  return parseInt(await rpc<string>("eth_blockNumber", []), 16);
}

/**
 * `eth_getLogs` with mandatory 2,000-block chunking. Returns logs in
 * ascending block order across all chunks.
 */
export async function getLogs(opts: {
  address: string;
  topics: (string | null)[];
  fromBlock: number;
  toBlock: number;
}): Promise<EvmLog[]> {
  const out: EvmLog[] = [];
  for (let from = opts.fromBlock; from <= opts.toBlock; from += LOG_CHUNK_BLOCKS) {
    const to = Math.min(from + LOG_CHUNK_BLOCKS - 1, opts.toBlock);
    const chunk = await rpc<EvmLog[]>("eth_getLogs", [
      {
        address: opts.address,
        topics: opts.topics,
        fromBlock: hex(from),
        toBlock: hex(to),
      },
    ]);
    out.push(...(chunk ?? []));
  }
  return out;
}

export async function getTransactionByHash(hash: string): Promise<EvmTx | null> {
  const tx = await rpc<{
    from: string;
    to: string | null;
    input: string;
    hash: string;
    blockNumber: string;
  } | null>("eth_getTransactionByHash", [hash]);
  if (!tx) return null;
  return {
    from: (tx.from ?? "").toLowerCase(),
    to: (tx.to ?? "").toLowerCase(),
    input: tx.input ?? "0x",
    hash: tx.hash,
    blockNumber: parseInt(tx.blockNumber ?? "0x0", 16),
  };
}

export async function getTransactionReceipt(hash: string): Promise<Record<string, unknown> | null> {
  return rpc<Record<string, unknown> | null>("eth_getTransactionReceipt", [hash]);
}

// Block timestamps are needed for occurredAt. One fetch per distinct block,
// cached for the lifetime of a run.
const blockTimeCache = new Map<number, string>();

export async function getBlockTimestamp(blockNumber: number): Promise<string> {
  const cached = blockTimeCache.get(blockNumber);
  if (cached) return cached;
  const block = await rpc<{ timestamp: string } | null>("eth_getBlockByNumber", [
    hex(blockNumber),
    false,
  ]);
  const iso = block?.timestamp
    ? new Date(parseInt(block.timestamp, 16) * 1000).toISOString()
    : new Date().toISOString();
  blockTimeCache.set(blockNumber, iso);
  return iso;
}

// ── Cursor persistence (indexer_state) ────────────────────────────────────

export async function readCursor(key = EVM_CURSOR_KEY): Promise<number | null> {
  const { data } = await supabaseAdmin
    .from("indexer_state")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (!data?.value) return null;
  const n = Number.parseInt(data.value, 10);
  return Number.isFinite(n) ? n : null;
}

export async function writeCursor(block: number, key = EVM_CURSOR_KEY): Promise<void> {
  await supabaseAdmin.from("indexer_state").upsert(
    { key, value: String(block), updated_at: new Date().toISOString() },
    {
      onConflict: "key",
    },
  );
}
