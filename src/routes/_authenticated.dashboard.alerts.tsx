import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, Trash2, Pause, Play } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  type AlertSubscription,
  deleteAlertSubscription,
  fetchAlertSubscriptions,
  updateAlertSubscription,
} from "@/lib/alerts";
import { fetchAgentsByMints } from "@/lib/agents-db";
import type { Agent } from "@/lib/agents";

export const Route = createFileRoute("/_authenticated/dashboard/alerts")({
  head: () => ({
    meta: [{ title: "Alert subscriptions — SPX402" }],
  }),
  component: AlertsDashboard,
});

const CHANNELS = [
  { name: "Email", value: "Default channel", action: "Active", active: true },
  { name: "Telegram", value: "Not connected", action: "Connect" },
  { name: "Webhook", value: "Team plan", action: "Upgrade" },
];

const EVENT_FIELDS: Array<{ key: keyof AlertSubscription; label: string }> = [
  { key: "event_buyback", label: "Buyback" },
  { key: "event_burn", label: "Burn" },
  { key: "event_deposit", label: "Deposit" },
  { key: "event_failed_window", label: "Failed window" },
  { key: "event_config_change", label: "Config change" },
  { key: "event_score_drop", label: "Score drop" },
];

function AlertsDashboard() {
  const { user } = useAuth();
  const [subs, setSubs] = useState<AlertSubscription[]>([]);
  const [agents, setAgents] = useState<Record<string, Agent>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchAlertSubscriptions(user.id);
      setSubs(rows);
      if (rows.length > 0) {
        const mints = Array.from(new Set(rows.map((r) => r.mint)));
        const ags = await fetchAgentsByMints(mints);
        const map: Record<string, Agent> = {};
        for (const a of ags) map[a.mint] = a;
        setAgents(map);
      } else {
        setAgents({});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const togglePause = async (sub: AlertSubscription) => {
    try {
      const updated = await updateAlertSubscription(sub.id, { paused: !sub.paused });
      setSubs((prev) => prev.map((s) => (s.id === sub.id ? updated : s)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    }
  };

  const toggleEvent = async (
    sub: AlertSubscription,
    key: keyof AlertSubscription,
  ) => {
    const next = !sub[key];
    try {
      const updated = await updateAlertSubscription(sub.id, { [key]: next } as Partial<AlertSubscription>);
      setSubs((prev) => prev.map((s) => (s.id === sub.id ? updated : s)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    }
  };

  const remove = async (sub: AlertSubscription) => {
    try {
      await deleteAlertSubscription(sub.id);
      setSubs((prev) => prev.filter((s) => s.id !== sub.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  };

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
            <button
              disabled={c.active}
              className={
                c.active
                  ? "border border-verified/60 bg-verified/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-verified"
                  : "border border-bronze/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-paper-muted hover:border-amber hover:text-amber"
              }
            >
              {c.action}
            </button>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-end justify-between gap-4">
          <div className="label-mono">Active subscriptions</div>
          {subs.length > 0 && (
            <span className="font-mono text-[10px] uppercase tracking-widest text-wire">
              {subs.length} subscribed
            </span>
          )}
        </div>

        {error && (
          <div className="mt-3 border-l-2 border-critical/70 bg-critical/5 p-3 font-mono text-xs text-critical">
            {error}
          </div>
        )}

        <div className="mt-3">
          {loading ? (
            <div className="panel-engraved p-10 text-center font-mono text-xs uppercase tracking-widest text-wire">
              Loading…
            </div>
          ) : subs.length === 0 ? (
            <div className="panel-engraved p-10 text-center text-sm text-paper-muted">
              No subscriptions configured. Open an agent dossier and tap
              <span className="mx-1 text-amber">Subscribe to alerts</span> to start.
              <div className="mt-4">
                <Link
                  to="/explore"
                  className="inline-block border border-amber/80 bg-amber/10 px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep"
                >
                  Browse agents →
                </Link>
              </div>
            </div>
          ) : (
            <ul className="space-y-3">
              {subs.map((sub) => {
                const agent = agents[sub.mint];
                return (
                  <li key={sub.id} className="panel-engraved p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Bell className="h-3.5 w-3.5 text-amber" />
                          {agent ? (
                            <Link
                              to="/agent/$mint"
                              params={{ mint: agent.mint }}
                              className="font-display text-lg font-bold text-paper hover:text-amber"
                            >
                              ${agent.symbol}
                            </Link>
                          ) : (
                            <span className="font-display text-lg font-bold text-paper">
                              {sub.mint.slice(0, 8)}…
                            </span>
                          )}
                          {agent?.name && (
                            <span className="font-mono text-xs text-paper-muted">{agent.name}</span>
                          )}
                          {sub.paused && (
                            <span className="border border-wire/60 bg-panel-deep/60 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-paper-muted">
                              Paused
                            </span>
                          )}
                        </div>
                        <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-wire">
                          via {sub.channel} · {sub.mint.slice(0, 6)}…{sub.mint.slice(-6)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => togglePause(sub)}
                          className="inline-flex items-center gap-1.5 border border-bronze/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-paper-muted hover:border-amber hover:text-amber"
                        >
                          {sub.paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                          {sub.paused ? "Resume" : "Pause"}
                        </button>
                        <button
                          onClick={() => remove(sub)}
                          className="inline-flex items-center gap-1.5 border border-bronze/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-paper-muted hover:border-critical hover:text-critical"
                        >
                          <Trash2 className="h-3 w-3" /> Remove
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {EVENT_FIELDS.map((f) => {
                        const on = !!sub[f.key];
                        return (
                          <button
                            key={f.key}
                            onClick={() => toggleEvent(sub, f.key)}
                            className={
                              on
                                ? "border border-amber/80 bg-amber/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-amber"
                                : "border border-bronze/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-wire hover:text-paper"
                            }
                          >
                            {f.label}
                          </button>
                        );
                      })}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
