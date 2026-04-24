import { TICKER_LINES } from "@/lib/agents";

export function TickerTape() {
  const stream = [...TICKER_LINES, ...TICKER_LINES, ...TICKER_LINES];
  return (
    <div
      className="relative overflow-hidden border-y border-bronze/40 bg-panel-deep py-2"
      role="marquee"
      aria-label="SPX402 live ticker"
    >
      <div className="ticker-track gap-12 text-xs font-mono text-amber/90">
        {stream.map((line, i) => (
          <span key={i} className="inline-flex items-center gap-3 tracking-widest">
            <span aria-hidden className="text-bronze">◆</span>
            {line}
          </span>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-panel-deep to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-panel-deep to-transparent" />
    </div>
  );
}
