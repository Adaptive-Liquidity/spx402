import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { fetchWatchlist } from "@/lib/watchlist";
import { ComingSoon } from "@/components/spx/ComingSoon";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — SPX402" },
      { name: "description", content: "Your SPX402 operator terminal." },
    ],
  }),
  component: DashboardOverview,
});

function DashboardOverview() {
  const { user } = useAuth();
  const [watchedCount, setWatchedCount] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchWatchlist(user.id)
      .then((rows) => setWatchedCount(rows.length))
      .catch(() => setWatchedCount(0));
  }, [user]);

  return (
    <div className="space-y-8">
      <div className="grid gap-px overflow-hidden border border-bronze/40 bg-bronze/40 md:grid-cols-3">
        <div className="bg-panel p-6">
          <div className="label-mono">Watched agents</div>
          <div className="mt-2 font-display text-3xl font-bold text-paper">
            {watchedCount === null ? "…" : String(watchedCount)}
          </div>
        </div>
        <ComingSoon label="Coming soon" className="block">
          <div className="bg-panel p-6">
            <div className="label-mono">Active alerts</div>
            <div className="mt-2 font-display text-3xl font-bold text-paper">0</div>
          </div>
        </ComingSoon>
        <ComingSoon label="Coming soon" className="block">
          <div className="bg-panel p-6">
            <div className="label-mono">API keys</div>
            <div className="mt-2 font-display text-3xl font-bold text-paper">0</div>
          </div>
        </ComingSoon>
      </div>

      <section className="panel-engraved p-6">
        <div className="label-amber">Welcome</div>
        <h2 className="mt-2 font-display text-2xl font-bold text-paper">
          Terminal initialized.
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-paper-muted">
          Signed in as <span className="font-mono text-paper">{user?.email}</span>. Add agents to
          your watchlist to begin monitoring deposits, buybacks, and burns. Configure
          alerts to be notified when execution drifts.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/explore" className="border border-amber/80 bg-amber/10 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep">
            Browse agents →
          </Link>
          <Link to="/dashboard/watchlist" className="border border-bronze/70 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-paper-muted hover:border-amber hover:text-amber">
            Open watchlist
          </Link>
          <ComingSoon label="Coming soon">
            <span className="inline-block border border-bronze/70 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-paper-muted">
              Issue API key
            </span>
          </ComingSoon>
        </div>
      </section>
    </div>
  );
}
