import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export type HubTab = { to: string; label: string };

/**
 * Compact hub band: hub name + tabs on one line. The blurb only renders on the
 * hub's default tab — every other tab page carries its own <PageHead>, so
 * repeating the hub blurb there was ~400px of restatement above the data.
 */
export function HubLayout({
  eyebrow,
  title,
  blurb,
  tabs,
}: {
  eyebrow: string;
  title: string;
  blurb: string;
  tabs: HubTab[];
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const normalized = path.replace(/\/$/, "") || "/";
  const rootTab = tabs[0]?.to.replace(/\/$/, "") || "/";
  const isRoot = normalized === rootTab;

  const navRef = useRef<HTMLElement | null>(null);

  // Arrow-key movement across the tab list (WAI-ARIA tabs pattern).
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const links = Array.from(el.querySelectorAll<HTMLAnchorElement>("a[role='tab']"));
      const i = links.indexOf(document.activeElement as HTMLAnchorElement);
      if (i === -1) return;
      e.preventDefault();
      const next = e.key === "ArrowRight" ? (i + 1) % links.length : (i - 1 + links.length) % links.length;
      links[next]?.focus();
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div>
      <div className="border-b border-bronze/40 bg-panel-deep">
        <div className="mx-auto max-w-[1400px] px-4 lg:px-8">
          <div className="flex flex-col gap-3 pt-6 lg:flex-row lg:items-baseline lg:justify-between">
            <div className="flex items-baseline gap-3">
              <span className="label-amber">{eyebrow}</span>
              <span className="font-display text-base font-semibold tracking-tight text-paper">
                {title}
              </span>
            </div>
            {isRoot ? (
              <p className="max-w-xl text-sm leading-relaxed text-paper-muted lg:text-right">
                {blurb}
              </p>
            ) : null}
          </div>

          <nav
            ref={navRef}
            role="tablist"
            aria-label={`${title} sections`}
            className="mt-4 -mb-px flex flex-wrap items-center gap-1 overflow-x-auto"
          >
            {tabs.map((tab) => {
              const tabPath = tab.to.replace(/\/$/, "") || "/";
              const active = normalized === tabPath;
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  role="tab"
                  aria-selected={active}
                  tabIndex={active ? 0 : -1}
                  className={cn(
                    "whitespace-nowrap border-b-2 px-3 py-2.5 font-mono text-[11px] uppercase tracking-widest transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber",
                    active
                      ? "border-amber text-amber"
                      : "border-transparent text-paper-muted hover:text-paper",
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <Outlet />
    </div>
  );
}
