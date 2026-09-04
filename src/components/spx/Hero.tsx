import { useEffect, useRef, useState } from "react";
import { GradeDial, type GradeSlice } from "@/components/spx/GradeDial";
import { QueryConsole } from "@/components/spx/QueryConsole";
import { Guilloche } from "@/components/spx/Guilloche";

interface Metric {
  value: string;
  label: string;
  sub?: string | null;
  /** Optional density series rendered as an engraved bar sparkline. */
  series?: number[];
}

function isZero(value: string) {
  return value.replace(/[^0-9]/g, "") === "" || Number(value.replace(/[^0-9.]/g, "")) === 0;
}

function Sparkline({ series }: { series: number[] }) {
  const max = Math.max(1, ...series);
  return (
    <svg className="metric-spark" viewBox={`0 0 ${series.length * 4} 24`} preserveAspectRatio="none" aria-hidden>
      {series.map((v, i) => {
        const h = Math.max(1, (v / max) * 22);
        return (
          <rect
            key={i}
            x={i * 4}
            y={24 - h}
            width={2.2}
            height={h}
            fill="var(--amber)"
            opacity={v === 0 ? 0.18 : 0.72}
          />
        );
      })}
    </svg>
  );
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
      {/* layered ground: horizon wash, engraving, vignette */}
      <div className="hero-horizon" aria-hidden />
      <Guilloche />
      <div className="hero-vignette" aria-hidden />

      {/* the golden seed → bounding rules */}
      <div className="hero-seed" aria-hidden />
      <div className="hero-bound hero-bound-top" aria-hidden />
      <div className="hero-bound hero-bound-bottom" aria-hidden />

      <div className="stage relative pb-10 pt-10 lg:pb-14 lg:pt-14">
        <div className="hero-aperture">
          <div className="mx-auto max-w-4xl text-center">
            <span className="pill-badge inscribe">
              <span className="h-1.5 w-1.5 rounded-full bg-amber" aria-hidden />
              Live · Solana Mainnet · Every agent under watch
            </span>

            <h1 className="hero-headline inscribe mt-6 font-display text-4xl leading-[1.04] tracking-tight sm:text-5xl lg:text-6xl">
              <span className="headline-lit bg-clip-text font-semibold text-transparent">
                Agents lie. The ledger doesn't.
              </span>
              <br />
              <span className="headline-glow">
                <span className="headline-gold bg-clip-text font-extrabold text-transparent">
                  We read the ledger.
                </span>
              </span>
            </h1>

            <p className="inscribe mx-auto mt-5 max-w-2xl leading-relaxed text-paper-muted">
              SPX402 is the reputation terminal for the agent economy. Thousands of autonomous
              agents now move real money on Solana — and until today, nobody was keeping score. We
              watch every escrow, bond, slash, and receipt, then publish a live Execution Score
              anyone can check in one click.
            </p>
            <p className="inscribe mt-2 font-mono text-xs uppercase tracking-[0.18em] text-wire">
              No screenshots. No promises. Just proof, on-chain.
            </p>
          </div>

          {/* viewfinder: the console sits on the caliper's chord line */}
          <div className="viewfinder mx-auto mt-8 max-w-4xl">
            <div className="viewfinder-console">
              <QueryConsole />
            </div>
            <div className="viewfinder-dial">
              <GradeDial slices={slices} />
            </div>
          </div>

          {/* instruments: tabular registration inside coordinate brackets */}
          <div className="register-grid mt-10 grid gap-px border border-bronze/40 bg-bronze/40 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((m) => (
              <div key={m.label} className="register-cell metric-cell bg-panel px-6 py-5 text-center">
                <span className="metric-bracket metric-bracket-tl" aria-hidden />
                <span className="metric-bracket metric-bracket-br" aria-hidden />
                {isZero(m.value) ? (
                  <div className="metric-awaiting">Awaiting first probe</div>
                ) : (
                  <div className="num-display text-3xl font-bold text-paper">{m.value}</div>
                )}
                <div className="register-label label-mono mt-2">{m.label}</div>
                {m.series && m.series.length > 0 && <Sparkline series={m.series} />}
                {m.sub && <div className="mt-1 font-mono text-[10px] text-wire">{m.sub}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
