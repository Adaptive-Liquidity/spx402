import { cn } from "@/lib/utils";
import type { PreflightCardModel } from "@/lib/preflight/model";

const TONE_TEXT: Record<PreflightCardModel["tone"], string> = {
  verified: "text-amber",
  amber: "text-amber",
  critical: "text-critical",
  muted: "text-paper-muted",
};

const TONE_BAR: Record<PreflightCardModel["tone"], string> = {
  verified: "bg-amber",
  amber: "bg-amber",
  critical: "bg-critical",
  muted: "bg-bronze",
};

/**
 * The Preflight result card. It answers exactly one question and shows the
 * scan time on every rendition. It never says "safe".
 */
export function PreflightCard({
  card,
  className,
}: {
  card: PreflightCardModel;
  className?: string;
}) {
  return (
    <figure
      className={cn("relative overflow-hidden border border-bronze/60 bg-panel", className)}
    >
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", TONE_BAR[card.tone])} />

      <div className="flex flex-col gap-6 p-6 lg:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.2em]">
          <span className="text-amber">SPX402 Preflight · {card.probeKind} probe</span>
          <span className="text-wire">Scanned {card.scannedLabel}</span>
        </div>

        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-paper-muted">
            {card.question}
          </p>
          <p className="mt-3 break-all font-mono text-sm text-paper">{card.url}</p>
          <p
            className={cn(
              "mt-4 font-display text-3xl font-bold tracking-tight lg:text-4xl",
              TONE_TEXT[card.tone],
            )}
          >
            {card.outcomeLabel}
          </p>
        </div>

        <dl className="grid gap-2 font-mono text-xs sm:grid-cols-2">
          {card.rows.map((row) => (
            <div
              key={row.label}
              className="flex items-baseline justify-between gap-4 border-b border-bronze/30 pb-2"
            >
              <dt className="uppercase tracking-[0.15em] text-paper-muted">{row.label}</dt>
              <dd className="break-all text-right tabular-nums text-paper">{row.value}</dd>
            </div>
          ))}
        </dl>

        <div className="border-t border-bronze/50 pt-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-wire">Checks run</p>
          <ul className="mt-2 space-y-1 text-xs text-paper-muted">
            {card.checksRun.map((check) => (
              <li key={check} className="flex gap-2">
                <span aria-hidden className="text-bronze">
                  ·
                </span>
                <span>{check}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </figure>
  );
}
