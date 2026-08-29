// Facilitator registry — the ground-truth source for x402 settlement detection.
// Server-only.
//
// An address becomes active ONLY when:
//   1. The operator publishes it (sourceUrl), AND
//   2. A captured settlement fixture exists proving detection (fixtureId).
// Static seed below; DB table `facilitators` (migration in this patch) can
// override/add rows without a redeploy. DB rows win on id conflict.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { HeliusEnhancedTx } from "./helius.server";

export type FacilitatorChain = "solana" | "base";

export interface Facilitator {
  id: string; // "cdp-solana", "payai-solana", ...
  name: string;
  chain: FacilitatorChain;
  address: string; // Solana: fee-payer wallet. EVM (future): tx sender.
  scheme: string; // "exact" today
  sourceUrl: string; // where the operator publishes this address
  fixtureId: string | null; // fixture proving detection — null until verified
  active: boolean;
}

// ── Static seed. INACTIVE until fixture-verified. Populate from official
// ── operator documentation only — never from memory or third-party lists.
export const FACILITATOR_SEED: Facilitator[] = [
  {
    id: "cdp-solana",
    name: "Coinbase CDP Facilitator (Solana)",
    chain: "solana",
    address: "", // POPULATE from https://docs.cdp.coinbase.com/x402 — verify with fixture
    scheme: "exact",
    sourceUrl: "https://docs.cdp.coinbase.com/x402",
    fixtureId: null, // set once a settlement fixture is captured
    active: false,
  },
  {
    id: "payai-solana",
    name: "PayAI Facilitator (Solana)",
    chain: "solana",
    // Published by PayAI as the Solana mainnet `extra.feePayer` in their x402
    // reference docs, and served live by the operator's own /supported
    // endpoint (https://facilitator.payai.network/supported →
    // network "solana" / "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp").
    // Independently corroborated by QuickNode's x402-rails guide.
    address: "2wKupLR9q6wXYppw8Gr2NvWxKBUqm4PPJKkQfoxHDBg4",
    scheme: "exact",
    sourceUrl: "https://docs.payai.network/x402/reference",
    fixtureId: "x402-facilitator-settlement-01",
    active: true,
  },

  // ── EVM lane (Base). Addresses are populated ONLY from each operator's
  // ── /supported endpoint or official docs, then fixture-verified before
  // ── active=true. Shipping address-less and inactive is the honest state.
  {
    id: "cdp-base",
    name: "Coinbase CDP Facilitator (Base)",
    chain: "base",
    address: "", // POPULATE from https://docs.cdp.coinbase.com/x402 + fixture E1
    scheme: "exact",
    sourceUrl: "https://docs.cdp.coinbase.com/x402",
    fixtureId: null,
    active: false,
  },
  {
    id: "payai-base",
    name: "PayAI Facilitator (Base)",
    chain: "base",
    address: "", // POPULATE from facilitator.payai.network/supported + fixture E1
    scheme: "exact",
    sourceUrl: "https://docs.payai.network/x402/reference",
    fixtureId: null,
    active: false,
  },
];

export const FACILITATOR_REGISTRY_VERSION = "v0.3.0";

// ── Runtime registry: static seed merged with DB overrides. Cached per
// ── isolate with a short TTL; cron routes re-fetch each invocation anyway.
let cache: { at: number; map: Map<string, Facilitator> } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function getActiveFacilitators(
  chain: FacilitatorChain = "solana",
): Promise<Map<string, Facilitator>> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return filterChain(cache.map, chain);
  }
  const map = new Map<string, Facilitator>();
  for (const f of FACILITATOR_SEED) {
    if (f.active && f.address) map.set(key(chainOf(f), f.address), f);
  }
  try {
    const { data } = await supabaseAdmin.from("facilitators").select("*").eq("active", true);
    for (const row of (data ?? []) as Array<Record<string, unknown>>) {
      map.set(key(String(row.chain), String(row.address)), {
        id: String(row.id),
        name: String(row.name),
        chain: String(row.chain) as FacilitatorChain,
        address: String(row.address),
        scheme: (row.scheme as string | null) ?? "exact",
        sourceUrl: (row.source_url as string | null) ?? "",
        fixtureId: (row.fixture_id as string | null) ?? null,
        active: true,
      });
    }
  } catch {
    // DB unreachable → static seed only. Never fail detection over registry I/O.
  }
  cache = { at: Date.now(), map };
  return filterChain(map, chain);
}

function key(chain: string, address: string): string {
  // EVM addresses are case-insensitive; Solana base58 is not.
  const addr = chain === "solana" ? address : address.toLowerCase();
  return `${chain}:${addr}`;
}
function chainOf(f: Facilitator): string {
  return f.chain;
}
function filterChain(
  map: Map<string, Facilitator>,
  chain: FacilitatorChain,
): Map<string, Facilitator> {
  const out = new Map<string, Facilitator>();
  for (const [k, v] of map) if (k.startsWith(`${chain}:`)) out.set(k, v);
  return out;
}

/** Synchronous hot-path check against a preloaded registry map. */
export function facilitatorForFeePayer(
  registry: Map<string, Facilitator>,
  feePayer: string | undefined,
): Facilitator | null {
  if (!feePayer) return null;
  return registry.get(`solana:${feePayer}`) ?? null;
}

/** Addresses the scanner should subscribe to / sweep. */
export function facilitatorAddressList(registry: Map<string, Facilitator>): string[] {
  return Array.from(registry.values()).map((f) => f.address);
}

/**
 * EVM equivalent of `facilitatorForFeePayer`: the settlement signer on EVM is
 * the transaction sender. Addresses are compared lowercase.
 */
export function facilitatorForSender(
  registry: Map<string, Facilitator>,
  txFrom: string | undefined,
): Facilitator | null {
  if (!txFrom) return null;
  return registry.get(`base:${txFrom.toLowerCase()}`) ?? null;
}

// Re-export for tests.
export type { HeliusEnhancedTx };
