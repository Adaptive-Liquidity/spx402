import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

const NAV = [
  { to: "/", label: "Terminal" },
  { to: "/tape", label: "Tape" },
  { to: "/pulse", label: "Pulse" },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/explore", label: "Explore" },
  { to: "/methodology", label: "Methodology" },
  { to: "/api", label: "API" },
  { to: "/operators", label: "Operators" },
] as const;

export function SiteHeader() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { session } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b border-bronze/40 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-6 px-4 py-3 lg:px-8">
        <Link to="/" className="group flex items-center gap-3">
          <div className="relative flex h-8 w-8 items-center justify-center border border-amber/70 bg-panel-deep">
            <span className="font-mono text-[10px] font-bold tracking-tighter text-amber">
              SPX
            </span>
            <span className="absolute -bottom-1 -right-1 h-1.5 w-1.5 rounded-full bg-amber pulse-amber" />
          </div>
          <div className="leading-none">
            <div className="font-display text-lg font-bold tracking-tight text-paper">
              SPX402<span className="text-amber">.</span>
            </div>
            <div className="label-mono mt-0.5 hidden text-[9px] sm:block">
              REPUTATION TERMINAL · SOLANA MAINNET
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => {
            const active =
              item.to === "/" ? path === "/" : path.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "px-3 py-2 font-mono text-[11px] uppercase tracking-widest transition-colors",
                  active
                    ? "text-amber"
                    : "text-paper-muted hover:text-paper",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {session ? (
            <Link
              to="/dashboard"
              className="border border-amber/80 bg-amber/10 px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-amber transition-colors hover:bg-amber hover:text-panel-deep"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-paper-muted hover:text-paper md:inline-flex"
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="border border-amber/80 bg-amber/10 px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-amber transition-colors hover:bg-amber hover:text-panel-deep"
              >
                Open Terminal
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
