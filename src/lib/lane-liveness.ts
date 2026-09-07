// Lane liveness — the honest answer to "is this observer actually observing?"
//
// A cron that runs on time and finds nothing is NOT operational. Every lane
// declares a cadence and a *productive source*: the table a real result lands
// in. Liveness is read from that source, never from the heartbeat alone.
//
//   OBSERVING  heartbeat on cadence AND a real result inside the window
//   QUIET      heartbeat on cadence, has produced before, nothing lately
//   STALLED    no heartbeat / late heartbeat / failed run / never produced
//
// Reads only public tables and sanitized views through the anon client.

import { supabase } from "@/integrations/supabase/client";

export type LaneState = "OBSERVING" | "QUIET" | "STALLED";

export interface LaneStatus {
  key: string;
  /** Declared cron cadence, in minutes. */
  cadenceMin: number;
  /** What "a real result" means for this lane. */
  source: string;
  lastRunAt: string | null;
  lastRunOk: boolean;
  /** Last time the productive source actually gained a row. */
  lastResultAt: string | null;
  state: LaneState;
  /** One line, plain, safe to print verbatim on the status page. */
  reason: string;
}

interface LaneSpec {
  key: string;
  cadenceMin: number;
  /** How long a productive lane may go without a result before it reads QUIET. */
  quietAfterHours: number;
  source: string;
}

export const LANE_SPECS: LaneSpec[] = [
  {
    key: "webhook_ingest",
    cadenceMin: 5,
    quietAfterHours: 24,
    source: "agent_events (Solana)",
  },
  { key: "backfill", cadenceMin: 30, quietAfterHours: 24, source: "agent_events (Solana)" },
  { key: "scoring", cadenceMin: 5, quietAfterHours: 6, source: "agents.scored_at" },
  {
    key: "reconciler",
    cadenceMin: 10,
    quietAfterHours: 72,
    source: "agent_events (failed windows)",
  },
  {
    key: "failure_reconciler",
    cadenceMin: 10,
    quietAfterHours: 72,
    source: "agent_events (failed windows)",
  },
  {
    key: "score_snapshot",
    cadenceMin: 1440,
    quietAfterHours: 48,
    source: "agent_score_snapshots",
  },
  { key: "x402_scan", cadenceMin: 15, quietAfterHours: 24, source: "agent_events (x402, Solana)" },
  { key: "evm_x402_scan", cadenceMin: 15, quietAfterHours: 24, source: "agent_events (Base)" },
  {
    key: "registry_scan",
    cadenceMin: 60,
    quietAfterHours: 72,
    source: "candidate_agents (registry)",
  },
  {
    key: "registered_agent_diff",
    cadenceMin: 60,
    quietAfterHours: 72,
    source: "agent_events (config / operator changes)",
  },
  { key: "directory_import", cadenceMin: 360, quietAfterHours: 72, source: "x402_service" },
  { key: "prober", cadenceMin: 15, quietAfterHours: 24, source: "probe_run" },
];

const MIN = 60_000;
const HOUR = 3_600_000;

// Table names vary per lane, so the generated row types do not apply. This is
// the minimal shape of the PostgREST builder we actually use.
interface AnyQuery {
  eq(column: string, value: unknown): AnyQuery;
  in(column: string, values: unknown[]): AnyQuery;
  order(column: string, opts: { ascending: boolean }): AnyQuery;
  limit(n: number): PromiseLike<{ data: unknown[] | null; error: unknown }>;
}

type LaneFilter = { column: string; values: string[] } | { column: string; value: string };

async function maxTimestamp(
  table: string,
  column: string,
  filter?: LaneFilter,
): Promise<string | null> {
  let q = supabase.from(table as never).select(column as never) as unknown as AnyQuery;
  if (filter && "values" in filter) q = q.in(filter.column, filter.values);
  else if (filter) q = q.eq(filter.column, filter.value);
  const { data, error } = await q.order(column, { ascending: false }).limit(1);
  if (error || !data || data.length === 0) return null;
  const row = data[0] as Record<string, unknown>;
  const value = row[column];
  return typeof value === "string" ? value : null;
}

export interface LaneHeartbeat {
  ranAt: string;
  ok: boolean;
}

/**
 * Resolve every lane's state. `heartbeats` comes from the sanitized
 * indexer_runs view so this function does no privileged reads.
 */
export async function fetchLaneLiveness(
  heartbeats: Record<string, LaneHeartbeat | null>,
): Promise<LaneStatus[]> {
  const [
    solanaEvent,
    baseEvent,
    x402Event,
    failureEvent,
    configEvent,
    scoredAt,
    snapshotAt,
    probeAt,
    serviceAt,
    candidateAt,
  ] = await Promise.all([
    maxTimestamp("agent_events", "occurred_at", (q) => q.eq("chain", "solana")),
    maxTimestamp("agent_events", "occurred_at", (q) => q.eq("chain", "base")),
    maxTimestamp("agent_events", "occurred_at", (q) =>
      q.in("type", ["X402_SETTLEMENT", "X402_PAYMENT", "X402_SETTLED"]),
    ),
    maxTimestamp("agent_events", "occurred_at", (q) =>
      q.in("type", ["FAILED_BUYBACK_WINDOW", "OC_FAILED", "OC_SLASHED"]),
    ),
    maxTimestamp("agent_events", "occurred_at", (q) =>
      q.in("type", ["CONFIG_CHANGED", "OPERATOR_CHANGED"]),
    ),
    maxTimestamp("agents", "scored_at"),
    maxTimestamp("agent_score_snapshots", "taken_at"),
    maxTimestamp("probe_run", "ran_at"),
    maxTimestamp("x402_service", "first_seen_at"),
    maxTimestamp("candidate_agents_public", "created_at"),
  ]);

  const resultFor: Record<string, string | null> = {
    webhook_ingest: solanaEvent,
    backfill: solanaEvent,
    scoring: scoredAt,
    reconciler: failureEvent,
    failure_reconciler: failureEvent,
    score_snapshot: snapshotAt,
    x402_scan: x402Event,
    evm_x402_scan: baseEvent,
    registry_scan: candidateAt,
    registered_agent_diff: configEvent,
    directory_import: serviceAt,
    prober: probeAt,
  };

  const now = Date.now();
  return LANE_SPECS.map((spec) => {
    const hb = heartbeats[spec.key] ?? null;
    const lastResultAt = resultFor[spec.key] ?? null;
    const base: LaneStatus = {
      key: spec.key,
      cadenceMin: spec.cadenceMin,
      source: spec.source,
      lastRunAt: hb?.ranAt ?? null,
      lastRunOk: hb?.ok ?? false,
      lastResultAt,
      state: "STALLED",
      reason: "",
    };

    if (!hb) {
      return { ...base, reason: "no heartbeat recorded — lane has never reported in" };
    }
    if (!hb.ok) {
      return { ...base, reason: "last run failed" };
    }
    const runAge = now - Date.parse(hb.ranAt);
    if (runAge > spec.cadenceMin * 3 * MIN) {
      return {
        ...base,
        reason: `heartbeat is late — expected every ${spec.cadenceMin} min`,
      };
    }
    if (!lastResultAt) {
      return {
        ...base,
        reason: `running on cadence but ${spec.source} has never received a row`,
      };
    }
    const resultAge = now - Date.parse(lastResultAt);
    if (resultAge > spec.quietAfterHours * HOUR) {
      return {
        ...base,
        state: "QUIET",
        reason: `running on cadence; nothing new in ${spec.source} for over ${spec.quietAfterHours}h`,
      };
    }
    return { ...base, state: "OBSERVING", reason: `${spec.source} is receiving rows` };
  });
}

export function laneTone(state: LaneState): "verified" | "amber" | "critical" {
  return state === "OBSERVING" ? "verified" : state === "QUIET" ? "amber" : "critical";
}
