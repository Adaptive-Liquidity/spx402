import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard/alerts")({
  head: () => ({
    meta: [{ title: "Alert subscriptions — SPX402" }],
  }),
  component: AlertsDashboard,
});

const CHANNELS = [
  { name: "Email", value: "—", action: "Verify" },
  { name: "Telegram", value: "Not connected", action: "Connect" },
  { name: "Webhook", value: "Team plan", action: "Upgrade" },
];

function AlertsDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <div className="label-amber">Alerts</div>
        <h2 className="mt-2 font-display text-2xl font-bold text-paper">Delivery channels</h2>
      </div>

      <div className="panel-engraved divide-y divide-bronze/30">
        {CHANNELS.map((c) => (
          <div key={c.name} className="flex items-center justify-between p-5">
            <div>
              <div className="font-mono text-sm text-paper">{c.name}</div>
              <div className="mt-1 font-mono text-xs text-wire">{c.value}</div>
            </div>
            <button className="border border-bronze/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-paper-muted hover:border-amber hover:text-amber">
              {c.action}
            </button>
          </div>
        ))}
      </div>

      <div>
        <div className="label-mono mb-3">Active subscriptions</div>
        <div className="panel-engraved p-10 text-center text-sm text-paper-muted">
          No subscriptions configured. Open an agent dossier and tap
          <span className="mx-1 text-amber">Subscribe to alerts</span> to start.
        </div>
      </div>
    </div>
  );
}
