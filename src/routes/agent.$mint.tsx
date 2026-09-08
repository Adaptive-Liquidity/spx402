import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import type { Agent } from "@/lib/agents";
import { fetchAgent } from "@/lib/agents-db";
import { fetchAgentEvents, fetchPayerDiversity, type PayerDiversity } from "@/lib/live-data";
import {
  fetchOutcomeContractMetrics,
  type OutcomeContractMetrics,
} from "@/lib/outcome-contract.functions";
import {
  fetchProbeRuns,
  fetchServiceByPayee,
  settleRateSeries,
  type ProbeRunRow,
  type SettleRatePoint,
  type X402ServiceRow,
} from "@/lib/prober-data";
import { buildGradeCard, cardImageUrl, cardShareTitle, SITE_ORIGIN } from "@/lib/grade-card";
import { supabase } from "@/integrations/supabase/client";
import { mergeEvents } from "@/components/spx/dossier/dossier-utils";
import { DossierHero } from "@/components/spx/dossier/DossierHero";
import {
  DossierDemand,
  DossierMetricStrip,
  DossierPriceContext,
} from "@/components/spx/dossier/DossierMetrics";
import { DossierRawLog, DossierTimeline } from "@/components/spx/dossier/DossierEvents";
import { DossierProbe } from "@/components/spx/dossier/DossierProbe";

type CandidateRow = {
  mint: string;
  status: string;
  check_attempts: number;
  signals: {
    skills_md?: boolean;
    invoice_pda?: boolean;
    on_chain_earnings?: boolean;
    agent_registry?: boolean;
  } | null;
  rejection_reason: string | null;
  last_checked_at: string | null;
  discovered_via: string;
};

type LoaderData =
  | {
      kind: "agent";
      agent: Agent;
      // Active-verification join. Present only when this agent's wallet is a
      // known x402 payee. Displayed, never scored.
      probeService: X402ServiceRow | null;
      probeSeries: SettleRatePoint[];
      probeLastRun: ProbeRunRow | null;
      diversity: PayerDiversity;
      outcomeMetrics: OutcomeContractMetrics | null;
    }
  | { kind: "verifying"; mint: string; candidate: CandidateRow | null };

async function fetchCandidate(mint: string): Promise<CandidateRow | null> {
  // Reads from the public view that exposes only safe columns. Internal
  // fields (signals, rejection_reason, submitted_by, notes) are no longer
  // public — set to null in the local row shape so existing UI keeps working.
  const { data } = await supabase
    .from("candidate_agents_public" as never)
    .select("mint, status, check_attempts, last_checked_at, discovered_via")
    .eq("mint", mint)
    .maybeSingle();
  if (!data) return null;
  const row = data as {
    mint: string;
    status: string;
    check_attempts: number;
    last_checked_at: string | null;
    discovered_via: string;
  };
  return {
    mint: row.mint,
    status: row.status,
    check_attempts: row.check_attempts,
    signals: null,
    rejection_reason: null,
    last_checked_at: row.last_checked_at,
    discovered_via: row.discovered_via,
  };
}

async function enqueueMint(mint: string): Promise<CandidateRow | null> {
  await supabase.rpc("enqueue_candidate_agent", { p_mint: mint });
  return fetchCandidate(mint);
}

export const Route = createFileRoute("/agent/$mint")({
  head: ({ loaderData }: { loaderData?: LoaderData }) => {
    if (!loaderData || loaderData.kind !== "agent") {
      const mint = loaderData?.kind === "verifying" ? loaderData.mint : "";
      return {
        meta: [
          { title: mint ? `Verifying ${mint.slice(0, 6)}… · SPX402` : "Agent dossier · SPX402" },
          {
            name: "description",
            content:
              "Verifying a tokenized agent on-chain: deposits, buybacks, burns, and identity proofs.",
          },
        ],
      };
    }
    const a = loaderData.agent;
    const card = buildGradeCard(a);
    const title = cardShareTitle(card);
    const image = cardImageUrl(a.mint);
    const url = `${SITE_ORIGIN}/agent/${a.mint}`;
    return {
      meta: [
        { title: `${card.ticker} — ${card.grade} · SPX402` },
        {
          name: "description",
          content: `${a.name}: Transparency Score ${a.score ?? "n/a"}. ${a.totalBuybacksCount} buybacks confirmed. ${a.verdict}`,
        },
        { property: "og:title", content: title },
        { property: "og:description", content: a.verdict },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { property: "og:image", content: image },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:image", content: image },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: a.name,
            sku: a.mint,
            url,
            image,
            description: a.verdict,
            brand: { "@type": "Brand", name: card.ticker },
          }),
        },
      ],
    };
  },
  loader: async ({ params }): Promise<LoaderData> => {
    const agent = await fetchAgent(params.mint);
    if (agent) {
      const liveEvents = await fetchAgentEvents(agent.mint, 100);
      const merged = mergeEvents(liveEvents, agent.events);
      // Join the active-verification lane by payee wallet. An agent that is
      // itself an x402 seller may have a probe transcript.
      const payee =
        agent.executorWallet ??
        (agent.identifierKind === "executor_wallet" ? agent.identifier : null);
      const [probeService, diversity, outcomeMetrics] = await Promise.all([
        payee ? fetchServiceByPayee(payee) : Promise.resolve(null),
        fetchPayerDiversity(agent.mint),
        agent.category === "task_executor"
          ? fetchOutcomeContractMetrics({ data: agent.mint })
          : Promise.resolve(null),
      ]);
      const probeRuns = probeService ? await fetchProbeRuns(probeService.id, 200) : [];
      return {
        kind: "agent",
        agent: { ...agent, events: merged },
        probeService,
        probeSeries: settleRateSeries(probeRuns),
        probeLastRun: probeRuns[0] ?? null,
        diversity,
        outcomeMetrics,
      };
    }

    // Not in agents table — auto-enqueue if it's a plausible mint and show
    // the verifying state instead of a dead-end 404.
    const mint = params.mint.trim();
    const looksLikeMint =
      mint.length >= 32 && mint.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(mint);
    let candidate = await fetchCandidate(mint);
    if (!candidate && looksLikeMint) {
      candidate = await enqueueMint(mint);
    }
    return { kind: "verifying", mint, candidate };
  },
  staleTime: 30_000,
  component: AgentRoutePage,
  errorComponent: AgentPageError,
});

function AgentRoutePage() {
  const data = Route.useLoaderData() as LoaderData;
  if (data.kind === "verifying") {
    return <VerifyingState mint={data.mint} candidate={data.candidate} />;
  }
  return (
    <div className="stage section">
      <DossierHero agent={data.agent} />
      <DossierMetricStrip agent={data.agent} outcomeMetrics={data.outcomeMetrics} />
      <DossierTimeline agent={data.agent} />
      <DossierPriceContext agent={data.agent} />
      <DossierProbe
        service={data.probeService}
        series={data.probeSeries}
        lastRun={data.probeLastRun}
      />
      <DossierDemand diversity={data.diversity} />
      <DossierRawLog agent={data.agent} />
    </div>
  );
}

function VerifyingState({
  mint,
  candidate: initial,
}: {
  mint: string;
  candidate: CandidateRow | null;
}) {
  const router = useRouter();
  const [candidate, setCandidate] = useState<CandidateRow | null>(initial);

  useEffect(() => {
    if (!mint) return;
    const id = window.setInterval(async () => {
      const next = await fetchCandidate(mint);
      setCandidate(next);
      if (next?.status === "verified") {
        router.invalidate();
      }
    }, 8000);
    return () => window.clearInterval(id);
  }, [mint, router]);

  const looksLikeMint =
    mint.length >= 32 && mint.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(mint);

  if (!looksLikeMint) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <div className="inline-flex items-center gap-2 border border-critical/70 bg-critical/10 px-4 py-2 font-mono text-xs uppercase tracking-widest text-critical flicker-404">
          SPX404
        </div>
        <h1 className="mt-8 font-display text-5xl font-bold text-paper">
          Not a valid Solana mint.
        </h1>
        <p className="mt-4 font-mono text-sm text-paper-muted">
          Paste a 32–44 char base58 SPL mint address.
        </p>
        {mint && <p className="mt-2 font-mono text-xs text-wire">QUERY: {mint}</p>}
        <div className="mt-8 flex justify-center gap-3">
          <Link
            to="/"
            className="focus-ring border border-amber/80 bg-amber/10 px-5 py-3 font-mono text-xs uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep"
          >
            New search
          </Link>
          <Link
            to="/registry/explore"
            className="border border-bronze/70 px-5 py-3 font-mono text-xs uppercase tracking-widest text-paper-muted hover:text-paper"
          >
            Explore agents
          </Link>
        </div>
      </div>
    );
  }

  const signals = candidate?.signals ?? {};
  const status = candidate?.status ?? "pending";
  const isRejected = status === "rejected";
  const checks: { key: string; label: string; passed: boolean; hint: string }[] = [
    {
      key: "skills_md",
      label: "Skills.md in metadata",
      passed: !!signals.skills_md,
      hint: "Off-chain JSON URI references skills",
    },
    {
      key: "invoice_pda",
      label: "Invoice ID PDA derivable",
      passed: !!signals.invoice_pda,
      hint: "Pump.fun agent-payments registration",
    },
    {
      key: "on_chain_earnings",
      label: "Deposit → buyback → burn observed",
      passed: !!signals.on_chain_earnings,
      hint: "Required to pass · the strict bar",
    },
    {
      key: "agent_registry",
      label: "Solana Agent Registry entry",
      passed: !!signals.agent_registry,
      hint: "AgentIdentity PDA exists",
    },
  ];

  return (
    <div className="stage-narrow section">
      <div className="label-amber">
        {isRejected ? "Verification failed" : "Verification in progress"}
      </div>
      <h1 className="mt-3 font-display text-4xl font-bold text-paper lg:text-5xl">
        {isRejected ? "We couldn't verify this agent." : "Reading the tape…"}
      </h1>
      <p className="mt-4 text-paper-muted">
        {isRejected
          ? "This mint did not show on-chain earnings combined with at least one identity proof after multiple checks."
          : "We're running four on-chain checks against this mint. SPX402 only lists agents that show real on-chain earnings AND carry at least one identity proof."}
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3 font-mono text-xs">
        <span className="border border-bronze/60 bg-panel-deep px-3 py-1.5 text-paper-muted">
          MINT{" "}
          <span className="ml-2 text-paper">
            {mint.slice(0, 6)}…{mint.slice(-6)}
          </span>
        </span>
        <span className="border border-bronze/60 bg-panel-deep px-3 py-1.5 text-paper-muted">
          STATUS{" "}
          <span
            className={
              status === "verified"
                ? "ml-2 text-verified"
                : status === "rejected"
                  ? "ml-2 text-critical"
                  : "ml-2 text-amber"
            }
          >
            {status.toUpperCase()}
          </span>
        </span>
        <span className="border border-bronze/60 bg-panel-deep px-3 py-1.5 text-paper-muted">
          ATTEMPTS <span className="ml-2 text-paper">{candidate?.check_attempts ?? 0} / 5</span>
        </span>
        <span className="border border-bronze/60 bg-panel-deep px-3 py-1.5 text-paper-muted">
          SOURCE{" "}
          <span className="ml-2 text-paper">
            {(candidate?.discovered_via ?? "search_lookup").toUpperCase()}
          </span>
        </span>
      </div>

      <div className="panel-engraved mt-8 divide-y divide-bronze/40">
        {checks.map((c) => (
          <div key={c.key} className="flex items-start justify-between gap-4 px-5 py-4">
            <div>
              <div className="font-mono text-sm text-paper">{c.label}</div>
              <div className="mt-1 font-mono text-[11px] uppercase tracking-widest text-wire">
                {c.hint}
              </div>
            </div>
            <div className="shrink-0">
              {c.passed ? (
                <span className="inline-flex items-center gap-1.5 border border-verified/60 bg-verified/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-verified">
                  <Check className="h-3 w-3" /> Pass
                </span>
              ) : status === "rejected" ? (
                <span className="inline-flex items-center gap-1.5 border border-critical/60 bg-critical/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-critical">
                  Fail
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 border border-bronze/60 bg-panel-deep px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-wire">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber pulse-amber" />
                  Checking
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {!isRejected && (
        <p className="mt-6 font-mono text-xs text-wire">
          The verifier runs every 5 minutes. This page polls automatically — when the agent passes,
          the dossier loads here.
        </p>
      )}
      {isRejected && candidate?.rejection_reason && (
        <p className="mt-6 border-l-2 border-critical/70 bg-critical/10 px-3 py-2 font-mono text-xs text-critical">
          {candidate.rejection_reason}
        </p>
      )}

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          to="/"
          className="focus-ring border border-amber/80 bg-amber/10 px-5 py-3 font-mono text-xs uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep"
        >
          New search
        </Link>
        <Link
          to="/registry/explore"
          className="border border-bronze/70 px-5 py-3 font-mono text-xs uppercase tracking-widest text-paper-muted hover:text-paper"
        >
          Explore verified agents
        </Link>
      </div>
    </div>
  );
}

function AgentPageError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <div className="label-amber">Dossier error</div>
      <p className="mt-3 text-paper-muted">{error.message}</p>
      <button
        onClick={() => {
          router.invalidate();
          reset();
        }}
        className="focus-ring mt-6 border border-amber/80 bg-amber/10 px-5 py-3 font-mono text-xs uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep"
      >
        Retry
      </button>
    </div>
  );
}
