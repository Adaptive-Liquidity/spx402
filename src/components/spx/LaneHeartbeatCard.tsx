import { CheckCircle2, AlertTriangle, MinusCircle } from "lucide-react";
import { relativeFromNow, type IndexerRunRow } from "@/lib/live-data";

export type LaneHealth = "operational" | "degraded" | "no-data";

export function laneHealth(run: IndexerRunRow | null, maxAgeMin = 30): LaneHealth {
  if (!run) return "no-data";
  if (!run.ok) return "degraded";
  const age = Date.now() - new Date(run.ranAt).getTime();
  if (age > maxAgeMin * 60 * 1000) return "no-data";
  return "operational";
}

/**
 * One card per indexing lane. The state label is derived from indexer_runs
 * only — a lane with no heartbeat says so rather than claiming health.
 */
export function LaneHeartbeatCard({
  name,
  description,
  run,
  badge,
  facts,
  children,
  maxAgeMin = 30,
}: {
  name: string;
  description: string;
  run: IndexerRunRow | null;
  /** Honest-state label, e.g. REPORT-ONLY or DISABLED. */
  badge?: { label: string; tone: "amber" | "critical" | "verified" | "muted" } | null;
  facts?: Array<{ l: string; v: string }>;
  children?: React.ReactNode;
  maxAgeMin?: number;
}) {
  const h = laneHealth(run, maxAgeMin);
  const Icon = h === "operational" ? CheckCircle2 : h === "degraded" ? AlertTriangle : MinusCircle;
  const tone =
    h === "operational" ? "text-verified" : h === "degraded" ? "text-critical" : "text-wire";
  const label = h === "operational" ? "operational" : h === "degraded" ? "degraded" : "no data";

  const badgeTone =
    badge?.tone === "critical"
      ? "border-critical/70 bg-critical/10 text-critical"
      : badge?.tone === "verified"
        ? "border-verified/70 bg-verified/10 text-verified"
        : badge?.tone === "amber"
          ? "border-amber/70 bg-amber/10 text-amber"
          : "border-bronze/70 bg-panel-deep/60 text-paper-muted";

  return (
    <div className="border border-bronze/50 bg-panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${tone}`} />
          <div>
            <div className="font-display text-base font-semibold text-paper">{name}</div>
            <div className="mt-1 font-mono text-[11px] leading-relaxed text-wire">
              {description}
            </div>
          </div>
        </div>
        {badge && (
          <span
            className={`shrink-0 border px-2 py-1 font-mono text-[10px] uppercase tracking-widest ${badgeTone}`}
          >
            {badge.label}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-baseline justify-between border-t border-bronze/30 pt-3 font-mono text-[11px]">
        <span className={`uppercase tracking-widest ${tone}`}>{label}</span>
        <span className="text-paper-muted">
          {run
            ? `last run ${relativeFromNow(run.ranAt)} · ${run.durationMs}ms`
            : "awaiting first heartbeat"}
        </span>
      </div>

      {facts && facts.length > 0 && (
        <dl className="mt-3 space-y-1.5 font-mono text-[11px]">
          {facts.map((f) => (
            <div key={f.l} className="flex items-baseline justify-between gap-3">
              <dt className="uppercase tracking-widest text-wire">{f.l}</dt>
              <dd className="break-all text-right text-paper">{f.v}</dd>
            </div>
          ))}
        </dl>
      )}

      {children}
    </div>
  );
}
