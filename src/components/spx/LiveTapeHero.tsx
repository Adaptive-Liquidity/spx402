// Wave 1a — Live Execution Tape (homepage hero).
//
// Replaces the static boot-sequence hero with a streaming canonical
// evidence ledger. Subscribes to agent_events via Supabase Realtime so
// new rows appear without a refresh. Every row links to its permalink
// at /tape/$eventId — that permalink is the contract that makes a grade
// explainable from the tape.

import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchTape,
  relativeFromNow,
  type TapeRow,
} from "@/lib/live-data";
import { categoryLabel } from "@/lib/agents/categories";

const MAX_ROWS = 18;

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

function summary(row: TapeRow): string {
  const subject = row.agentSymbol ? `$${row.agentSymbol}` : shortSig(row.mint);
  const sol = row.amountSol > 0 ? ` · ${row.amountSol.toFixed(2)} SOL` : "";
  switch (row.type) {
    case "BUYBACK_EXECUTED":
      return `BUYBACK · ${subject}${sol}`;
    case "BURN_CONFIRMED":
      return `BURN · ${subject}`;
    case "DEPOSIT_RECEIVED":
      return `DEPOSIT · ${subject}${sol}`;
    case "X402_PAYMENT_RECEIVED":
      return `x402 PAID · ${subject}${sol}`;
    case "SWAP_EXECUTED":
      return `SWAP · ${subject}${sol}`;
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
  const [live, setLive] = useState(false);

  // Refresh from server every 30s as a safety net (in case the realtime
  // subscription is dropped or the user is on a stale tab).
  useEffect(() => {
    const t = setInterval(async () => {
      const fresh = await fetchTape({ limit: MAX_ROWS });
      if (fresh.length > 0) setRows(fresh);
    }, 30_000);
    return () => clearInterval(t);
  }, []);

  // Realtime subscription. New rows are prepended; we cap at MAX_ROWS.
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
          const fresh = await fetchTape({ limit: MAX_ROWS });
          if (fresh.length > 0) {
            setRows(fresh);
            setLive(true);
            setTimeout(() => setLive(false), 1500);
          }
          void payload;
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="panel-engraved relative overflow-hidden">
      <div className="flex items-center justify-between border-b border-bronze/50 bg-panel-deep/60 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-critical" />
          <span className="h-2 w-2 rounded-full bg-amber" />
          <span className="h-2 w-2 rounded-full bg-verified" />
        </div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-wire">
          spx402://tape/live
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] text-amber">
          <span
            className={`h-1.5 w-1.5 rounded-full ${live ? "bg-verified pulse-amber" : "bg-amber"}`}
          />
          {live ? "● UPDATED" : "● LIVE"}
        </div>
      </div>

      <div className="max-h-[520px] overflow-y-auto">
        {rows.length === 0 ? (
          <div className="p-8 text-center font-mono text-xs text-paper-muted">
            No events on the tape yet. The indexer is warming up.
          </div>
        ) : (
          <ul className="divide-y divide-bronze/30">
            {rows.map((r) => (
              <li key={r.id} className="bg-panel/60">
                <Link
                  to="/tape/$eventId"
                  params={{ eventId: r.id }}
                  className="flex items-center gap-3 px-4 py-2.5 font-mono text-xs text-paper transition-colors hover:bg-panel-deep"
                >
                  <span
                    aria-hidden
                    className={`h-1.5 w-1.5 flex-none rounded-full ${severityDot(r.severity)}`}
                  />
                  <span className={`flex-1 truncate ${severityTone(r.severity)}`}>
                    {summary(r)}
                  </span>
                  <span className="hidden text-[10px] uppercase tracking-widest text-wire sm:inline">
                    {categoryLabel(r.agentCategory)}
                  </span>
                  <span className="text-[10px] text-paper-muted">
                    {relativeFromNow(r.occurredAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-bronze/40 bg-panel-deep/40 px-4 py-2 font-mono text-[10px] uppercase tracking-widest">
        <span className="text-wire">
          Every row is a permalinked piece of evidence
        </span>
        <Link to="/tape" className="text-amber hover:underline">
          Open full tape →
        </Link>
      </div>
    </div>
  );
}
