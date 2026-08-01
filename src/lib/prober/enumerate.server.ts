// Active Prober — service enumeration.
//
// SERVER ONLY.
//
// Three sources feed x402_service:
//   (a) Tier A settlement payees observed in agent_events        → address-only
//   (b) x402_executor candidates from the facilitator scans      → address-only
//   (c) manual admin insert / directory import                   → url
//
// (a) and (b) give us an address but no endpoint, so they enter at the
// `address-only` tier: we know somebody is being paid, we don't yet know
// where to knock. Only rows with a URL are probeable.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { payeeSlug, serviceSlug } from "./outcomes";

export interface SeedResult {
  fromSettlements: number;
  fromCandidates: number;
  skippedExisting: number;
  total: number;
}

interface PayeeSeed {
  payTo: string;
  chain: string;
  discoveredVia: string;
}

/**
 * Seed address-only services from what the passive lanes already saw.
 * Idempotent: existing pay_to rows are left untouched.
 */
export async function seedServicesFromLanes(): Promise<SeedResult> {
  const seeds = new Map<string, PayeeSeed>();

  // (a) Tier A x402 settlements recorded by the Solana + Base lanes.
  const { data: events } = await supabaseAdmin
    .from("agent_events")
    .select("mint, chain, raw")
    .eq("type", "X402_PAYMENT_RECEIVED")
    .order("occurred_at", { ascending: false })
    .limit(1000);

  let fromSettlements = 0;
  for (const ev of events ?? []) {
    const raw = (ev.raw ?? {}) as Record<string, unknown>;
    const payee =
      typeof raw["payee"] === "string"
        ? raw["payee"]
        : typeof raw["executor_wallet"] === "string"
          ? (raw["executor_wallet"] as string)
          : typeof ev.mint === "string"
            ? ev.mint
            : null;
    if (!payee) continue;
    const key = `${ev.chain}:${payee}`;
    if (!seeds.has(key)) {
      seeds.set(key, {
        payTo: payee,
        chain: ev.chain ?? "solana",
        discoveredVia: "settlement_lane",
      });
      fromSettlements += 1;
    }
  }

  // (b) x402 executor candidates discovered by the facilitator scans.
  const { data: candidates } = await supabaseAdmin
    .from("candidate_agents")
    .select("mint, chain, executor_wallet, discovered_via")
    .eq("category", "x402_executor")
    .limit(1000);

  let fromCandidates = 0;
  for (const c of candidates ?? []) {
    const payee = c.executor_wallet ?? c.mint;
    if (!payee) continue;
    const key = `${c.chain}:${payee}`;
    if (!seeds.has(key)) {
      seeds.set(key, {
        payTo: payee,
        chain: c.chain ?? "solana",
        discoveredVia: c.discovered_via ?? "facilitator_scan",
      });
      fromCandidates += 1;
    }
  }

  if (seeds.size === 0) {
    return { fromSettlements: 0, fromCandidates: 0, skippedExisting: 0, total: 0 };
  }

  const payees = Array.from(new Set(Array.from(seeds.values()).map((s) => s.payTo)));
  const { data: existing } = await supabaseAdmin
    .from("x402_service")
    .select("pay_to")
    .in("pay_to", payees);
  const known = new Set((existing ?? []).map((r) => r.pay_to));

  const fresh = Array.from(seeds.values()).filter((s) => !known.has(s.payTo));
  if (fresh.length > 0) {
    await supabaseAdmin.from("x402_service").insert(
      fresh.map((s) => ({
        pay_to: s.payTo,
        chain: s.chain,
        discovered_via: s.discoveredVia,
        probe_tier: "address-only",
        active: true,
        // Base slug only — the DB trigger freezes it and resolves
        // collisions with -2, -3, ... so permalinks stay unambiguous.
        slug: payeeSlug(s.payTo),
      })),
    );
  }


  return {
    fromSettlements,
    fromCandidates,
    skippedExisting: seeds.size - fresh.length,
    total: fresh.length,
  };
}

export interface ManualServiceInput {
  url: string;
  chain?: string;
  payTo?: string | null;
  facilitator?: string | null;
  discoveredVia?: string;
  probeTier?: string;
}

/**
 * Admin / directory-import insert path. If an address-only row already exists
 * for the same pay_to, it is upgraded in place rather than duplicated.
 */
export async function upsertServiceByUrl(
  input: ManualServiceInput,
): Promise<{ ok: boolean; id: string | null; slug: string; action: string; error?: string }> {
  let normalized: string;
  try {
    const u = new URL(input.url);
    if (u.protocol !== "https:" && u.protocol !== "http:") {
      return { ok: false, id: null, slug: "", action: "rejected", error: "unsupported protocol" };
    }
    u.hash = "";
    normalized = u.toString().replace(/\/$/, "");
  } catch {
    return { ok: false, id: null, slug: "", action: "rejected", error: "invalid url" };
  }

  const slug = serviceSlug(normalized);
  const chain = input.chain ?? "solana";

  const { data: byUrl } = await supabaseAdmin
    .from("x402_service")
    .select("id")
    .eq("url", normalized)
    .maybeSingle();

  if (byUrl) {
    await supabaseAdmin
      .from("x402_service")
      .update({
        slug,
        chain,
        pay_to: input.payTo ?? undefined,
        facilitator: input.facilitator ?? undefined,
        probe_tier: input.probeTier ?? "challenge",
        active: true,
      })
      .eq("id", byUrl.id);
    return { ok: true, id: byUrl.id, slug, action: "updated" };
  }

  // Upgrade an address-only row discovered by the passive lanes.
  if (input.payTo) {
    const { data: byPayee } = await supabaseAdmin
      .from("x402_service")
      .select("id, url")
      .eq("pay_to", input.payTo)
      .is("url", null)
      .maybeSingle();
    if (byPayee) {
      await supabaseAdmin
        .from("x402_service")
        .update({
          url: normalized,
          slug,
          chain,
          facilitator: input.facilitator ?? undefined,
          probe_tier: input.probeTier ?? "challenge",
          active: true,
        })
        .eq("id", byPayee.id);
      return { ok: true, id: byPayee.id, slug, action: "upgraded" };
    }
  }

  const { data: inserted, error } = await supabaseAdmin
    .from("x402_service")
    .insert({
      url: normalized,
      slug,
      chain,
      pay_to: input.payTo ?? null,
      facilitator: input.facilitator ?? null,
      discovered_via: input.discoveredVia ?? "manual_admin",
      probe_tier: input.probeTier ?? "challenge",
      active: true,
    })
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, id: null, slug, action: "failed", error: "insert failed" };
  return { ok: true, id: inserted?.id ?? null, slug, action: "inserted" };
}
