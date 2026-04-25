import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard/watchlist")({
  head: () => ({
    meta: [{ title: "Watchlist — SPX402" }],
  }),
  component: WatchlistPage,
});

function WatchlistPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="label-amber">Watchlist</div>
          <h2 className="mt-2 font-display text-2xl font-bold text-paper">Tracked agents</h2>
        </div>
        <button className="border border-amber/80 bg-amber/10 px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep">
          + Add agent
        </button>
      </div>

      <div className="panel-engraved p-12 text-center">
        <div className="label-mono text-wire">Empty watchlist</div>
        <p className="mt-3 max-w-md mx-auto text-sm text-paper-muted">
          Paste a Solana mint address or browse the Explore terminal to begin
          tracking buyback and burn execution.
        </p>
      </div>
    </div>
  );
}
