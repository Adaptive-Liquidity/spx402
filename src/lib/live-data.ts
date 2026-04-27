// Read-only helpers for the live-data tables (agent_events, indexer_runs,
// changelog). These tables are publicly readable; writes happen only via
// service-role workers (webhook-ingest, scoring, reconciler).
//
// All helpers swallow errors and return safe empty defaults so SSR loaders
// and components never crash on a cold/empty DB.

import { supabase } from "@/integrations/supabase/client";
import type { Severity, EventType } from "@/lib/agents";

// ---------- agent_events ----------

export interface AgentEventRow {
  id: string;
  mint: string;
  type: EventType | string;
  severity: Severity | string;
  signature: string;
  slot: number | null;
  occurredAt: string; // ISO
  amountSol: number;
  amountToken: number;
  parserVersion: string;
}

const numOrZero = (v: number | string | null | undefined): number =>
  v == null ? 0 : typeof v === "number" ? v : Number(v);

export async function fetchAgentEvents(
  mint: string,
  limit = 50,
): Promise<AgentEventRow[]> {
  if (!mint) return [];
  const { data, error } = await supabase
    .from("agent_events")
    .select(
      "id, mint, type, severity, signature, slot, occurred_at, amount_sol, amount_token, parser_version",
    )
    .eq("mint", mint)
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id,
    mint: r.mint,
    type: r.type,
    severity: r.severity,
    signature: r.signature,
    slot: r.slot == null ? null : Number(r.slot),
    occurredAt: r.occurred_at,
    amountSol: numOrZero(r.amount_sol),
    amountToken: numOrZero(r.amount_token),
    parserVersion: r.parser_version,
  }));
}

export async function fetchRecentTickerEvents(limit = 20): Promise<
  Array<{ id: string; line: string; severity: string }>
> {
  const { data, error } = await supabase
    .from("agent_events")
    .select("id, mint, type, severity, amount_sol, occurred_at")
    .in("severity", ["success", "critical"])
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id,
    severity: r.severity,
    line: tickerLine(r.type, r.mint, numOrZero(r.amount_sol)),
  }));
}

// Leaderboard-flavored ticker lines (top earners) — woven in alongside event lines.
export async function fetchLeaderboardTickerLines(limit = 5): Promise<string[]> {
  const { data, error } = await supabase
    .from("agents")
    .select("symbol, grade, total_buyback_sol")
    .gt("total_buyback_sol", 0)
    .order("total_buyback_sol", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((r, i) => {
    const sol = numOrZero(r.total_buyback_sol);
    return `#${i + 1} EARNER · $${r.symbol} · ${sol.toFixed(2)} SOL bought back (${r.grade})`;
  });
}

function shortMint(m: string) {
  return m.length > 12 ? `${m.slice(0, 4)}…${m.slice(-4)}` : m;
}

function tickerLine(type: string, mint: string, sol: number): string {
  const m = shortMint(mint);
  switch (type) {
    case "BUYBACK_EXECUTED":
      return `BUYBACK · ${m} · ${sol.toFixed(2)} SOL`;
    case "BURN_CONFIRMED":
      return `BURN · ${m} · confirmed on-chain`;
    case "DEPOSIT_RECEIVED":
      return `DEPOSIT · ${m} · ${sol.toFixed(2)} SOL`;
    case "FAILED_WINDOW":
      return `FAILED WINDOW · ${m} · reconciler flagged`;
    case "CONFIG_CHANGED":
      return `CONFIG CHANGED · ${m}`;
    case "ANOMALY_DETECTED":
      return `ANOMALY · ${m} · review queued`;
    case "OPERATOR_VERIFIED":
      return `OPERATOR VERIFIED · ${m}`;
    default:
      return `${type} · ${m}`;
  }
}

// ---------- indexer_runs ----------

export interface IndexerRunRow {
  id: string;
  worker: string;
  ok: boolean;
  ranAt: string;
  durationMs: number;
  notes: string | null;
}

const KNOWN_WORKERS = [
  "webhook_ingest",
  "backfill",
  "scoring",
  "reconciler",
] as const;

export async function fetchLatestIndexerRuns(): Promise<
  Record<string, IndexerRunRow | null>
> {
  const out: Record<string, IndexerRunRow | null> = {};
  for (const w of KNOWN_WORKERS) out[w] = null;

  const { data, error } = await supabase
    .from("indexer_runs")
    .select("id, worker, ok, ran_at, duration_ms, notes")
    .order("ran_at", { ascending: false })
    .limit(200);
  if (error || !data) return out;

  for (const r of data) {
    if (out[r.worker] == null) {
      out[r.worker] = {
        id: r.id,
        worker: r.worker,
        ok: r.ok,
        ranAt: r.ran_at,
        durationMs: r.duration_ms,
        notes: r.notes,
      };
    }
  }
  return out;
}

export async function fetchIndexerStats24h(): Promise<{
  eventsProcessed: number;
  successEvents: number;
  criticalEvents: number;
  agentsIndexed: number;
}> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [{ count: total }, { count: success }, { count: critical }, agentsRes] =
    await Promise.all([
      supabase
        .from("agent_events")
        .select("id", { count: "exact", head: true })
        .gte("occurred_at", since),
      supabase
        .from("agent_events")
        .select("id", { count: "exact", head: true })
        .gte("occurred_at", since)
        .eq("severity", "success"),
      supabase
        .from("agent_events")
        .select("id", { count: "exact", head: true })
        .gte("occurred_at", since)
        .eq("severity", "critical"),
      supabase.from("agents").select("mint", { count: "exact", head: true }),
    ]);

  return {
    eventsProcessed: total ?? 0,
    successEvents: success ?? 0,
    criticalEvents: critical ?? 0,
    agentsIndexed: agentsRes.count ?? 0,
  };
}

// ---------- changelog ----------

export interface ChangelogEntry {
  id: string;
  version: string;
  releasedOn: string; // ISO date
  type: string;
  items: string[];
}

export async function fetchChangelog(): Promise<ChangelogEntry[]> {
  const { data, error } = await supabase
    .from("changelog")
    .select("id, version, released_on, type, items")
    .order("released_on", { ascending: false });
  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id,
    version: r.version,
    releasedOn: r.released_on,
    type: r.type,
    items: (r.items as string[]) ?? [],
  }));
}

export function formatReleaseDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function relativeFromNow(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const diff = Math.max(0, Date.now() - t);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
