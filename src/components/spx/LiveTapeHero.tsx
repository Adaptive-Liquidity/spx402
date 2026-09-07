// Wave 1a — Live Execution Tape (homepage hero).
//
// Replaces the static boot-sequence hero with a streaming canonical
// evidence ledger. Subscribes to agent_events via Supabase Realtime so
// new rows appear without a refresh. Every row links to its permalink
// at /tape/$eventId — that permalink is the contract that makes a grade
// explainable from the tape.

import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { fetchTape, relativeFromNow, type TapeRow } from "@/lib/live-data";
import { categoryLabel } from "@/lib/agents/categories";

const ROW_STEPS = [5, 15, 25, 50, 100] as const;
const POLL_MS = 30_000;

const SEVERITIES = ["all", "success", "warn", "critical", "info"] as const;
const SORTS = ["newest", "oldest", "largest"] as const;
type SortKey = (typeof SORTS)[number];

const SORT_LABEL: Record<SortKey, string> = {
  newest: "Newest",
  oldest: "Oldest",
  largest: "Largest SOL",
};

function severityTone(sev: string): string {
  if (sev === "success") return "text-verified";
  if (sev === "critical") return "text-critical";
  if (sev === "warn") return "text-amber";
  return "text-paper-muted";
}

function severityDot(sev: string): string {
  if (sev === "success") return "bg-verified";
  if (sev === "critical") return "bg-critical";
  if (sev === "warn") return "bg-amber pulse-amber";
  return "bg-wire";
}

function shortSig(s: string): string {
  return s.length > 12 ? `${s.slice(0, 4)}…${s.slice(-4)}` : s;
}

function label(row: TapeRow): string {
  const subject = row.agentSymbol ? `$${row.agentSymbol}` : shortSig(row.mint);
  switch (row.type) {
    case "BUYBACK_EXECUTED":
      return `BUYBACK · ${subject}`;
    case "BURN_CONFIRMED":
      return `BURN · ${subject}`;
    case "DEPOSIT_RECEIVED":
      return `DEPOSIT · ${subject}`;
    case "X402_PAYMENT_RECEIVED":
      return `x402 PAID · ${subject}`;
    case "SWAP_EXECUTED":
      return `SWAP · ${subject}`;
    case "FAILED_BUYBACK_WINDOW":
      return `FAILED BUYBACK · ${subject} · deposit unsettled`;
    case "PROMISED_BUYBACK_NOT_SETTLED":
      return `BUYBACK REVERTED · ${subject}`;
    case "X402_PAYMENT_REVERTED":
      return `x402 REVERTED · ${subject}`;
    case "FAILED_WINDOW":
      return `FAILED WINDOW · ${subject}`;
    case "ANOMALY_DETECTED":
      return `ANOMALY · ${subject}`;
    case "OPERATOR_VERIFIED":
      return `OPERATOR VERIFIED · ${subject}`;
    case "CONFIG_CHANGED":
      return `CONFIG CHANGED · ${subject}`;
    default:
      return `${row.type} · ${subject}`;
  }
}

export function LiveTapeHero({ initialRows }: { initialRows: TapeRow[] }) {
  const [rows, setRows] = useState<TapeRow[]>(initialRows);
  const [fresh, setFresh] = useState<string[]>([]);
  const [stamp, setStamp] = useState<string | null>(null);
  const [count, setCount] = useState<number>(ROW_STEPS[0]);
  const [severity, setSeverity] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [eventType, setEventType] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [loading, setLoading] = useState(false);
  const seen = useRef(new Set(initialRows.map((r) => r.id)));
  const fetchLimit = useRef(initialRows.length);

  async function refresh(limit = fetchLimit.current) {
    const next = await fetchTape({ limit });
    if (next.length > 0) {
      const incoming = next.filter((r) => !seen.current.has(r.id)).map((r) => r.id);
      next.forEach((r) => seen.current.add(r.id));
      setRows(next);
      setStamp(new Date().toISOString().slice(11, 19));
      if (incoming.length > 0) {
        setFresh(incoming);
        setTimeout(() => setFresh([]), 400);
      }
    }
  }

  // Refresh from server as a safety net (in case the realtime subscription is
  // dropped or the user is on a stale tab).
  useEffect(() => {
    const t = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(t);
  }, []);

  // Realtime subscription. New rows arrive as a refreshed window.
  useEffect(() => {
    const channel = supabase
      .channel("live-tape")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "agent_events" },
        async (payload) => {
          // The realtime payload doesn't include the joined agent label, so
          // we re-fetch the freshest window. Cheap because of the
          // (occurred_at desc) index from the migration.
          await refresh();
          void payload;
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  function cycleCount() {
    const next =
      ROW_STEPS[(ROW_STEPS.indexOf(count as (typeof ROW_STEPS)[number]) + 1) % ROW_STEPS.length];
    setCount(next);
    // Only hit the server when the new window is deeper than what we hold.
    if (next > rows.length) {
      fetchLimit.current = Math.max(next, fetchLimit.current);
      setLoading(true);
      void refresh().finally(() => setLoading(false));
    }
  }

  // Filter/sort client-side over the held window so controls are instant.
  const filtered = rows
    .filter((r) => severity === "all" || r.severity === severity)
    .filter((r) => category === "all" || r.agentCategory === category)
    .filter((r) => eventType === "all" || r.type === eventType)
    .sort((a, b) => {
      if (sort === "oldest") return a.occurredAt.localeCompare(b.occurredAt);
      if (sort === "largest") return b.amountSol - a.amountSol;
      return b.occurredAt.localeCompare(a.occurredAt);
    });
  const visible = filtered.slice(0, count);

  const categories = Array.from(
    new Set(rows.map((r) => r.agentCategory).filter(Boolean)),
  ) as string[];
  const types = Array.from(new Set(rows.map((r) => r.type)));

  const selectCls =
    "bg-panel-deep border border-bronze/50 px-2 py-1 text-[10px] uppercase tracking-widest text-paper-muted focus:outline-none focus:border-amber";

  return (
    <div className="panel-engraved relative overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-bronze/50 bg-panel-deep/60 px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest">
        <div className="flex min-w-0 items-center gap-2 text-amber">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-verified pulse-amber" aria-hidden />
          <span className="truncate">Poll: {POLL_MS / 1000}s · Realtime</span>
        </div>
        <div className="hidden text-wire sm:block">spx402://tape/live</div>
        <div className="flex shrink-0 items-center gap-3 text-wire">
          <span>{filtered.length} events</span>
          <span className="text-paper-muted">{stamp ? `UTC ${stamp}` : "UTC —"}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-bronze/40 px-4 py-2 font-mono text-[10px] uppercase tracking-widest">
        <button
          type="button"
          onClick={cycleCount}
          disabled={loading}
          className="border border-amber/60 bg-panel-deep px-2 py-1 text-amber transition-colors hover:border-amber hover:bg-amber/10 disabled:opacity-50"
          title="Cycle rows shown: 5, 15, 25, 50, 100"
        >
          {loading ? "Loading…" : `Rows: ${count}`}
        </button>
        <select
          aria-label="Filter by event type"
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
          className={selectCls}
        >
          <option value="all">All events</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by severity"
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className={selectCls}
        >
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All severities" : s}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by agent category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={selectCls}
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {categoryLabel(c)}
            </option>
          ))}
        </select>
        <select
          aria-label="Sort order"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className={selectCls}
        >
          {SORTS.map((s) => (
            <option key={s} value={s}>
              {SORT_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="tape-window">
        {visible.length === 0 ? (
          <div className="p-8 text-center font-mono text-xs text-paper-muted">
            No events on the tape yet. The indexer is warming up.
          </div>
        ) : (
          <ul className="divide-y divide-bronze/30">
            {visible.map((r) => (
              <li
                key={r.id}
                className={`tape-row bg-panel/60 ${fresh.includes(r.id) ? "is-fresh" : ""} ${
                  r.amountSol === 0 ? "is-quiet" : ""
                }`}
              >
                <Link
                  to="/tape/$eventId"
                  params={{ eventId: r.id }}
                  className="flex items-center gap-3 px-4 py-2.5 font-mono text-xs text-paper transition-colors hover:bg-panel-deep"
                >
                  <span
                    aria-hidden
                    className={`h-1.5 w-1.5 flex-none rounded-full ${severityDot(r.severity)}`}
                  />
                  <span className={`min-w-0 flex-1 truncate ${severityTone(r.severity)}`}>
                    {label(r)}
                  </span>
                  <span className="hidden shrink-0 text-[10px] uppercase tracking-widest text-wire md:inline">
                    {categoryLabel(r.agentCategory)}
                  </span>
                  <span className="w-24 shrink-0 text-right tabular-nums text-paper">
                    {r.amountSol > 0 ? `${r.amountSol.toFixed(2)} SOL` : "—"}
                  </span>
                  <span className="w-14 shrink-0 text-right text-[10px] tabular-nums text-paper-muted">
                    {relativeFromNow(r.occurredAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="tape-fade" aria-hidden />
      </div>

      <Link to="/live" className="tape-tab">
        Open full repository tape ↗
      </Link>
    </div>
  );
}
