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
    case "FAILED_BUYBACK_WINDOW":
      return `FAILED BUYBACK · ${m} · deposit unsettled`;
    case "PROMISED_BUYBACK_NOT_SETTLED":
      return `BUYBACK REVERTED · ${m}`;
    case "X402_PAYMENT_REVERTED":
      return `x402 REVERTED · ${m}`;
    case "X402_PAYMENT_RECEIVED":
      return `x402 PAID · ${m} · ${sol.toFixed(2)} SOL`;
    case "SWAP_EXECUTED":
      return `SWAP · ${m} · ${sol.toFixed(2)} SOL`;
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
  "failure_reconciler",
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

// ---------- tape (canonical evidence ledger) ----------
//
// The tape is the homepage Live Execution Tape and the /tape ledger view.
// Every row carries enough context to render a permalink + one-line summary
// without a follow-up fetch, which lets us stream new rows in via realtime.

export interface TapeRow {
  id: string;
  mint: string;
  type: string;
  severity: string;
  signature: string;
  occurredAt: string;
  amountSol: number;
  amountToken: number;
  parserVersion: string;
  agentSymbol: string | null;
  agentName: string | null;
  agentCategory: string | null;
}

interface AgentLite {
  symbol: string;
  name: string;
  category: string;
}

async function loadAgentLookup(
  mints: string[],
): Promise<Map<string, AgentLite>> {
  if (mints.length === 0) return new Map();
  const { data } = await supabase
    .from("agents")
    .select("mint, symbol, name, category")
    .in("mint", Array.from(new Set(mints)));
  const out = new Map<string, AgentLite>();
  for (const r of data ?? []) {
    out.set(r.mint, {
      symbol: r.symbol,
      name: r.name,
      category: r.category ?? "tokenized_buyback",
    });
  }
  return out;
}

interface FetchTapeOpts {
  limit?: number;
  category?: string | null;
  severity?: string | null;
  mint?: string | null;
}

export async function fetchTape(opts: FetchTapeOpts = {}): Promise<TapeRow[]> {
  const limit = opts.limit ?? 50;
  let query = supabase
    .from("agent_events")
    .select(
      "id, mint, type, severity, signature, occurred_at, amount_sol, amount_token, parser_version",
    )
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (opts.severity) query = query.eq("severity", opts.severity);
  if (opts.mint) query = query.eq("mint", opts.mint);
  const { data, error } = await query;
  if (error || !data) return [];

  const lookup = await loadAgentLookup(data.map((r) => r.mint));

  let rows: TapeRow[] = data.map((r) => {
    const a = lookup.get(r.mint) ?? null;
    return {
      id: r.id,
      mint: r.mint,
      type: r.type,
      severity: r.severity,
      signature: r.signature,
      occurredAt: r.occurred_at,
      amountSol: numOrZero(r.amount_sol),
      amountToken: numOrZero(r.amount_token),
      parserVersion: r.parser_version,
      agentSymbol: a?.symbol ?? null,
      agentName: a?.name ?? null,
      agentCategory: a?.category ?? null,
    };
  });

  if (opts.category) {
    rows = rows.filter((r) => r.agentCategory === opts.category);
  }
  return rows;
}

export async function fetchTapeEventWithRaw(eventId: string): Promise<
  | (TapeRow & { slot: number | null; raw: Record<string, unknown> })
  | null
> {
  const { data, error } = await supabase
    .from("agent_events")
    .select(
      "id, mint, type, severity, signature, slot, occurred_at, amount_sol, amount_token, parser_version, raw",
    )
    .eq("id", eventId)
    .maybeSingle();
  if (error || !data) return null;
  const lookup = await loadAgentLookup([data.mint]);
  const a = lookup.get(data.mint) ?? null;
  return {
    id: data.id,
    mint: data.mint,
    type: data.type,
    severity: data.severity,
    signature: data.signature,
    slot: data.slot == null ? null : Number(data.slot),
    occurredAt: data.occurred_at,
    amountSol: numOrZero(data.amount_sol),
    amountToken: numOrZero(data.amount_token),
    parserVersion: data.parser_version,
    agentSymbol: a?.symbol ?? null,
    agentName: a?.name ?? null,
    agentCategory: a?.category ?? null,
    raw: (data.raw as Record<string, unknown>) ?? {},
  };
}

// Per-decoder coverage for the /status indexer health surface.
// Returns recent observation count + timestamp for each (category, type)
// pair. Lets the status page distinguish "no failures" from "decoder is
// broken / dark category."
export async function fetchEventCoverage(): Promise<
  Array<{
    category: string;
    type: string;
    count: number;
    lastObservedAt: string | null;
  }>
> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [eventsRes, agentsRes] = await Promise.all([
    supabase
      .from("agent_events")
      .select("mint, type, occurred_at")
      .gte("occurred_at", since)
      .order("occurred_at", { ascending: false })
      .limit(1000),
    supabase.from("agents").select("mint, category"),
  ]);

  const cat = new Map<string, string>();
  for (const a of agentsRes.data ?? []) {
    cat.set(a.mint, a.category ?? "tokenized_buyback");
  }

  const seen = new Map<string, { count: number; last: string | null }>();
  for (const e of eventsRes.data ?? []) {
    const c = cat.get(e.mint) ?? "tokenized_buyback";
    const key = `${c}|${e.type}`;
    const cur = seen.get(key);
    if (!cur) {
      seen.set(key, { count: 1, last: e.occurred_at });
    } else {
      cur.count++;
      if (!cur.last || cur.last < e.occurred_at) cur.last = e.occurred_at;
    }
  }

  return Array.from(seen.entries()).map(([k, v]) => {
    const [category, type] = k.split("|");
    return {
      category,
      type,
      count: v.count,
      lastObservedAt: v.last,
    };
  });
}
