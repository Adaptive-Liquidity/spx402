import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AgentRow } from "@/components/spx/AgentRow";
import { fetchAllAgents } from "@/lib/agents-db";
import { qualifiesForLeaderboard, type Agent } from "@/lib/agents";
import { CATEGORIES, type AgentCategory } from "@/lib/agents/categories";
import { fetchScoreMovers, type ScoreMover } from "@/lib/live-data";
import { ArrowDown, ArrowUp } from "lucide-react";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
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
  }),
  loader: () => fetchAllAgents(),
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
    eyebrow: "Buyback SOL routed",
    body: "Agents ranked by total SOL routed into buybacks of their own token.",
  },
  {
    id: "consistent",
    label: "Most Consistent",
    eyebrow: "Buyback execution rate",
    body: "Agents that hit their buyback windows. Minimum 5 confirmed buybacks to qualify.",
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

function rankAgents(
  agents: Agent[],
  tab: Tab,
  catFilter: CategoryFilter,
): Agent[] {
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
    const consistencySignal = (a: typeof qualified[number]) => {
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

  const ranked = useMemo(
    () => rankAgents(agents, tab, catFilter),
    [agents, tab, catFilter],
  );
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

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 lg:px-8 lg:py-16">
      <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-8">
          <div className="label-amber">Leaderboard</div>
          <h1 className="mt-3 font-display text-5xl font-bold leading-tight text-paper">
            Ranked by what the chain settles.
          </h1>
          <p className="mt-4 max-w-2xl text-paper-muted">
            Not by holders. Not by sentiment. Not by who shouted the loudest.
            SPX402 ranks Solana agents by the execution patterns it can verify
            on-chain.
          </p>
        </div>
        {topEarner && (
          <div className="lg:col-span-4">
            <Link
              to="/agent/$mint"
              params={{ mint: topEarner.mint }}
              className="panel-engraved block p-5 transition-colors hover:bg-panel/60"
            >
              <div className="label-amber">#1 Earner</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-3xl font-bold text-paper">
                  ${topEarner.symbol}
                </span>
                <span className="font-mono text-xs text-wire">{topEarner.grade}</span>
              </div>
              <div className="mt-1 num-display text-xl font-bold text-amber">
                {topEarner.totalBuybackSol.toFixed(2)} SOL
              </div>
              <div className="mt-1 font-mono text-[11px] uppercase tracking-widest text-wire">
                bought back · all-time
              </div>
            </Link>
          </div>
        )}
      </div>

      {/* Category filter chips — narrow leaderboard scope to one agent type */}
      <div className="mt-10 flex flex-wrap gap-2">
        {(["all", ...CATEGORIES.map((c) => c.id)] as CategoryFilter[]).map(
          (id) => {
            const isActive = catFilter === id;
            const label =
              id === "all"
                ? "All Categories"
                : CATEGORIES.find((c) => c.id === id)!.label;
            const count = categoryCounts[id] ?? 0;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setCatFilter(id)}
                className={`flex items-center gap-2 border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors ${
                  isActive
                    ? "border-amber bg-amber/10 text-amber"
                    : "border-bronze/40 bg-panel text-paper-muted hover:border-bronze hover:text-paper"
                }`}
              >
                {label}
                <span
                  className={`border px-1 py-0.5 text-[9px] ${
                    isActive
                      ? "border-amber/60 bg-amber/10 text-amber"
                      : "border-bronze/40 bg-panel-deep text-wire"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          },
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-px overflow-hidden border border-bronze/40 bg-bronze/40">
        {TABS.map((t) => {
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-1 min-w-[140px] px-4 py-3 font-mono text-[11px] uppercase tracking-widest transition-colors ${
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

      <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="label-amber">{active.eyebrow}</div>
          <p className="mt-1 max-w-xl text-sm text-paper-muted">{active.body}</p>
          {tab !== "movers" && (
            <p className="mt-2 max-w-xl text-[11px] font-mono uppercase tracking-widest text-wire">
              Quality gate · grade ≥ SPX BB · score ≥ 50 · not flagged
            </p>
          )}
          {tab === "movers" && (
            <p className="mt-2 max-w-xl text-[11px] font-mono uppercase tracking-widest text-wire">
              Source · agent_score_snapshots (daily) · 24h window
            </p>
          )}
        </div>
        <span className="font-mono text-xs uppercase tracking-widest text-wire">
          {tab === "movers"
            ? `${movers?.length ?? 0} movers`
            : `${ranked.length} ranked`}
        </span>
      </div>

      <div className="mt-6 space-y-2">
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
          <div className="border border-dashed border-bronze/60 p-10 text-center font-mono text-sm text-paper-muted">
            No agents qualify for this leaderboard yet.
            <div className="mt-3 space-x-4">
              <Link to="/explore" className="text-amber underline">
                Browse the full index →
              </Link>
              <Link to="/register" className="text-amber underline">
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
          Register your mint or Agent Registry PDA. SPX402 indexes your
          execution and ranks you automatically — no email gate, no pay-to-rank.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/register"
            className="inline-flex items-center gap-2 border border-amber/80 bg-amber/10 px-5 py-3 font-mono text-xs uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep"
          >
            Register your agent
          </Link>
          <Link
            to="/explore"
            className="inline-flex items-center gap-2 border border-bronze/60 bg-panel px-5 py-3 font-mono text-xs uppercase tracking-widest text-paper-muted hover:bg-panel-deep hover:text-paper"
          >
            Browse all agents
          </Link>
          <Link
            to="/flagged"
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
          <span className="font-display text-lg font-bold text-paper">
            ${mover.symbol}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-wire">
            {mover.grade}
          </span>
        </div>
        <div className="mt-1 truncate font-mono text-[11px] text-paper-muted">
          {mover.name}
        </div>
      </div>
      <div className="text-right">
        <div className="font-mono text-[10px] uppercase tracking-widest text-wire">
          score
        </div>
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
