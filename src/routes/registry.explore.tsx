import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { AgentSearchBar } from "@/components/spx/AgentSearchBar";
import { ExecutionGradeBadge } from "@/components/spx/ExecutionGradeBadge";
import { fetchAgentIndex } from "@/lib/agents-db";
import type { Agent } from "@/lib/agents";
import { categoryMeta } from "@/lib/agents/categories";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { PageHead } from "@/components/spx/PageHead";
import { DataTable, Pager, type Column } from "@/components/spx/DataTable";
import { DataToolbar, FilterChip, FilterRow } from "@/components/spx/DataToolbar";

const PAGE_SIZE = 50;

export const Route = createFileRoute("/registry/explore")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://spx402.com/registry/explore" }],
    meta: [
      { property: "og:url", content: "https://spx402.com/registry/explore" },
      { title: "Explore Agents — SPX402" },
      {
        name: "description",
        content:
          "Browse every Solana agent SPX402 indexes, filter by execution grade, and inspect the long tail. SPX D and SPX404 archive included.",
      },
      { property: "og:title", content: "Explore tokenized agents — SPX402" },
      {
        property: "og:description",
        content: "Filter by observable execution. Not by vibes. Includes the SPX404 archive.",
      },
    ],
  }),
  validateSearch: (
    search: Record<string, unknown>,
  ): { grade?: string; page?: number; sort?: string } => ({
    grade: typeof search.grade === "string" && search.grade ? search.grade : undefined,
    page: Number(search.page) > 1 ? Number(search.page) : undefined,
    sort: search.sort === "grade" || search.sort === "recent" ? search.sort : undefined,
  }),
  loader: () => fetchAgentIndex(),
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
    label: "All indexed",
    description: "Every agent in the SPX402 index, regardless of grade.",
    match: () => true,
  },
  {
    id: "high",
    label: "High trust",
    description: "Grades SPX A through SPX AAA. Strongest execution evidence.",
    match: (a) => a.grade === "SPX AAA" || a.grade === "SPX AA" || a.grade === "SPX A",
  },
  {
    id: "mid",
    label: "Mid trust",
    description: "Grades SPX BB and SPX BBB. Acceptable execution with some coverage gaps.",
    match: (a) => a.grade === "SPX BBB" || a.grade === "SPX BB",
  },
  {
    id: "low",
    label: "Low / watch",
    description:
      "Grades SPX B and SPX D. Limited or degraded execution — treat metrics as indicative only.",
    match: (a) => a.grade === "SPX B" || a.grade === "SPX D",
  },
  {
    id: "spx404",
    label: "SPX404 archive",
    description:
      "No on-chain activity observed in the indexed window. Insufficient evidence to grade.",
    match: (a) => a.grade === "SPX404",
  },
];

function ExplorePage() {
  const allAgents = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/registry/explore" });

  const filter = (GRADE_FILTERS.find((f) => f.id === search.grade)?.id ?? "all") as GradeFilter;
  const page = search.page ?? 1;

  // Flagged agents never appear on /explore — they live on /flagged only.
  const visible = useMemo(() => allAgents.filter((a: Agent) => !a.flagged), [allAgents]);
  const flaggedCount = allAgents.length - visible.length;

  const active = GRADE_FILTERS.find((f) => f.id === filter)!;
  const filtered = useMemo(
    () => [...visible].filter(active.match).sort((a, b) => (b.score ?? 0) - (a.score ?? 0)),
    [visible, active],
  );

  const counts = useMemo(() => {
    const c: Record<GradeFilter, number> = { all: 0, high: 0, mid: 0, low: 0, spx404: 0 };
    for (const a of visible) for (const f of GRADE_FILTERS) if (f.match(a)) c[f.id]++;
    return c;
  }, [visible]);

  const setFilter = (id: GradeFilter) =>
    void navigate({
      search: { grade: id === "all" ? undefined : id, page: undefined },
      replace: true,
    });
  const setPage = (next: number) =>
    void navigate({ search: (prev) => ({ ...prev, page: next > 1 ? next : undefined }) });

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const start = (current - 1) * PAGE_SIZE;
  const rows = filtered.slice(start, start + PAGE_SIZE);

  // Columns that would print a full column of dashes for this page are dropped
  // rather than rendered empty.
  const hasBuybacks = rows.some((a) => a.totalBuybacksCount > 0);
  const hasLastActivity = rows.some(
    (a) => a.lastBuybackLabel && a.lastBuybackLabel !== "—" && a.lastBuybackLabel !== "NONE",
  );

  const showsLowGradeWarning = filter === "low" || filter === "spx404";

  const columns: Array<Column<Agent>> = [
    {
      key: "agent",
      header: "Agent",
      className: "min-w-[14rem]",
      cell: (a) => (
        <Link
          to="/agent/$mint"
          params={{ mint: a.mint }}
          className="flex items-center gap-2 hover:underline"
        >
          <span className="font-display text-sm font-semibold text-paper">${a.symbol}</span>
          <span className="truncate text-[11px] text-wire">{a.name}</span>
          {a.operatorVerified ? (
            <ShieldCheck className="h-3 w-3 shrink-0 text-verified" aria-label="Operator verified" />
          ) : null}
        </Link>
      ),
    },
    {
      key: "category",
      header: "Category",
      hideBelow: "md",
      className: "text-paper-muted",
      cell: (a) => categoryMeta(a.category).label,
    },
    {
      key: "grade",
      header: "Grade",
      className: "w-32",
      cell: (a) => (
        <ExecutionGradeBadge grade={a.grade} size="sm" confidenceScore={a.confidenceScore} />
      ),
    },
    {
      key: "score",
      header: "Score",
      align: "right",
      className: "w-20",
      cell: (a) => a.score ?? "—",
    },
    ...(hasBuybacks
      ? [
          {
            key: "buybacks",
            header: "Buybacks",
            align: "right" as const,
            hideBelow: "sm" as const,
            className: "w-24",
            cell: (a: Agent) => a.totalBuybacksCount.toLocaleString(),
          },
        ]
      : []),
    {
      key: "failed",
      header: "Failed",
      align: "right",
      hideBelow: "sm",
      className: "w-20",
      cell: (a: Agent) => (
        <span className={a.failedWindows > 0 ? "text-critical" : "text-wire"}>
          {a.failedWindows}
        </span>
      ),
    },
    ...(hasLastActivity
      ? [
          {
            key: "last",
            header: "Last activity",
            align: "right" as const,
            hideBelow: "lg" as const,
            className: "w-32 text-paper-muted",
            cell: (a: Agent) => a.lastBuybackLabel,
          },
        ]
      : []),
  ];

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 lg:px-8">
      <PageHead
        title="Explore the index"
        description="Every Solana agent we have heard, filterable by execution grade — including the SPX404 archive of agents we found but couldn't verify."
        actions={
          <div className="w-full lg:w-[26rem]">
            <AgentSearchBar />
          </div>
        }
      />

      <div className="mt-6">
        <DataToolbar
          filters={
            <FilterRow label="Grade">
              {GRADE_FILTERS.map((f) => (
                <FilterChip
                  key={f.id}
                  active={filter === f.id}
                  onClick={() => setFilter(f.id)}
                  count={counts[f.id]}
                  disabled={counts[f.id] === 0 && f.id !== "all"}
                >
                  {f.label}
                </FilterChip>
              ))}
            </FilterRow>
          }
          status={<span className="text-paper-muted">{active.description}</span>}
        />

        <DataTable
          caption="Indexed Solana agents and their execution grades"
          columns={columns}
          rows={rows}
          rowKey={(a) => a.mint}
          empty="No agents match this filter."
        />

        <Pager
          page={current}
          pageCount={pageCount}
          total={total}
          from={total === 0 ? 0 : start + 1}
          to={Math.min(start + PAGE_SIZE, total)}
          onPage={setPage}
        />
      </div>

      {showsLowGradeWarning && total > 0 && (
        <div className="mt-4 flex items-start gap-3 border border-critical/40 bg-critical/5 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-critical" />
          <p className="font-mono text-xs text-critical/90">
            These agents do not meet the SPX402 leaderboard quality bar. Execution is limited,
            degraded, or not observable in the indexed window. Treat all metrics as indicative only
            and verify on-chain before any positioning decision.
          </p>
        </div>
      )}

      <div className="mt-10 grid gap-3 sm:grid-cols-3">
        <Link to="/registry" className="panel-engraved block p-5 transition-colors hover:bg-panel/60">
          <div className="label-amber">Leaderboard</div>
          <div className="mt-2 font-display text-base font-semibold text-paper">
            High-trust agents only →
          </div>
        </Link>
        <Link
          to="/registry/flagged"
          className="block border border-critical/40 bg-critical/5 p-5 transition-colors hover:bg-critical/10"
        >
          <div className="label-amber !text-critical">Flagged</div>
          <div className="mt-2 font-display text-base font-semibold text-paper">
            {flaggedCount} flagged {flaggedCount === 1 ? "agent" : "agents"} →
          </div>
        </Link>
        <Link
          to="/build/register"
          className="panel-engraved block p-5 transition-colors hover:bg-panel/60"
        >
          <div className="label-amber">Register</div>
          <div className="mt-2 font-display text-base font-semibold text-paper">
            Add your agent to the index →
          </div>
        </Link>
      </div>
    </div>
  );
}
