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
import {
  CHANNEL_KINDS,
  createChannel,
  deleteChannel,
  fetchChannels,
  fetchDeliveries,
  testChannel,
  updateChannel,
  type AlertChannel,
  type AlertDelivery,
  type ChannelKind,
} from "@/lib/alert-channels";
import { invalidateOperatorCounts } from "@/lib/operator-counts";
import { EmptyState } from "@/components/spx/EmptyState";

export const Route = createFileRoute("/_authenticated/dashboard/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts — SPX402 Operator Terminal" },
      {
        name: "description",
        content:
          "Arm escrow, bond, receipt and score-drop notices for the agents on your watchlist.",
      },
    ],
  }),
  component: AlertsDashboard,
});

const CHANNELS = [
  {
    name: "Email",
    value: "Delivered to your account address",
    Icon: Mail,
    state: "live" as const,
  },
  {
    name: "Telegram",
    value: "Operator bot — not yet connected",
    Icon: MessageCircle,
    state: "pending" as const,
  },
  {
    name: "Webhook",
    value: "Team plan — not yet connected",
    Icon: Webhook,
    state: "pending" as const,
  },
];

const AEON_KEYS: AlertEventKey[] = [
  "event_escrow_created",
  "event_escrow_released",
  "event_escrow_canceled",
  "event_bond_deposited",
  "event_bond_slashed",
  "event_receipt_created",
];

const REGISTERS: Array<{ title: string; keys: AlertEventKey[] }> = [
  { title: "AEON EXECUTION", keys: AEON_KEYS },
  {
    title: "LEGACY LANES",
    keys: ALERT_EVENT_FIELDS.map((f) => f.key).filter(
      (k) => !AEON_KEYS.includes(k),
    ) as AlertEventKey[],
  },
];

const LABELS = new Map(ALERT_EVENT_FIELDS.map((f) => [f.key, f.label] as const));

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
      invalidateOperatorCounts(user.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to subscribe");
    }
  };

  const toggle = async (sub: AlertSubscription, key: AlertEventKey | "paused") => {
    const next = !sub[key as keyof AlertSubscription];
    setSubs((prev) => prev?.map((s) => (s.id === sub.id ? { ...s, [key]: next } : s)) ?? null);
    try {
      await updateSubscription(sub.id, { [key]: next } as Record<string, boolean>);
      if (key === "paused") invalidateOperatorCounts(user?.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    }
  };

  const remove = async (id: string) => {
    setSubs((prev) => prev?.filter((s) => s.id !== id) ?? null);
    try {
      await deleteSubscription(id);
      invalidateOperatorCounts(user?.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove");
    }
  };

  return (
    <div className="space-y-12">
      <section>
        <div className="band-spine">
          <b>01</b>
          <span>// SUBSCRIPTIONS</span>
        </div>
        <div className="mt-3 h-px w-full bg-bronze/40" />
        <h2 className="mt-6 font-display text-2xl font-bold text-paper">
          Standing orders on the tape.
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-paper-muted">
          Be told when an escrow is released or canceled, a bond is slashed, a receipt is written,
          or a grade drops. Every notice comes straight off the ingest pipeline with the signature
          attached.
        </p>

        {error && (
          <div className="mt-6 border-l-2 border-critical/70 bg-critical/10 px-3 py-2 font-mono text-xs text-critical">
            {error}
          </div>
        )}

        <div className="panel-engraved mt-6 flex flex-wrap items-end gap-3 p-5">
          <label className="min-w-[240px] flex-1">
            <span className="label-mono">Agent from your watchlist</span>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="field-terminal mt-2"
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
          <button onClick={add} disabled={!selected} className="btn-caliper btn-caliper-primary">
            <Bell className="h-3.5 w-3.5" /> Arm subscription
          </button>
        </div>

        <div className="mt-6">
          {subs === null ? (
            <div className="panel-engraved space-y-3 p-5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="skel h-5 w-full" />
              ))}
            </div>
          ) : subs.length === 0 ? (
            <EmptyState
              label="No subscriptions"
              title="Nothing is watching for you yet."
              body={
                <>
                  Add an agent to your{" "}
                  <Link
                    to="/dashboard/watchlist"
                    className="text-amber underline underline-offset-4"
                  >
                    watchlist
                  </Link>
                  , then arm it above to be told the moment its execution record changes.
                </>
              }
            />
          ) : (
            <div className="panel-engraved divide-y divide-bronze/30">
              {subs.map((sub) => {
                const armedCount = ALERT_EVENT_FIELDS.filter((f) => sub[f.key]).length;
                return (
                  <div key={sub.id} className="record-row p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <Link
                          to="/agent/$mint"
                          params={{ mint: sub.mint }}
                          className="font-mono text-sm text-paper hover:text-amber"
                        >
                          {shortMint(sub.mint)}
                        </Link>
                        <div className="mt-1.5 flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-wire">
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className={
                                sub.paused
                                  ? "inline-block h-1.5 w-1.5 rounded-full bg-wire"
                                  : "inline-block h-1.5 w-1.5 rounded-full bg-verified"
                              }
                            />
                            {sub.paused ? "Muted" : "Armed"}
                          </span>
                          <span>{armedCount} events</span>
                          <span className="border border-bronze/50 px-1.5 py-0.5 text-paper-muted">
                            {sub.channel || "email"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExpanded(expanded === sub.id ? null : sub.id)}
                          className="btn-caliper !px-3 !py-1.5"
                        >
                          {expanded === sub.id ? "Close" : "Configure"}
                        </button>
                        <button
                          onClick={() => toggle(sub, "paused")}
                          className="btn-caliper !px-3 !py-1.5"
                        >
                          {sub.paused ? "Arm" : "Mute"}
                        </button>
                        <button
                          onClick={() => remove(sub.id)}
                          aria-label="Remove subscription"
                          className="btn-caliper btn-caliper-danger !px-2 !py-1.5"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {expanded === sub.id && (
                      <div className="mt-6 space-y-6">
                        {REGISTERS.map((reg) => (
                          <div key={reg.title}>
                            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-amber">
                              {reg.title}
                            </div>
                            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                              {reg.keys.map((key) => (
                                <label
                                  key={key}
                                  className="matrix-cell"
                                  data-on={Boolean(sub[key])}
                                >
                                  <input
                                    type="checkbox"
                                    checked={Boolean(sub[key])}
                                    onChange={() => toggle(sub, key)}
                                    className="accent-amber"
                                  />
                                  <span className="min-w-0 flex-1">
                                    <span className="block font-mono text-[11px] text-paper">
                                      {LABELS.get(key)}
                                    </span>
                                    <span className="block truncate font-mono text-[9px] uppercase tracking-[0.16em] text-wire">
                                      {key.replace("event_", "")}
                                    </span>
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="band-spine">
          <b>02</b>
          <span>// DELIVERY</span>
        </div>
        <div className="mt-3 h-px w-full bg-bronze/40" />
        <ChannelsPanel />
      </section>
    </div>
  );
}

function kindIcon(kind: ChannelKind) {
  if (kind === "email") return Mail;
  if (kind === "slack") return MessageCircle;
  if (kind === "sms") return MessageCircle;
  return Webhook;
}

function ChannelsPanel() {
  const { user } = useAuth();
  const [channels, setChannels] = useState<AlertChannel[] | null>(null);
  const [deliveries, setDeliveries] = useState<AlertDelivery[]>([]);
  const [kind, setKind] = useState<ChannelKind>("webhook");
  const [target, setTarget] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    try {
      const [c, d] = await Promise.all([fetchChannels(user.id), fetchDeliveries(user.id)]);
      setChannels(c);
      setDeliveries(d);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load channels");
      setChannels([]);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const selectedKind = CHANNEL_KINDS.find((k) => k.kind === kind)!;

  const add = async () => {
    if (!user || !target.trim()) return;
    setBusy(true);
    setErr(null);
    setNote(null);
    try {
      const row = await createChannel(user.id, kind, target, label);
      setChannels((prev) => [row, ...(prev ?? [])]);
      setTarget("");
      setLabel("");
      setNote("Destination added. Send a test to verify it before alerts start flowing.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to add destination");
    } finally {
      setBusy(false);
    }
  };

  const test = async (id: string) => {
    setErr(null);
    setNote(null);
    try {
      const res = await testChannel(id);
      setNote(res.ok ? "Test delivered — destination verified." : (res.error ?? "Test failed."));
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Test failed");
    }
  };

  const remove = async (id: string) => {
    setChannels((prev) => prev?.filter((c) => c.id !== id) ?? null);
    try {
      await deleteChannel(id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to remove");
    }
  };

  const togglePause = async (c: AlertChannel) => {
    setChannels((prev) =>
      prev?.map((x) => (x.id === c.id ? { ...x, paused: !c.paused } : x)) ?? null,
    );
    try {
      await updateChannel(c.id, { paused: !c.paused });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save");
    }
  };

  return (
    <div className="mt-6 space-y-6">
      <p className="max-w-xl text-sm leading-relaxed text-paper-muted">
        Alerts go where you tell them. Webhooks are signed with HMAC-SHA256 so you can prove the
        notice came from us. Email and text need a sending domain and number that this deployment
        does not have yet — they stay listed as unavailable rather than silently dropping notices.
      </p>

      {err && (
        <div className="border-l-2 border-critical/70 bg-critical/10 px-3 py-2 font-mono text-xs text-critical">
          {err}
        </div>
      )}
      {note && (
        <div className="border-l-2 border-amber/70 bg-amber/5 px-3 py-2 font-mono text-xs text-paper-muted">
          {note}
        </div>
      )}

      <div className="panel-engraved flex flex-wrap items-end gap-3 p-5">
        <label className="min-w-[160px]">
          <span className="label-mono">Type</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as ChannelKind)}
            className="field-terminal mt-2"
          >
            {CHANNEL_KINDS.map((k) => (
              <option key={k.kind} value={k.kind} disabled={!k.available}>
                {k.label}
                {k.available ? "" : " — unavailable"}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-[240px] flex-1">
          <span className="label-mono">
            {kind === "email" ? "Email address" : kind === "sms" ? "Phone number" : "URL"}
          </span>
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder={kind === "email" ? "you@example.com" : "https://…"}
            className="field-terminal mt-2"
          />
        </label>
        <label className="min-w-[160px]">
          <span className="label-mono">Label</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="ops channel"
            className="field-terminal mt-2"
          />
        </label>
        <button
          onClick={add}
          disabled={busy || !target.trim() || !selectedKind.available}
          className="btn-caliper btn-caliper-primary"
        >
          + Add destination
        </button>
        <div className="w-full font-mono text-[10px] uppercase tracking-[0.18em] text-wire">
          {selectedKind.hint}
        </div>
      </div>

      {channels === null ? (
        <div className="panel-engraved space-y-3 p-5">
          {[0, 1].map((i) => (
            <span key={i} className="skel h-5 w-full" />
          ))}
        </div>
      ) : channels.length === 0 ? (
        <EmptyState
          label="No destinations"
          title="Nowhere to send yet."
          body="Add a webhook or Slack URL above, send a test, and armed subscriptions will start arriving there."
        />
      ) : (
        <div className="panel-engraved divide-y divide-bronze/30">
          {channels.map((c) => {
            const Icon = kindIcon(c.kind);
            return (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-amber" />
                    <span className="font-mono text-sm text-paper">{c.label || c.kind}</span>
                  </div>
                  <div className="mt-1.5 truncate font-mono text-[11px] text-paper-muted">
                    {c.target}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-wire">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className={
                          c.verified && !c.paused
                            ? "inline-block h-1.5 w-1.5 rounded-full bg-verified"
                            : "inline-block h-1.5 w-1.5 rounded-full bg-wire"
                        }
                      />
                      {c.paused ? "Muted" : c.verified ? "Verified" : "Unverified"}
                    </span>
                    {c.last_delivery_at && (
                      <span>last {new Date(c.last_delivery_at).toISOString().slice(0, 16)}Z</span>
                    )}
                    {c.last_error && <span className="text-critical">{c.last_error}</span>}
                  </div>
                  {c.secret && (
                    <div className="mt-2 font-mono text-[10px] text-wire">
                      signing secret{" "}
                      <span className="text-paper-muted">{c.secret.slice(0, 14)}…</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => test(c.id)} className="btn-caliper !px-3 !py-1.5">
                    Send test
                  </button>
                  <button onClick={() => togglePause(c)} className="btn-caliper !px-3 !py-1.5">
                    {c.paused ? "Arm" : "Mute"}
                  </button>
                  <button
                    onClick={() => remove(c.id)}
                    aria-label="Remove destination"
                    className="btn-caliper btn-caliper-danger !px-2 !py-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div>
        <div className="label-mono">Recent deliveries</div>
        {deliveries.length === 0 ? (
          <div className="panel-engraved mt-3 p-5 font-mono text-xs text-wire">
            No deliveries yet.
          </div>
        ) : (
          <div className="panel-engraved mt-3 divide-y divide-bronze/30">
            {deliveries.map((d) => (
              <div
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 font-mono text-[11px]"
              >
                <span className="text-paper">{d.event_type ?? "—"}</span>
                <span className="text-paper-muted">{d.mint ? shortMint(d.mint) : "—"}</span>
                <span
                  className={
                    d.status === "failed"
                      ? "text-critical uppercase tracking-widest"
                      : "text-verified uppercase tracking-widest"
                  }
                >
                  {d.status}
                  {d.http_status ? ` ${d.http_status}` : ""}
                </span>
                <span className="text-wire">
                  {new Date(d.created_at).toISOString().slice(0, 16)}Z
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

