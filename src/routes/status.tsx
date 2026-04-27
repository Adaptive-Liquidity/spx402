import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Panel } from "@/components/spx/Panel";
import { CheckCircle2, AlertTriangle, MinusCircle } from "lucide-react";
import {
  fetchEventCoverage,
  fetchIndexerStats24h,
  fetchLatestIndexerRuns,
  relativeFromNow,
  type IndexerRunRow,
} from "@/lib/live-data";
import { categoryLabel } from "@/lib/agents/categories";

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "Status — SPX402" },
      {
        name: "description",
        content:
          "Indexer status, parser version, webhook health, reconciliation.",
      },
    ],
  }),
  loader: async () => {
    const [runs, stats, coverage] = await Promise.all([
      fetchLatestIndexerRuns(),
      fetchIndexerStats24h(),
      fetchEventCoverage(),
    ]);
    return { runs, stats, coverage };
  },
  staleTime: 15_000,
  component: StatusPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="label-amber">Status error</div>
        <p className="mt-3 text-paper-muted">{error.message}</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 border border-amber/80 bg-amber/10 px-5 py-3 font-mono text-xs uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep"
        >
          Retry
        </button>
      </div>
    );
  },
});

const COMPONENT_ROWS: Array<{
  key: string;
  name: string;
  description: string;
}> = [
  {
    key: "webhook_ingest",
    name: "Helius webhook stream",
    description: "Decodes inbound Pump + SPL Token events.",
  },
  {
    key: "backfill",
    name: "Raw transaction backfill",
    description: "Fills gaps via Helius Enhanced Transactions.",
  },
  {
    key: "scoring",
    name: "Scoring worker",
    description: "Recomputes Transparency Score per agent.",
  },
  {
    key: "reconciler",
    name: "Reconciliation worker",
    description: "Asserts buyback windows produced a burn.",
  },
];

type Health = "operational" | "degraded" | "no-data";

function healthFor(run: IndexerRunRow | null): Health {
  if (!run) return "no-data";
  if (!run.ok) return "degraded";
  // If a heartbeat is older than 30 minutes, mark it as no-data so we don't
  // claim things are operational when nothing is reporting in.
  const age = Date.now() - new Date(run.ranAt).getTime();
  if (age > 30 * 60 * 1000) return "no-data";
  return "operational";
}

function StatusPage() {
  const { runs, stats } = Route.useLoaderData() as {
    runs: Record<string, IndexerRunRow | null>;
    stats: Awaited<ReturnType<typeof fetchIndexerStats24h>>;
  };

  const healths = COMPONENT_ROWS.map((c) => healthFor(runs[c.key] ?? null));
  const degraded = healths.filter((h) => h === "degraded").length;
  const noData = healths.filter((h) => h === "no-data").length;
  const operational = healths.filter((h) => h === "operational").length;

  const banner =
    degraded > 0
      ? `${degraded} component${degraded > 1 ? "s" : ""} degraded`
      : noData === COMPONENT_ROWS.length
        ? "Indexer not reporting yet · pre-launch"
        : noData > 0
          ? `${operational} of ${COMPONENT_ROWS.length} components reporting`
          : "All components nominal";

  const bannerTone =
    degraded > 0 ? "critical" : noData === COMPONENT_ROWS.length ? "amber" : "verified";

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-12 lg:px-8 lg:py-20">
      <div className="label-amber">System status</div>
      <h1 className="mt-3 font-display text-5xl font-bold text-paper">
        All execution observers, accounted for.
      </h1>
      <div
        className={`mt-6 inline-flex items-center gap-2 border px-4 py-2 font-mono text-xs uppercase tracking-widest ${
          bannerTone === "critical"
            ? "border-critical/70 bg-critical/10 text-critical"
            : bannerTone === "amber"
              ? "border-amber/70 bg-amber/10 text-amber"
              : "border-verified/70 bg-verified/10 text-verified"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            bannerTone === "critical"
              ? "bg-critical"
              : bannerTone === "amber"
                ? "bg-amber pulse-amber"
                : "bg-verified"
          }`}
        />
        {banner}
      </div>

      {/* COMPONENTS */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-bold text-paper">Components</h2>
        <div className="mt-6 overflow-hidden border border-bronze/50">
          {COMPONENT_ROWS.map((c, i) => {
            const run = runs[c.key] ?? null;
            const h = healthFor(run);
            const Icon =
              h === "operational"
                ? CheckCircle2
                : h === "degraded"
                  ? AlertTriangle
                  : MinusCircle;
            const tone =
              h === "operational"
                ? "text-verified"
                : h === "degraded"
                  ? "text-critical"
                  : "text-wire";
            const label =
              h === "operational"
                ? "operational"
                : h === "degraded"
                  ? "degraded"
                  : "no data";
            const note = run
              ? `Last run ${relativeFromNow(run.ranAt)} · ${run.durationMs}ms`
              : "Awaiting first heartbeat";
            return (
              <div
                key={c.key}
                className={`grid grid-cols-12 items-center gap-4 px-5 py-4 ${
                  i % 2 ? "bg-panel" : "bg-background"
                }`}
              >
                <div className="col-span-1">
                  <Icon className={`h-5 w-5 ${tone}`} />
                </div>
                <div className="col-span-6">
                  <div className="font-display text-base font-semibold text-paper">
                    {c.name}
                  </div>
                  <div className="font-mono text-[11px] text-wire">
                    {c.description}
                  </div>
                </div>
                <div
                  className={`col-span-2 font-mono text-xs uppercase tracking-widest ${tone}`}
                >
                  {label}
                </div>
                <div className="col-span-3 font-mono text-xs text-paper-muted">
                  {note}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-12 grid gap-6 lg:grid-cols-2">
        <Panel eyebrow="Index telemetry" title="Last 24 hours">
          <dl className="space-y-3">
            {[
              { l: "Agents indexed", v: stats.agentsIndexed.toLocaleString() },
              {
                l: "Events processed (24h)",
                v: stats.eventsProcessed.toLocaleString(),
              },
              {
                l: "Successful executions (24h)",
                v: stats.successEvents.toLocaleString(),
              },
              {
                l: "Critical events (24h)",
                v: stats.criticalEvents.toLocaleString(),
              },
            ].map((s) => (
              <div
                key={s.l}
                className="flex items-baseline justify-between border-b border-bronze/30 pb-2"
              >
                <dt className="text-sm text-paper-muted">{s.l}</dt>
                <dd className="num-display text-lg font-semibold text-paper">
                  {s.v}
                </dd>
              </div>
            ))}
          </dl>
        </Panel>

        <Panel eyebrow="Recent activity" title="Operational log">
          {Object.values(runs).every((r) => r === null) ? (
            <div className="font-mono text-sm text-paper-muted">
              No worker heartbeats received yet.
              <div className="mt-2 text-xs text-wire">
                The indexer fleet (webhook ingest, backfill, scoring,
                reconciler) will start reporting here once it ships.
              </div>
            </div>
          ) : (
            <ul className="space-y-3">
              {Object.entries(runs)
                .filter((entry): entry is [string, IndexerRunRow] => entry[1] !== null)
                .sort(
                  (a, b) =>
                    new Date(b[1].ranAt).getTime() -
                    new Date(a[1].ranAt).getTime(),
                )
                .map(([worker, r]) => (
                  <li
                    key={worker}
                    className={`border-l-2 pl-3 ${r.ok ? "border-verified/60" : "border-critical/60"}`}
                  >
                    <div className="font-mono text-[11px] uppercase tracking-widest text-wire">
                      {relativeFromNow(r.ranAt)} · {worker}
                    </div>
                    <div className="mt-1 text-sm text-paper">
                      {r.notes ?? (r.ok ? "Run completed." : "Run failed.")}
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </Panel>
      </section>

      <section className="mt-12 panel-engraved p-6">
        <div className="label-amber">Known parser limitations</div>
        <ul className="mt-3 space-y-2 text-sm text-paper-muted">
          <li>
            • Custom buyback routes outside published Pump/PumpSwap IDLs surface
            as low-confidence events.
          </li>
          <li>
            • Multi-step burn sequences across multiple slots may be reconciled
            with up to 90 seconds of delay.
          </li>
          <li>
            • Off-chain operator activity is, by definition, invisible to SPX402.
          </li>
        </ul>
      </section>
    </div>
  );
}
