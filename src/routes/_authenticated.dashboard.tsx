import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { fetchWatchlist } from "@/lib/watchlist";
import { fetchSubscriptions } from "@/lib/alerts";
import { fetchApiKeys } from "@/lib/api-keys";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — SPX402" },
      { name: "description", content: "Your SPX402 operator terminal." },
    ],
  }),
  component: DashboardOverview,
});

function Tile({ label, value, to }: { label: string; value: string; to: string }) {
  return (
    <Link to={to} className="block bg-panel p-6 transition-colors hover:bg-panel-deep/60">
      <div className="label-mono">{label}</div>
      <div className="mt-2 font-display text-3xl font-bold text-paper">{value}</div>
    </Link>
  );
}

function DashboardOverview() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<{ watched: number; alerts: number; keys: number } | null>(
    null,
  );

  useEffect(() => {
    if (!user) return;
    Promise.all([fetchWatchlist(user.id), fetchSubscriptions(user.id), fetchApiKeys(user.id)])
      .then(([w, s, k]) =>
        setCounts({
          watched: w.length,
          alerts: s.filter((x) => !x.paused).length,
          keys: k.filter((x) => x.status === "active").length,
        }),
      )
      .catch(() => setCounts({ watched: 0, alerts: 0, keys: 0 }));
  }, [user]);

  const v = (n: number | undefined) => (counts === null ? "…" : String(n ?? 0));

  return (
    <div className="space-y-8">
      <div className="grid gap-px overflow-hidden border border-bronze/40 bg-bronze/40 md:grid-cols-3">
        <Tile label="Watched agents" value={v(counts?.watched)} to="/dashboard/watchlist" />
        <Tile label="Active alerts" value={v(counts?.alerts)} to="/dashboard/alerts" />
        <Tile label="API keys" value={v(counts?.keys)} to="/dashboard/api-keys" />
      </div>

      <section className="panel-engraved p-6">
        <div className="label-amber">Welcome</div>
        <h2 className="mt-2 font-display text-2xl font-bold text-paper">Terminal initialized.</h2>
        <p className="mt-3 max-w-2xl text-sm text-paper-muted">
          Signed in as <span className="font-mono text-paper">{user?.email}</span>. Add agents to
          your watchlist to track escrows, bonds and receipts as they land. Subscribe to alerts to
          hear the moment execution drifts.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            to="/explore"
            className="border border-amber/80 bg-amber/10 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep"
          >
            Browse agents →
          </Link>
          <Link
            to="/dashboard/watchlist"
            className="border border-bronze/70 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-paper-muted hover:border-amber hover:text-amber"
          >
            Open watchlist
          </Link>
          <Link
            to="/dashboard/api-keys"
            className="border border-bronze/70 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-paper-muted hover:border-amber hover:text-amber"
          >
            Issue API key
          </Link>
        </div>
      </section>
    </div>
  );
}
