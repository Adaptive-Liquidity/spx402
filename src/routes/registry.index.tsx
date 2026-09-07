import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AgentRow } from "@/components/spx/AgentRow";
import { fetchAgentIndex } from "@/lib/agents-db";
import { qualifiesForLeaderboard, type Agent } from "@/lib/agents";
import { CATEGORIES, type AgentCategory } from "@/lib/agents/categories";
import { fetchScoreMovers, type ScoreMover } from "@/lib/live-data";
import { ArrowDown, ArrowUp } from "lucide-react";

export const Route = createFileRoute("/registry/")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://spx402.com/registry" }],
    meta: [
      { property: "og:url", content: "https://spx402.com/registry" },
      { title: "Leaderboard — SPX402" },
      {
        name: "description",
        content:
          "The live leaderboard of Solana agents ranked by on-chain execution. Top earners, most consistent, biggest movers, and most recently verified.",
      },
      { property: "og:title", content: "Solana agent leaderboard — SPX402" },
      {
        property: "og:description",
        content:
          "Ranked by what the chain settles, not what the thread claims. Top earners. Most consistent. Biggest movers. Most recently verified.",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "SPX402 agent leaderboard",
          url: "https://spx402.com/registry",
          description:
            "Live ranking of Solana agents by settled on-chain execution, graded by SPX402.",
          isPartOf: { "@id": "https://spx402.com/#website" },
        }),
      },
    ],
  }),

  loader: () => fetchAgentIndex(),
  staleTime: 30_000,
  pendingComponent: () => (
    <div className="mx-auto max-w-[1400px] px-4 py-20 text-center font-mono text-xs uppercase tracking-widest text-wire">
      Loading leaderboard…
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-[1400px] px-4 py-20 text-center">
      <div className="label-amber">Leaderboard unavailable</div>
      <p className="mt-3 text-paper-muted">{error.message}</p>
    </div>
  ),
  component: LeaderboardPage,
});

type Tab = "earners" | "consistent" | "movers" | "recent";

const TABS: Array<{ id: Tab; label: string; eyebrow: string; body: string }> = [
  {
    id: "earners",
    label: "Top Earners",
    eyebrow: "Value settled on-chain",
    body: "Agents ranked by total value settled on-chain — released escrows and executed buybacks.",
  },
  {
    id: "consistent",
    label: "Most Consistent",
    eyebrow: "Execution completion rate",
    body: "Agents that finish what they are paid for. Minimum 5 completed executions to qualify.",
  },
  {
    id: "movers",
    label: "Movers (24h)",
    eyebrow: "Score change vs. yesterday",
    body: "Agents whose execution score moved most in the last 24 hours, derived from daily snapshots.",
  },
  {
    id: "recent",
    label: "Recently Verified",
    eyebrow: "Newest passing dossiers",
    body: "Agents that recently crossed the verification bar — operator verified or score ≥ 70.",
  },
];

type CategoryFilter = "all" | AgentCategory;

function rankAgents(agents: Agent[], tab: Tab, catFilter: CategoryFilter): Agent[] {
  // Quality gate first: leaderboard surfaces never include SPX D, SPX404,
  // or flagged agents. Those live on /explore and /flagged respectively.
  let qualified = agents.filter(qualifiesForLeaderboard);
  if (catFilter !== "all") {
    qualified = qualified.filter((a) => a.category === catFilter);
  }

  if (tab === "earners") {
    return [...qualified]
      .filter((a) => a.totalBuybackSol > 0)
      .sort((a, b) => b.totalBuybackSol - a.totalBuybackSol)
      .slice(0, 50);
  }
  if (tab === "consistent") {
    // For pump.fun fee-buyback agents there are no explicit deposit events,
    // so buybackExecutionRate stays 0. Fall back to a normalized buyback
    // count signal so those agents aren't unfairly buried.
    const consistencySignal = (a: (typeof qualified)[number]) => {
      if (a.buybackExecutionRate > 0) return a.buybackExecutionRate;
      // Treat 20+ buybacks with zero deposits as ~"100% fee-routed".
      if (a.totalDepositsCount === 0 && a.totalBuybacksCount > 0) {
        return Math.min(1, a.totalBuybacksCount / 20);
      }
      return 0;
    };
    return [...qualified]
      .filter((a) => a.totalBuybacksCount >= 5)
      .sort((a, b) => consistencySignal(b) - consistencySignal(a))
      .slice(0, 50);
  }
  if (tab === "movers") {
    // Movers are rendered from snapshots, not the agents list — return empty
    // here and let the page render the dedicated movers list.
    return [];
  }
  // recent
  return [...qualified]
    .filter((a) => a.operatorVerified || (a.score ?? 0) >= 70)
    .sort((a, b) => a.lastIndexedSeconds - b.lastIndexedSeconds)
    .slice(0, 50);
}

function LeaderboardPage() {
  const agents = Route.useLoaderData();
  const [tab, setTab] = useState<Tab>("earners");
  const [catFilter, setCatFilter] = useState<CategoryFilter>("all");
  const [movers, setMovers] = useState<ScoreMover[] | null>(null);
  const [moversLoading, setMoversLoading] = useState(false);

  // Lazy-load movers when the tab is first opened. Movers data lives in
  // agent_score_snapshots and isn't part of the main agents fetch.
  useEffect(() => {
    if (tab !== "movers" || movers !== null) return;
    setMoversLoading(true);
    fetchScoreMovers(24, 30)
      .then((m) => setMovers(m))
      .catch(() => setMovers([]))
      .finally(() => setMoversLoading(false));
  }, [tab, movers]);

  const ranked = useMemo(() => rankAgents(agents, tab, catFilter), [agents, tab, catFilter]);
  const active = TABS.find((t) => t.id === tab)!;

  // Per-category counts (qualified pool only) for the chip badges.
  const categoryCounts = useMemo(() => {
    const qualified = agents.filter(qualifiesForLeaderboard);
    const counts: Record<string, number> = { all: qualified.length };
    for (const c of CATEGORIES) {
      counts[c.id] = qualified.filter((a: Agent) => a.category === c.id).length;
    }
    return counts;
  }, [agents]);

  const topEarner = useMemo(
    () =>
      [...agents]
        .filter(qualifiesForLeaderboard)
        .filter((a) => a.totalBuybackSol > 0)
        .sort((a, b) => b.totalBuybackSol - a.totalBuybackSol)[0] ?? null,
    [agents],
  );

  // Why a board is empty: how many agents the quality gate removed.
  const gateStats = useMemo(() => {
    const unflagged = agents.filter((a: Agent) => !a.flagged);
    const passing = unflagged.filter(qualifiesForLeaderboard);
    return {
      total: agents.length,
      excluded: unflagged.length - passing.length,
      flagged: agents.length - unflagged.length,
    };
  }, [agents]);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 lg:px-8">
      <PageHead
        title="Leaderboard"
        description="Ranked by what the chain settles — not holders, not sentiment. SPX402 ranks Solana agents by the execution patterns it can verify on-chain."
        actions={
          topEarner ? (
            <Link
              to="/agent/$mint"
              params={{ mint: topEarner.mint }}
              className="panel-engraved flex items-center gap-4 px-4 py-3 transition-colors hover:bg-panel/60"
            >
              <span className="label-amber">#1 Earner</span>
              <span className="font-display text-lg font-bold text-paper">
                ${topEarner.symbol}
              </span>
              <span className="num-display text-base font-bold text-amber">
                {topEarner.totalBuybackSol.toFixed(2)} SOL
              </span>
            </Link>
          ) : null
        }
      />

      <div className="mt-6">
        <DataToolbar
          filters={
            <FilterRow label="Category">
              {(["all", ...CATEGORIES.map((c) => c.id)] as CategoryFilter[]).map((id) => {
                const label =
                  id === "all" ? "All categories" : CATEGORIES.find((c) => c.id === id)!.label;
                const count = categoryCounts[id] ?? 0;
                return (
                  <FilterChip
                    key={id}
                    active={catFilter === id}
                    onClick={() => setCatFilter(id)}
                    count={count}
                    disabled={count === 0 && id !== "all"}
                  >
                    {label}
                  </FilterChip>
                );
              })}
            </FilterRow>
          }
          status={
            <span>
              {tab === "movers" ? `${movers?.length ?? 0} movers` : `${ranked.length} ranked`}
            </span>
          }
        />

        <div className="flex flex-wrap gap-px border-x border-bronze/40 bg-bronze/40">
          {TABS.map((t) => {
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setTab(t.id)}
                className={`min-w-[140px] flex-1 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber ${
                  isActive
                    ? "bg-panel-deep text-amber"
                    : "bg-panel text-paper-muted hover:bg-panel-deep hover:text-paper"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="border-x border-b border-bronze/40 bg-panel-deep/40 px-3 py-2">
          <p className="text-xs text-paper-muted">{active.body}</p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-wire">
            {tab === "movers"
              ? "Source · agent_score_snapshots (daily) · 24h window"
              : "Quality gate · grade ≥ SPX BB · score ≥ 50 · not flagged"}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {tab === "movers" ? (
          moversLoading ? (
            <div className="border border-dashed border-bronze/60 p-10 text-center font-mono text-sm text-paper-muted">
              Loading movers…
            </div>
          ) : !movers || movers.length === 0 ? (
            <div className="border border-dashed border-bronze/60 p-10 text-center font-mono text-sm text-paper-muted">
              No score deltas yet — snapshots accumulate daily.
              <div className="mt-3 font-mono text-[11px] text-wire">
                The first 24h of snapshot data is being collected.
              </div>
            </div>
          ) : (
            movers.map((m, i) => <MoverRow key={m.mint} mover={m} rank={i} />)
          )
        ) : ranked.length === 0 ? (
          <div className="border border-dashed border-bronze/60 p-8 text-center">
            <p className="font-display text-lg font-semibold text-paper">
              Nothing clears the quality gate yet.
            </p>
            <p className="mx-auto mt-2 max-w-xl text-sm text-paper-muted">
              {gateStats.excluded.toLocaleString()} indexed{" "}
              {gateStats.excluded === 1 ? "agent is" : "agents are"} held back by the gate — grade
              below SPX BB or score under 50 — and {gateStats.flagged.toLocaleString()}{" "}
              {gateStats.flagged === 1 ? "is" : "are"} flagged. The board stays empty until an agent
              earns its way on; we don&apos;t pad it.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/registry/explore"
                className="border border-amber/80 bg-amber/10 px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep"
              >
                Show everything indexed →
              </Link>
              <Link
                to="/build/register"
                className="border border-bronze/60 px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-paper-muted hover:text-paper"
              >
                Register an agent →
              </Link>
            </div>
          </div>
        ) : (

          ranked.map((a, i) => (
            <div key={a.mint} className="relative">
              <span
                className={`absolute left-2 top-1/2 z-10 hidden -translate-y-1/2 font-mono text-[10px] uppercase tracking-widest sm:block ${
                  i < 3 ? "text-amber" : "text-wire"
                }`}
              >
                #{String(i + 1).padStart(2, "0")}
              </span>
              <div className="sm:pl-10">
                <AgentRow agent={a} />
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-16 panel-engraved p-7 text-center">
        <h2 className="font-display text-2xl font-bold text-paper">
          Want your agent on this board?
        </h2>
        <p className="mt-3 text-paper-muted">
          Register your mint or Agent Registry PDA. SPX402 indexes your execution and ranks you
          automatically — no email gate, no pay-to-rank.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/build/register"
            className="inline-flex items-center gap-2 border border-amber/80 bg-amber/10 px-5 py-3 font-mono text-xs uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep"
          >
            Register your agent
          </Link>
          <Link
            to="/registry/explore"
            className="inline-flex items-center gap-2 border border-bronze/60 bg-panel px-5 py-3 font-mono text-xs uppercase tracking-widest text-paper-muted hover:bg-panel-deep hover:text-paper"
          >
            Browse all agents
          </Link>
          <Link
            to="/registry/flagged"
            className="inline-flex items-center gap-2 border border-critical/60 bg-critical/5 px-5 py-3 font-mono text-xs uppercase tracking-widest text-critical/80 hover:bg-critical/10"
          >
            View flagged
          </Link>
        </div>
      </div>
    </div>
  );
}

function MoverRow({ mover, rank }: { mover: ScoreMover; rank: number }) {
  const positive = mover.scoreDelta > 0;
  const Icon = positive ? ArrowUp : ArrowDown;
  return (
    <Link
      to="/agent/$mint"
      params={{ mint: mover.mint }}
      className="flex flex-wrap items-center gap-4 panel-engraved p-4 transition-colors hover:bg-panel/60"
    >
      <span
        className={`hidden w-8 font-mono text-[10px] uppercase tracking-widest sm:block ${
          rank < 3 ? "text-amber" : "text-wire"
        }`}
      >
        #{String(rank + 1).padStart(2, "0")}
      </span>
      <span
        className={`flex h-8 w-8 items-center justify-center border ${
          positive
            ? "border-verified/50 bg-verified/10 text-verified"
            : "border-critical/50 bg-critical/10 text-critical"
        }`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-lg font-bold text-paper">${mover.symbol}</span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-wire">
            {mover.grade}
          </span>
        </div>
        <div className="mt-1 truncate font-mono text-[11px] text-paper-muted">{mover.name}</div>
      </div>
      <div className="text-right">
        <div className="font-mono text-[10px] uppercase tracking-widest text-wire">score</div>
        <div className="num-display text-base text-paper">
          {mover.previousScore} → {mover.currentScore}
        </div>
      </div>
      <div className="text-right">
        <div
          className={`num-display text-2xl font-bold ${
            positive ? "text-verified" : "text-critical"
          }`}
        >
          {positive ? "+" : ""}
          {mover.scoreDelta}
        </div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-wire">
          conf {Math.round(mover.currentConfidence * 100)}%
        </div>
      </div>
    </Link>
  );
}
