import { createFileRoute, Link } from "@tanstack/react-router";
import { AgentSearchBar } from "@/components/spx/AgentSearchBar";
import { ExecutionGradeBadge } from "@/components/spx/ExecutionGradeBadge";
import { fetchAllAgents } from "@/lib/agents-db";
import type { Agent } from "@/lib/agents";
import { Panel } from "@/components/spx/Panel";
import { useEffect, useState } from "react";
import { ArrowDownToLine, Repeat, Flame, Award, ShieldCheck, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SPX402 — Execution Grade for Tokenized AI Agents" },
      {
        name: "description",
        content:
          "Paste a mint. Read the tape. SPX402 verifies tokenized agent deposits, buybacks, burns, and execution gaps on-chain.",
      },
      { property: "og:title", content: "SPX402 — Payment required. Proof provided." },
      {
        property: "og:description",
        content:
          "The execution-grade terminal for tokenized AI agents. We only rate what we can prove.",
      },
    ],
  }),
  loader: () => fetchAllAgents(),
  staleTime: 30_000,
  component: HomePage,
});

const BOOT_LINES = [
  "[ 0.001 ] SPX402 TERMINAL :: BOOT",
  "[ 0.014 ] PARSER v0.1.7 LOADED",
  "[ 0.038 ] HELIUS WEBHOOK STREAM   ONLINE",
  "[ 0.062 ] PUMP IDL DECODER        ARMED",
  "[ 0.087 ] SPL BURN OBSERVER       ARMED",
  "[ 0.112 ] AGENT INDEX             842 / 847 RECONCILED",
  "[ 0.140 ] HTTP 402                READY",
];

function BootSequence() {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (n >= BOOT_LINES.length) return;
    const t = setTimeout(() => setN(n + 1), 220);
    return () => clearTimeout(t);
  }, [n]);

  return (
    <div className="font-mono text-[11px] leading-relaxed text-amber/80">
      {BOOT_LINES.slice(0, n).map((l, i) => (
        <div key={i} className="boot-line">{l}</div>
      ))}
      {n >= BOOT_LINES.length ? (
        <div className="mt-1 text-paper cursor-blink">READY_</div>
      ) : (
        <div className="mt-1 text-amber cursor-blink"></div>
      )}
    </div>
  );
}

function TerminalSampleCard({ agent }: { agent: Agent | null }) {
  return (
    <div className="panel-engraved relative overflow-hidden">
      <div className="flex items-center justify-between border-b border-bronze/50 bg-panel-deep/60 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-critical" />
          <span className="h-2 w-2 rounded-full bg-amber" />
          <span className="h-2 w-2 rounded-full bg-verified" />
        </div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-wire">
          spx402://terminal/{agent ? "live-sample" : "awaiting-first-dossier"}
        </div>
        <div className="font-mono text-[10px] text-amber">● LIVE</div>
      </div>
      <div className="space-y-4 p-5">
        <BootSequence />
        <div className="rule-amber" />
        {agent ? (
          <>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="label-mono">Agent</div>
                <div className="mt-1 font-mono text-paper">{agent.name}</div>
              </div>
              <div>
                <div className="label-mono">Mint</div>
                <div className="mt-1 truncate font-mono text-paper">
                  {agent.mint.slice(0, 6)}…{agent.mint.slice(-4)}
                </div>
              </div>
              <div>
                <div className="label-mono">Status</div>
                <div className="mt-1 font-mono text-verified">TOKENIZED_AGENT_CONFIRMED</div>
              </div>
              <div>
                <div className="label-mono">Operator</div>
                <div className={`mt-1 font-mono ${agent.operatorVerified ? "text-verified" : "text-paper-muted"}`}>
                  {agent.operatorVerified ? "VERIFIED" : "UNVERIFIED"}
                </div>
              </div>
            </div>
            <div className="rule-bronze" />
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-xs">
              <div className="flex justify-between"><span className="text-wire">DEPOSITS OBSERVED</span><span className="text-paper">{agent.totalDepositsCount.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-wire">BUYBACKS</span><span className="text-paper">{agent.totalBuybacksCount.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-wire">BURNS</span><span className="text-paper">{agent.totalBurnsCount.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-wire">FAILED WINDOWS</span><span className="text-amber">{agent.failedWindows}</span></div>
              <div className="col-span-2 flex justify-between"><span className="text-wire">LAST BUYBACK</span><span className="text-paper">{agent.lastBuybackLabel}</span></div>
            </div>
            <div className="rule-amber" />
            <div className="flex items-center justify-between">
              <div>
                <div className="label-mono">Execution Grade</div>
                <div className="mt-2"><ExecutionGradeBadge grade={agent.grade} size="lg" /></div>
              </div>
              <div className="text-right">
                <div className="label-mono">Score</div>
                <div className="num-display mt-1 text-4xl font-bold text-verified">{agent.score ?? "—"}</div>
              </div>
            </div>
            {agent.tagline && (
              <div className="border-l-2 border-amber/60 pl-3 font-mono text-xs italic text-paper-muted">
                "{agent.tagline}"
              </div>
            )}
            <Link
              to="/agent/$mint"
              params={{ mint: agent.mint }}
              className="flex items-center justify-between border border-bronze/60 bg-panel-deep/60 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-amber transition-colors hover:bg-amber/10"
            >
              Open full dossier <ArrowRight className="h-3 w-3" />
            </Link>
          </>
        ) : (
          <>
            <div className="space-y-2 font-mono text-xs">
              <div className="flex justify-between"><span className="text-wire">REGISTRY SCAN</span><span className="text-amber">QUEUED</span></div>
              <div className="flex justify-between"><span className="text-wire">PUMP.FUN STREAM</span><span className="text-verified">LISTENING</span></div>
              <div className="flex justify-between"><span className="text-wire">CANDIDATES</span><span className="text-paper">awaiting first verified dossier</span></div>
            </div>
            <div className="rule-bronze" />
            <p className="font-mono text-xs text-paper-muted">
              No agent has yet passed the verification bar (on-chain earnings + at least one identity proof). Submit a mint or wait for the indexer to catch one in the wild.
            </p>
            <Link
              to="/submit"
              className="flex items-center justify-between border border-bronze/60 bg-panel-deep/60 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-amber transition-colors hover:bg-amber/10"
            >
              Submit a mint <ArrowRight className="h-3 w-3" />
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

const PROOF_STEPS = [
  { icon: ArrowDownToLine, title: "Deposit detected", body: "Agent Deposit Address receives SOL, USDC, USDT, or USD1.", code: "DEPOSIT_RECEIVED" },
  { icon: Repeat, title: "Buyback observed", body: "Tokenized Agent Authority routes assets into the agent token.", code: "BUYBACK_EXECUTED" },
  { icon: Flame, title: "Burn confirmed", body: "Bought tokens are removed from circulating supply.", code: "BURN_CONFIRMED" },
  { icon: Award, title: "Grade assigned", body: "Execution data becomes a public Transparency Score.", code: "GRADE_PUBLISHED" },
];

const CATCHES = [
  "Missing buybacks",
  "Deposits with no matching burn",
  "Creator config changes",
  "Failed transactions",
  "Stale agents",
  "Unsupported assets",
  "Suspicious wash-like windows",
  "Unverified operators",
  "Metadata drift",
];

const AUDIENCES = [
  {
    label: "Token communities",
    title: "One public URL.",
    body: "Verify whether an agent’s buyback and burn loop is visible on-chain. Share the dossier. Stop arguing in the replies.",
  },
  {
    label: "Operators",
    title: "Prove execution.",
    body: "Catch failures before holders do. Verify your wallet. Publish a badge that has teeth.",
  },
  {
    label: "Researchers & funds",
    title: "Screen by receipts.",
    body: "Filter agent tokens by observable execution patterns. Not screenshots. Not threads. Not vibes.",
  },
];

const GRADES = [
  { g: "SPX AAA", r: "90–100", t: "Flawless observable execution" },
  { g: "SPX AA", r: "80–89", t: "Consistent execution, minor anomalies" },
  { g: "SPX A", r: "70–79", t: "Active, some gaps" },
  { g: "SPX BBB", r: "60–69", t: "Functional but irregular" },
  { g: "SPX BB", r: "40–59", t: "Inconsistent, monitor closely" },
  { g: "SPX B", r: "20–39", t: "Stale or degraded" },
  { g: "SPX D", r: "0–19", t: "Inactive or high-risk pattern" },
  { g: "SPX404", r: "n/a", t: "Insufficient evidence to grade" },
] as const;

function HomePage() {
  const agents = Route.useLoaderData() as Agent[];
  const featured = agents.slice(0, 3);
  const heroAgent = agents[0] ?? null;
  const totalBuybacks = agents.reduce((acc, a) => acc + a.totalBuybacksCount, 0);
  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-[1400px] gap-12 px-4 py-16 lg:grid-cols-12 lg:gap-10 lg:px-8 lg:py-24">
          <div className="lg:col-span-7">
            <div className="label-amber">Tokenized Agent Execution Terminal · Solana Mainnet</div>
            <h1 className="mt-6 font-display text-5xl font-bold leading-[1.02] tracking-tight text-paper sm:text-6xl lg:text-7xl">
              HTTP 402.<br />
              Payment required.<br />
              <span className="text-amber">Proof provided.</span>
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-paper-muted">
              SPX402 verifies tokenized AI agents by reading the only witness
              that does not care about narratives: the chain. Paste a mint.
              See deposits, buybacks, burns, config changes, and execution gaps.
            </p>
            <p className="mt-3 max-w-xl font-mono text-sm text-wire">
              No hype. No price calls. No mercy for missing receipts.
            </p>

            <div className="mt-10">
              <AgentSearchBar size="lg" />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                to="/explore"
                className="border border-bronze/70 bg-transparent px-5 py-3 font-mono text-xs uppercase tracking-widest text-paper-muted hover:border-amber hover:text-amber"
              >
                Browse Explorer
              </Link>
              <Link
                to="/methodology"
                className="border border-bronze/70 bg-transparent px-5 py-3 font-mono text-xs uppercase tracking-widest text-paper-muted hover:border-amber hover:text-amber"
              >
                Read Methodology
              </Link>
            </div>

            <div className="mt-10 grid max-w-md grid-cols-3 gap-6">
              <div>
                <div className="num-display text-2xl font-bold text-paper">{agents.length.toLocaleString()}</div>
                <div className="label-mono mt-1">Agents indexed</div>
              </div>
              <div>
                <div className="num-display text-2xl font-bold text-paper">{totalBuybacks.toLocaleString()}</div>
                <div className="label-mono mt-1">Buybacks confirmed</div>
              </div>
              <div>
                <div className="num-display text-2xl font-bold text-paper">5m</div>
                <div className="label-mono mt-1">Reconcile cadence</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <TerminalSampleCard agent={heroAgent} />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1400px] px-4 lg:px-8">
        <div className="rule-amber" />
      </div>

      {/* PROOF CHAIN */}
      <section className="mx-auto max-w-[1400px] px-4 py-20 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="label-amber">The Proof Chain</div>
            <h2 className="mt-3 font-display text-4xl font-bold leading-tight text-paper">
              Revenue claims are cheap. <span className="text-paper-muted">Execution is expensive.</span>
            </h2>
            <p className="mt-5 max-w-sm text-paper-muted">
              SPX402 follows the trail from deposit to buyback to burn.
              If the flow breaks, stalls, or disappears, the grade changes.
            </p>
          </div>
          <div className="lg:col-span-8">
            <ol className="grid gap-px overflow-hidden border border-bronze/40 bg-bronze/40 sm:grid-cols-2">
              {PROOF_STEPS.map((s, i) => (
                <li key={s.title} className="relative bg-panel p-6">
                  <div className="flex items-start justify-between">
                    <s.icon className="h-6 w-6 text-amber" aria-hidden />
                    <span className="font-mono text-[10px] tracking-widest text-wire">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-xl font-semibold text-paper">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-paper-muted">
                    {s.body}
                  </p>
                  <div className="mt-4 inline-block border border-bronze/60 bg-panel-deep px-2 py-1 font-mono text-[10px] tracking-widest text-amber">
                    {s.code}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* WHAT SPX402 CATCHES */}
      <section className="border-y border-bronze/40 bg-panel-deep">
        <div className="mx-auto max-w-[1400px] px-4 py-20 lg:px-8">
          <div className="label-amber">What SPX402 Catches</div>
          <h2 className="mt-3 max-w-3xl font-display text-4xl font-bold leading-tight text-paper">
            We do not care what the agent says.{" "}
            <span className="text-paper-muted">We care what the agent settles.</span>
          </h2>
          <ul className="mt-12 grid gap-px overflow-hidden border border-bronze/40 bg-bronze/40 sm:grid-cols-2 lg:grid-cols-3">
            {CATCHES.map((c) => (
              <li
                key={c}
                className="bg-background p-5 font-mono text-sm uppercase tracking-wider text-paper"
              >
                <span className="mr-2 text-amber">✕</span> {c}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* AUDIENCES */}
      <section className="mx-auto max-w-[1400px] px-4 py-20 lg:px-8">
        <div className="label-amber">Built for three users</div>
        <h2 className="mt-3 font-display text-4xl font-bold text-paper">
          For agents that claim revenue.
        </h2>
        <div className="mt-12 grid gap-px overflow-hidden border border-bronze/40 bg-bronze/40 md:grid-cols-3">
          {AUDIENCES.map((a) => (
            <div key={a.label} className="bg-panel p-7">
              <div className="label-amber">{a.label}</div>
              <h3 className="mt-4 font-display text-2xl font-bold text-paper">
                {a.title}
              </h3>
              <p className="mt-3 leading-relaxed text-paper-muted">{a.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* GRADE TAXONOMY */}
      <section className="border-t border-bronze/40 bg-panel-deep">
        <div className="mx-auto max-w-[1400px] px-4 py-20 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <div className="label-amber">Execution Grade</div>
              <h2 className="mt-3 font-display text-4xl font-bold text-paper">
                A public score for observable behavior.
              </h2>
              <p className="mt-5 text-paper-muted">
                Grades are not predictions. Grades are not recommendations.
                Grades are not financial advice.
              </p>
              <p className="mt-3 font-mono text-sm text-wire">
                They compress observed execution signals. Nothing more.
              </p>
            </div>
            <div className="lg:col-span-8">
              <div className="overflow-hidden border border-bronze/40">
                {GRADES.map((g, i) => (
                  <div
                    key={g.g}
                    className={`grid grid-cols-12 items-center gap-4 px-5 py-4 ${i % 2 ? "bg-panel" : "bg-background"}`}
                  >
                    <div className="col-span-4 sm:col-span-3">
                      <ExecutionGradeBadge grade={g.g as "SPX AAA"} size="sm" />
                    </div>
                    <div className="col-span-3 sm:col-span-2 font-mono text-sm text-paper-muted">
                      {g.r}
                    </div>
                    <div className="col-span-12 sm:col-span-7 text-sm text-paper">
                      {g.t}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* API */}
      <section className="mx-auto max-w-[1400px] px-4 py-20 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-6">
            <div className="label-amber">SPX402 API</div>
            <h2 className="mt-3 font-display text-4xl font-bold leading-tight text-paper">
              Agents will not browse dashboards. <span className="text-paper-muted">Agents will query other agents.</span>
            </h2>
            <p className="mt-5 max-w-lg text-paper-muted">
              SPX402 exposes execution data over REST and pay-per-call HTTP 402
              endpoints designed for machine buyers. Auditable by anyone.
            </p>
            <div className="mt-8 flex gap-3">
              <Link to="/api" className="border border-amber/80 bg-amber/10 px-5 py-3 font-mono text-xs uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep">
                API Overview
              </Link>
              <Link to="/api/docs" className="border border-bronze/70 px-5 py-3 font-mono text-xs uppercase tracking-widest text-paper-muted hover:text-paper hover:border-amber">
                Endpoints
              </Link>
            </div>
          </div>
          <div className="lg:col-span-6">
            <div className="panel-engraved overflow-hidden">
              <div className="flex items-center justify-between border-b border-bronze/50 bg-panel-deep/60 px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest">
                <span className="text-amber">GET</span>
                <span className="text-wire">api.spx402.xyz/v1/agent/:mint</span>
                <span className="text-verified">200 OK</span>
              </div>
              <pre className="overflow-x-auto bg-panel-deep/30 p-5 font-mono text-[12px] leading-relaxed text-paper">
{`{
  "mint": "7xK...Q92",
  "symbol": "NOVA",
  "grade": "SPX AA",
  "transparencyScore": 87,
  "operatorVerified": true,
  "lastBuybackAt": "2026-04-24T16:42:11Z",
  "lastBurnAt": "2026-04-24T16:42:11Z",
  "buybackExecutionRate": 0.964,
  "burnConfirmationRate": 1,
  "status": "active",
  "confidence": "high"
}`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING PREVIEW */}
      <section className="border-y border-bronze/40 bg-panel-deep">
        <div className="mx-auto max-w-[1400px] px-4 py-20 lg:px-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="label-amber">Pricing</div>
              <h2 className="mt-3 font-display text-4xl font-bold text-paper">
                Free to verify. Paid to monitor.
              </h2>
            </div>
            <Link to="/pricing" className="font-mono text-xs uppercase tracking-widest text-amber hover:underline">
              Full pricing →
            </Link>
          </div>
          <div className="mt-12 grid gap-px overflow-hidden border border-bronze/40 bg-bronze/40 md:grid-cols-2 lg:grid-cols-4">
            {[
              { p: "Free", price: "$0", body: "Public dossiers, 30-day history, 1 alert." },
              { p: "Pro", price: "$49", body: "Realtime alerts, full history, CSV export, badges." },
              { p: "Team", price: "$149", body: "REST API, webhooks, multi-wallet operator." },
              { p: "x402 API", price: "per call", body: "Pay-per-request HTTP 402 endpoints." },
            ].map((x) => (
              <div key={x.p} className="bg-background p-6">
                <div className="label-amber">{x.p}</div>
                <div className="mt-3 num-display text-3xl font-bold text-paper">{x.price}</div>
                <p className="mt-3 text-sm text-paper-muted">{x.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED AGENTS */}
      <section className="mx-auto max-w-[1400px] px-4 py-20 lg:px-8">
        <div className="flex items-end justify-between">
          <div>
            <div className="label-amber">Currently watched</div>
            <h2 className="mt-3 font-display text-3xl font-bold text-paper">
              {featured.length > 0 ? "The tape is loud today." : "The tape is quiet."}
            </h2>
          </div>
          <Link to="/explore" className="font-mono text-xs uppercase tracking-widest text-amber hover:underline">
            Explore →
          </Link>
        </div>
        {featured.length === 0 ? (
          <div className="mt-8 border border-dashed border-bronze/60 p-10 text-center">
            <div className="font-mono text-sm text-paper-muted">
              No verified agents in the index yet.
            </div>
            <p className="mt-3 mx-auto max-w-md font-mono text-xs text-wire">
              SPX402 only lists agents that have been observed earning on-chain AND carry at least one identity proof. The discovery indexer is running. Submit a mint or wait for the next sweep.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-px overflow-hidden border border-bronze/40 bg-bronze/40 md:grid-cols-3">
            {featured.map((a) => (
              <Link
                key={a.mint}
                to="/agent/$mint"
                params={{ mint: a.mint }}
                className="group bg-panel p-6 transition-colors hover:bg-panel-deep"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-display text-2xl font-bold text-paper">${a.symbol}</div>
                    <div className="font-mono text-xs text-wire">{a.name}</div>
                  </div>
                  {a.operatorVerified && <ShieldCheck className="h-4 w-4 text-verified" />}
                </div>
                <div className="mt-6 flex items-center justify-between">
                  <ExecutionGradeBadge grade={a.grade} size="sm" />
                  <div className="num-display text-2xl font-bold text-amber">
                    {a.score ?? "—"}
                  </div>
                </div>
                {a.tagline && (
                  <p className="mt-4 border-l border-amber/40 pl-3 font-mono text-xs italic text-paper-muted">
                    "{a.tagline}"
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* FINAL CTA */}
      <section className="mx-auto max-w-[1400px] px-4 pb-24 lg:px-8">
        <Panel className="text-center" bodyClassName="px-6 py-16">
          <div className="label-amber">Final word</div>
          <h2 className="mt-4 font-display text-5xl font-bold text-paper sm:text-6xl">
            Paste the mint.<br />
            <span className="text-amber">Let the tape speak.</span>
          </h2>
          <div className="mx-auto mt-10 max-w-2xl">
            <AgentSearchBar size="md" />
          </div>
          <p className="mt-8 font-mono text-xs uppercase tracking-widest text-wire">
            SPX402 provides operational transparency only. Not investment advice.
          </p>
        </Panel>
      </section>
    </div>
  );
}
