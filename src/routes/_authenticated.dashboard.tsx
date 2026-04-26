import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { fetchWatchlist } from "@/lib/watchlist";
import { fetchAlertSubscriptions } from "@/lib/alerts";

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
  const [alertsCount, setAlertsCount] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchWatchlist(user.id)
      .then((rows) => setWatchedCount(rows.length))
      .catch(() => setWatchedCount(0));
    fetchAlertSubscriptions(user.id)
      .then((rows) => setAlertsCount(rows.filter((r) => !r.paused).length))
      .catch(() => setAlertsCount(0));
  }, [user]);

  const stats = [
    { l: "Watched agents", v: watchedCount === null ? "…" : String(watchedCount) },
    { l: "Active alerts", v: alertsCount === null ? "…" : String(alertsCount) },
    { l: "API keys", v: "0" },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-px overflow-hidden border border-bronze/40 bg-bronze/40 md:grid-cols-3">
        {stats.map((s) => (
          <div key={s.l} className="bg-panel p-6">
            <div className="label-mono">{s.l}</div>
            <div className="mt-2 font-display text-3xl font-bold text-paper">{s.v}</div>
          </div>
        ))}
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
          <Link to="/dashboard/api-keys" className="border border-bronze/70 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-paper-muted hover:border-amber hover:text-amber">
            Issue API key
          </Link>
        </div>
      </section>
    </div>
  );
}
