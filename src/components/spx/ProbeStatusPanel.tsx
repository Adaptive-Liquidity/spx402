import { Link } from "@tanstack/react-router";
import { Panel } from "@/components/spx/Panel";
import { SettleRateSparkline } from "@/components/spx/SettleRateSparkline";
import { relativeFromNow } from "@/lib/live-data";
import type { ProbeRunRow, SettleRatePoint, X402ServiceRow } from "@/lib/prober-data";
import { outcomeLabel } from "@/lib/prober/outcomes";

/**
 * Active-verification panel for a dossier.
 *
 * Three honest states:
 *  - no service matched → nothing rendered by the caller
 *  - service known by wallet only → ADDRESS-ONLY
 *  - service probed → last probe, settle rate, transcript link
 */
export function ProbeStatusPanel({
  service,
  series,
  lastRun,
}: {
  service: X402ServiceRow;
  series: SettleRatePoint[];
  lastRun?: ProbeRunRow | null;
}) {
  const addressOnly = !service.url;
  const withData = series.filter((p) => p.rate != null);
  const attempts = withData.reduce((s, p) => s + p.attempts, 0);
  const settled = withData.reduce((s, p) => s + p.settled, 0);

  return (
    <Panel
      className="mt-6"
      eyebrow="Active verification"
      title="Probed as a paying customer"
      right={
        addressOnly ? (
          <span className="border border-amber/60 bg-amber/10 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-amber">
            Address-only
          </span>
        ) : null
      }
    >
      {addressOnly ? (
        <p className="text-sm text-paper-muted">
          Settlement observed. Endpoint not yet probed.
          <span className="mt-2 block font-mono text-[11px] text-wire">
            SPX402 knows the wallet that gets paid, not the URL that charges. Active verification
            starts once an endpoint is known.
          </span>
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-6">
            <div className="font-mono text-xs text-paper-muted">
              Last probed{" "}
              <span className="text-paper">
                {service.lastProbeAt ? relativeFromNow(service.lastProbeAt) : "never"}
              </span>
              {lastRun && (
                <>
                  {" — "}
                  <span className="text-paper">
                    {lastRun.challengeValid === false ? "challenge malformed" : "challenge valid"}
                    {lastRun.settleMs != null
                      ? `, ${outcomeLabel(lastRun.outcome)} in ${(lastRun.settleMs / 1000).toFixed(1)}s`
                      : `, ${outcomeLabel(lastRun.outcome)}`}
                  </span>
                </>
              )}
              {attempts > 0 && (
                <>
                  {" · "}30d settle rate{" "}
                  <span className="text-paper">
                    {((settled / attempts) * 100).toFixed(0)}% ({settled}/{attempts})
                  </span>
                </>
              )}
            </div>
            <div className="min-w-[180px] flex-1">
              <SettleRateSparkline series={series} height="h-10" />
            </div>
            {service.slug && (
              <Link
                to="/service/$slug"
                params={{ slug: service.slug }}
                className="border border-amber/80 bg-amber/10 px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep"
              >
                Probe transcript
              </Link>
            )}
          </div>
          <p className="mt-3 font-mono text-[11px] text-wire">
            Measured by the SPX402 prober buying from this service. Probe data is published as
            evidence and is not part of the score.
          </p>
        </>
      )}
    </Panel>
  );
}
