import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, MessageSquare, Webhook } from "lucide-react";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts — SPX402" },
      { name: "description", content: "Email, Telegram, and webhook alerts on tokenized agent execution." },
      { property: "og:title", content: "SPX402 Alerts" },
      { property: "og:description", content: "When the tape changes, you hear it first." },
    ],
  }),
  component: AlertsPage,
});

const CHANNELS = [
  { icon: Mail, name: "Email", body: "Plain text, no marketing. Designed to be read at 3am during a launch." },
  { icon: MessageSquare, name: "Telegram", body: "Bot delivery to a private channel. Markdown formatted, signature-linked." },
  { icon: Webhook, name: "Webhooks", body: "Team plan only. Idempotent JSON, retries with exponential backoff." },
];

const SAMPLES = [
  {
    eyebrow: "BUYBACK EXECUTED",
    body: "SPX402 ALERT — NOVA: Buyback executed. 2.1 SOL routed via Tokenized Agent Authority. 142,000 NOVA burned. Confirmed on-chain.",
    color: "verified" as const,
  },
  {
    eyebrow: "NO BUYBACK OVERDUE",
    body: "SPX402 ALERT — FLUX: Expected buyback window missed. 4 consecutive failures. Score downgraded to SPX BB.",
    color: "amber" as const,
  },
  {
    eyebrow: "CONFIG CHANGED",
    body: "SPX402 ALERT — NOVA: buyback_bps changed from 2500 to 3000 by creator wallet. Operator notified.",
    color: "amber" as const,
  },
  {
    eyebrow: "ANOMALY DETECTED",
    body: "SPX402 ALERT — UNKNOWN: Large deposit observed (1,200 USDC). No matching buyback after expected window. SPX402 has opened a file.",
    color: "critical" as const,
  },
];

function AlertsPage() {
  return (
    <div className="mx-auto max-w-[1100px] px-4 py-12 lg:px-8 lg:py-20">
      <div className="label-amber">Alerts</div>
      <h1 className="mt-3 font-display text-5xl font-bold leading-tight text-paper">
        When the tape changes,<br />
        <span className="text-amber">you hear it first.</span>
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-paper-muted">
        Subscribe to event-level alerts on any agent. Filter by severity, type,
        and threshold. Operators get notified before holders do.
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
          Configure your first alert.
        </h2>
        <div className="mt-6">
          <Link to="/signup" className="inline-flex border border-amber bg-amber px-5 py-3 font-mono text-xs uppercase tracking-widest text-panel-deep hover:bg-amber-dim">
            Open dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
}
