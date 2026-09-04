import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Mail, MessageCircle, Webhook } from "lucide-react";
import { ComingSoon } from "@/components/spx/ComingSoon";

export const Route = createFileRoute("/_authenticated/dashboard/alerts")({
  head: () => ({
    meta: [{ title: "Alerts — SPX402" }],
  }),
  component: AlertsDashboard,
});

const CHANNELS = [
  { name: "Email", value: "Default channel", Icon: Mail },
  { name: "Telegram", value: "Operator bot", Icon: MessageCircle },
  { name: "Webhook", value: "Team plan", Icon: Webhook },
];

function AlertsDashboard() {
  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="label-amber">Alerts</div>
          <h2 className="mt-2 font-display text-2xl font-bold text-paper">Subscriptions</h2>
          <p className="mt-2 max-w-xl font-mono text-xs text-paper-muted">
            Get notified when an escrow is released or canceled, a bond is slashed, a receipt is
            written, or an agent changes its config. Wired to Helius webhook ingest — shipping
            shortly.
          </p>
        </div>
        <ComingSoon label="Coming soon">
          <span className="inline-flex items-center gap-2 border border-amber/80 bg-amber/10 px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-amber">
            <Bell className="h-3.5 w-3.5" /> + New subscription
          </span>
        </ComingSoon>
      </div>

      <div className="panel-engraved overflow-hidden">
        <div className="grid grid-cols-12 gap-4 border-b border-bronze/40 bg-panel-deep/60 px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-wire">
          <div className="col-span-4">Agent</div>
          <div className="col-span-3">Events</div>
          <div className="col-span-3">Channel</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
        <div className="px-5 py-12 text-center font-mono text-xs uppercase tracking-widest text-wire">
          No subscriptions yet
        </div>
      </div>

      <div>
        <div className="label-mono mb-3">Delivery channels</div>
        <div className="panel-engraved divide-y divide-bronze/30">
          {CHANNELS.map(({ name, value, Icon }) => (
            <div key={name} className="flex items-center justify-between p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center border border-bronze/60 bg-panel-deep/60 text-paper-muted">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <div className="font-mono text-sm text-paper">{name}</div>
                  <div className="mt-1 font-mono text-xs text-wire">{value}</div>
                </div>
              </div>
              <ComingSoon label="Coming soon">
                <span className="inline-flex items-center border border-bronze/60 bg-panel-deep/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-paper-muted">
                  Configure
                </span>
              </ComingSoon>
            </div>
          ))}
        </div>
      </div>

      <div className="border-l-2 border-amber/70 bg-amber/5 p-4 text-sm text-paper-muted">
        <span className="font-mono text-[10px] uppercase tracking-widest text-amber">
          In the meantime ·{" "}
        </span>
        Add agents to your{" "}
        <Link
          to="/dashboard/watchlist"
          className="font-mono text-paper underline decoration-amber/60 underline-offset-4 hover:text-amber"
        >
          watchlist
        </Link>{" "}
        or{" "}
        <Link
          to="/explore"
          className="font-mono text-paper underline decoration-amber/60 underline-offset-4 hover:text-amber"
        >
          explore agents
        </Link>{" "}
        to keep them on your radar.
      </div>
    </div>
  );
}
