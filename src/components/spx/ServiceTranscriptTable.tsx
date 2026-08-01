import { relativeFromNow } from "@/lib/live-data";
import type { ProbeRunRow } from "@/lib/prober-data";
import { outcomeLabel, outcomeTone } from "@/lib/prober/outcomes";

function toneClass(outcome: string): string {
  switch (outcomeTone(outcome)) {
    case "verified":
      return "text-verified border-verified/60 bg-verified/10";
    case "critical":
      return "text-critical border-critical/60 bg-critical/10";
    case "amber":
      return "text-amber border-amber/60 bg-amber/10";
    default:
      return "text-paper-muted border-bronze/60 bg-panel-deep";
  }
}

/** Every probe run against one endpoint, newest first. */
export function ServiceTranscriptTable({ runs }: { runs: ProbeRunRow[] }) {
  if (runs.length === 0) {
    return (
      <div className="border border-bronze/50 bg-panel p-6 font-mono text-sm text-paper-muted">
        No probes recorded for this service yet.
      </div>
    );
  }
  return (
    <div className="overflow-hidden border border-bronze/50">
      {runs.map((r, i) => (
        <div
          key={r.id}
          className={`grid grid-cols-1 gap-2 px-4 py-3 sm:grid-cols-12 sm:items-center sm:gap-3 ${
            i % 2 ? "bg-panel" : "bg-background"
          }`}
        >
          <div className="font-mono text-[11px] text-wire sm:col-span-3">
            {relativeFromNow(r.ranAt)}
            <div className="text-[10px] uppercase tracking-widest">{r.probeKind}</div>
          </div>
          <div className="sm:col-span-3">
            <span
              className={`inline-block border px-2 py-1 font-mono text-[11px] uppercase tracking-widest ${toneClass(r.outcome)}`}
            >
              {outcomeLabel(r.outcome)}
            </span>
            {r.challengeValid != null && (
              <span
                className={`ml-2 font-mono text-[10px] uppercase tracking-widest ${r.challengeValid ? "text-verified" : "text-critical"}`}
              >
                {r.challengeValid ? "challenge valid" : "challenge malformed"}
              </span>
            )}
          </div>
          <div className="font-mono text-[11px] text-paper-muted sm:col-span-2">
            {r.httpStatus ?? "—"}
            {r.verifyMs != null ? ` · verify ${r.verifyMs}ms` : ""}
            {r.settleMs != null ? ` · settle ${r.settleMs}ms` : ""}
          </div>
          <div className="font-mono text-[11px] text-paper-muted sm:col-span-2">
            {r.paidAmountUsd ? `$${r.paidAmountUsd.toFixed(6)}` : "free"}
            {r.delivered != null && (
              <span className={r.delivered ? " text-verified" : " text-critical"}>
                {r.delivered ? " · delivered" : " · no delivery"}
              </span>
            )}
          </div>
          <div className="break-all font-mono text-[10px] text-wire sm:col-span-2">
            {r.txSignature
              ? `${r.txSignature.slice(0, 14)}…`
              : r.notes
                ? r.notes.slice(0, 60)
                : ""}
          </div>
        </div>
      ))}
    </div>
  );
}
