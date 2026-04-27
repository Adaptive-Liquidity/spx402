import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AgentRow } from "@/components/spx/AgentRow";
import { fetchAllAgents } from "@/lib/agents-db";
import { qualifiesForLeaderboard, type Agent } from "@/lib/agents";
import { CATEGORIES, type AgentCategory } from "@/lib/agents/categories";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — SPX402" },
      {
        name: "description",
        content:
          "The live leaderboard of Solana agents ranked by on-chain execution. Top earners, most consistent, and most recently verified.",
      },
      { property: "og:title", content: "Solana agent leaderboard — SPX402" },
      {
        property: "og:description",
        content:
          "Ranked by what the chain settles, not what the thread claims. Top earners. Most consistent. Most recently verified.",
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

type Tab = "earners" | "consistent" | "recent";

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
    return [...qualified]
      .filter((a) => a.totalBuybacksCount >= 5)
      .sort((a, b) => b.buybackExecutionRate - a.buybackExecutionRate)
      .slice(0, 50);
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
      counts[c.id] = qualified.filter((a) => a.category === c.id).length;
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

      <div className="mt-10 flex flex-wrap gap-px overflow-hidden border border-bronze/40 bg-bronze/40">
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
          <p className="mt-2 max-w-xl text-[11px] font-mono uppercase tracking-widest text-wire">
            Quality gate · grade ≥ SPX BB · score ≥ 50 · not flagged
          </p>
        </div>
        <span className="font-mono text-xs uppercase tracking-widest text-wire">
          {ranked.length} ranked
        </span>
      </div>

      <div className="mt-6 space-y-2">
        {ranked.length === 0 ? (
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
