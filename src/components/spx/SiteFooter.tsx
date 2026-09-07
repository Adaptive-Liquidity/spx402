import { Link } from "@tanstack/react-router";

const COLS: Array<{ heading: string; links: Array<{ to: string; label: string }> }> = [
  {
    heading: "Product",
    links: [
      { to: "/build/register", label: "Register agent" },
      { to: "/registry/explore", label: "Registry" },
      { to: "/registry", label: "Leaderboard" },
      { to: "/aeon-agents", label: "AEON agents" },
      { to: "/live", label: "Execution tape" },
    ],
  },
  {
    heading: "Trust",
    links: [
      { to: "/methodology", label: "Methodology" },
      { to: "/corrections", label: "Corrections" },
      { to: "/genesis-record", label: "Genesis record" },
      { to: "/live/status", label: "System status" },
      { to: "/registry/flagged", label: "Flagged" },
    ],
  },
  {
    heading: "Developers",
    links: [
      { to: "/build", label: "API" },
      { to: "/build/docs", label: "Endpoints" },
      { to: "/registry/operators", label: "Operators" },
      { to: "/pricing", label: "Pricing" },
    ],
  },
  {
    heading: "Company",
    links: [
      { to: "/about", label: "About" },
      { to: "/about/changelog", label: "Changelog" },
      { to: "/about/disclaimer", label: "Disclaimer" },
      { to: "/live/pulse", label: "Pulse" },
    ],
  },
];


export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-bronze/40 bg-panel-deep">
      <div className="stage py-12">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center border border-amber/70 bg-background">
                <span className="font-mono text-[10px] font-bold text-amber">SPX</span>
              </div>
              <div className="font-display text-lg font-bold text-paper">
                SPX402<span className="text-amber">.</span>
              </div>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-paper-muted">
              The on-chain reputation terminal for every Solana agent. We only rate what we can
              prove.
            </p>
            <div className="mt-6 label-mono">PARSER v0.1.7 · LAST RECONCILED 14s AGO</div>
          </div>

          {COLS.map((col) => (
            <div key={col.heading}>
              <div className="label-amber">{col.heading}</div>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      className="text-sm text-paper-muted transition-colors hover:text-paper"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 rule-bronze" />

        <div className="mt-6 flex flex-col gap-4 text-xs text-wire md:flex-row md:items-center md:justify-between">
          <p className="font-mono uppercase tracking-widest">
            © 2026 SPX402 · ALL OBSERVATIONS RESERVED
          </p>
          <p className="max-w-2xl text-right leading-relaxed">
            SPX402 provides operational transparency only. Not investment, legal, tax, or financial
            advice. Not affiliated with S&amp;P, Standard &amp; Poor&apos;s, S&amp;P Global, or
            S&amp;P Dow Jones Indices.
          </p>
        </div>
      </div>
    </footer>
  );
}
