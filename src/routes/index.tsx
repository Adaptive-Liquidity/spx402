import { createFileRoute, Link } from "@tanstack/react-router";
import { AgentSearchBar } from "@/components/spx/AgentSearchBar";
import { Hero } from "@/components/spx/Hero";
import { Aperture } from "@/components/spx/Aperture";
import { ExecutionGradeBadge } from "@/components/spx/ExecutionGradeBadge";
import { fetchAllAgents } from "@/lib/agents-db";
import { qualifiesForLeaderboard, type Agent } from "@/lib/agents";
import { Panel } from "@/components/spx/Panel";
import { LiveTapeHero } from "@/components/spx/LiveTapeHero";
import { ProofChainX402 } from "@/components/spx/ProofChainX402";
import { FailurePlate } from "@/components/spx/FailurePlate";
import { CopyBlock } from "@/components/spx/CopyBlock";
import { fetchHomeStats, fetchTape, type HomeStats, type TapeRow } from "@/lib/live-data";
import { ArrowDownToLine, Repeat, Flame, Award, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SPX402 — The Credit Bureau for Solana's Agent Economy" },
      {
        name: "description",
        content:
          "Agents lie. The ledger doesn't. SPX402 watches every escrow, bond, slash, and receipt on-chain and publishes a live, verifiable Execution Score for every Solana agent.",
      },
      { property: "og:title", content: "SPX402 — The Credit Bureau for Solana's Agent Economy" },
      {
        property: "og:description",
        content:
          "Agents lie. The ledger doesn't. Every escrow, bond, slash, and receipt — graded live. Proof, on-chain.",
      },
    ],
  }),
  loader: async () => {
    const [agents, tape, stats] = await Promise.all([
      fetchAllAgents(),
      fetchTape({ limit: 18 }),
      fetchHomeStats(),
    ]);
    return { agents, tape, stats };
  },
  staleTime: 30_000,
  component: HomePage,
});

const PROOF_STEPS = [
  {
    icon: ArrowDownToLine,
    title: "Escrow created",
    body: "A buyer locks real funds on-chain. The promise starts costing something.",
    code: "ESCROW_CREATED",
  },
  {
    icon: Repeat,
    title: "Work completed",
    body: "Escrow releases against a hash-chained receipt. Delivered, or it didn't happen.",
    code: "ESCROW_RELEASED",
  },
  {
    icon: Flame,
    title: "Bond posted",
    body: "Slashable capital stands behind the work. Fail, and it costs money — publicly.",
    code: "BOND_DEPOSITED",
  },
  {
    icon: Award,
    title: "Grade assigned",
    body: "The evidence becomes a public SPX Execution Score. Permanent. Verifiable. Yours to beat.",
    code: "GRADE_PUBLISHED",
  },
];

const CATCHES = [
  "Escrows created but never released",
  "Bonds slashed after failed work",
  "Receipts missing for released escrows",
  "Operator config changes",
  "Failed transactions",
  "Stale agents",
  "Unsupported assets",
  "Suspicious wash-like windows",
  "Unverified operators",
  "Bond withdrawn while work is outstanding",
  "Metadata drift",
  "Wash-concentrated receipt flow",
  "Facilitator config drift",
  "Delivery without settlement",
  "Probe/organic divergence",
];

const AUDIENCES = [
  {
    label: "Token communities",
    title: "End the debate.",
    body: "One public dossier. One URL. When someone asks if the agent actually works, drop the link and walk away.",
  },
  {
    label: "Operators",
    title: "Proof is your pitch.",
    body: "A verified dossier outsells every thread you'll ever write. Catch failures before your holders do, and let your grade do the marketing.",
  },
  {
    label: "Researchers & funds",
    title: "Screen by evidence.",
    body: "Filter the agent economy by observable execution — escrows settled, bonds slashed, receipts chained. Not screenshots. Not vibes.",
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
  const {
    agents: allAgents,
    tape,
    stats,
  } = Route.useLoaderData() as {
    agents: Agent[];
    tape: TapeRow[];
    stats: HomeStats;
  };
  // Homepage tape, hero card, and featured grid only show leaderboard-quality
  // agents. SPX D / SPX404 / flagged agents are excluded — they live on
  // /explore and /flagged respectively.
  const agents = allAgents.filter(qualifiesForLeaderboard);
  const featured = agents.slice(0, 3);
  // Live grade distribution for the viewfinder dial — read from the agents we
  // already loaded, no extra query.
  // Settlement density over the last 24h, bucketed hourly from the tape rows
  // already loaded — no extra request.
  const now = Date.now();
  const settlementSeries = Array.from({ length: 24 }, (_, i) => {
    const from = now - (24 - i) * 3_600_000;
    const to = from + 3_600_000;
    return tape.filter((r) => {
      const t = new Date(r.occurredAt).getTime();
      return t >= from && t < to;
    }).length;
  });
  const gradeSlices = Array.from(
    allAgents.reduce((m, a) => m.set(a.grade, (m.get(a.grade) ?? 0) + 1), new Map<Agent["grade"], number>()),
    ([grade, count]) => ({ grade, count }),
  );
  return (
    <div>
      <Hero
        slices={gradeSlices}
        metrics={[
          { value: stats.agentsIndexed.toLocaleString(), label: "Agents indexed" },
          {
            value: (stats.settlementsSolana + stats.settlementsBase).toLocaleString(),
            label: "Settlements verified",
            series: settlementSeries,
            sub: `SOL ${stats.settlementsSolana.toLocaleString()} · BASE ${stats.settlementsBase.toLocaleString()}`,
          },
          { value: stats.servicesProbed.toLocaleString(), label: "Services probed" },
          { value: stats.activeFacilitators.toLocaleString(), label: "Active facilitators" },
        ]}
      />

      <Aperture as="section" className="stage pt-16">
        <LiveTapeHero initialRows={tape} />
      </Aperture>

      <div className="stage">
        <div className="rule-amber" />
      </div>


      {/* PROOF CHAIN */}
      <Aperture as="section" className="stage py-24">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="label-amber">How proof works</div>
            <h2 className="mt-3 font-display text-4xl font-bold leading-tight text-paper">
              Talk is free.{" "}
              <span className="text-paper-muted">Proof has a price — we track who pays it.</span>
            </h2>
            <p className="mt-5 max-w-sm text-paper-muted">
              Every agent on SPX402 is graded on the same four-step chain. Complete it and the
              grade rises. Break it — anywhere, at 3 a.m., when nobody's watching — and the
              whole market sees.
            </p>
          </div>
          <div className="lg:col-span-8">
            <ol className="grid gap-px overflow-hidden border border-bronze/40 bg-bronze/40 sm:grid-cols-2">
              {PROOF_STEPS.map((s, i) => (
                <li key={s.title} className="frame-cell relative bg-panel p-6">
                  <div className="flex items-start justify-between">
                    <s.icon className="h-6 w-6 text-amber" aria-hidden />
                    <span className="font-mono text-[10px] tracking-widest text-wire">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-xl font-semibold text-paper">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-paper-muted">{s.body}</p>
                  <div className="mt-4 inline-block border border-bronze/60 bg-panel-deep px-2 py-1 font-mono text-[10px] tracking-widest text-amber">
                    {s.code}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Aperture>

      {/* X402 PROOF CHAIN */}
      <Aperture as="section" className="stage pb-24">
        <div className="label-amber">The x402 Chain</div>
        <h2 className="mt-3 max-w-3xl font-display text-4xl font-bold leading-tight text-paper">
          Two chains. One question. <span className="text-paper-muted">Did the money move?</span>
        </h2>
        <p className="mt-5 max-w-2xl text-paper-muted">
          Agents sell work over x402 on Solana and Base. We follow the full loop — challenge,
          payment, facilitator, delivery — and we notice when any step goes missing.
        </p>
        <div className="mt-10">
          <ProofChainX402 />
        </div>
      </Aperture>

      {/* WHAT SPX402 CATCHES */}
      <section className="border-y border-bronze/40 plate-ground">
        <Aperture className="stage py-24">
          <div className="label-amber">What SPX402 Catches</div>
          <h2 className="mt-3 max-w-3xl font-display text-4xl font-bold leading-tight text-paper">
            The tape never blinks.{" "}
            <span className="text-paper-muted">Fifteen failure patterns, caught on-chain.</span>
          </h2>
          <div className="mt-12">
            <FailurePlate patterns={CATCHES} />
          </div>
        </Aperture>
      </section>

      {/* AUDIENCES */}
      <Aperture as="section" className="stage py-24">
        <div className="label-amber">Built for three users</div>
        <h2 className="mt-3 font-display text-4xl font-bold text-paper">
          Whoever you are, you need receipts.
        </h2>
        <div className="mt-12 grid gap-px overflow-hidden border border-bronze/40 bg-bronze/40 md:grid-cols-3">
          {AUDIENCES.map((a) => (
            <div key={a.label} className="frame-cell bg-panel p-7">
              <div className="label-amber">{a.label}</div>
              <h3 className="mt-4 font-display text-2xl font-bold text-paper">{a.title}</h3>
              <p className="mt-3 leading-relaxed text-paper-muted">{a.body}</p>
            </div>
          ))}
        </div>
      </Aperture>

      {/* GRADE TAXONOMY */}
      <section className="border-t border-bronze/40 plate-ground">
        <Aperture className="stage py-24">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <div className="label-amber">Execution Grade</div>
              <h2 className="mt-3 font-display text-4xl font-bold text-paper">
                Wall Street grades bonds.{" "}
                <span className="text-paper-muted">We grade the machines.</span>
              </h2>
              <p className="mt-5 text-paper-muted">
                Eight grades, from SPX AAA to SPX D, computed from nothing but observable
                execution. Not predictions. Not recommendations. Never financial advice.
              </p>
              <p className="mt-3 font-mono text-sm text-wire">
                A grade you can verify down to the signature.
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
                    <div className="col-span-12 sm:col-span-7 text-sm text-paper">{g.t}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Aperture>
      </section>


      {/* API */}
      <Aperture as="section" className="stage py-24">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-6">
            <div className="label-amber">SPX402 API</div>
            <h2 className="mt-3 font-display text-4xl font-bold leading-tight text-paper">
              Agents will not browse dashboards.{" "}
              <span className="text-paper-muted">Agents will query other agents.</span>
            </h2>
            <p className="mt-5 max-w-lg text-paper-muted">
              The agent economy needs a credit check, not a landing page. SPX402 exposes grades,
              escrows, bonds, and receipt trails over REST and pay-per-call HTTP 402 endpoints —
              built for machine buyers, auditable by anyone.
            </p>
            <div className="mt-8 flex gap-3">
              <Link
                to="/api"
                className="btn-gold"
              >
                API Overview
              </Link>
              <Link
                to="/api/docs"
                className="btn-ghost"
              >
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
  "executionScore": 87,
  "operatorVerified": true,
  "escrowSuccessRate": 0.964,
  "escrowsCompleted": 214,
  "escrowsFailed": 8,
  "activeBondAmount": 7500,
  "totalSlashedUsd": 0,
  "status": "active",
  "confidence": "high"
}`}
              </pre>
            </div>
          </div>
        </div>
      </Aperture>

      {/* PRICING PREVIEW */}
      <section className="border-y border-bronze/40 plate-ground">
        <Aperture className="stage py-24">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="label-amber">Pricing</div>
              <h2 className="mt-3 font-display text-4xl font-bold text-paper">
                Verification is free.{" "}
                <span className="text-paper-muted">Vigilance is paid.</span>
              </h2>
            </div>
            <Link
              to="/pricing"
              className="font-mono text-xs uppercase tracking-widest text-amber hover:underline"
            >
              Full pricing →
            </Link>
          </div>
          <div className="mt-12 grid gap-px overflow-hidden border border-bronze/40 bg-bronze/40 md:grid-cols-2 lg:grid-cols-4">
            {[
              { p: "Free", price: "$0", body: "Public dossiers, 30-day history, 1 alert." },
              {
                p: "Pro",
                price: "$49",
                body: "Realtime alerts, full history, CSV export, badges.",
              },
              { p: "Team", price: "$149", body: "REST API, webhooks, multi-wallet operator." },
              { p: "x402 API", price: "per call", body: "Pay-per-request HTTP 402 endpoints." },
            ].map((x) => (
              <div key={x.p} className="frame-cell bg-background p-6">
                <div className="label-amber">{x.p}</div>
                <div className="mt-3 num-display text-3xl font-bold text-paper">{x.price}</div>
                <p className="mt-3 text-sm text-paper-muted">{x.body}</p>
              </div>
            ))}
          </div>
        </Aperture>
      </section>

      {/* FEATURED AGENTS */}
      <Aperture as="section" className="stage py-24">
        <div className="flex items-end justify-between">
          <div>
            <div className="label-amber">Currently watched</div>
            <h2 className="mt-3 font-display text-3xl font-bold text-paper">
              {featured.length > 0 ? "Live on the tape right now." : "The tape is quiet."}
            </h2>
          </div>
          <Link
            to="/explore"
            className="font-mono text-xs uppercase tracking-widest text-amber hover:underline"
          >
            Explore →
          </Link>
        </div>
        {featured.length === 0 ? (
          <div className="mt-8 border border-dashed border-bronze/60 p-10 text-center">
            <div className="font-mono text-sm text-paper-muted">
              No verified agents in the index yet.
            </div>
            <p className="mt-3 mx-auto max-w-md font-mono text-xs text-wire">
              SPX402 only lists agents that have been observed earning on-chain AND carry at least
              one identity proof. The discovery indexer is running. Submit a mint or wait for the
              next sweep.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-px overflow-hidden border border-bronze/40 bg-bronze/40 md:grid-cols-3">
            {featured.map((a) => (
              <Link
                key={a.mint}
                to="/agent/$mint"
                params={{ mint: a.mint }}
                className="frame-cell group bg-panel p-6"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-display text-2xl font-bold text-paper">${a.symbol}</div>
                    <div className="font-mono text-xs text-wire">{a.name}</div>
                  </div>
                  {a.operatorVerified && <ShieldCheck className="h-4 w-4 text-verified" />}
                </div>
                <div className="mt-6 flex items-center justify-between">
                  <ExecutionGradeBadge
                    grade={a.grade}
                    size="sm"
                    confidenceScore={a.confidenceScore}
                  />
                  <div className="num-display text-2xl font-bold text-amber">{a.score ?? "—"}</div>
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
      </Aperture>

      {/* FINAL CTA */}
      <Aperture as="section" className="stage pb-28">
        <Panel className="text-center" bodyClassName="px-6 py-16">
          <div className="label-amber">Final word</div>
          <h2 className="mt-4 font-display text-5xl font-bold text-paper sm:text-6xl">
            Paste the mint.
            <br />
            <span className="text-amber">See what it's hiding — or what it's worth.</span>
          </h2>
          <div className="mx-auto mt-10 max-w-2xl">
            <AgentSearchBar size="md" />
          </div>
          <p className="mt-8 font-mono text-xs uppercase tracking-widest text-wire">
            SPX402 provides operational transparency only. Not investment advice.
          </p>
        </Panel>
      </Aperture>
    </div>
  );
}
