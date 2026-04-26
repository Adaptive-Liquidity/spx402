import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/alerts")({
  head: () => ({
    meta: [{ title: "Alerts — SPX402" }],
  }),
  component: AlertsDashboard,
});

const CHANNELS = [
  { name: "Email", value: "Default channel" },
  { name: "Telegram", value: "Operator bot" },
  { name: "Webhook", value: "Team plan" },
];

function AlertsDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <div className="label-amber">Alerts</div>
        <h2 className="mt-2 font-display text-2xl font-bold text-paper">
          Subscriptions
        </h2>
      </div>

      <div className="panel-engraved p-10 text-center">
        <div className="mx-auto inline-flex h-12 w-12 items-center justify-center border border-amber/60 bg-amber/10 text-amber">
          <Bell className="h-5 w-5" />
        </div>
        <div className="mt-5 font-mono text-[10px] uppercase tracking-widest text-amber">
          Coming soon
        </div>
        <h3 className="mt-2 font-display text-xl font-bold text-paper">
          Real-time alerts are being wired up.
        </h3>
        <p className="mx-auto mt-3 max-w-lg text-sm text-paper-muted">
          We're connecting Helius webhook ingest to per-agent subscriptions so
          you get notified the moment a buyback executes, a burn is confirmed,
          or an execution window fails. In the meantime, add agents to your
          watchlist to keep them on your radar.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to="/dashboard/watchlist"
            className="border border-amber/80 bg-amber/10 px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep"
          >
            Open watchlist →
          </Link>
          <Link
            to="/explore"
            className="border border-bronze/70 px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-paper-muted hover:border-amber hover:text-amber"
          >
            Browse agents
          </Link>
        </div>
      </div>

      <div>
        <div className="label-mono mb-3">Planned delivery channels</div>
        <div className="panel-engraved divide-y divide-bronze/30">
          {CHANNELS.map((c) => (
            <div key={c.name} className="flex items-center justify-between p-5">
              <div>
                <div className="font-mono text-sm text-paper">{c.name}</div>
                <div className="mt-1 font-mono text-xs text-wire">{c.value}</div>
              </div>
              <span className="border border-bronze/60 bg-panel-deep/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-wire">
                Soon
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
