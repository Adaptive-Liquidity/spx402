import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export type HubTab = { to: string; label: string };

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

  return (
    <div>
      <div className="border-b border-bronze/40 bg-panel-deep">
        <div className="mx-auto max-w-[1400px] px-4 pt-8 lg:px-8">
          <div className="label-amber">{eyebrow}</div>
          <div className="mt-2 font-display text-xl font-bold tracking-tight text-paper">
            {title}
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-paper-muted">{blurb}</p>


          <nav className="mt-8 -mb-px flex flex-wrap items-center gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const tabPath = tab.to.replace(/\/$/, "") || "/";
              const active = normalized === tabPath;
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  className={cn(
                    "whitespace-nowrap border-b-2 px-4 py-3 font-mono text-[11px] uppercase tracking-widest transition-colors",
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
