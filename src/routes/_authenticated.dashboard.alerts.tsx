import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, Mail, MessageCircle, Trash2, Webhook } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { fetchWatchlist, type WatchlistRow } from "@/lib/watchlist";
import {
  ALERT_EVENT_FIELDS,
  createSubscription,
  deleteSubscription,
  fetchSubscriptions,
  updateSubscription,
  type AlertEventKey,
  type AlertSubscription,
} from "@/lib/alerts";
import { EmptyState } from "@/components/spx/EmptyState";

export const Route = createFileRoute("/_authenticated/dashboard/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts — SPX402" },
      {
        name: "description",
        content: "Subscribe to escrow, bond, receipt and score-drop events for the agents you watch.",
      },
    ],
  }),
  component: AlertsDashboard,
});

const CHANNELS = [
  { name: "Email", value: "Delivered to your account address", Icon: Mail },
  { name: "Telegram", value: "Operator bot — not yet connected", Icon: MessageCircle },
  { name: "Webhook", value: "Team plan — not yet connected", Icon: Webhook },
];

function shortMint(mint: string) {
  return `${mint.slice(0, 4)}…${mint.slice(-4)}`;
}

function AlertsDashboard() {
  const { user } = useAuth();
  const [subs, setSubs] = useState<AlertSubscription[] | null>(null);
  const [watch, setWatch] = useState<WatchlistRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([fetchSubscriptions(user.id), fetchWatchlist(user.id)])
      .then(([s, w]) => {
        setSubs(s);
        setWatch(w);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Failed to load subscriptions");
        setSubs([]);
      });
  }, [user]);

  const subscribed = new Set((subs ?? []).map((s) => s.mint));
  const available = watch.filter((w) => !subscribed.has(w.mint));

  const add = async () => {
    if (!user || !selected) return;
    setError(null);
    try {
      const row = await createSubscription(user.id, selected);
      setSubs((prev) => [row, ...(prev ?? [])]);
      setSelected("");
      setExpanded(row.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to subscribe");
    }
  };

  const toggle = async (sub: AlertSubscription, key: AlertEventKey | "paused") => {
    const next = !sub[key as keyof AlertSubscription];
    setSubs((prev) => prev?.map((s) => (s.id === sub.id ? { ...s, [key]: next } : s)) ?? null);
    try {
      await updateSubscription(sub.id, { [key]: next } as Record<string, boolean>);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    }
  };

  const remove = async (id: string) => {
    setSubs((prev) => prev?.filter((s) => s.id !== id) ?? null);
    try {
      await deleteSubscription(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove");
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="label-amber">Alerts</div>
        <h2 className="mt-2 font-display text-2xl font-bold text-paper">Subscriptions</h2>
        <p className="mt-2 max-w-xl text-sm text-paper-muted">
          Get notified when an escrow is released or canceled, a bond is slashed, a receipt is
          written, or an agent's grade drops. Events come straight off the ingest pipeline.
        </p>
      </div>

      {error && (
        <div className="border-l-2 border-critical/70 bg-critical/10 px-3 py-2 font-mono text-xs text-critical">
          {error}
        </div>
      )}

      <div className="panel-engraved flex flex-wrap items-end gap-3 p-5">
        <label className="flex-1 min-w-[220px]">
          <span className="label-mono">Agent from your watchlist</span>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="mt-2 w-full border border-bronze/50 bg-panel-deep/60 px-3 py-2 font-mono text-sm text-paper outline-none focus:border-amber"
          >
            <option value="">
              {available.length ? "Select an agent…" : "No unsubscribed watchlist agents"}
            </option>
            {available.map((w) => (
              <option key={w.mint} value={w.mint}>
                {w.label || shortMint(w.mint)}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={add}
          disabled={!selected}
          className="inline-flex items-center gap-2 border border-amber/80 bg-amber/10 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep disabled:opacity-40"
        >
          <Bell className="h-3.5 w-3.5" /> + New subscription
        </button>
      </div>

      {subs === null ? (
        <div className="panel-engraved p-12 text-center font-mono text-xs uppercase tracking-widest text-wire">
          Loading…
        </div>
      ) : subs.length === 0 ? (
        <EmptyState
          label="No subscriptions"
          title="Nothing is watching for you yet."
          body={
            <>
              Add an agent to your{" "}
              <Link to="/dashboard/watchlist" className="text-amber underline underline-offset-4">
                watchlist
              </Link>
              , then subscribe above to be told the moment its execution record changes.
            </>
          }
        />
      ) : (
        <div className="panel-engraved divide-y divide-bronze/30">
          {subs.map((sub) => (
            <div key={sub.id} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Link
                    to="/agent/$mint"
                    params={{ mint: sub.mint }}
                    className="font-mono text-sm text-paper hover:text-amber"
                  >
                    {shortMint(sub.mint)}
                  </Link>
                  <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-wire">
                    {ALERT_EVENT_FIELDS.filter((f) => sub[f.key]).length} events ·{" "}
                    {sub.channel || "email"} · {sub.paused ? "paused" : "live"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setExpanded(expanded === sub.id ? null : sub.id)}
                    className="border border-bronze/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-paper-muted hover:border-amber hover:text-amber"
                  >
                    {expanded === sub.id ? "Close" : "Configure"}
                  </button>
                  <button
                    onClick={() => toggle(sub, "paused")}
                    className="border border-bronze/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-paper-muted hover:border-amber hover:text-amber"
                  >
                    {sub.paused ? "Resume" : "Pause"}
                  </button>
                  <button
                    onClick={() => remove(sub.id)}
                    aria-label="Remove subscription"
                    className="border border-bronze/60 p-1.5 text-paper-muted hover:border-critical hover:text-critical"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {expanded === sub.id && (
                <div className="mt-5">
                  <div className="label-mono mb-3">Event coverage</div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {ALERT_EVENT_FIELDS.map((f) => (
                      <label
                        key={f.key}
                        className="flex cursor-pointer items-center gap-2 border border-bronze/40 bg-panel-deep/40 px-3 py-2"
                      >
                        <input
                          type="checkbox"
                          checked={!!sub[f.key]}
                          onChange={() => toggle(sub, f.key)}
                          className="accent-amber"
                        />
                        <span className="font-mono text-[11px] text-paper-muted">{f.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div>
        <div className="label-mono mb-3">Delivery channels</div>
        <div className="panel-engraved divide-y divide-bronze/30">
          {CHANNELS.map(({ name, value, Icon }) => (
            <div key={name} className="flex items-center gap-3 p-5">
              <span className="flex h-8 w-8 items-center justify-center border border-bronze/60 bg-panel-deep/60 text-paper-muted">
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <div className="font-mono text-sm text-paper">{name}</div>
                <div className="mt-1 font-mono text-xs text-wire">{value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
