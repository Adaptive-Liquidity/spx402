import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { fetchWatchlist, removeFromWatchlist, type WatchlistRow } from "@/lib/watchlist";
import { fetchAgentsByMints } from "@/lib/agents-db";
import { invalidateOperatorCounts } from "@/lib/operator-counts";
import type { Agent } from "@/lib/agents";
import { ExecutionGradeBadge } from "@/components/spx/ExecutionGradeBadge";
import { EmptyState } from "@/components/spx/EmptyState";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/watchlist")({
  head: () => ({
    meta: [
      { title: "Watchlist — SPX402 Operator Terminal" },
      {
        name: "description",
        content: "The agents you track — grade, execution score and last settlement in one register.",
      },
    ],
  }),
  component: WatchlistPage,
});

interface WatchedItem {
  row: WatchlistRow;
  agent: Agent | null;
}

function shortMint(mint: string) {
  return `${mint.slice(0, 6)}…${mint.slice(-4)}`;
}

function WatchlistPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<WatchedItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setError(null);
    try {
      const rows = await fetchWatchlist(user.id);
      const agents = await fetchAgentsByMints(rows.map((r) => r.mint));
      const byMint = new Map(agents.map((a) => [a.mint, a]));
      setItems(rows.map((row) => ({ row, agent: byMint.get(row.mint) ?? null })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load watchlist");
      setItems([]);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const remove = async (mint: string) => {
    if (!user) return;
    setRemoving(mint);
    try {
      await removeFromWatchlist(user.id, mint);
      setItems((prev) => prev?.filter((i) => i.row.mint !== mint) ?? null);
      invalidateOperatorCounts(user.id);
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="band-spine">
            <b>01</b>
            <span>// REGISTER</span>
          </div>
          <h2 className="mt-4 font-display text-2xl font-bold text-paper">Agents under watch</h2>
          <p className="mt-2 max-w-xl text-sm text-paper-muted">
            Everything you track, graded on observable execution only. Figures update as evidence
            lands on the tape.
          </p>
        </div>
        <Link to="/explore" className="btn-caliper btn-caliper-primary">
          + Add agent
        </Link>
      </div>

      {error && (
        <div className="border-l-2 border-critical/70 bg-critical/10 px-3 py-2 font-mono text-xs text-critical">
          {error}
        </div>
      )}

      {items === null ? (
        <div className="panel-engraved space-y-3 p-5">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="skel h-5 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          label="No agents under watch"
          title="The register is empty."
          body={
            <>
              Open the{" "}
              <Link to="/explore" className="text-amber underline underline-offset-4">
                Explorer
              </Link>{" "}
              or any dossier and use <span className="text-amber">Add to watchlist</span> to start
              tracking execution.
            </>
          }
          action={
            <Link to="/explore" className="btn-caliper btn-caliper-primary">
              Browse agents →
            </Link>
          }
        />
      ) : (
        <div className="panel-engraved overflow-hidden">
          <div className="hidden grid-cols-12 gap-4 border-b border-bronze/40 bg-panel-deep/60 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-wire min-[900px]:grid">
            <div className="col-span-3">Subject</div>
            <div className="col-span-3">Grade</div>
            <div className="col-span-2 text-right">Score</div>
            <div className="col-span-2 text-right">Last settlement</div>
            <div className="col-span-2 text-right">Action</div>
          </div>
          <ul className="divide-y divide-bronze/30">
            {items.map(({ row, agent }) => (
              <li
                key={row.id}
                className="record-row grid grid-cols-1 gap-3 px-5 py-4 min-[900px]:grid-cols-12 min-[900px]:items-center min-[900px]:gap-4"
              >
                <div className="min-[900px]:col-span-3">
                  {agent ? (
                    <Link
                      to="/agent/$mint"
                      params={{ mint: agent.mint }}
                      className="font-mono text-sm text-paper hover:text-amber"
                    >
                      ${agent.symbol}
                      <span className="mt-0.5 block font-mono text-[10px] text-wire">
                        {shortMint(agent.mint)}
                      </span>
                    </Link>
                  ) : (
                    <div>
                      <div className="font-mono text-sm text-paper-muted">
                        {row.label ?? "Unknown"}
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] text-wire">
                        {shortMint(row.mint)}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 min-[900px]:col-span-3 min-[900px]:block">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-wire min-[900px]:hidden">
                    Grade
                  </span>
                  {agent ? (
                    <ExecutionGradeBadge
                      grade={agent.grade}
                      size="sm"
                      confidenceScore={agent.confidenceScore}
                    />
                  ) : (
                    <span className="font-mono text-xs text-wire">—</span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 min-[900px]:col-span-2 min-[900px]:justify-end">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-wire min-[900px]:hidden">
                    Score
                  </span>
                  <span className="font-mono text-sm tabular-nums text-paper">
                    {agent?.score ?? "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 min-[900px]:col-span-2 min-[900px]:justify-end">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-wire min-[900px]:hidden">
                    Last settlement
                  </span>
                  <span className="font-mono text-xs text-paper-muted">
                    {agent?.lastBuybackLabel ?? "—"}
                  </span>
                </div>

                <div className="flex min-[900px]:col-span-2 min-[900px]:justify-end">
                  <button
                    onClick={() => remove(row.mint)}
                    disabled={removing === row.mint}
                    className="btn-caliper btn-caliper-danger record-reveal !px-2.5 !py-1.5 max-[899px]:!opacity-100"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
