// Read-only helpers for the active-prober tables (x402_service, probe_run).
// Both are publicly readable; writes happen only via the service-role cron.
//
// Like live-data.ts, every helper swallows errors and returns empty defaults
// so SSR loaders never crash on a cold table.
//
// SCORING BOUNDARY: nothing here feeds scoring. Probe data is displayed only.

import { supabase } from "@/integrations/supabase/client";
import { serviceSlug } from "@/lib/prober/outcomes";

export interface X402ServiceRow {
  id: string;
  url: string | null;
  slug: string | null;
  chain: string;
  payTo: string | null;
  facilitator: string | null;
  probeTier: string;
  advertisedAmountUsd: number | null;
  advertisedAsset: string | null;
  discoveredVia: string;
  active: boolean;
  firstSeenAt: string;
  lastProbeAt: string | null;
  lastChallengeProbeAt: string | null;
  lastSettlementProbeAt: string | null;
}

export interface ProbeRunRow {
  id: string;
  serviceId: string;
  probeKind: string;
  chain: string;
  outcome: string;
  httpStatus: number | null;
  challengeValid: boolean | null;
  paidAmountUsd: number | null;
  txSignature: string | null;
  verifyMs: number | null;
  settleMs: number | null;
  delivered: boolean | null;
  proberWallet: string | null;
  notes: string | null;
  ranAt: string;
}

const SERVICE_COLS =
  "id, url, slug, chain, pay_to, facilitator, probe_tier, advertised_amount_usd, advertised_asset, discovered_via, active, first_seen_at, last_probe_at, last_challenge_probe_at, last_settlement_probe_at";

const RUN_COLS =
  "id, service_id, probe_kind, chain, outcome, http_status, challenge_valid, paid_amount_usd, tx_signature, verify_ms, settle_ms, delivered, prober_wallet, notes, ran_at";

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapService(r: any): X402ServiceRow {
  return {
    id: r.id,
    url: r.url ?? null,
    slug: r.slug ?? (r.url ? serviceSlug(r.url) : null),
    chain: r.chain ?? "solana",
    payTo: r.pay_to ?? null,
    facilitator: r.facilitator ?? null,
    probeTier: r.probe_tier ?? "address-only",
    advertisedAmountUsd:
      r.advertised_amount_usd == null ? null : Number(r.advertised_amount_usd),
    advertisedAsset: r.advertised_asset ?? null,
    discoveredVia: r.discovered_via ?? "unknown",
    active: Boolean(r.active),
    firstSeenAt: r.first_seen_at,
    lastProbeAt: r.last_probe_at ?? null,
    lastChallengeProbeAt: r.last_challenge_probe_at ?? null,
    lastSettlementProbeAt: r.last_settlement_probe_at ?? null,
  };
}

function mapRun(r: any): ProbeRunRow {
  return {
    id: r.id,
    serviceId: r.service_id,
    probeKind: r.probe_kind,
    chain: r.chain ?? "solana",
    outcome: r.outcome,
    httpStatus: r.http_status ?? null,
    challengeValid: r.challenge_valid ?? null,
    paidAmountUsd: r.paid_amount_usd == null ? null : Number(r.paid_amount_usd),
    txSignature: r.tx_signature ?? null,
    verifyMs: r.verify_ms ?? null,
    settleMs: r.settle_ms ?? null,
    delivered: r.delivered ?? null,
    proberWallet: r.prober_wallet ?? null,
    notes: r.notes ?? null,
    ranAt: r.ran_at,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function fetchServiceBySlug(
  slug: string,
): Promise<X402ServiceRow | null> {
  const { data } = await supabase
    .from("x402_service" as never)
    .select(SERVICE_COLS)
    .eq("slug", slug)
    .maybeSingle();
  return data ? mapService(data) : null;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

/** UUID permalink support: /service/:id resolves to the canonical slug. */
export async function fetchServiceById(
  id: string,
): Promise<X402ServiceRow | null> {
  const { data } = await supabase
    .from("x402_service" as never)
    .select(SERVICE_COLS)
    .eq("id", id)
    .maybeSingle();
  return data ? mapService(data) : null;
}


/** Dossier join: the service (if any) paid at this agent's wallet. */
export async function fetchServiceByPayee(
  payTo: string,
): Promise<X402ServiceRow | null> {
  const { data } = await supabase
    .from("x402_service" as never)
    .select(SERVICE_COLS)
    .eq("pay_to", payTo)
    .order("last_probe_at", { ascending: false, nullsFirst: false })
    .limit(1);
  const rows = (data ?? []) as unknown[];
  return rows.length > 0 ? mapService(rows[0]) : null;
}

export async function fetchProbeRuns(
  serviceId: string,
  limit = 100,
): Promise<ProbeRunRow[]> {
  const { data } = await supabase
    .from("probe_run" as never)
    .select(RUN_COLS)
    .eq("service_id", serviceId)
    .order("ran_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as unknown[]).map(mapRun);
}

export interface SettleRatePoint {
  day: string;
  attempts: number;
  settled: number;
  rate: number | null;
}

/**
 * 30-day daily settle-rate for a service: settled / paid attempts.
 * Days with no paid probe are `null` — an honest gap, not a zero.
 */
export function settleRateSeries(
  runs: ProbeRunRow[],
  days = 30,
): SettleRatePoint[] {
  const buckets = new Map<string, { attempts: number; settled: number }>();
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86_400_000);
    buckets.set(d.toISOString().slice(0, 10), { attempts: 0, settled: 0 });
  }

  for (const run of runs) {
    if (run.probeKind !== "settlement") continue;
    if (run.outcome === "over_cap" || run.outcome === "probe_error") continue;
    const day = run.ranAt.slice(0, 10);
    const bucket = buckets.get(day);
    if (!bucket) continue;
    bucket.attempts += 1;
    if (run.outcome === "settled") bucket.settled += 1;
  }

  return Array.from(buckets.entries()).map(([day, b]) => ({
    day,
    attempts: b.attempts,
    settled: b.settled,
    rate: b.attempts === 0 ? null : b.settled / b.attempts,
  }));
}

export interface ProberOverview {
  totalServices: number;
  probeableServices: number;
  addressOnlyServices: number;
  runs30d: number;
  outcomeCounts: Record<string, number>;
  spentTodayUsd: number;
  spentAllTimeUsd: number;
  paidProbes: number;
  lastProbeAt: string | null;
  configDrift30d: number;
}

const EMPTY_OVERVIEW: ProberOverview = {
  totalServices: 0,
  probeableServices: 0,
  addressOnlyServices: 0,
  runs30d: 0,
  outcomeCounts: {},
  spentTodayUsd: 0,
  spentAllTimeUsd: 0,
  paidProbes: 0,
  lastProbeAt: null,
  configDrift30d: 0,
};

export async function fetchProberOverview(): Promise<ProberOverview> {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const dayStart = new Date(
    Date.UTC(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth(),
      new Date().getUTCDate(),
    ),
  ).toISOString();

  const [servicesRes, runsRes] = await Promise.all([
    supabase.from("x402_service" as never).select("url, probe_tier, active"),
    supabase
      .from("probe_run" as never)
      .select("outcome, paid_amount_usd, ran_at, probe_kind")
      .gte("ran_at", since)
      .order("ran_at", { ascending: false })
      .limit(1000),
  ]);

  if (servicesRes.error && runsRes.error) return EMPTY_OVERVIEW;

  const services = (servicesRes.data ?? []) as unknown as Array<{
    url: string | null;
    probe_tier: string;
    active: boolean;
  }>;
  const runs = (runsRes.data ?? []) as unknown as Array<{
    outcome: string;
    paid_amount_usd: number | string | null;
    ran_at: string;
    probe_kind: string;
  }>;

  const outcomeCounts: Record<string, number> = {};
  let spentToday = 0;
  let spentAll = 0;
  let paidProbes = 0;

  for (const r of runs) {
    outcomeCounts[r.outcome] = (outcomeCounts[r.outcome] ?? 0) + 1;
    const amount = r.paid_amount_usd == null ? 0 : Number(r.paid_amount_usd);
    if (r.probe_kind === "settlement" && amount > 0) {
      paidProbes += 1;
      spentAll += amount;
      if (r.ran_at >= dayStart) spentToday += amount;
    }
  }

  return {
    totalServices: services.length,
    probeableServices: services.filter((s) => s.url != null && s.active).length,
    addressOnlyServices: services.filter((s) => s.url == null).length,
    runs30d: runs.length,
    outcomeCounts,
    spentTodayUsd: Math.round(spentToday * 1e6) / 1e6,
    spentAllTimeUsd: Math.round(spentAll * 1e6) / 1e6,
    paidProbes,
    lastProbeAt: runs[0]?.ran_at ?? null,
    configDrift30d: outcomeCounts["config_drift"] ?? 0,
  };
}
