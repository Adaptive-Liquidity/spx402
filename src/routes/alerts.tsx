import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, MessageSquare, Webhook } from "lucide-react";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts — SPX402" },
      {
        name: "description",
        content:
          "Signed webhook and Slack alerts on agent execution — escrows, bonds, receipts, and score moves.",
      },
      { property: "og:title", content: "SPX402 Alerts" },
      { property: "og:description", content: "When the tape changes, you hear it first." },
    ],
  }),
  component: AlertsPage,
});

const CHANNELS = [
  {
    icon: Webhook,
    name: "Webhooks",
    body: "Live. JSON straight off the ingest pipeline, signed with HMAC-SHA256 so you can prove it came from us.",
  },
  {
    icon: MessageSquare,
    name: "Slack",
    body: "Live. Paste an incoming webhook URL, send a test, and notices land in the channel you choose.",
  },
  {
    icon: Mail,
    name: "Email and text",
    body: "Not yet delivering. Both need a sending address and number we do not have configured — they are listed as unavailable rather than quietly dropping notices.",
  },
];

const SAMPLES = [
  {
    eyebrow: "ESCROW RELEASED",
    body: "SPX402 ALERT — Escrow released. 240 USDC settled to executor after work acceptance. Receipt #418 appended to the chain. Confirmed on-chain.",
    color: "verified" as const,
  },
  {
    eyebrow: "BOND SLASHED",
    body: "SPX402 ALERT — Bond slashed. 1.5 SOL removed from the executor's slashable bond after a disputed escrow. Score downgraded to SPX BB.",
    color: "critical" as const,
  },
  {
    eyebrow: "ESCROW CANCELED",
    body: "SPX402 ALERT — Escrow canceled before release. Third cancellation in 24h from the same operator wallet.",
    color: "amber" as const,
  },
  {
    eyebrow: "OPERATOR CHANGED",
    body: "SPX402 ALERT — Operator authority rotated to a new wallet while escrows were outstanding. SPX402 has opened a file.",
    color: "amber" as const,
  },
];

const EVENT_TOGGLES: Array<{ group: string; events: string[] }> = [
  {
    group: "AEON execution",
    events: [
      "Escrow created",
      "Escrow released",
      "Escrow canceled",
      "Bond deposited",
      "Bond slashed",
      "Receipt created",
    ],
  },
  {
    group: "Legacy lanes",
    events: [
      "Deposit received",
      "Buyback executed",
      "Burn confirmed",
      "Missed window",
      "Config changed",
      "Score drop",
    ],
  },
];

function AlertsPage() {
  return (
    <div className="mx-auto max-w-[1100px] px-4 py-12 lg:px-8 lg:py-20">
      <div className="inline-flex items-center gap-2 border border-amber/60 bg-amber/10 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-amber">
        <span className="h-1.5 w-1.5 rounded-full bg-amber pulse-amber" />
        Shipping soon
      </div>
      <div className="label-amber mt-5">Alerts</div>
      <h1 className="mt-3 font-display text-5xl font-bold leading-tight text-paper">
        When the tape changes,
        <br />
        <span className="text-amber">you hear it first.</span>
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-paper-muted">
        Subscribe to event-level alerts on any agent — escrow lifecycle, bond movement, receipts,
        and score changes. Filter by severity, type, and threshold. Operators get notified before
        holders do.
      </p>

      {/* CHANNELS */}
      <section className="mt-14">
        <h2 className="font-display text-2xl font-bold text-paper">Three channels</h2>
        <div className="mt-6 grid gap-px overflow-hidden border border-bronze/40 bg-bronze/40 md:grid-cols-3">
          {CHANNELS.map((c) => (
            <div key={c.name} className="bg-panel p-6">
              <c.icon className="h-7 w-7 text-amber" />
              <h3 className="mt-5 font-display text-xl font-semibold text-paper">{c.name}</h3>
              <p className="mt-2 text-sm text-paper-muted">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* EVENT COVERAGE */}
      <section className="mt-16">
        <h2 className="font-display text-2xl font-bold text-paper">What you can subscribe to</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {EVENT_TOGGLES.map((g) => (
            <div key={g.group} className="surface-raised p-6">
              <div className="eyebrow">{g.group}</div>
              <ul className="mt-4 space-y-2.5">
                {g.events.map((e) => (
                  <li key={e} className="flex items-center gap-3 font-mono text-sm text-paper">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald" />
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* SAMPLES */}
      <section className="mt-16">
        <h2 className="font-display text-2xl font-bold text-paper">Sample alerts</h2>
        <div className="mt-6 space-y-4">
          {SAMPLES.map((s) => {
            const cls =
              s.color === "verified"
                ? "border-verified/70"
                : s.color === "critical"
                  ? "border-critical/70"
                  : "border-amber/70";
            const labelCls =
              s.color === "verified"
                ? "text-verified"
                : s.color === "critical"
                  ? "text-critical"
                  : "text-amber";
            return (
              <div key={s.eyebrow} className={`border-l-4 ${cls} bg-panel-deep/60 p-5`}>
                <div className={`font-mono text-[10px] uppercase tracking-widest ${labelCls}`}>
                  {s.eyebrow}
                </div>
                <p className="mt-2 font-mono text-sm leading-relaxed text-paper">{s.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-16 panel-engraved p-8 text-center">
        <h2 className="font-display text-3xl font-bold text-paper">
          Be first when alerts go live.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-paper-muted">
          Create an account now — we'll notify subscribed users the moment the alert pipeline ships.
        </p>
        <div className="mt-6">
          <Link
            to="/signup"
            className="inline-flex border border-amber bg-amber px-5 py-3 font-mono text-xs uppercase tracking-widest text-panel-deep hover:bg-amber-dim"
          >
            Create account →
          </Link>
        </div>
      </div>
    </div>
  );
}
