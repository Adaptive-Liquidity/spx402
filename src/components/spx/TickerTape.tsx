import { useEffect, useState } from "react";
import { fetchLeaderboardTickerLines, fetchRecentTickerEvents } from "@/lib/live-data";
import { fetchProberTickerLines } from "@/lib/prober-data";

const FALLBACK_LINES = [
  "SPX402 · pre-launch · indexer warming up",
  "Awaiting first verified executions on-chain",
  "Methodology v0.1.7 · operator weight 5%",
  "Helius webhook bus · armed",
  "Reconciler · standing by",
];

export function TickerTape() {
  const [lines, setLines] = useState<string[]>(FALLBACK_LINES);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [events, leaders, probes] = await Promise.all([
        fetchRecentTickerEvents(20),
        fetchLeaderboardTickerLines(5),
        fetchProberTickerLines(5),
      ]);
      if (cancelled) return;
      const combined: string[] = [];
      // Interleave: leader, then 3 events, repeat — keeps reputation salient.
      const eventLines = [...events.map((e) => e.line), ...probes];
      let li = 0;
      let ei = 0;
      while (li < leaders.length || ei < eventLines.length) {
        if (li < leaders.length) combined.push(leaders[li++]);
        for (let k = 0; k < 3 && ei < eventLines.length; k++) {
          combined.push(eventLines[ei++]);
        }
      }
      if (combined.length > 0) setLines(combined);
    })();
    return () => {
      cancelled = true;
    };
  }, []);


  const stream = [...lines, ...lines, ...lines];
  return (
    <div
      className="relative overflow-hidden border-y border-bronze/40 bg-panel-deep py-2"
      role="marquee"
      aria-label="SPX402 live ticker"
    >
      <div className="ticker-track gap-12 text-xs font-mono text-amber/90">
        {stream.map((line, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-3 tracking-widest"
          >
            <span aria-hidden className="text-bronze">
              ◆
            </span>
            {line}
          </span>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-panel-deep to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-panel-deep to-transparent" />
    </div>
  );
}
