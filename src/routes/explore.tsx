import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AgentRow } from "@/components/spx/AgentRow";
import { AgentSearchBar } from "@/components/spx/AgentSearchBar";
import { fetchAllAgents } from "@/lib/agents-db";
import { isLowGrade, type Agent, type Grade } from "@/lib/agents";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explore Agents — SPX402" },
      {
        name: "description",
        content:
          "Browse every Solana agent SPX402 indexes, filter by execution grade, and inspect the long tail. SPX D and SPX404 archive included.",
      },
      { property: "og:title", content: "Explore tokenized agents — SPX402" },
      {
        property: "og:description",
        content:
          "Filter by observable execution. Not by vibes. Includes the SPX404 archive.",
      },
    ],
  }),
  loader: () => fetchAllAgents(),
  staleTime: 30_000,
  pendingComponent: () => (
    <div className="mx-auto max-w-[1400px] px-4 py-20 text-center font-mono text-xs uppercase tracking-widest text-wire">
      Loading agent index…
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-[1400px] px-4 py-20 text-center">
      <div className="label-amber">Index unavailable</div>
      <p className="mt-3 text-paper-muted">{error.message}</p>
    </div>
  ),
  component: ExplorePage,
});

type GradeFilter = "all" | "high" | "mid" | "low" | "spx404";

const GRADE_FILTERS: Array<{
  id: GradeFilter;
  label: string;
  description: string;
  match: (a: Agent) => boolean;
}> = [
  {
    id: "all",
    label: "All Indexed",
    description: "Every agent in the SPX402 index, regardless of grade.",
    match: () => true,
  },
  {
    id: "high",
    label: "High Trust",
    description: "Grades SPX A through SPX AAA. Strongest execution evidence.",
    match: (a) =>
      a.grade === "SPX AAA" || a.grade === "SPX AA" || a.grade === "SPX A",
  },
  {
    id: "mid",
    label: "Mid Trust",
    description:
      "Grades SPX BB and SPX BBB. Acceptable execution with some coverage gaps.",
    match: (a) => a.grade === "SPX BBB" || a.grade === "SPX BB",
  },
  {
    id: "low",
    label: "Low / Watch",
    description:
      "Grades SPX B and SPX D. Limited or degraded execution — treat metrics as indicative only.",
    match: (a) => a.grade === "SPX B" || a.grade === "SPX D",
  },
  {
    id: "spx404",
    label: "SPX404 Archive",
    description:
      "No on-chain activity observed in the indexed window. Insufficient evidence to grade.",
    match: (a) => a.grade === "SPX404",
  },
];

function ExplorePage() {
  const allAgents = Route.useLoaderData();
  const [filter, setFilter] = useState<GradeFilter>("all");

  // Flagged agents never appear on /explore — they live on /flagged only.
  const visible = useMemo(
    () => allAgents.filter((a: Agent) => !a.flagged),
    [allAgents],
  );

  const flaggedCount = allAgents.length - visible.length;

  const active = GRADE_FILTERS.find((f) => f.id === filter)!;
  const filtered = useMemo(
    () =>
      [...visible]
        .filter(active.match)
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0)),
    [visible, active],
  );

  // Counts by filter for the chip badges
  const counts = useMemo(() => {
    const c: Record<GradeFilter, number> = {
      all: 0,
      high: 0,
      mid: 0,
      low: 0,
      spx404: 0,
    };
    for (const a of visible) {
      for (const f of GRADE_FILTERS) {
        if (f.match(a)) c[f.id]++;
      }
    }
    return c;
  }, [visible]);

  const showsLowGradeWarning = filter === "low" || filter === "spx404";

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 lg:px-8 lg:py-16">
      <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <div className="label-amber">Explorer</div>
          <h1 className="mt-3 font-display text-5xl font-bold text-paper">
            Every Solana agent we have heard.
          </h1>
          <p className="mt-4 max-w-xl text-paper-muted">
            Filter by execution grade. The full index — including the SPX404
            archive of agents we found but couldn&apos;t verify. The
            leaderboard only shows high-trust grades; this page shows
            everything else too.
          </p>
        </div>
        <div className="lg:col-span-5">
          <AgentSearchBar />
        </div>
      </div>

      {/* Grade filter chips */}
      <div className="mt-10 flex flex-wrap gap-2">
        {GRADE_FILTERS.map((f) => {
          const isActive = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`group flex items-center gap-2 border px-4 py-2 font-mono text-[11px] uppercase tracking-widest transition-colors ${
                isActive
                  ? "border-amber bg-amber/10 text-amber"
                  : "border-bronze/40 bg-panel text-paper-muted hover:border-bronze hover:text-paper"
              }`}
            >
              {f.label}
              <span
                className={`border px-1.5 py-0.5 text-[9px] ${
                  isActive
                    ? "border-amber/60 bg-amber/10 text-amber"
                    : "border-bronze/40 bg-panel-deep text-wire"
                }`}
              >
                {counts[f.id]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="label-amber">{active.label}</div>
          <p className="mt-1 max-w-xl text-sm text-paper-muted">
            {active.description}
          </p>
        </div>
        <span className="font-mono text-xs uppercase tracking-widest text-wire">
          {filtered.length} agents
        </span>
      </div>

      {showsLowGradeWarning && filtered.length > 0 && (
        <div className="mt-4 flex items-start gap-3 border border-critical/40 bg-critical/5 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-critical" />
          <p className="font-mono text-xs text-critical/90">
            These agents do not meet the SPX402 leaderboard quality bar.
            Execution is limited, degraded, or not observable in the indexed
            window. Treat all metrics as indicative only and verify on-chain
            before any positioning decision.
          </p>
        </div>
      )}

      <div className="mt-6 space-y-2">
        {filtered.length === 0 ? (
          <div className="border border-dashed border-bronze/60 p-10 text-center font-mono text-sm text-paper-muted">
            No agents match this filter.
          </div>
        ) : (
          filtered.map((a) => (
            <div key={a.mint} className={isLowGrade(a) ? "opacity-90" : ""}>
              <AgentRow agent={a} />
            </div>
          ))
        )}
      </div>

      <div className="mt-12 grid gap-3 sm:grid-cols-3">
        <Link
          to="/leaderboard"
          className="panel-engraved block p-5 transition-colors hover:bg-panel/60"
        >
          <div className="label-amber">Leaderboard</div>
          <div className="mt-2 font-display text-base font-semibold text-paper">
            High-trust agents only →
          </div>
        </Link>
        <Link
          to="/flagged"
          className="block border border-critical/40 bg-critical/5 p-5 transition-colors hover:bg-critical/10"
        >
          <div className="label-amber !text-critical">Flagged</div>
          <div className="mt-2 font-display text-base font-semibold text-paper">
            {flaggedCount} flagged {flaggedCount === 1 ? "agent" : "agents"} →
          </div>
        </Link>
        <Link
          to="/register"
          className="panel-engraved block p-5 transition-colors hover:bg-panel/60"
        >
          <div className="label-amber">Register</div>
          <div className="mt-2 font-display text-base font-semibold text-paper">
            Add your agent to the index →
          </div>
        </Link>
      </div>

      <div className="mt-16 panel-engraved p-8 text-center">
        <h2 className="font-display text-2xl font-bold text-paper">
          Don&apos;t see your agent?
        </h2>
        <p className="mt-3 text-paper-muted">
          Paste a mint, creator wallet, or Agent Registry PDA and SPX402 will
          queue it for analysis.
        </p>
        <div className="mx-auto mt-6 max-w-xl">
          <AgentSearchBar />
        </div>
      </div>
    </div>
  );
}
