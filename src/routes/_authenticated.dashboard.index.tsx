import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useOperatorCounts } from "@/lib/operator-counts";
import { fetchWatchlist } from "@/lib/watchlist";
import { fetchRecentEventsForMints, type TapeEvent } from "@/lib/live-data";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({
    meta: [
      { title: "Overview — SPX402 Operator Terminal" },
      {
        name: "description",
        content: "Your watchlist, armed alerts and issued API keys in one ledger view.",
      },
    ],
  }),
  component: DashboardOverview,
});

function Cell({
  label,
  value,
  reading,
  to,
  loading,
}: {
  label: string;
  value: number;
  reading: string;
  to: string;
  loading: boolean;
}) {
  return (
    <Link to={to} className="metric-cell block bg-panel px-6 py-7 transition-colors hover:bg-panel-deep/60">
      <span className="metric-bracket metric-bracket-tl" aria-hidden />
      <span className="metric-bracket metric-bracket-br" aria-hidden />
      {loading ? (
        <span className="skel h-9 w-16" />
      ) : (
        <div className="font-display text-4xl font-bold tabular-nums text-paper">{value}</div>
      )}
      <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-paper-muted">
        {label}
      </div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-wire">
        {loading ? "—" : reading}
      </div>
    </Link>
  );
}

function DashboardOverview() {
  const { user } = useAuth();
  const counts = useOperatorCounts(user?.id);
  const loading = counts === null;
  const [recent, setRecent] = useState<TapeEvent[] | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const rows = await fetchWatchlist(user.id);
        if (!rows.length) {
          if (!cancelled) setRecent([]);
          return;
        }
        const events = await fetchRecentEventsForMints(
          rows.map((r) => r.mint),
          6,
        );
        if (!cancelled) setRecent(events);
      } catch {
        if (!cancelled) setRecent([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return (
    <div className="space-y-10">
      <div className="grid gap-px overflow-hidden border border-bronze/40 bg-bronze/40 md:grid-cols-3">
        <Cell
          label="Agents under watch"
          value={counts?.watched ?? 0}
          reading={counts?.watched ? "tracked on the tape" : "nothing tracked"}
          to="/dashboard/watchlist"
          loading={loading}
        />
        <Cell
          label="Alert subscriptions"
          value={counts?.alertsArmed ?? 0}
          reading={`${counts?.alertsArmed ?? 0} armed · ${counts?.alertsMuted ?? 0} muted`}
          to="/dashboard/alerts"
          loading={loading}
        />
        <Cell
          label="API keys"
          value={counts?.keysActive ?? 0}
          reading={`${counts?.keysActive ?? 0} active · ${counts?.keysTotal ?? 0} issued`}
          to="/dashboard/api-keys"
          loading={loading}
        />
      </div>

      <section>
        <div className="band-spine">
          <b>01</b>
          <span>// STANDING ORDERS</span>
        </div>
        <div className="mt-3 h-px w-full bg-bronze/40" />
        <h2 className="mt-6 font-display text-2xl font-bold text-paper">Terminal initialized.</h2>
        <div className="mt-3 font-mono text-xs text-wire">
          OPERATOR · <span className="text-paper-muted">{user?.email}</span>
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-paper-muted">
          Add agents to your watchlist to track escrows, bonds and receipts as they land. Arm alerts
          to hear the moment execution drifts — every notice links straight back to the signature it
          came from.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/explore" className="btn-caliper btn-caliper-primary">
            Browse agents →
          </Link>
          <Link to="/dashboard/watchlist" className="btn-caliper">
            Open watchlist
          </Link>
          <Link to="/dashboard/api-keys" className="btn-caliper">
            Issue API key
          </Link>
        </div>
      </section>

      <section>
        <div className="band-spine">
          <b>02</b>
          <span>// RECENT ACTIVITY</span>
        </div>
        <div className="mt-3 h-px w-full bg-bronze/40" />
        <div className="mt-6 panel-engraved">
          {recent === null ? (
            <div className="space-y-3 p-5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="skel h-4 w-full" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-wire">
                No activity on file
              </div>
              <p className="mx-auto mt-3 max-w-md text-sm text-paper-muted">
                Nothing has landed for the agents you watch. When one settles an escrow, moves a
                bond or writes a receipt, it appears here first.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-bronze/30">
              {recent.map((e) => (
                <li
                  key={e.id}
                  className="record-row grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-3"
                >
                  <div className="min-w-0">
                    <div className="truncate font-mono text-xs uppercase tracking-[0.16em] text-paper">
                      {e.kindLabel}
                    </div>
                    <div className="mt-0.5 truncate font-mono text-[10px] text-wire">
                      {e.subjectLabel}
                    </div>
                  </div>
                  <div className="text-right font-mono text-[10px] uppercase tracking-[0.16em] text-wire">
                    {e.ageLabel}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
