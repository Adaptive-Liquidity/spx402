import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { ActionLink } from "./ActionButton";
import { MobileNav } from "./MobileNav";
import { NAV_ITEMS as NAV } from "./nav-items";
import { SearchDialog } from "./SearchDialog";
import { Telemetry } from "./Telemetry";

/** Condenses the header once the page has scrolled past the first fold. */
function useCondensed() {
  const [condensed, setCondensed] = useState(false);
  useEffect(() => {
    const onScroll = () => setCondensed(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return condensed;
}

export function SiteHeader() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { session } = useAuth();
  const condensed = useCondensed();
  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md transition-[border-color,box-shadow] duration-[var(--motion)] ease-[var(--ease)]",
        condensed ? "border-bronze/60 shadow-[0_1px_0_0_var(--bronze-dim)]" : "border-bronze/40",
      )}
    >
      <div
        className={cn(
          "stage flex items-center justify-between gap-6 transition-[padding] duration-[var(--motion)] ease-[var(--ease)] motion-reduce:transition-none",
          condensed ? "py-2" : "py-3",
        )}
      >
        <Link to="/" className="group flex items-center gap-3">
          <div className="relative flex h-8 w-8 items-center justify-center border border-amber/70 bg-panel-deep">
            <span className="font-mono text-[10px] font-bold tracking-tighter text-amber">SPX</span>
            <span className="absolute -bottom-1 -right-1 h-1.5 w-1.5 rounded-full bg-amber pulse-amber" />
          </div>
          <div className="leading-none">
            <div className="font-display text-lg font-bold tracking-tight text-paper">
              SPX402<span className="text-amber">.</span>
            </div>
            <div className="label-mono mt-0.5 hidden text-[9px] sm:block">
              REPUTATION TERMINAL · SOLANA + BASE
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => {
            const active = path === item.to || path.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "focus-ring whitespace-nowrap px-3 py-2 font-mono text-[11px] uppercase tracking-widest transition-colors",
                  active ? "text-amber" : "text-paper-muted hover:text-paper",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Telemetry />
          <SearchDialog />
          <MobileNav signedIn={!!session} />

          {session ? (
            <ActionLink to="/dashboard" variant="primary" size="md">
              Dashboard
            </ActionLink>
          ) : (
            <ActionLink to="/signup" variant="primary" size="md" className="hidden lg:inline-flex">
              Open Terminal
            </ActionLink>
          )}
        </div>
      </div>
    </header>
  );
}
