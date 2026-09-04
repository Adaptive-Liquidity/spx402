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

const MAX_ROWS = 18;
const VISIBLE_ROWS = 8;
const POLL_MS = 30_000;

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
  const seen = useRef(new Set(initialRows.map((r) => r.id)));

  function ingest(next: TapeRow[]) {
    const incoming = next.filter((r) => !seen.current.has(r.id)).map((r) => r.id);
    next.forEach((r) => seen.current.add(r.id));
    setRows(next);
    setStamp(new Date().toISOString().slice(11, 19));
    if (incoming.length > 0) {
      setFresh(incoming);
      setTimeout(() => setFresh([]), 400);
    }
  }

  // Refresh from server as a safety net (in case the realtime subscription is
  // dropped or the user is on a stale tab).
  useEffect(() => {
    const t = setInterval(async () => {
      const next = await fetchTape({ limit: MAX_ROWS });
      if (next.length > 0) ingest(next);
    }, POLL_MS);
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
          const next = await fetchTape({ limit: MAX_ROWS });
          if (next.length > 0) ingest(next);
          void payload;
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const visible = rows.slice(0, VISIBLE_ROWS);

  return (
    <div className="panel-engraved relative overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-bronze/50 bg-panel-deep/60 px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest">
        <div className="flex min-w-0 items-center gap-2 text-amber">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-verified pulse-amber" aria-hidden />
          <span className="truncate">Poll: {POLL_MS / 1000}s · Realtime</span>
        </div>
        <div className="hidden text-wire sm:block">spx402://tape/live</div>
        <div className="flex shrink-0 items-center gap-3 text-wire">
          <span>{rows.length} events</span>
          <span className="text-paper-muted">{stamp ? `UTC ${stamp}` : "UTC —"}</span>
        </div>
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

      <Link to="/tape" className="tape-tab">
        Open full repository tape ↗
      </Link>
    </div>
  );
}
