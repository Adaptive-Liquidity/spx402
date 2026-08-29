import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { fetchWatchlist, removeFromWatchlist, type WatchlistRow } from "@/lib/watchlist";
import { fetchAgentsByMints } from "@/lib/agents-db";
import type { Agent } from "@/lib/agents";
import { ExecutionGradeBadge } from "@/components/spx/ExecutionGradeBadge";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/watchlist")({
  head: () => ({
    meta: [{ title: "Watchlist — SPX402" }],
  }),
  component: WatchlistPage,
});

interface WatchedItem {
  row: WatchlistRow;
  agent: Agent | null;
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
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="label-amber">Watchlist</div>
          <h2 className="mt-2 font-display text-2xl font-bold text-paper">Tracked agents</h2>
        </div>
        <Link
          to="/explore"
          className="border border-amber/80 bg-amber/10 px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep"
        >
          + Add agent
        </Link>
      </div>

      {error && (
        <div className="border-l-2 border-critical/70 bg-critical/10 px-3 py-2 font-mono text-xs text-critical">
          {error}
        </div>
      )}

      {items === null ? (
        <div className="panel-engraved p-12 text-center font-mono text-xs uppercase tracking-widest text-wire">
          Loading…
        </div>
      ) : items.length === 0 ? (
        <div className="panel-engraved p-12 text-center">
          <div className="label-mono text-wire">Empty watchlist</div>
          <p className="mt-3 max-w-md mx-auto text-sm text-paper-muted">
            Open the{" "}
            <Link to="/explore" className="text-amber hover:underline">
              Explorer
            </Link>{" "}
            or any agent dossier and tap <span className="text-amber">Add to watchlist</span> to
            start tracking.
          </p>
        </div>
      ) : (
        <div className="panel-engraved overflow-hidden">
          <div className="grid grid-cols-12 gap-4 border-b border-bronze/40 bg-panel-deep/60 px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-wire">
            <div className="col-span-3">Symbol</div>
            <div className="col-span-3">Grade</div>
            <div className="col-span-2">Score</div>
            <div className="col-span-2">Last buyback</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
          <ul className="divide-y divide-bronze/30">
            {items.map(({ row, agent }) => (
              <li key={row.id} className="grid grid-cols-12 items-center gap-4 px-5 py-4">
                <div className="col-span-3">
                  {agent ? (
                    <Link
                      to="/agent/$mint"
                      params={{ mint: agent.mint }}
                      className="font-mono text-sm text-paper hover:text-amber"
                    >
                      ${agent.symbol}
                      <div className="mt-0.5 font-mono text-[10px] text-wire">
                        {agent.mint.slice(0, 6)}…{agent.mint.slice(-4)}
                      </div>
                    </Link>
                  ) : (
                    <div>
                      <div className="font-mono text-sm text-paper-muted">
                        {row.label ?? "Unknown"}
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] text-wire">
                        {row.mint.slice(0, 6)}…{row.mint.slice(-4)}
                      </div>
                    </div>
                  )}
                </div>
                <div className="col-span-3">
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
                <div className="col-span-2 font-mono text-sm text-paper">{agent?.score ?? "—"}</div>
                <div className="col-span-2 font-mono text-xs text-paper-muted">
                  {agent?.lastBuybackLabel ?? "—"}
                </div>
                <div className="col-span-2 flex justify-end">
                  <button
                    onClick={() => remove(row.mint)}
                    disabled={removing === row.mint}
                    className="inline-flex items-center gap-1.5 border border-bronze/60 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-widest text-paper-muted hover:border-critical hover:text-critical disabled:opacity-50"
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
