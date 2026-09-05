import { cn } from "@/lib/utils";
import type { GradeCardModel } from "@/lib/grade-card";

// The share object, rendered on the page. Same model as the PNG/SVG renditions
// so what an operator sees is byte-for-byte what unfurls in a feed.
export function GradeCard({ card, className }: { card: GradeCardModel; className?: string }) {
  return (
    <figure
      className={cn(
        "relative aspect-square w-full max-w-md overflow-hidden border border-bronze/60 bg-panel",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn("absolute inset-y-0 left-0 w-1", card.danger ? "bg-critical" : "bg-amber")}
      />
      <div className="flex h-full flex-col justify-between p-6">
        <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.2em]">
          <span className="text-amber">SPX402 · On-chain reputation</span>
          <span className="text-wire">Execution grade</span>
        </div>

        <div>
          <div className="font-mono text-4xl font-bold tracking-tight text-paper tabular-nums">
            {card.ticker}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span
              className={cn(
                "font-mono text-2xl font-bold uppercase tracking-widest",
                card.danger ? "text-critical" : "text-paper",
              )}
            >
              {card.grade}
            </span>
            <span
              className={cn(
                "border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.2em]",
                card.operator === "VERIFIED"
                  ? "border-amber/70 text-amber"
                  : "border-bronze/60 text-paper-muted",
              )}
            >
              {card.operator}
            </span>
          </div>
        </div>

        <dl className="space-y-2 font-mono text-xs">
          {card.rows.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-4">
              <dt className="uppercase tracking-[0.15em] text-paper-muted">{row.label}</dt>
              <dd className="tabular-nums text-paper">{row.value}</dd>
            </div>
          ))}
        </dl>

        <div className="truncate border-t border-bronze/50 pt-3 font-mono text-[10px] uppercase tracking-[0.15em] text-wire">
          {card.url}
        </div>

      </div>
    </figure>
  );
}
