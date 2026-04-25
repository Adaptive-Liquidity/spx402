import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

const TABS: ReadonlyArray<{ to: string; label: string; exact?: boolean }> = [
  { to: "/dashboard", label: "Overview", exact: true },
  { to: "/dashboard/watchlist", label: "Watchlist" },
  { to: "/dashboard/alerts", label: "Alerts" },
  { to: "/dashboard/api-keys", label: "API Keys" },
];

function AuthenticatedLayout() {
  const { session, loading, user, signOut } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !session) {
      navigate({
        to: "/login",
        search: { redirect: path } as never,
        replace: true,
      });
    }
  }, [loading, session, navigate, path]);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-20 text-center font-mono text-xs uppercase tracking-widest text-wire">
        Authenticating…
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="label-amber">Restricted</div>
        <h1 className="mt-3 font-display text-3xl font-bold text-paper">Sign in required.</h1>
        <Link to="/login" className="mt-6 inline-flex border border-amber bg-amber px-5 py-3 font-mono text-xs uppercase tracking-widest text-panel-deep hover:bg-amber-dim">
          Sign in →
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 lg:px-8 lg:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-bronze/40 pb-4">
        <div>
          <div className="label-amber">Operator Terminal</div>
          <h1 className="mt-2 font-display text-3xl font-bold text-paper">
            {user?.user_metadata?.display_name || user?.email}
          </h1>
        </div>
        <button
          onClick={() => signOut()}
          className="border border-bronze/60 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-paper-muted hover:border-critical hover:text-critical"
        >
          Sign out
        </button>
      </div>

      <nav className="mt-6 flex flex-wrap gap-px overflow-hidden border border-bronze/40 bg-bronze/40">
        {TABS.map((t) => {
          const active = t.exact ? path === t.to : path.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                "flex-1 bg-panel px-4 py-3 text-center font-mono text-[11px] uppercase tracking-widest transition-colors",
                active ? "bg-amber/15 text-amber" : "text-paper-muted hover:text-paper",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8">
        <Outlet />
      </div>
    </div>
  );
}
