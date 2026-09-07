import { useEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown, Search } from "lucide-react";
import { NAV_HUBS } from "./nav-items";
import { MobileNav } from "./MobileNav";
import { SearchDialog } from "./CommandPalette";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export function SiteHeader() {
  const { user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isHome = pathname === "/";
  const [health, setHealth] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [openHub, setOpenHub] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Single status line: "Indexed <iso> · UTC <HH:MM:SS>" after hydration.
    let mounted = true;
    const tick = () => {
      const utc = new Date().toISOString().slice(11, 19) + " UTC";
      setHealth((prev) => (prev ? prev.replace(/· .+$/, `· ${utc}`) : prev));
    };
    tick();
    const id = setInterval(tick, 1000);
    supabase
      .from("agents")
      .select("updated_at")
      .order("updated_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (!mounted) return;
        const latest = data?.[0]?.updated_at;
        const iso = latest ? String(latest).replace("T", " ").slice(0, 19) : "unknown";
        setHealth(`Indexed ${iso} · ${new Date().toISOString().slice(11, 19)} UTC`);
      });
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  useEffect(() => setOpenHub(null), [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
      if (e.key === "Escape") setOpenHub(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-bronze/40 bg-background/90 backdrop-blur-md">
      {/* Slim single status line: compact on mobile, roomy from lg up. */}
      <div className="border-b border-bronze/25 bg-panel-deep/70">
        <div className="stage flex h-7 items-center justify-end">
          <span className="font-mono text-[10px] tracking-widest text-wire">
            {health ?? "--:--:--"}
          </span>
        </div>
      </div>

      <div className="stage flex h-16 items-center justify-between gap-6">
        <Link to="/" className="flex items-center gap-3" aria-label="SPX402 home">
          <span className="flex h-9 w-9 items-center justify-center border border-amber/70 bg-amber/10 font-display text-sm font-bold text-amber">
            S4
          </span>
          <span className="hidden sm:flex flex-col leading-tight">
            <span className="font-display text-[15px] font-semibold tracking-wide text-paper">
              SPX402
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-wire">
              Reputation terminal
            </span>
          </span>
        </Link>

        <div ref={navRef} className="hidden items-center gap-1 lg:flex">
          {NAV_HUBS.map((hub) => {
            const hubActive =
              pathname === hub.to ||
              hub.items.some(
                (i) => pathname === i.to || pathname.startsWith(i.to + "/"),
              );
            const open = openHub === hub.label;
            return (
              <div key={hub.label} className="relative">
                <button
                  type="button"
                  aria-expanded={open}
                  aria-haspopup="true"
                  onClick={() => setOpenHub(open ? null : hub.label)}
                  className={`focus-ring inline-flex h-10 items-center gap-1.5 px-3 font-mono text-[11px] uppercase tracking-widest transition-colors ${
                    hubActive ? "text-amber" : "text-paper-muted hover:text-amber"
                  }`}
                >
                  {hub.label}
                  <ChevronDown
                    className={`h-3 w-3 text-wire transition-transform ${open ? "rotate-180" : ""}`}
                  />
                </button>
                {open && (
                  <div className="absolute left-0 top-full min-w-[200px] border border-bronze/60 bg-panel shadow-lg">
                    {hub.items.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        className="block px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-paper-muted transition-colors hover:bg-panel-deep hover:text-amber"
                        activeProps={{ className: "text-amber bg-panel-deep" }}
                        activeOptions={{ exact: item.to === hub.to }}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search agents"
            className="focus-ring inline-flex h-10 items-center gap-2 border border-bronze/60 px-3 font-mono text-[11px] uppercase tracking-widest text-paper-muted transition-colors hover:border-amber hover:text-amber"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">Search</span>
            <kbd className="hidden border border-bronze/50 px-1.5 py-0.5 text-[9px] text-wire xl:inline">
              ⌘K
            </kbd>
          </button>
          {user ? (
            <Link
              to="/dashboard"
              className="hidden h-10 items-center border border-amber/80 bg-amber/10 px-4 font-mono text-[11px] uppercase tracking-widest text-amber transition-colors hover:bg-amber hover:text-panel-deep lg:inline-flex"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              to="/signup"
              className="hidden h-10 items-center border border-amber/80 bg-amber/10 px-4 font-mono text-[11px] uppercase tracking-widest text-amber transition-colors hover:bg-amber hover:text-panel-deep lg:inline-flex"
            >
              Open Terminal
            </Link>
          )}
          <MobileNav signedIn={!!user} />
        </div>
      </div>
      {searchOpen && <SearchDialog onClose={() => setSearchOpen(false)} />}
      {isHome ? null : null}
    </header>
  );
}
