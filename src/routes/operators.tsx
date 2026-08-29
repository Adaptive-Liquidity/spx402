import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, KeyRound, AlertTriangle, Eye } from "lucide-react";
import { Panel } from "@/components/spx/Panel";

export const Route = createFileRoute("/operators")({
  head: () => ({
    meta: [
      { title: "Operators — Prove your agent is not just talking · SPX402" },
      {
        name: "description",
        content: "Verify operator identity. Catch execution failures. Publish a badge with teeth.",
      },
      { property: "og:title", content: "SPX402 for Operators" },
      {
        property: "og:description",
        content: "Prove execution. Catch failures. Verify your wallet.",
      },
    ],
  }),
  component: OperatorsPage,
});

const STEPS = [
  {
    icon: KeyRound,
    title: "Connect wallet",
    body: "Connect the same Solana wallet listed as the agent creator on-chain.",
  },
  {
    icon: ShieldCheck,
    title: "Sign one message",
    body: "Sign a one-time challenge string. SPX402 verifies the Ed25519 signature.",
  },
  {
    icon: Eye,
    title: "Operator Verified",
    body: "If the signature matches the creator record, your dossier shows Operator Verified.",
  },
];

const ALERT_TYPES = [
  {
    title: "Buyback missed",
    body: "Expected buyback window passed without a confirmed instruction.",
  },
  { title: "Burn missing", body: "Buyback observed but no SPL burn within the expected window." },
  {
    title: "Deposit unsupported",
    body: "Asset received that does not match supported initial receipt assets.",
  },
  { title: "Config changed", body: "Creator changed buyback parameters on-chain." },
  { title: "Webhook lag", body: "Helius delivery latency above your operator threshold." },
];

function OperatorsPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-12 lg:px-8 lg:py-20">
      <div className="label-amber">Operators</div>
      <h1 className="mt-3 font-display text-5xl font-bold leading-tight text-paper">
        Prove your agent is <span className="text-amber">not just talking.</span>
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-paper-muted">
        Operators publish on the same scoreboard as the agents they ship. SPX402 gives you a
        verifiable identity, an alert pipeline, and a badge that costs more to fake than to earn.
      </p>

      {/* VERIFY FLOW */}
      <section className="mt-16">
        <h2 className="font-display text-2xl font-bold text-paper">Verify operator identity</h2>
        <div className="mt-6 grid gap-px overflow-hidden border border-bronze/40 bg-bronze/40 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="bg-panel p-6">
              <div className="flex items-center justify-between">
                <s.icon className="h-6 w-6 text-amber" />
                <span className="font-mono text-[10px] tracking-widest text-wire">0{i + 1}</span>
              </div>
              <h3 className="mt-5 font-display text-xl font-semibold text-paper">{s.title}</h3>
              <p className="mt-2 text-sm text-paper-muted">{s.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 panel-engraved p-5 font-mono text-sm">
          <div className="text-paper-muted">
            <span className="mr-2 text-verified">▶</span>
            Operator verified.
          </div>
          <div className="ml-6 text-paper">Ed25519 signature confirmed.</div>
          <div className="ml-6 text-wire">People lie. Signatures are less creative.</div>
        </div>
      </section>

      {/* BADGE */}
      <section className="mt-16">
        <h2 className="font-display text-2xl font-bold text-paper">Publish a verified badge</h2>
        <p className="mt-3 max-w-2xl text-paper-muted">
          Embed the badge on your site, token page, docs, or community post. Every badge links back
          to the public dossier so any reader can audit the source.
        </p>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="panel-engraved flex items-center justify-center p-12">
            <div className="border-2 border-amber bg-panel-deep px-6 py-4 text-center">
              <div className="font-mono text-[10px] uppercase tracking-widest text-amber">
                Verified by SPX402
              </div>
              <div className="mt-1 font-display text-xl font-bold text-paper">$NOVA · SPX AA</div>
              <div className="font-mono text-[10px] text-wire">87 / 100 · operator verified</div>
            </div>
          </div>
          <div className="panel-engraved p-6">
            <div className="label-amber">Embed snippet</div>
            <pre className="mt-4 overflow-x-auto border border-bronze/40 bg-panel-deep p-4 font-mono text-[11px] leading-relaxed text-paper">
              {`<a
  href="https://spx402.xyz/agent/7xKQ92..."
  target="_blank" rel="noopener"
>
  <img
    src="https://spx402.xyz/badge/7xKQ92.svg"
    alt="Verified by SPX402 — SPX AA"
  />
</a>`}
            </pre>
          </div>
        </div>
      </section>

      {/* ALERTS */}
      <section className="mt-16">
        <h2 className="font-display text-2xl font-bold text-paper">Catch execution failures</h2>
        <p className="mt-3 max-w-2xl text-paper-muted">
          Operators are notified before holders are. Configure thresholds, severity, and routing per
          agent.
        </p>
        <ul className="mt-8 grid gap-px overflow-hidden border border-bronze/40 bg-bronze/40 md:grid-cols-2 lg:grid-cols-3">
          {ALERT_TYPES.map((a) => (
            <li key={a.title} className="bg-panel p-5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber" />
                <span className="font-display text-base font-semibold text-paper">{a.title}</span>
              </div>
              <p className="mt-2 text-sm text-paper-muted">{a.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* PRIVATE DASHBOARD */}
      <section className="mt-16">
        <Panel eyebrow="Private operator dashboard" title="What you see (and only you)">
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              "Invoices and payment activity",
              "Deposits and observed residual receipt assets",
              "Open and resolved alerts",
              "Public profile controls",
              "Webhook delivery health",
              "Methodology change-impact preview",
            ].map((x) => (
              <div
                key={x}
                className="border-l-2 border-amber/60 bg-panel-deep/40 px-4 py-3 text-sm text-paper"
              >
                {x}
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="mt-16 panel-engraved p-8 text-center">
        <h2 className="font-display text-3xl font-bold text-paper">Ready to prove it on-chain?</h2>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/signup"
            className="border border-amber bg-amber px-5 py-3 font-mono text-xs uppercase tracking-widest text-panel-deep hover:bg-amber-dim"
          >
            Verify operator
          </Link>
          <Link
            to="/pricing"
            className="border border-bronze/70 px-5 py-3 font-mono text-xs uppercase tracking-widest text-paper-muted hover:border-amber hover:text-amber"
          >
            Pricing
          </Link>
        </div>
      </section>
    </div>
  );
}
