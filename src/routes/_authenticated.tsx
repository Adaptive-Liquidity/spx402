import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useOperatorCounts } from "@/lib/operator-counts";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

const TABS: ReadonlyArray<{ to: string; n: string; label: string; exact?: boolean }> = [
  { to: "/dashboard", n: "01", label: "Overview", exact: true },
  { to: "/dashboard/watchlist", n: "02", label: "Watchlist" },
  { to: "/dashboard/alerts", n: "03", label: "Alerts" },
  { to: "/dashboard/api-keys", n: "04", label: "API Keys" },
  { to: "/dashboard/account", n: "05", label: "Account" },
];

function useUtcClock() {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date().toISOString().slice(11, 19));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

function ShellFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 lg:px-8 lg:py-16">
      <div className="reg-frame p-8 lg:p-14">
        <span className="reg-mark reg-mark-tl" aria-hidden />
        <span className="reg-mark reg-mark-tr" aria-hidden />
        <span className="reg-mark reg-mark-bl" aria-hidden />
        <span className="reg-mark reg-mark-br" aria-hidden />
        {children}
      </div>
    </div>
  );
}

function AuthenticatedLayout() {
  const { session, loading, user, signOut } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const clock = useUtcClock();
  const counts = useOperatorCounts(user?.id);

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
      <ShellFrame>
        <div className="band-spine">
          <b>00</b>
          <span>// HANDSHAKE</span>
        </div>
        <div className="mt-3 h-px w-full bg-bronze/40" />
        <div className="mt-8 space-y-3">
          <span className="skel h-7 w-64" />
          <span className="skel h-4 w-40" />
        </div>
        <div className="mt-8 font-mono text-[11px] uppercase tracking-[0.22em] text-wire">
          Verifying credentials…
        </div>
      </ShellFrame>
    );
  }

  if (!session) {
    return (
      <ShellFrame>
        <div className="band-spine">
          <b>00</b>
          <span>// RESTRICTED</span>
        </div>
        <div className="mt-3 h-px w-full bg-bronze/40" />
        <h1 className="mt-8 font-display text-3xl font-bold text-paper">
          This record is sealed.
        </h1>
        <p className="mt-3 max-w-md text-sm text-paper-muted">
          The operator terminal holds your watchlist, alert subscriptions and API keys. Sign in to
          open it.
        </p>
        <Link to="/login" className="btn-caliper btn-caliper-primary mt-7">
          Sign in →
        </Link>
      </ShellFrame>
    );
  }

  const name = user?.user_metadata?.display_name || user?.email || "Operator";

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 lg:px-8 lg:py-12">
      <div className="reg-frame">
        <span className="reg-mark reg-mark-tl" aria-hidden />
        <span className="reg-mark reg-mark-tr" aria-hidden />
        <span className="reg-mark reg-mark-bl" aria-hidden />
        <span className="reg-mark reg-mark-br" aria-hidden />

        {/* MASTHEAD */}
        <header className="flex flex-wrap items-end justify-between gap-5 px-5 py-6 lg:px-8 lg:py-7">
          <div className="min-w-0">
            <div className="band-spine">
              <b>SPX402</b>
              <span>// OPERATOR TERMINAL</span>
            </div>
            <h1 className="mt-3 truncate font-display text-2xl font-bold text-paper lg:text-3xl">
              {name}
            </h1>
            <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-wire">
              {counts === null ? (
                <span className="skel inline-block h-3 w-52 align-middle" />
              ) : (
                <>
                  {counts.watched} watched · {counts.alertsArmed} armed · {counts.keysActive} keys
                  active
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-wire sm:block">
              <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-verified align-middle" />
              UTC {clock ?? "--:--:--"}
            </div>
            <button onClick={() => signOut()} className="btn-caliper btn-caliper-danger">
              Sign out
            </button>
          </div>
        </header>

        {/* REGISTER */}
        <nav className="reg-tabs" aria-label="Operator sections">
          {TABS.map((t) => {
            const active = t.exact ? path === t.to : path.startsWith(t.to);
            return (
              <Link key={t.to} to={t.to} className="reg-tab" data-active={active}>
                <b>{t.n}</b>
                {t.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-5 py-8 lg:px-8 lg:py-10">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
