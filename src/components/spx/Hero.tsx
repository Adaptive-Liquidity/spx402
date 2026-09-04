import { useEffect, useRef, useState } from "react";
import { GradeDial, type GradeSlice } from "@/components/spx/GradeDial";
import { QueryConsole } from "@/components/spx/QueryConsole";
import { Guilloche } from "@/components/spx/Guilloche";

interface Metric {
  value: string;
  label: string;
  sub?: string | null;
}

/**
 * Architectural horizon aperture. One synchronised gesture: a gold hairline
 * cleaves into the hero's bounding rules while the frame opens through a
 * single clip expansion. No per-element cascade.
 */
export function Hero({ metrics, slices }: { metrics: Metric[]; slices: GradeSlice[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(id);
  }, []);

  function onMove(e: React.MouseEvent<HTMLElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
  }

  return (
    <section
      ref={ref as never}
      onMouseMove={onMove}
      className={`hero-band relative overflow-hidden ${open ? "is-open" : ""}`}
    >
      <Guilloche />

      {/* the golden seed → bounding rules */}
      <div className="hero-seed" aria-hidden />
      <div className="hero-bound hero-bound-top" aria-hidden />
      <div className="hero-bound hero-bound-bottom" aria-hidden />

      <div className="stage relative pb-16 pt-16 lg:pb-24 lg:pt-24">
        <div className="hero-aperture">
          <div className="mx-auto max-w-4xl text-center">
            <span className="pill-badge inscribe">
              <span className="h-1.5 w-1.5 rounded-full bg-amber" aria-hidden />
              Live · Solana Mainnet · Every agent under watch
            </span>

            <h1 className="inscribe mt-8 font-display text-5xl font-bold leading-[1.03] tracking-tight sm:text-6xl lg:text-7xl">
              <span className="headline-lit bg-clip-text text-transparent">
                Agents lie. The ledger doesn't.
              </span>
              <br />
              <span className="headline-gold bg-clip-text text-transparent">
                We read the ledger.
              </span>
            </h1>

            <p className="inscribe mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-paper-muted">
              SPX402 is the reputation terminal for the agent economy. Thousands of autonomous
              agents now move real money on Solana — and until today, nobody was keeping score. We
              watch every escrow, bond, slash, and receipt, then publish a live Execution Score
              anyone can check in one click.
            </p>
            <p className="inscribe mt-3 font-mono text-sm text-wire">
              No screenshots. No promises. Just proof, on-chain.
            </p>
          </div>

          {/* viewfinder: the console sits on the caliper's chord line */}
          <div className="viewfinder mx-auto mt-14 max-w-4xl">
            <div className="viewfinder-console">
              <QueryConsole />
            </div>
            <div className="viewfinder-dial">
              <GradeDial slices={slices} />
            </div>
          </div>


          {/* instant tabular registration */}
          <div className="register-grid mt-16 grid gap-px border border-bronze/40 bg-bronze/40 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((m) => (
              <div key={m.label} className="register-cell bg-panel p-6 text-center">
                <div className="num-display text-3xl font-bold text-paper">{m.value}</div>
                <div className="register-label label-mono mt-2">{m.label}</div>
                {m.sub && <div className="mt-1 font-mono text-[10px] text-wire">{m.sub}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
