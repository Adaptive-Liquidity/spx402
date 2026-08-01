import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ExecutionGradeBadge } from "@/components/spx/ExecutionGradeBadge";
import { TransparencyScoreRing } from "@/components/spx/TransparencyScoreRing";
import { MetricCard } from "@/components/spx/MetricCard";
import { Panel } from "@/components/spx/Panel";
import { ComingSoon } from "@/components/spx/ComingSoon";
import { type Agent, type AgentEvent, type EventType, type Severity } from "@/lib/agents";
import { categoryMeta } from "@/lib/agents/categories";
import { fetchAgent } from "@/lib/agents-db";
import {
  fetchAgentEvents,
  fetchPayerDiversity,
  relativeFromNow,
  type AgentEventRow,
  type PayerDiversity,
} from "@/lib/live-data";
import { ChainBadge } from "@/components/spx/ChainBadge";
import { PayerDiversityStat } from "@/components/spx/PayerDiversityStat";
import { ProbeStatusPanel } from "@/components/spx/ProbeStatusPanel";
import {
  fetchProbeRuns,
  fetchServiceByPayee,
  settleRateSeries,
  type ProbeRunRow,
  type SettleRatePoint,
  type X402ServiceRow,
} from "@/lib/prober-data";


import { supabase } from "@/integrations/supabase/client";
import { addToWatchlist, isOnWatchlist, removeFromWatchlist } from "@/lib/watchlist";
import { useAuth } from "@/lib/auth";
import {
  ShieldCheck, ShieldOff, Copy, Share2, AlertTriangle, CheckCircle2, ArrowDownToLine, Repeat, Flame, Settings, Activity, Check, Bell,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

const KNOWN_EVENT_TYPES: EventType[] = [
  "DEPOSIT_RECEIVED",
  "BUYBACK_EXECUTED",
  "BURN_CONFIRMED",
  "CONFIG_CHANGED",
  "FAILED_WINDOW",
  "ANOMALY_DETECTED",
  "OPERATOR_VERIFIED",
  "SWAP_EXECUTED",
  "X402_PAYMENT_RECEIVED",
  "TASK_COMPLETED",
];

const KNOWN_SEVERITIES: Severity[] = ["info", "warn", "critical", "success"];

function eventTitleFor(type: string): string {
  switch (type) {
    case "DEPOSIT_RECEIVED": return "Deposit received";
    case "BUYBACK_EXECUTED": return "Buyback executed";
    case "BURN_CONFIRMED": return "Burn confirmed";
    case "CONFIG_CHANGED": return "Config changed";
    case "FAILED_WINDOW": return "Failed buyback window";
    case "ANOMALY_DETECTED": return "Anomaly detected";
    case "OPERATOR_VERIFIED": return "Operator verified";
    case "SWAP_EXECUTED": return "DEX swap executed";
    case "X402_PAYMENT_RECEIVED": return "x402 payment received";
    case "TASK_COMPLETED": return "Task completed";
    default: return type;
  }
}

function eventDescFor(row: AgentEventRow): string {
  switch (row.type) {
    case "DEPOSIT_RECEIVED":
      return `${row.amountSol.toFixed(4)} SOL routed to the agent deposit address.`;
    case "BUYBACK_EXECUTED":
      return `Buyback swap of ${row.amountSol.toFixed(4)} SOL executed on-chain.`;
    case "BURN_CONFIRMED":
      return `${row.amountToken.toLocaleString()} tokens burned and supply reduced.`;
    case "CONFIG_CHANGED":
      return "Agent configuration parameters changed on-chain.";
    case "FAILED_WINDOW":
      return "Reconciler flagged a buyback window with no confirmed burn.";
    case "ANOMALY_DETECTED":
      return "Indexer flagged this transaction for review.";
    case "OPERATOR_VERIFIED":
      return "Operator wallet signed an Ed25519 challenge for this agent.";
    case "SWAP_EXECUTED":
      return `DEX swap of ${row.amountSol.toFixed(4)} SOL net by the executor wallet.`;
    case "X402_PAYMENT_RECEIVED":
      return row.amountToken > 0
        ? `${(row.amountToken / 1_000_000).toFixed(2)} USDC received via x402 micropayment.`
        : `${row.amountSol.toFixed(4)} SOL received via x402 micropayment.`;
    case "TASK_COMPLETED":
      return "Agent completed a priced task attested on-chain.";
    default:
      return "Decoded program event.";
  }
}

function rowToAgentEvent(row: AgentEventRow): AgentEvent {
  const type = (KNOWN_EVENT_TYPES as string[]).includes(row.type as string)
    ? (row.type as EventType)
    : "ANOMALY_DETECTED";
  const severity = (KNOWN_SEVERITIES as string[]).includes(row.severity as string)
    ? (row.severity as Severity)
    : "info";
  return {
    id: row.id,
    type,
    severity,
    title: eventTitleFor(type),
    description: eventDescFor(row),
    signature: row.signature,
    amount: row.amountSol || undefined,
    tokenAmount: row.amountToken || undefined,
    slot: row.slot ?? 0,
    // Tier B (protocol-marker) x402 detection is self-asserted evidence, so it
    // is surfaced as medium confidence on the event row.
    confidence: row.detectionMethod === "memo_marker" ? "medium" : "high",
    facilitatorId: row.facilitatorId,
    occurredAt: relativeFromNow(row.occurredAt),
    iso: row.occurredAt,
  };
}


// Live agent_events are authoritative once present. The seeded jsonb is only
// shown when no live events have been indexed for this agent yet.
function mergeEvents(live: AgentEventRow[], seeded: AgentEvent[]): AgentEvent[] {
  if (live.length === 0) return seeded;
  return live.map(rowToAgentEvent);
}

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
    return {
      meta: [
        { title: `$${a.symbol} — ${a.grade} · SPX402` },
        {
          name: "description",
          content: `${a.name}: Transparency Score ${a.score ?? "n/a"}. ${a.totalBuybacksCount} buybacks confirmed. ${a.verdict}`,
        },
        { property: "og:title", content: `$${a.symbol} — ${a.grade} on SPX402` },
        { property: "og:description", content: a.verdict },
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
      const [probeService, diversity] = await Promise.all([
        payee ? fetchServiceByPayee(payee) : Promise.resolve(null),
        fetchPayerDiversity(agent.mint),
      ]);
      const probeRuns = probeService
        ? await fetchProbeRuns(probeService.id, 200)
        : [];
      return {
        kind: "agent",
        agent: { ...agent, events: merged },
        probeService,
        probeSeries: settleRateSeries(probeRuns),
        probeLastRun: probeRuns[0] ?? null,
        diversity,
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
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="label-amber">Dossier error</div>
        <p className="mt-3 text-paper-muted">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 border border-amber/80 bg-amber/10 px-5 py-3 font-mono text-xs uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep"
        >
          Retry
        </button>
      </div>
    );
  },
});

function VerifyingState({ mint, candidate: initial }: { mint: string; candidate: CandidateRow | null }) {
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
          <Link to="/" className="border border-amber/80 bg-amber/10 px-5 py-3 font-mono text-xs uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep">
            New search
          </Link>
          <Link to="/explore" className="border border-bronze/70 px-5 py-3 font-mono text-xs uppercase tracking-widest text-paper-muted hover:text-paper">
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
    { key: "skills_md", label: "Skills.md in metadata", passed: !!signals.skills_md, hint: "Off-chain JSON URI references skills" },
    { key: "invoice_pda", label: "Invoice ID PDA derivable", passed: !!signals.invoice_pda, hint: "Pump.fun agent-payments registration" },
    { key: "on_chain_earnings", label: "Deposit → buyback → burn observed", passed: !!signals.on_chain_earnings, hint: "Required to pass · the strict bar" },
    { key: "agent_registry", label: "Solana Agent Registry entry", passed: !!signals.agent_registry, hint: "AgentIdentity PDA exists" },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:py-20">
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
          MINT <span className="ml-2 text-paper">{mint.slice(0, 6)}…{mint.slice(-6)}</span>
        </span>
        <span className="border border-bronze/60 bg-panel-deep px-3 py-1.5 text-paper-muted">
          STATUS{" "}
          <span className={
            status === "verified" ? "ml-2 text-verified"
            : status === "rejected" ? "ml-2 text-critical"
            : "ml-2 text-amber"
          }>
            {status.toUpperCase()}
          </span>
        </span>
        <span className="border border-bronze/60 bg-panel-deep px-3 py-1.5 text-paper-muted">
          ATTEMPTS <span className="ml-2 text-paper">{candidate?.check_attempts ?? 0} / 5</span>
        </span>
        <span className="border border-bronze/60 bg-panel-deep px-3 py-1.5 text-paper-muted">
          SOURCE <span className="ml-2 text-paper">{(candidate?.discovered_via ?? "search_lookup").toUpperCase()}</span>
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
          The verifier runs every 5 minutes. This page polls automatically — when
          the agent passes, the dossier loads here.
        </p>
      )}
      {isRejected && candidate?.rejection_reason && (
        <p className="mt-6 border-l-2 border-critical/70 bg-critical/10 px-3 py-2 font-mono text-xs text-critical">
          {candidate.rejection_reason}
        </p>
      )}

      <div className="mt-10 flex flex-wrap gap-3">
        <Link to="/" className="border border-amber/80 bg-amber/10 px-5 py-3 font-mono text-xs uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep">
          New search
        </Link>
        <Link to="/explore" className="border border-bronze/70 px-5 py-3 font-mono text-xs uppercase tracking-widest text-paper-muted hover:text-paper">
          Explore verified agents
        </Link>
      </div>
    </div>
  );
}

const EVENT_ICON: Record<string, typeof Activity> = {
  DEPOSIT_RECEIVED: ArrowDownToLine,
  BUYBACK_EXECUTED: Repeat,
  BURN_CONFIRMED: Flame,
  CONFIG_CHANGED: Settings,
  FAILED_WINDOW: AlertTriangle,
  ANOMALY_DETECTED: AlertTriangle,
  OPERATOR_VERIFIED: ShieldCheck,
  SWAP_EXECUTED: Repeat,
  X402_PAYMENT_RECEIVED: ArrowDownToLine,
  TASK_COMPLETED: ShieldCheck,
};

function shortMint(m: string) {
  return `${m.slice(0, 6)}…${m.slice(-6)}`;
}

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => {
        void navigator.clipboard.writeText(value);
        setDone(true);
        setTimeout(() => setDone(false), 1200);
      }}
      className="inline-flex items-center gap-1.5 border border-bronze/60 bg-panel-deep/60 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-paper-muted hover:border-amber hover:text-amber"
    >
      {done ? <CheckCircle2 className="h-3 w-3 text-verified" /> : <Copy className="h-3 w-3" />}
      {label ?? (done ? "Copied" : "Copy")}
    </button>
  );
}

/** Active-verification strip. Renders only when a probe transcript exists. */
function ProbeStrip({
  service,
  series,
}: {
  service: X402ServiceRow;
  series: SettleRatePoint[];
}) {
  const withData = series.filter((p) => p.rate != null);
  const attempts = withData.reduce((s, p) => s + p.attempts, 0);
  const settled = withData.reduce((s, p) => s + p.settled, 0);
  return (
    <Panel
      className="mt-6"
      eyebrow="Active verification"
      title="Probed as a paying customer"
    >
      <div className="flex flex-wrap items-center gap-6">
        <div className="font-mono text-xs text-paper-muted">
          Last probed{" "}
          <span className="text-paper">
            {service.lastProbeAt ? relativeFromNow(service.lastProbeAt) : "never"}
          </span>
          {attempts > 0 && (
            <>
              {" · "}30d settle rate{" "}
              <span className="text-paper">
                {((settled / attempts) * 100).toFixed(0)}% ({settled}/{attempts})
              </span>
            </>
          )}
        </div>
        <div className="flex h-10 flex-1 items-end gap-[2px]">
          {series.map((p) => (
            <div
              key={p.day}
              title={
                p.rate == null
                  ? `${p.day}: no probe`
                  : `${p.day}: ${(p.rate * 100).toFixed(0)}%`
              }
              className={`w-full ${p.rate == null ? "bg-bronze/25" : p.rate >= 0.9 ? "bg-verified/70" : p.rate >= 0.5 ? "bg-amber/70" : "bg-critical/70"}`}
              style={{ height: `${p.rate == null ? 8 : Math.max(10, p.rate * 100)}%` }}
            />
          ))}
        </div>
        <Link
          to="/service/$slug"
          params={{ slug: service.slug }}
          className="border border-amber/80 bg-amber/10 px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep"
        >
          Probe transcript
        </Link>
      </div>
      <p className="mt-3 font-mono text-[11px] text-wire">
        Measured by the SPX402 prober buying from this service. Probe data is
        published as evidence and is not part of the score.
      </p>
    </Panel>
  );
}

function AgentRoutePage() {
  const data = Route.useLoaderData() as LoaderData;
  if (data.kind === "verifying") {
    return <VerifyingState mint={data.mint} candidate={data.candidate} />;
  }
  return (
    <Dossier
      agent={data.agent}
      probeService={data.probeService}
      probeSeries={data.probeSeries}
    />
  );
}

function Dossier({
  agent,
  probeService,
  probeSeries,
}: {
  agent: Agent;
  probeService: X402ServiceRow | null;
  probeSeries: SettleRatePoint[];
}) {

  const cat = categoryMeta(agent.category);
  const isTokenized = agent.category === "tokenized_buyback";
  const isExecutor = agent.identifierKind === "executor_wallet";
  const isRegistered = agent.category === "registered_agent";

  type FilterKey = "all" | "buyback" | "burn" | "deposit" | "anomaly" | "config" | "swap" | "x402";
  const [filter, setFilter] = useState<FilterKey>("all");
  const filtered = agent.events.filter((e) => {
    if (filter === "all") return true;
    if (filter === "buyback") return e.type === "BUYBACK_EXECUTED";
    if (filter === "burn") return e.type === "BURN_CONFIRMED";
    if (filter === "deposit") return e.type === "DEPOSIT_RECEIVED";
    if (filter === "anomaly") return e.type === "ANOMALY_DETECTED" || e.type === "FAILED_WINDOW";
    if (filter === "config") return e.type === "CONFIG_CHANGED";
    if (filter === "swap") return e.type === "SWAP_EXECUTED";
    if (filter === "x402") return e.type === "X402_PAYMENT_RECEIVED";
    return true;
  });

  // Category-aware filter chips: only show what's meaningful for the agent type.
  const filterKeys: FilterKey[] = isTokenized
    ? ["all", "buyback", "burn", "deposit", "anomaly", "config"]
    : isExecutor || isRegistered
      ? ["all", "swap", "x402", "anomaly"]
      : ["all", "buyback", "burn", "deposit", "swap", "x402", "anomaly", "config"];

  // Aggregate counts for non-tokenized metric cards.
  const swapCount = agent.events.filter((e) => e.type === "SWAP_EXECUTED").length;
  const x402Count = agent.events.filter((e) => e.type === "X402_PAYMENT_RECEIVED").length;
  const swapSol = agent.events
    .filter((e) => e.type === "SWAP_EXECUTED")
    .reduce((s, e) => s + (e.amount ?? 0), 0);
  const x402Sol = agent.events
    .filter((e) => e.type === "X402_PAYMENT_RECEIVED")
    .reduce((s, e) => s + (e.amount ?? 0), 0);
  const x402Usdc = agent.events
    .filter((e) => e.type === "X402_PAYMENT_RECEIVED")
    .reduce((s, e) => s + (e.tokenAmount ?? 0), 0);

  const isSPX404 = agent.grade === "SPX404";

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 lg:px-8 lg:py-14">
      {/* Flagged-agent warning banner — permanent, public chain of custody */}
      {agent.flagged && (
        <div className="mb-6 border-2 border-critical bg-critical/10 p-5">
          <div className="flex items-start gap-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-critical" />
            <div className="flex-1">
              <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-critical">
                Flagged by SPX402 — trust violation
              </div>
              <p className="mt-1 text-sm text-paper">
                This agent has been flagged and is excluded from the leaderboard,
                explorer, homepage tape, and ticker. Dossier remains public for
                auditability.
              </p>
              {agent.flagReason && (
                <p className="mt-2 font-mono text-xs text-critical/90">
                  Reason: {agent.flagReason}
                  {agent.flaggedAt && (
                    <span className="ml-2 text-wire">
                      · flagged {new Date(agent.flaggedAt).toISOString().slice(0, 10)}
                    </span>
                  )}
                </p>
              )}
              <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-wire">
                Dispute? Email <span className="text-amber">disputes@spx402.com</span> with on-chain evidence.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top status bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border border-bronze/50 bg-panel-deep/60 px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-wire">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <span><span className="text-amber">SPX402</span> / AGENT DOSSIER / SOLANA MAINNET</span>
          <span>PARSER {agent.parserVersion}</span>
          <span>LAST INDEXED {agent.lastIndexedSeconds}s AGO</span>
          <span>CONFIDENCE <span className={agent.confidence === "high" ? "text-verified" : agent.confidence === "medium" ? "text-amber" : "text-critical"}>{agent.confidence.toUpperCase()}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-verified pulse-amber" />
          ON-CHAIN VERIFIED
        </div>
      </div>

      {/* HERO PANEL */}
      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <div className="panel-engraved relative lg:col-span-8 p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="label-amber">{cat.longLabel} {isSPX404 ? "· not found" : "confirmed"}</div>
              <h1 className="mt-3 font-display text-5xl font-bold text-paper">
                {isTokenized ? `$${agent.symbol}` : agent.name}
              </h1>
              <div className="mt-1 text-lg text-paper-muted">
                {isTokenized ? agent.name : `$${agent.symbol}`}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-wire">{cat.identifierLabel.toUpperCase()}</span>
                <span className="font-mono text-xs text-paper">{shortMint(agent.identifier)}</span>
                <CopyButton value={agent.identifier} />
              </div>
              {isExecutor && agent.executorWallet && agent.executorWallet !== agent.identifier && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-wire">EXECUTOR</span>
                  <span className="font-mono text-xs text-paper">{shortMint(agent.executorWallet)}</span>
                  <CopyButton value={agent.executorWallet} />
                  <Link
                    to="/operator/$wallet"
                    params={{ wallet: agent.executorWallet }}
                    className="font-mono text-[10px] uppercase tracking-widest text-amber hover:underline"
                  >
                    operator profile ↗
                  </Link>
                </div>
              )}
              {isRegistered && agent.coreAsset && agent.coreAsset !== agent.identifier && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-wire">MPL ASSET</span>
                  <span className="font-mono text-xs text-paper">{shortMint(agent.coreAsset)}</span>
                  <CopyButton value={agent.coreAsset} />
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-3">
              {/* Chain badge — SPX402 indexes Solana and Base as separate
                  lanes and never merges identities across them. */}
              <span
                className={`inline-flex items-center gap-1.5 border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest ${
                  agent.chain === "base"
                    ? "border-[#0052ff]/70 bg-[#0052ff]/10 text-[#7aa2ff]"
                    : "border-bronze/70 bg-panel-deep/60 text-paper-muted"
                }`}
                title={`Indexed on the ${agent.chain} settlement lane`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    agent.chain === "base" ? "bg-[#0052ff]" : "bg-amber"
                  }`}
                />
                {agent.chain}
              </span>
              <ExecutionGradeBadge
                grade={agent.grade}
                size="lg"
                confidenceScore={agent.confidenceScore}
              />
              {/* Wave 2 — explicit numeric confidence chip. Outlined badge
                  + low-confidence chip together signal "thin evidence base." */}
              <span
                className={`inline-flex items-center gap-1.5 border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest ${
                  agent.confidenceScore >= 0.66
                    ? "border-verified/70 bg-verified/10 text-verified"
                    : agent.confidenceScore >= 0.33
                      ? "border-amber/70 bg-amber/10 text-amber"
                      : "border-wire/70 bg-panel-deep/60 text-paper-muted"
                }`}
                title={`${agent.confidenceModelVersion} · ${agent.methodologyVersion}`}
              >
                Confidence {(agent.confidenceScore * 100).toFixed(0)}%
              </span>
              {agent.operatorVerified ? (
                <span className="inline-flex items-center gap-1.5 border border-verified/70 bg-verified/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-verified">
                  <ShieldCheck className="h-3 w-3" /> Operator Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 border border-wire/70 bg-panel-deep/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-paper-muted">
                  <ShieldOff className="h-3 w-3" /> Operator Unverified
                </span>
              )}
            </div>
          </div>
          <div className="mt-8 rule-amber" />
          <p className="mt-6 max-w-2xl text-paper">{agent.verdict}</p>
          <div className="mt-4 border-l-2 border-amber/60 pl-3 font-mono text-sm italic text-paper-muted">
            “{agent.tagline}”
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <WatchlistButton mint={agent.mint} symbol={agent.symbol} />
            <AlertSubscribeButton mint={agent.mint} />
            <button className="inline-flex items-center gap-2 border border-bronze/70 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-paper-muted hover:border-amber hover:text-amber">
              <Share2 className="h-3.5 w-3.5" /> Share dossier
            </button>
            {/* Wave 1c — machine-readable evidence bundle (Merkle-rooted). */}
            <a
              href={`/api/public/agent/${agent.mint}/evidence`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 border border-bronze/70 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-paper-muted hover:border-amber hover:text-amber"
              title="Canonical evidence JSON with Merkle root over the 30-day window"
            >
              Evidence bundle ↗
            </a>
            {/* Wave 4 — embeddable widget for partner sites. */}
            <a
              href={`/embed/${agent.mint}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 border border-bronze/70 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-paper-muted hover:border-amber hover:text-amber"
              title="Iframe-friendly badge widget"
            >
              Embed widget ↗
            </a>
          </div>
        </div>

        <Panel className="lg:col-span-4" eyebrow="SPX Execution Score" title="Reputation pillars">
          <div className="flex flex-col items-center">
            <TransparencyScoreRing score={agent.score} />
          </div>
          <div className="mt-6 space-y-4">
            {[
              {
                pillar: "Execution",
                hint: "Deposits → buybacks → burns",
                value:
                  agent.scoreBreakdown.depositConsistency +
                  agent.scoreBreakdown.buybackExecution +
                  agent.scoreBreakdown.burnConfirmation,
                max: 65,
                tone: "text-verified",
              },
              {
                pillar: "Reliability",
                hint: "Failed-window rate · indexing recency",
                value: agent.scoreBreakdown.failedTx + agent.scoreBreakdown.recency,
                max: 25,
                tone: "text-amber",
              },
              {
                pillar: "Identity",
                hint: "Metadata · operator signature",
                value: agent.scoreBreakdown.metadata + agent.scoreBreakdown.operator,
                max: 10,
                tone: "text-paper",
              },
            ].map((row) => {
              const pct = row.max === 0 ? 0 : (row.value / row.max) * 100;
              return (
                <div key={row.pillar}>
                  <div className="flex items-baseline justify-between">
                    <span className={`font-display text-sm font-semibold ${row.tone}`}>
                      {row.pillar}
                    </span>
                    <span className="num-display text-sm text-paper">
                      {row.value} <span className="text-wire">/ {row.max}</span>
                    </span>
                  </div>
                  <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-wire">
                    {row.hint}
                  </div>
                  <div className="mt-1.5 h-1 w-full bg-bronze-dim/60">
                    <div className="h-full bg-amber" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 border-t border-bronze/30 pt-4 text-[10px] font-mono uppercase tracking-widest text-wire">
            Pillars compose the SPX Execution Score. Methodology · v0.1.7
          </div>
        </Panel>
      </div>

      {/* CATEGORY + CLAIM STRIP */}
      <div className="mt-6 panel-engraved flex flex-wrap items-center justify-between gap-4 px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="label-mono">Category</span>
          <span className="border border-amber/60 bg-amber/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-amber">
            {cat.longLabel}
          </span>
          <span className="font-mono text-[11px] text-wire">{cat.blurb}</span>
        </div>
        {!agent.operatorVerified && (
          <Link
            to="/operators"
            className="inline-flex items-center gap-2 border border-amber/70 bg-amber/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep"
          >
            Is this your agent? Verify operator → climb the leaderboard
          </Link>
        )}
      </div>

      {/* METRIC CARDS — category aware */}
      {isTokenized ? (
        (() => {
          // Pump.fun fee-buyback model has no explicit DEPOSIT_RECEIVED events,
          // so rate denominators collapse to 0 even when buybacks are firing.
          // Surface "—" instead of a misleading 0.0% in those cases.
          const isFeeModel = agent.totalDepositsCount === 0 && agent.totalBuybacksCount > 0;
          const buybackRateDisplay = isFeeModel
            ? "—"
            : `${(agent.buybackExecutionRate * 100).toFixed(1)}`;
          const burnRateDisplay = agent.totalBuybacksCount === 0
            ? "—"
            : `${(agent.burnConfirmationRate * 100).toFixed(1)}`;
          return (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <MetricCard label="Total Deposits" value={agent.totalDepositsCount.toLocaleString()} />
              <MetricCard label="Buybacks Confirmed" value={agent.totalBuybacksCount.toLocaleString()} tone="verified" />
              <MetricCard label="Burns Confirmed" value={agent.totalBurnsCount.toLocaleString()} tone="verified" />
              <MetricCard label="Failed Windows" value={agent.failedWindows.toString()} tone={agent.failedWindows > 10 ? "critical" : "amber"} />
              <MetricCard
                label={isFeeModel ? "Buyback Rate (fee model)" : "Buyback Rate"}
                value={buybackRateDisplay}
                suffix={isFeeModel ? undefined : "%"}
              />
              <MetricCard
                label="Burn Confirm Rate"
                value={burnRateDisplay}
                suffix={agent.totalBuybacksCount === 0 ? undefined : "%"}
              />
            </div>
          );
        })()
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <MetricCard label="Swaps Executed" value={swapCount.toLocaleString()} tone="verified" />
          <MetricCard label="Swap Volume" value={swapSol.toFixed(3)} suffix="SOL" />
          <MetricCard label="x402 Receipts" value={x402Count.toLocaleString()} tone={x402Count > 0 ? "verified" : "amber"} />
          <MetricCard label="x402 Revenue" value={x402Usdc > 0 ? (x402Usdc / 1_000_000).toFixed(2) : x402Sol.toFixed(3)} suffix={x402Usdc > 0 ? "USDC" : "SOL"} />
          <MetricCard
            label={isRegistered ? "MPL Registered" : "Identity"}
            value={isRegistered ? "YES" : agent.operatorVerified ? "VERIFIED" : "—"}
            tone={isRegistered || agent.operatorVerified ? "verified" : "amber"}
          />
          <MetricCard label="Failed Windows" value={agent.failedWindows.toString()} tone={agent.failedWindows > 10 ? "critical" : "amber"} />
        </div>
      )}

      {/* SECONDARY STATS */}
      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <Panel className="lg:col-span-8" eyebrow="Proof Timeline" title="On-chain execution log"
          right={
            <div className="flex flex-wrap gap-1">
              {filterKeys.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`border px-2 py-1 font-mono text-[10px] uppercase tracking-widest ${
                    filter === f
                      ? "border-amber bg-amber/15 text-amber"
                      : "border-bronze/60 text-paper-muted hover:text-paper"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          }
        >
          {filtered.length === 0 ? (
            <div className="border border-dashed border-bronze/60 bg-panel-deep/40 p-10 text-center">
              <div className="font-mono text-sm text-paper-muted">
                No verifiable execution detected.
              </div>
              <div className="mt-2 font-mono text-xs text-wire">
                This may mean the agent is new, inactive, misconfigured, or not routing
                activity on-chain. SPX402 only rates what it can prove.
              </div>
            </div>
          ) : (
            <ol className="relative">
              <div className="absolute bottom-0 left-[15px] top-0 w-px bg-bronze/40" aria-hidden />
              {filtered.map((e) => {
                const Icon = EVENT_ICON[e.type] ?? Activity;
                const color =
                  e.severity === "success"
                    ? "text-verified border-verified/60"
                    : e.severity === "warn"
                      ? "text-amber border-amber/60"
                      : e.severity === "critical"
                        ? "text-critical border-critical/60"
                        : "text-paper border-bronze/60";
                return (
                  <li key={e.id} className="relative pb-6 pl-12">
                    <div className={`absolute left-0 top-0 flex h-8 w-8 items-center justify-center border bg-background ${color}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-mono text-xs uppercase tracking-widest text-paper">
                        {e.title}
                      </div>
                      <div className="font-mono text-[11px] text-wire">{e.occurredAt}</div>
                    </div>
                    <p className="mt-1.5 text-sm text-paper-muted">{e.description}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-wire">
                      <span>SLOT {e.slot.toLocaleString()}</span>
                      <span>·</span>
                      <span>SIG {e.signature.slice(0, 8)}…</span>
                      <CopyButton value={e.signature} label="sig" />
                      <span>·</span>
                      <span className={e.confidence === "high" ? "text-verified" : "text-amber"}>
                        {e.confidence} confidence
                      </span>
                      {e.facilitatorId ? (
                        <>
                          <span>·</span>
                          <span
                            className="border border-verified/50 px-1.5 py-0.5 text-verified"
                            title="Tier A detection — settled by a registry facilitator"
                          >
                            via {e.facilitatorId}
                          </span>
                        </>
                      ) : null}
                    </div>

                  </li>
                );
              })}
            </ol>
          )}
        </Panel>

        <div className="lg:col-span-4 space-y-6">
          <Panel eyebrow="Anomaly panel" title="Watchlist signals">
            {agent.failedWindows === 0 ? (
              <div className="font-mono text-sm text-paper-muted">
                No critical anomalies detected.
                <div className="mt-2 text-xs text-wire">This is uncommon. Enjoy it quietly.</div>
              </div>
            ) : agent.grade === "SPX BB" || agent.grade === "SPX B" || agent.grade === "SPX D" ? (
              <div className="space-y-3">
                <div className="border-l-2 border-critical pl-3">
                  <div className="font-mono text-xs uppercase tracking-widest text-critical">
                    Execution gap
                  </div>
                  <p className="mt-1 text-sm text-paper-muted">
                    {agent.failedWindows} failed buyback windows observed. The tape has developed a limp.
                  </p>
                </div>
                <div className="border-l-2 border-amber pl-3">
                  <div className="font-mono text-xs uppercase tracking-widest text-amber">
                    Operator silence
                  </div>
                  <p className="mt-1 text-sm text-paper-muted">
                    Operator has not signed a verification. SPX402 cannot attest to control.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="border-l-2 border-amber pl-3">
                  <div className="font-mono text-xs uppercase tracking-widest text-amber">
                    Minor drift
                  </div>
                  <p className="mt-1 text-sm text-paper-muted">
                    {agent.failedWindows} failed windows recorded. SPX402 has opened a file.
                  </p>
                </div>
              </div>
            )}
          </Panel>

          <Panel eyebrow="Configuration" title="Agent parameters">
            <dl className="space-y-3 font-mono text-xs">
              {isTokenized ? (
                <>
                  <div className="flex justify-between border-b border-bronze/30 pb-2">
                    <dt className="text-wire">BUYBACK_BPS</dt>
                    <dd className="text-paper">{agent.buybackBps}</dd>
                  </div>
                  <div className="flex justify-between border-b border-bronze/30 pb-2">
                    <dt className="text-wire">LAST CONFIG CHANGE</dt>
                    <dd className="text-paper">{agent.configLastChangedLabel}</dd>
                  </div>
                  <div className="flex justify-between border-b border-bronze/30 pb-2">
                    <dt className="text-wire">LAST BUYBACK</dt>
                    <dd className="text-paper">{agent.lastBuybackLabel}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-wire">LAST BURN</dt>
                    <dd className="text-paper">{agent.lastBurnLabel}</dd>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between border-b border-bronze/30 pb-2">
                    <dt className="text-wire">CHAIN</dt>
                    <dd className="text-paper">{agent.chain}</dd>
                  </div>
                  <div className="flex justify-between border-b border-bronze/30 pb-2">
                    <dt className="text-wire">CATEGORY</dt>
                    <dd className="text-paper">{cat.label}</dd>
                  </div>
                  <div className="flex justify-between border-b border-bronze/30 pb-2">
                    <dt className="text-wire">IDENTIFIER KIND</dt>
                    <dd className="text-paper">{agent.identifierKind}</dd>
                  </div>
                  {agent.executorWallet && (
                    <div className="flex justify-between border-b border-bronze/30 pb-2">
                      <dt className="text-wire">EXECUTOR</dt>
                      <dd className="text-paper">{shortMint(agent.executorWallet)}</dd>
                    </div>
                  )}
                  {agent.coreAsset && (
                    <div className="flex justify-between border-b border-bronze/30 pb-2">
                      <dt className="text-wire">MPL ASSET</dt>
                      <dd className="text-paper">{shortMint(agent.coreAsset)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-wire">DECODER</dt>
                    <dd className={cat.decoderLive ? "text-verified" : "text-amber"}>
                      {cat.decoderLive ? "LIVE" : "PENDING"}
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </Panel>
        </div>
      </div>

      {/* PRICE CONTEXT — only meaningful for tokenized agents */}
      {isTokenized && agent.priceSeries.length > 0 && (
        <Panel
          className="mt-6"
          eyebrow="Price context"
          title="Market data shown for context only"
          right={
            <span className="font-mono text-[10px] uppercase tracking-widest text-wire">
              Excluded from Transparency Score
            </span>
          }
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={agent.priceSeries}>
                <defs>
                  <linearGradient id="amberFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.78 0.16 75)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="oklch(0.78 0.16 75)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="oklch(0.32 0.04 65)" strokeOpacity={0.3} vertical={false} />
                <XAxis dataKey="t" stroke="var(--wire)" tick={{ fontSize: 10, fontFamily: "monospace" }} />
                <YAxis stroke="var(--wire)" tick={{ fontSize: 10, fontFamily: "monospace" }} width={70} />
                <Tooltip
                  contentStyle={{
                    background: "var(--panel-deep)",
                    border: "1px solid var(--bronze)",
                    borderRadius: 0,
                    fontFamily: "monospace",
                    fontSize: 11,
                  }}
                  labelStyle={{ color: "var(--wire)" }}
                />
                <Area type="monotone" dataKey="v" stroke="var(--amber)" strokeWidth={2} fill="url(#amberFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      )}

      {/* RAW TX TABLE */}
      {probeService && <ProbeStrip service={probeService} series={probeSeries} />}

      <Panel className="mt-6" eyebrow="Raw transactions" title="Decoded events">

        <div className="overflow-x-auto">
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="border-b border-bronze/50 text-left text-[10px] uppercase tracking-widest text-wire">
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Event</th>
                <th className="px-3 py-2">Asset</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2">Slot</th>
                <th className="px-3 py-2">Signature</th>
                <th className="px-3 py-2">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {agent.events.map((e) => (
                <tr key={e.id} className="border-b border-bronze/20 hover:bg-panel-deep/40">
                  <td className="px-3 py-2.5 text-paper-muted">{e.occurredAt}</td>
                  <td className="px-3 py-2.5 text-paper">{e.title}</td>
                  <td className="px-3 py-2.5 text-paper-muted">{e.asset ?? "—"}</td>
                  <td className="px-3 py-2.5 text-right text-paper">
                    {e.amount ?? e.tokenAmount ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 text-wire">{e.slot.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-amber">{e.signature.slice(0, 12)}…</td>
                  <td className={`px-3 py-2.5 ${e.confidence === "high" ? "text-verified" : e.confidence === "medium" ? "text-amber" : "text-critical"}`}>
                    {e.confidence}
                  </td>
                </tr>
              ))}
              {agent.events.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-paper-muted">
                    No raw events to display.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* DISCLAIMER */}
      <div className="mt-10 border-l-2 border-bronze bg-panel-deep/60 p-5">
        <div className="label-amber">Disclaimer</div>
        <p className="mt-2 text-sm leading-relaxed text-paper-muted">
          SPX402 verifies observable on-chain events. It does not verify off-chain
          revenue, service quality, future buybacks, token value, or operator intent.
          A high Transparency Score does not mean a token is safe, valuable, or
          suitable to buy. Buybacks may not occur, may occur irregularly, or may
          stop entirely. Read the full <Link to="/disclaimer" className="text-amber hover:underline">disclaimer</Link>.
        </p>
      </div>
    </div>
  );
}

function WatchlistButton({ mint, symbol }: { mint: string; symbol: string }) {
  const { user } = useAuth();
  const [tracked, setTracked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user) {
      setChecked(true);
      return;
    }
    let cancelled = false;
    isOnWatchlist(user.id, mint)
      .then((v) => { if (!cancelled) setTracked(v); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setChecked(true); });
    return () => { cancelled = true; };
  }, [user, mint]);

  if (!user) {
    return (
      <Link
        to="/login"
        className="inline-flex items-center gap-2 border border-amber/80 bg-amber/10 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep"
      >
        <Activity className="h-3.5 w-3.5" /> Sign in to watchlist
      </Link>
    );
  }

  const toggle = async () => {
    if (busy || !checked) return;
    setBusy(true);
    try {
      if (tracked) {
        await removeFromWatchlist(user.id, mint);
        setTracked(false);
      } else {
        await addToWatchlist(user.id, mint, symbol);
        setTracked(true);
      }
    } catch {
      /* swallow — UI stays as-is */
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy || !checked}
      className={
        tracked
          ? "inline-flex items-center gap-2 border border-verified/80 bg-verified/10 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-verified hover:border-critical hover:text-critical disabled:opacity-50"
          : "inline-flex items-center gap-2 border border-amber/80 bg-amber/10 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep disabled:opacity-50"
      }
    >
      {tracked ? <Check className="h-3.5 w-3.5" /> : <Activity className="h-3.5 w-3.5" />}
      {tracked ? "On watchlist" : "Add to watchlist"}
    </button>
  );
}

function AlertSubscribeButton({ mint: _mint }: { mint: string }) {
  return (
    <ComingSoon label="Alerts coming soon">
      <span className="inline-flex items-center gap-2 border border-amber/80 bg-amber/10 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-amber">
        <Bell className="h-3.5 w-3.5" /> Subscribe to alerts
      </span>
    </ComingSoon>
  );
}

