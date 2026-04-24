import { createFileRoute } from "@tanstack/react-router";
import { Panel } from "@/components/spx/Panel";
import { CheckCircle2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "Status — SPX402" },
      { name: "description", content: "Indexer status, parser version, webhook health, reconciliation." },
    ],
  }),
  component: StatusPage,
});

const COMPONENTS = [
  { name: "Helius webhook stream", status: "operational", note: "P99 delivery 1.2s" },
  { name: "Raw transaction backfill", status: "operational", note: "Backfill queue: 142" },
  { name: "Pump IDL decoder", status: "operational", note: "Parser v0.1.7" },
  { name: "SPL burn observer", status: "operational", note: "100% match rate" },
  { name: "Reconciliation worker", status: "operational", note: "Last run 14s ago" },
  { name: "API gateway", status: "degraded", note: "Elevated latency on /timeline" },
  { name: "Alert delivery", status: "operational", note: "Email queue clear" },
];

const STATS = [
  { l: "Agents indexed", v: "5,142" },
  { l: "Events processed (24h)", v: "218,902" },
  { l: "Duplicate webhooks discarded (24h)", v: "1,041" },
  { l: "Low-confidence events pending review", v: "37" },
];

const RECENT = [
  { t: "14s ago", d: "Reconciliation completed for 5,142 agents." },
  { t: "1h ago", d: "Parser v0.1.7 deployed. Adds support for buyback_bps config diffing." },
  { t: "4h ago", d: "API gateway latency spike investigated. Mitigation in progress." },
  { t: "1d ago", d: "Backfill of historic NOVA events completed." },
];

function StatusPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-12 lg:px-8 lg:py-20">
      <div className="label-amber">System status</div>
      <h1 className="mt-3 font-display text-5xl font-bold text-paper">
        All execution observers, accounted for.
      </h1>
      <div className="mt-6 inline-flex items-center gap-2 border border-amber/70 bg-amber/10 px-4 py-2 font-mono text-xs uppercase tracking-widest text-amber">
        <span className="h-1.5 w-1.5 rounded-full bg-amber pulse-amber" />
        1 component degraded · core indexing nominal
      </div>

      {/* COMPONENTS */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-bold text-paper">Components</h2>
        <div className="mt-6 overflow-hidden border border-bronze/50">
          {COMPONENTS.map((c, i) => {
            const ok = c.status === "operational";
            return (
              <div
                key={c.name}
                className={`grid grid-cols-12 items-center gap-4 px-5 py-4 ${i % 2 ? "bg-panel" : "bg-background"}`}
              >
                <div className="col-span-1">
                  {ok ? (
                    <CheckCircle2 className="h-5 w-5 text-verified" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber" />
                  )}
                </div>
                <div className="col-span-6 font-display text-base font-semibold text-paper">{c.name}</div>
                <div className={`col-span-2 font-mono text-xs uppercase tracking-widest ${ok ? "text-verified" : "text-amber"}`}>
                  {c.status}
                </div>
                <div className="col-span-3 font-mono text-xs text-paper-muted">{c.note}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-12 grid gap-6 lg:grid-cols-2">
        <Panel eyebrow="Index telemetry" title="Last 24 hours">
          <dl className="space-y-3">
            {STATS.map((s) => (
              <div key={s.l} className="flex items-baseline justify-between border-b border-bronze/30 pb-2">
                <dt className="text-sm text-paper-muted">{s.l}</dt>
                <dd className="num-display text-lg font-semibold text-paper">{s.v}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        <Panel eyebrow="Recent activity" title="Operational log">
          <ul className="space-y-3">
            {RECENT.map((r) => (
              <li key={r.d} className="border-l-2 border-amber/60 pl-3">
                <div className="font-mono text-[11px] uppercase tracking-widest text-wire">{r.t}</div>
                <div className="mt-1 text-sm text-paper">{r.d}</div>
              </li>
            ))}
          </ul>
        </Panel>
      </section>

      <section className="mt-12 panel-engraved p-6">
        <div className="label-amber">Known parser limitations</div>
        <ul className="mt-3 space-y-2 text-sm text-paper-muted">
          <li>• Custom buyback routes outside published Pump/PumpSwap IDLs surface as low-confidence events.</li>
          <li>• Multi-step burn sequences across multiple slots may be reconciled with up to 90 seconds of delay.</li>
          <li>• Off-chain operator activity is, by definition, invisible to SPX402.</li>
        </ul>
      </section>
    </div>
  );
}
