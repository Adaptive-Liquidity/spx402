import { createFileRoute, Link } from "@tanstack/react-router";
import { ExecutionGradeBadge } from "@/components/spx/ExecutionGradeBadge";
import type { Agent } from "@/lib/agents";
import { fetchAgentIndex } from "@/lib/agents-db";
import { AlertTriangle } from "lucide-react";
import { DataTable, type Column } from "@/components/spx/DataTable";

export const Route = createFileRoute("/registry/flagged")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://spx402.com/registry/flagged" }],
    meta: [
      { property: "og:url", content: "https://spx402.com/registry/flagged" },
      { title: "Flagged Agents — SPX402" },
      {
        name: "description",
        content:
          "Public registry of agents flagged by SPX402 for impersonation, rug signals, or other trust violations. Transparent chain of custody.",
      },
      { property: "og:title", content: "Flagged agents — SPX402" },
      {
        property: "og:description",
        content:
          "Trust signaling, on the record. Every flagged agent on SPX402, with the reason it was flagged.",
      },
    ],
  }),
  loader: async () => {
    const all = await fetchAgentIndex();
    return all.filter((a) => a.flagged);
  },
  staleTime: 60_000,
  pendingComponent: () => (
    <div className="stage section text-center font-mono text-xs uppercase tracking-widest text-wire">
      Loading flagged registry…
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="stage section text-center">
      <div className="label-amber">Registry unavailable</div>
      <p className="mt-3 text-paper-muted">{error.message}</p>
    </div>
  ),
  component: FlaggedPage,
});

function FlaggedPage() {
  const flagged = Route.useLoaderData() as Agent[];

  const columns: Array<Column<Agent>> = [
    {
      key: "agent",
      header: "Agent",
      className: "min-w-[12rem]",
      cell: (a) => (
        <Link
          to="/agent/$mint"
          params={{ mint: a.mint }}
          className="flex items-center gap-2 hover:underline"
        >
          <span className="font-display text-sm font-semibold text-paper">${a.symbol}</span>
          <span className="truncate text-[11px] text-wire">{a.name}</span>
        </Link>
      ),
    },
    {
      key: "grade",
      header: "Last grade",
      className: "w-32",
      cell: (a) => <ExecutionGradeBadge grade={a.grade} size="sm" confidenceScore={a.confidenceScore} />,
    },
    {
      key: "reason",
      header: "Flag reason",
      className: "min-w-[16rem] text-critical",
      cell: (a) => a.flagReason ?? "Reason not published",
    },
    {
      key: "flaggedAt",
      header: "Flagged",
      align: "right",
      hideBelow: "sm",
      className: "w-28 text-wire",
      cell: (a) => (a.flaggedAt ? new Date(a.flaggedAt).toISOString().slice(0, 10) : "—"),
    },
  ];

  return (
    <div className="stage section">
      <div className="border border-critical/50 bg-critical/10 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-critical" />
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-paper">
              Flagged agents
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-paper-muted">
              Flagged for impersonation, rug signals, deceptive metadata, or other trust violations.
              They never appear on the leaderboard, the explorer, or the tape. Their dossiers stay
              live at the direct mint URL with a permanent warning, so the chain of custody remains
              public and auditable.
            </p>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-wire">
              Disagree with a flag? Email <span className="text-amber">disputes@spx402.com</span>{" "}
              with the mint and on-chain evidence.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between border border-b-0 border-bronze/40 bg-panel-deep/60 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-wire">
        <span>Currently flagged</span>
        <span className="tabular-nums">{flagged.length}</span>
      </div>

      <DataTable
        caption="Agents flagged by SPX402 and the reason for each flag"
        columns={columns}
        rows={flagged}
        rowKey={(a) => a.mint}
        empty="No flagged agents in the registry. It is clean."
      />

      {flagged.length === 0 ? (
        <div className="mt-4 text-center">
          <Link
            to="/registry"
            className="font-mono text-[11px] uppercase tracking-widest text-amber hover:underline"
          >
            Return to leaderboard →
          </Link>
        </div>
      ) : null}
    </div>
  );
}
