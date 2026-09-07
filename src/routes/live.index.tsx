// Wave 1a — canonical execution tape.
//
// Paginated, filterable view of every event the indexer has produced.
// This is the public ledger that grades, attestations, and (later)
// bonds must reconcile against.

import { createFileRoute, Link, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { fetchTape, relativeFromNow, type TapeRow } from "@/lib/live-data";
import { CATEGORIES, categoryLabel } from "@/lib/agents/categories";
import { PageHead } from "@/components/spx/PageHead";
import { DataTable, Pager, type Column } from "@/components/spx/DataTable";
import { DataToolbar, FilterChip, FilterRow } from "@/components/spx/DataToolbar";

const PAGE_SIZE = 50;
const WINDOW = 400;

const SEVERITIES: Array<{ id: string | null; label: string }> = [
  { id: null, label: "All" },
  { id: "success", label: "Success" },
  { id: "info", label: "Info" },
  { id: "warn", label: "Warn" },
  { id: "critical", label: "Critical" },
];

export const Route = createFileRoute("/live/")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://spx402.com/live" }],
    meta: [
      { property: "og:url", content: "https://spx402.com/live" },
      { title: "Execution Tape — SPX402" },
      {
        name: "description",
        content:
          "The canonical evidence ledger for every Solana agent SPX402 indexes. Every row is a permalinked piece of execution evidence.",
      },
      { property: "og:title", content: "SPX402 Execution Tape" },
      {
        property: "og:description",
        content:
          "The canonical on-chain evidence ledger for Solana agents. Every grade is explainable from the tape.",
      },
    ],
  }),
  // Filters and the page cursor live in the URL so every view is cacheable,
  // shareable, and instant on revisit.
  validateSearch: (
    search: Record<string, unknown>,
  ): { category?: string; severity?: string; page?: number } => ({
    category: typeof search.category === "string" && search.category ? search.category : undefined,
    severity: typeof search.severity === "string" && search.severity ? search.severity : undefined,
    page: Number(search.page) > 1 ? Number(search.page) : undefined,
  }),
  loaderDeps: ({ search }) => ({
    category: search.category ?? null,
    severity: search.severity ?? null,
  }),
  loader: ({ deps }) =>
    fetchTape({ limit: WINDOW, category: deps.category, severity: deps.severity }),
  staleTime: 15_000,
  component: TapePage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="label-amber">Tape error</div>
        <p className="mt-3 text-paper-muted">{error.message}</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 border border-amber/80 bg-amber/10 px-5 py-3 font-mono text-xs uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep"
        >
          Retry
        </button>
      </div>
    );
  },
});

function severityTone(sev: string): string {
  if (sev === "success") return "text-verified";
  if (sev === "critical") return "text-critical";
  if (sev === "warn") return "text-amber";
  return "text-paper-muted";
}

function severityDot(sev: string): string {
  if (sev === "success") return "bg-verified";
  if (sev === "critical") return "bg-critical";
  if (sev === "warn") return "bg-amber";
  return "bg-wire";
}

function TapePage() {
  const rows = Route.useLoaderData() as TapeRow[];
  const search = Route.useSearch();
  const category = search.category ?? null;
  const severity = search.severity ?? null;
  const page = search.page ?? 1;
  const navigate = useNavigate({ from: "/live/" });
  const loading = useRouterState({ select: (s) => s.isLoading });

  const setFilter = (key: "category" | "severity", value: string | null) =>
    void navigate({
      search: (prev) => ({ ...prev, [key]: value ?? undefined, page: undefined }),
      replace: true,
    });

  const setPage = (next: number) =>
    void navigate({ search: (prev) => ({ ...prev, page: next > 1 ? next : undefined }) });

  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const start = (current - 1) * PAGE_SIZE;
  const visible = rows.slice(start, start + PAGE_SIZE);

  const columns: Array<Column<TapeRow>> = [
    {
      key: "type",
      header: "Event",
      className: "min-w-[15rem]",
      cell: (r) => (
        <Link
          to="/tape/$eventId"
          params={{ eventId: r.id }}
          className={`flex items-center gap-2 hover:underline ${severityTone(r.severity)}`}
        >
          <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${severityDot(r.severity)}`} />
          <span className="truncate">{r.type}</span>
          <span className="sr-only">— severity {r.severity}</span>
        </Link>
      ),
    },
    {
      key: "subject",
      header: "Subject",
      className: "min-w-[9rem]",
      cell: (r) =>
        r.agentSymbol ? `$${r.agentSymbol}` : `${r.mint.slice(0, 4)}…${r.mint.slice(-4)}`,
    },
    {
      key: "category",
      header: "Category",
      hideBelow: "sm",
      className: "text-paper-muted",
      cell: (r) => categoryLabel(r.agentCategory),
    },
    {
      key: "amount",
      header: "Amount",
      hideBelow: "sm",
      align: "right",
      className: "w-28",
      cell: (r) => (r.amountSol > 0 ? `${r.amountSol.toFixed(2)} SOL` : "—"),
    },
    {
      key: "when",
      header: "When",
      align: "right",
      className: "w-24 text-wire",
      cell: (r) => relativeFromNow(r.occurredAt),
    },
  ];

  return (
    <div className="stage py-8">
      <PageHead
        title="Execution tape"
        description="Canonical evidence ledger. Every row is a permalinked on-chain event the indexer observed — every grade is explainable from the tape."
      />

      <div className="mt-6">
        <DataToolbar
          filters={
            <>
              <FilterRow label="Category">
                <FilterChip active={category === null} onClick={() => setFilter("category", null)}>
                  All
                </FilterChip>
                {CATEGORIES.filter((c) => c.decoderLive).map((c) => (
                  <FilterChip
                    key={c.id}
                    active={category === c.id}
                    onClick={() => setFilter("category", c.id)}
                  >
                    {c.label}
                  </FilterChip>
                ))}
              </FilterRow>
              <FilterRow label="Severity">
                {SEVERITIES.map((s) => (
                  <FilterChip
                    key={s.label}
                    active={severity === s.id}
                    onClick={() => setFilter("severity", s.id)}
                  >
                    {s.label}
                  </FilterChip>
                ))}
              </FilterRow>
            </>
          }
          right={
            current > 1 ? (
              <button
                type="button"
                onClick={() => setPage(1)}
                className="border border-bronze/40 px-2.5 py-1 transition-colors hover:border-amber hover:text-amber"
              >
                Jump to newest
              </button>
            ) : null
          }
        />

        <DataTable
          caption="Execution events observed on-chain"
          columns={columns}
          rows={visible}
          rowKey={(r) => r.id}
          loading={loading}
          empty="No events match these filters."
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

      <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-wire">
        Most recent {WINDOW} events retained in this view · deeper history via the evidence API.
      </p>
    </div>
  );
}
