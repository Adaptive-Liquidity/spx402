import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * One measured figure with its label. Used in meta strips, dossier summaries and
 * stat grids so numbers never drift in size or alignment.
 */
export function StatCell({
  label,
  value,
  hint,
  align = "left",
  tone = "default",
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  align?: "left" | "right";
  tone?: "default" | "muted" | "amber" | "critical";
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", align === "right" && "text-right", className)}>
      <div className="font-mono text-[10px] uppercase tracking-widest text-wire">{label}</div>
      <div
        className={cn(
          "mt-1.5 font-display text-2xl font-bold tabular-nums",
          tone === "default" && "text-paper",
          tone === "muted" && "text-paper-muted",
          tone === "amber" && "text-amber",
          tone === "critical" && "text-critical",
        )}
      >
        {value}
      </div>
      {hint ? <div className="mt-1 font-mono text-[11px] text-wire">{hint}</div> : null}
    </div>
  );
}

export function StatGrid({
  children,
  cols = 4,
  className,
}: {
  children: ReactNode;
  cols?: 2 | 3 | 4;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-px border border-bronze/40 bg-bronze/25",
        cols === 2 && "grid-cols-1 sm:grid-cols-2",
        cols === 3 && "grid-cols-1 sm:grid-cols-3",
        cols === 4 && "grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** A StatCell already wrapped in the grid's cell chrome. */
export function StatGridCell(props: Parameters<typeof StatCell>[0]) {
  return (
    <div className="bg-panel p-4">
      <StatCell {...props} />
    </div>
  );
}
