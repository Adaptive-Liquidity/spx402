import { createFileRoute } from "@tanstack/react-router";
import { ExecutionGradeBadge } from "@/components/spx/ExecutionGradeBadge";
import { Panel } from "@/components/spx/Panel";

export const Route = createFileRoute("/methodology")({
  head: () => ({
    meta: [
      { title: "Methodology — SPX402" },
      {
        name: "description",
        content: "How the Transparency Score is calculated. Receipt compression, not opinion.",
      },
      { property: "og:title", content: "SPX402 Methodology" },
      { property: "og:description", content: "The score is not an opinion. It is a receipt compression algorithm." },
    ],
  }),
  component: MethodologyPage,
});

const FORMULA = [
  { label: "Deposit Consistency", weight: 20, body: "Density and regularity of confirmed deposits to the Agent Deposit Address." },
  { label: "Buyback Execution Rate", weight: 25, body: "Ratio of expected buyback windows that produced a confirmed buyback." },
  { label: "Burn Confirmation Rate", weight: 20, body: "Ratio of buybacks that resulted in confirmed SPL Token burns." },
  { label: "Failed / Errored Tx", weight: 15, body: "Inverse score for failed buyback or burn instructions in observed windows." },
  { label: "Recency", weight: 10, body: "Time since the last successful buyback. Decays with silence." },
  { label: "Metadata", weight: 5, body: "Presence of skills.md and parseable metadata for the agent." },
  { label: "Operator Verification", weight: 5, body: "Wallet signature confirmed against the on-chain creator record." },
];

const GRADES = [
  { g: "SPX AAA", r: "90–100", t: "Flawless observable execution." },
  { g: "SPX AA", r: "80–89", t: "Consistent execution with minor anomalies." },
  { g: "SPX A", r: "70–79", t: "Active, with some gaps." },
  { g: "SPX BBB", r: "60–69", t: "Functional but irregular." },
  { g: "SPX BB", r: "40–59", t: "Inconsistent. Monitor closely." },
  { g: "SPX B", r: "20–39", t: "Stale or degraded." },
  { g: "SPX D", r: "0–19", t: "Inactive or high-risk execution pattern." },
  { g: "SPX404", r: "n/a", t: "Agent not found, or insufficient evidence to grade." },
] as const;

const CONFIDENCE = [
  { k: "high", c: "verified", body: "Raw transaction, decoded instruction, balance delta, and expected mint all agree." },
  { k: "medium", c: "amber", body: "Balance delta and address context agree, but the instruction path is ambiguous." },
  { k: "low", c: "amber-dim", body: "Signal exists, but supporting evidence is incomplete." },
  { k: "unknown", c: "critical", body: "SPX402 has insufficient evidence. The correct answer is “unknown”, not “probably fine”." },
];

function MethodologyPage() {
  return (
    <div className="mx-auto max-w-[1100px] px-4 py-12 lg:px-8 lg:py-20">
      <div className="label-amber">Methodology</div>
      <h1 className="mt-3 font-display text-5xl font-bold leading-tight text-paper">
        The score is not an opinion.<br />
        <span className="text-amber">It is a receipt compression algorithm.</span>
      </h1>
      <p className="mt-6 max-w-2xl text-lg text-paper-muted">
        SPX402 grades observable on-chain execution patterns. Every input is derived
        from a verifiable signature, slot, and instruction. No off-chain claims, no
        social signals, no token price.
      </p>

      {/* WHAT WE MEASURE */}
      <section className="mt-16">
        <h2 className="font-display text-2xl font-bold text-paper">What SPX402 measures</h2>
        <p className="mt-2 max-w-2xl text-paper-muted">
          Deposits, buybacks, burns, failed windows, metadata presence, operator
          verification, and time since the last successful execution.
        </p>
      </section>

      {/* WHAT WE REFUSE */}
      <section className="mt-10">
        <h2 className="font-display text-2xl font-bold text-paper">What SPX402 refuses to measure</h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {[
            "Token price",
            "Expected return",
            "Social momentum",
            "Meme quality",
            "Celebrity endorsement",
            "Holder count",
            "Vibes",
            "Future buyback promises",
          ].map((x) => (
            <li key={x} className="border-l-2 border-critical/70 bg-panel-deep/40 px-4 py-2 font-mono text-sm text-paper-muted">
              <span className="mr-2 text-critical">✕</span> {x}
            </li>
          ))}
        </ul>
      </section>

      {/* FORMULA */}
      <section className="mt-16">
        <Panel eyebrow="Score Formula" title="Transparency Score = Σ weighted execution signals">
          <div className="space-y-4">
            {FORMULA.map((row) => (
              <div key={row.label}>
                <div className="flex items-baseline justify-between">
                  <div className="font-display text-base font-semibold text-paper">{row.label}</div>
                  <div className="num-display text-amber">{row.weight}%</div>
                </div>
                <div className="mt-2 h-1 w-full bg-bronze-dim/60">
                  <div className="h-full bg-amber" style={{ width: `${row.weight * 4}%` }} />
                </div>
                <p className="mt-2 text-sm text-paper-muted">{row.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 rule-bronze" />
          <p className="mt-5 font-mono text-sm text-paper">
            Σ = 100 points · Grade is assigned by the band the score falls in.
          </p>
        </Panel>
      </section>

      {/* GRADE TAXONOMY */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-bold text-paper">Grade taxonomy</h2>
        <div className="mt-6 overflow-hidden border border-bronze/50">
          {GRADES.map((g, i) => (
            <div
              key={g.g}
              className={`grid grid-cols-12 items-center gap-4 px-5 py-4 ${i % 2 ? "bg-panel" : "bg-background"}`}
            >
              <div className="col-span-5 sm:col-span-3">
                <ExecutionGradeBadge grade={g.g as "SPX AAA"} size="sm" />
              </div>
              <div className="col-span-3 sm:col-span-2 font-mono text-sm text-paper-muted">{g.r}</div>
              <div className="col-span-12 sm:col-span-7 text-sm text-paper">{g.t}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CONFIDENCE */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-bold text-paper">Event confidence</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {CONFIDENCE.map((c) => (
            <div key={c.k} className="panel-engraved p-5">
              <div className={`label-mono`} style={{ color: `var(--${c.c})` }}>
                {c.k}
              </div>
              <p className="mt-3 text-sm text-paper">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DATA SOURCES */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-bold text-paper">Data sources</h2>
        <ul className="mt-4 space-y-3 text-paper-muted">
          <li className="border-l-2 border-amber/60 pl-3"><span className="font-mono text-paper">Helius webhooks</span> — live on-chain event delivery, with idempotent reconciliation against duplicate retries.</li>
          <li className="border-l-2 border-amber/60 pl-3"><span className="font-mono text-paper">Raw transaction backfill</span> — reconciled against decoded instructions for missed events.</li>
          <li className="border-l-2 border-amber/60 pl-3"><span className="font-mono text-paper">Pump &amp; PumpSwap IDLs</span> — canonical instruction decoding from the official public IDL repository.</li>
          <li className="border-l-2 border-amber/60 pl-3"><span className="font-mono text-paper">SPL Token burn detection</span> — direct on-chain confirmation, not log parsing.</li>
          <li className="border-l-2 border-amber/60 pl-3"><span className="font-mono text-paper">Manual fixture validation</span> — every parser version is regression-tested against a corpus of real transactions.</li>
        </ul>
      </section>

      {/* WHY PRICE IS EXCLUDED */}
      <section className="mt-12 panel-engraved p-7">
        <h2 className="font-display text-2xl font-bold text-paper">Why token price is excluded</h2>
        <p className="mt-3 max-w-3xl text-paper-muted">
          Token price reflects market participation, liquidity conditions, and
          speculation. None of those are operational signals. SPX402 grades whether
          an agent settles its claimed flow on-chain. Whether the market rewards or
          ignores that flow is not part of the score.
        </p>
      </section>

      {/* WHY SPX402 CAN DOWNGRADE ITSELF */}
      <section className="mt-8 panel-engraved p-7">
        <h2 className="font-display text-2xl font-bold text-paper">Why SPX402 can downgrade itself</h2>
        <p className="mt-3 max-w-3xl text-paper-muted">
          SPX402&apos;s own tokenized agent is scored by the same methodology as every
          other tracked agent. If our buybacks fail or our operator stops signing,
          the grade drops. The trust layer dies the moment the rater grants itself
          an exception.
        </p>
      </section>

      {/* LIMITATIONS */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-bold text-paper">Known limitations</h2>
        <ul className="mt-4 space-y-3 text-sm text-paper-muted">
          <li>• Webhook delivery latency may delay event ingestion. Reconciliation runs every 60 seconds.</li>
          <li>• Custom buyback routes outside known IDLs may surface as low-confidence events.</li>
          <li>• Off-chain revenue, service quality, and operator intent are unknowable to SPX402.</li>
          <li>• A high score does not predict price, future execution, or solvency.</li>
        </ul>
      </section>

      {/* APPEALS */}
      <section className="mt-12 panel-engraved p-7">
        <h2 className="font-display text-2xl font-bold text-paper">Appeals and corrections</h2>
        <p className="mt-3 text-paper-muted">
          Operators may submit a verification signature and a parser-fixture link
          via the operator dashboard. Score recalculations are deterministic and
          replayable from the underlying event log.
        </p>
      </section>
    </div>
  );
}
