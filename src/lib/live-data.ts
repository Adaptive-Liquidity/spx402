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
  // Tiered x402 detection provenance (parser v0.2.0+). Null for every event
  // detected without a registry facilitator in the fee-payer slot.
  facilitatorId: string | null;
  detectionMethod: string | null;
}


const numOrZero = (v: number | string | null | undefined): number =>
  v == null ? 0 : typeof v === "number" ? v : Number(v);

// Tiered-detection provenance lives in agent_events.raw (written by the x402
// decoder, parser v0.2.0+). Missing on every pre-v0.2.0 row — hence nullable.
export function facilitatorIdFromRaw(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const v = (raw as Record<string, unknown>)["facilitator_id"] ??
    (raw as Record<string, unknown>)["facilitatorId"];
  return typeof v === "string" && v.length > 0 ? v : null;
}

export function detectionMethodFromRaw(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const v = (raw as Record<string, unknown>)["detection_method"] ??
    (raw as Record<string, unknown>)["detectionMethod"];
  return typeof v === "string" && v.length > 0 ? v : null;
}

export async function fetchAgentEvents(
  mint: string,
  limit = 50,
): Promise<AgentEventRow[]> {
  if (!mint) return [];
  const { data, error } = await supabase
    .from("agent_events")
    .select(
      "id, mint, type, severity, signature, slot, occurred_at, amount_sol, amount_token, parser_version, raw",
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
    facilitatorId: facilitatorIdFromRaw(r.raw),
    detectionMethod: detectionMethodFromRaw(r.raw),
  }));
}


export async function fetchRecentTickerEvents(limit = 20): Promise<
  Array<{ id: string; line: string; severity: string }>
> {
  const { data, error } = await supabase
    .from("agent_events")
    .select("id, mint, type, severity, amount_sol, amount_token, chain, raw, occurred_at")
    .in("severity", ["success", "critical", "warn"])
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data
    .filter((r) => {
      // Only high-confidence x402 settlements reach the tape. A memo-marker
      // match is evidence, but not the kind we broadcast.
      if (r.type !== "X402_PAYMENT_RECEIVED") return true;
      return detectionMethodFromRaw(r.raw) === "facilitator_fee_payer";
    })
    .map((r) => ({
      id: r.id,
      severity: r.severity,
      line: tickerLine({
        type: r.type,
        mint: r.mint,
        sol: numOrZero(r.amount_sol),
        token: numOrZero(r.amount_token),
        chain: r.chain ?? "solana",
        facilitatorId: facilitatorIdFromRaw(r.raw),
      }),
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
  "score_snapshot",
  "x402_scan",
  "evm_x402_scan",
  "prober",
] as const;


export async function fetchLatestIndexerRuns(): Promise<
  Record<string, IndexerRunRow | null>
> {
  const out: Record<string, IndexerRunRow | null> = {};
  for (const w of KNOWN_WORKERS) out[w] = null;

  // Reads the sanitized view — internal `notes` are server-only.
  const { data, error } = await supabase
    .from("indexer_runs_public" as never)
    .select("id, worker, ok, ran_at, duration_ms")
    .order("ran_at", { ascending: false })
    .limit(200);
  if (error || !data) return out;

  for (const r of data as unknown as Array<{
    id: string;
    worker: string;
    ok: boolean;
    ran_at: string;
    duration_ms: number;
  }>) {
    if (out[r.worker] == null) {
      out[r.worker] = {
        id: r.id,
        worker: r.worker,
        ok: r.ok,
        ranAt: r.ran_at,
        durationMs: r.duration_ms,
        notes: null,
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

// ---------- Wave 3: score snapshots, movers, pulse ----------

export interface ScoreMover {
  mint: string;
  symbol: string;
  name: string;
  category: string;
  grade: string;
  currentScore: number | null;
  previousScore: number | null;
  scoreDelta: number;
  currentConfidence: number;
  previousConfidence: number;
  confidenceDelta: number;
  takenAt: string;
}

interface SnapshotRow {
  mint: string;
  score: number | null;
  confidence_score: number | string | null;
  grade: string | null;
  taken_at: string;
}

// Movers (24h) — for each agent, compare the most recent snapshot at least
// `windowHours` old to the current agents row. Returns agents with non-zero
// score delta sorted by absolute delta.
export async function fetchScoreMovers(
  windowHours = 24,
  limit = 25,
): Promise<ScoreMover[]> {
  const cutoff = new Date(
    Date.now() - windowHours * 60 * 60 * 1000,
  ).toISOString();

  // Pull the newest snapshot per mint that is older than `cutoff`.
  // We fetch a generous window so the per-mint reduction below sees enough rows.
  const since = new Date(
    Date.now() - (windowHours + 96) * 60 * 60 * 1000,
  ).toISOString();
  const { data: snaps } = await supabase
    .from("agent_score_snapshots")
    .select("mint, score, confidence_score, grade, taken_at")
    .lte("taken_at", cutoff)
    .gte("taken_at", since)
    .order("taken_at", { ascending: false })
    .limit(2000);

  const baseline = new Map<string, SnapshotRow>();
  for (const s of (snaps ?? []) as SnapshotRow[]) {
    if (!baseline.has(s.mint)) baseline.set(s.mint, s);
  }
  if (baseline.size === 0) return [];

  const mints = Array.from(baseline.keys());
  const { data: agentRows } = await supabase
    .from("agents")
    .select(
      "mint, symbol, name, category, grade, score, confidence_score",
    )
    .in("mint", mints);
  if (!agentRows) return [];

  const movers: ScoreMover[] = [];
  for (const a of agentRows) {
    const base = baseline.get(a.mint);
    if (!base) continue;
    const cur = a.score == null ? null : Number(a.score);
    const prev = base.score == null ? null : Number(base.score);
    if (cur == null || prev == null) continue;
    const delta = cur - prev;
    const curConf = numOrZero(a.confidence_score);
    const prevConf = numOrZero(base.confidence_score);
    if (delta === 0 && Math.abs(curConf - prevConf) < 0.02) continue;
    movers.push({
      mint: a.mint,
      symbol: a.symbol,
      name: a.name,
      category: a.category ?? "tokenized_buyback",
      grade: a.grade ?? "—",
      currentScore: cur,
      previousScore: prev,
      scoreDelta: delta,
      currentConfidence: curConf,
      previousConfidence: prevConf,
      confidenceDelta: curConf - prevConf,
      takenAt: base.taken_at,
    });
  }

  movers.sort((a, b) => Math.abs(b.scoreDelta) - Math.abs(a.scoreDelta));
  return movers.slice(0, limit);
}

export interface PulseEntry {
  id: string;
  kind: "score_delta" | "failure_event" | "verified_event";
  occurredAt: string;
  mint: string;
  symbol: string | null;
  name: string | null;
  category: string | null;
  // For deltas
  scoreDelta?: number;
  fromScore?: number | null;
  toScore?: number | null;
  fromGrade?: string | null;
  toGrade?: string | null;
  // For events
  eventType?: string;
  severity?: string;
  signature?: string;
  amountSol?: number;
}

// /pulse feed — chronological merge of (a) the most recent score-delta
// transitions per agent, and (b) recent failure / critical events. The two
// streams are interleaved by occurredAt so the page reads as a live timeline.
export async function fetchPulseFeed(limit = 60): Promise<PulseEntry[]> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Recent failure / warning / critical events (negative-event taxonomy
  // from Wave 1b plus generic critical severity).
  const NEGATIVE_TYPES = [
    "FAILED_BUYBACK_WINDOW",
    "PROMISED_BUYBACK_NOT_SETTLED",
    "X402_PAYMENT_REVERTED",
    "WINDOW_MISSED",
    "FAILED_WINDOW",
    "ANOMALY_DETECTED",
  ];
  const [failureRes, criticalRes] = await Promise.all([
    supabase
      .from("agent_events")
      .select("id, mint, type, severity, signature, occurred_at, amount_sol")
      .in("type", NEGATIVE_TYPES)
      .gte("occurred_at", since)
      .order("occurred_at", { ascending: false })
      .limit(limit),
    supabase
      .from("agent_events")
      .select("id, mint, type, severity, signature, occurred_at, amount_sol")
      .eq("severity", "critical")
      .gte("occurred_at", since)
      .order("occurred_at", { ascending: false })
      .limit(limit),
  ]);

  // Score-delta entries — derive from snapshot history (per-mint pair the two
  // most recent snapshots and emit a delta entry if score changed).
  const { data: snapRows } = await supabase
    .from("agent_score_snapshots")
    .select("id, mint, score, grade, taken_at")
    .gte("taken_at", since)
    .order("taken_at", { ascending: false })
    .limit(2000);

  const grouped = new Map<
    string,
    Array<{ id: string; score: number | null; grade: string | null; taken_at: string }>
  >();
  for (const r of snapRows ?? []) {
    const arr = grouped.get(r.mint) ?? [];
    arr.push({ id: r.id, score: r.score, grade: r.grade, taken_at: r.taken_at });
    grouped.set(r.mint, arr);
  }

  // All mints we'll need to look up
  const mintSet = new Set<string>();
  for (const r of failureRes.data ?? []) mintSet.add(r.mint);
  for (const r of criticalRes.data ?? []) mintSet.add(r.mint);
  for (const m of grouped.keys()) mintSet.add(m);
  const lookup = await loadAgentLookup(Array.from(mintSet));

  const entries: PulseEntry[] = [];

  // Failure events
  const seenIds = new Set<string>();
  const pushEvent = (
    r: {
      id: string;
      mint: string;
      type: string;
      severity: string;
      signature: string;
      occurred_at: string;
      amount_sol: number | string | null;
    },
    kind: "failure_event" | "verified_event",
  ) => {
    if (seenIds.has(r.id)) return;
    seenIds.add(r.id);
    const a = lookup.get(r.mint) ?? null;
    entries.push({
      id: `evt:${r.id}`,
      kind,
      occurredAt: r.occurred_at,
      mint: r.mint,
      symbol: a?.symbol ?? null,
      name: a?.name ?? null,
      category: a?.category ?? null,
      eventType: r.type,
      severity: r.severity,
      signature: r.signature,
      amountSol: numOrZero(r.amount_sol),
    });
  };
  for (const r of failureRes.data ?? []) pushEvent(r, "failure_event");
  for (const r of criticalRes.data ?? []) pushEvent(r, "verified_event");

  // Score deltas — emit one entry per consecutive snapshot pair where score moved.
  for (const [mint, arr] of grouped) {
    // arr is desc by taken_at; we want pairs (newer, older).
    for (let i = 0; i < arr.length - 1; i++) {
      const newer = arr[i];
      const older = arr[i + 1];
      if (newer.score == null || older.score == null) continue;
      const delta = Number(newer.score) - Number(older.score);
      if (delta === 0) continue;
      const a = lookup.get(mint) ?? null;
      entries.push({
        id: `snap:${newer.id}`,
        kind: "score_delta",
        occurredAt: newer.taken_at,
        mint,
        symbol: a?.symbol ?? null,
        name: a?.name ?? null,
        category: a?.category ?? null,
        scoreDelta: delta,
        fromScore: Number(older.score),
        toScore: Number(newer.score),
        fromGrade: older.grade,
        toGrade: newer.grade,
      });
    }
  }

  entries.sort(
    (a, b) =>
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );
  return entries.slice(0, limit);
}

// ---------- Wave 3: operator profiles ----------

export interface OperatorAgentSummary {
  mint: string;
  symbol: string;
  name: string;
  category: string;
  grade: string;
  score: number | null;
  confidenceScore: number;
  totalBuybackSol: number;
  totalBuybacksCount: number;
  failedWindows: number;
  flagged: boolean;
  lastIndexedSeconds: number;
}

export interface OperatorProfile {
  wallet: string;
  agents: OperatorAgentSummary[];
  aggregate: {
    agentCount: number;
    totalBuybackSol: number;
    totalEvents: number;
    failureEvents: number;
    successEvents: number;
    avgScore: number | null;
    avgConfidence: number;
    bestGrade: string | null;
    worstGrade: string | null;
    flaggedCount: number;
  };
  recentEvents: AgentEventRow[];
}

const GRADE_RANK: Record<string, number> = {
  "SPX A+": 9,
  "SPX A": 8,
  "SPX AA": 7,
  "SPX BB": 6,
  "SPX B": 5,
  "SPX C": 4,
  "SPX D": 3,
  "SPX 404": 1,
};

export async function fetchOperatorProfile(
  wallet: string,
): Promise<OperatorProfile | null> {
  if (!wallet) return null;

  // Find agents owned/operated by this wallet. Match either the
  // operator_wallet column or the executor_wallet column (both observed
  // in the agents schema).
  const { data: agents, error: agentsErr } = await supabase
    .from("agents")
    .select(
      "mint, symbol, name, category, grade, score, confidence_score, total_buyback_sol, total_buybacks_count, failed_windows, flagged, last_indexed_seconds",
    )
    .or(
      `operator_wallet.eq.${wallet},executor_wallet.eq.${wallet}`,
    );
  if (agentsErr || !agents || agents.length === 0) return null;

  const agentSummaries: OperatorAgentSummary[] = agents.map((a) => ({
    mint: a.mint,
    symbol: a.symbol,
    name: a.name,
    category: a.category ?? "tokenized_buyback",
    grade: a.grade ?? "—",
    score: a.score == null ? null : Number(a.score),
    confidenceScore: numOrZero(a.confidence_score),
    totalBuybackSol: numOrZero(a.total_buyback_sol),
    totalBuybacksCount: a.total_buybacks_count ?? 0,
    failedWindows: a.failed_windows ?? 0,
    flagged: Boolean(a.flagged),
    lastIndexedSeconds: a.last_indexed_seconds ?? 0,
  }));

  // Aggregate stats across all operated agents.
  const mints = agentSummaries.map((a) => a.mint);
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: eventRows } = await supabase
    .from("agent_events")
    .select(
      "id, mint, type, severity, signature, slot, occurred_at, amount_sol, amount_token, parser_version, raw",
    )
    .in("mint", mints)
    .gte("occurred_at", since)
    .order("occurred_at", { ascending: false })
    .limit(200);

  const events = (eventRows ?? []).map((r) => ({
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
    facilitatorId: facilitatorIdFromRaw(r.raw),
    detectionMethod: detectionMethodFromRaw(r.raw),

  }));

  let failureEvents = 0;
  let successEvents = 0;
  for (const e of events) {
    if (e.severity === "critical" || e.severity === "warning") failureEvents++;
    else if (e.severity === "success") successEvents++;
  }

  const scoredAgents = agentSummaries.filter((a) => a.score != null);
  const avgScore =
    scoredAgents.length === 0
      ? null
      : Math.round(
          scoredAgents.reduce((acc, a) => acc + (a.score ?? 0), 0) /
            scoredAgents.length,
        );
  const avgConfidence =
    agentSummaries.length === 0
      ? 0
      : agentSummaries.reduce((acc, a) => acc + a.confidenceScore, 0) /
        agentSummaries.length;

  const grades = agentSummaries
    .map((a) => a.grade)
    .filter((g) => GRADE_RANK[g] != null);
  let bestGrade: string | null = null;
  let worstGrade: string | null = null;
  if (grades.length > 0) {
    bestGrade = grades.reduce((a, b) =>
      GRADE_RANK[a] >= GRADE_RANK[b] ? a : b,
    );
    worstGrade = grades.reduce((a, b) =>
      GRADE_RANK[a] <= GRADE_RANK[b] ? a : b,
    );
  }

  return {
    wallet,
    agents: agentSummaries,
    aggregate: {
      agentCount: agentSummaries.length,
      totalBuybackSol: agentSummaries.reduce(
        (acc, a) => acc + a.totalBuybackSol,
        0,
      ),
      totalEvents: events.length,
      failureEvents,
      successEvents,
      avgScore,
      avgConfidence,
      bestGrade,
      worstGrade,
      flaggedCount: agentSummaries.filter((a) => a.flagged).length,
    },
    recentEvents: events.slice(0, 30),
  };
}

// Discover the set of distinct operator wallets — drives an index page if needed.
export async function fetchOperatorWallets(limit = 100): Promise<
  Array<{ wallet: string; agentCount: number }>
> {
  const { data } = await supabase
    .from("agents")
    .select("operator_wallet, executor_wallet");
  const counts = new Map<string, number>();
  for (const r of data ?? []) {
    const w = r.operator_wallet || r.executor_wallet;
    if (!w) continue;
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([wallet, agentCount]) => ({ wallet, agentCount }))
    .sort((a, b) => b.agentCount - a.agentCount)
    .slice(0, limit);
}

// ─────────────────────────────────────────────────────────────────────
// Facilitator registry (x402 tiered detection). Publicly readable so the
// /status and /methodology surfaces can state exactly which settlement
// fee-payers SPX402 recognises today — and prove it when the list is empty.
// ─────────────────────────────────────────────────────────────────────
export interface FacilitatorRow {
  id: string;
  name: string;
  chain: string;
  address: string;
  sourceUrl: string | null;
  fixtureId: string | null;
  active: boolean;
}

export async function fetchFacilitators(): Promise<FacilitatorRow[]> {
  const { data, error } = await supabase
    .from("facilitators")
    .select("id, name, chain, address, source_url, fixture_id, active")
    .order("chain", { ascending: true })
    .order("id", { ascending: true });
  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id,
    name: r.name,
    chain: r.chain,
    address: r.address,
    sourceUrl: r.source_url,
    fixtureId: r.fixture_id,
    active: r.active,
  }));
}
