import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A single row of filter chips with a leading label. */
export function FilterRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 font-mono text-[10px] uppercase tracking-widest text-wire">
        {label}
      </span>
      {children}
    </div>
  );
}

export function FilterChip({
  active,
  onClick,
  children,
  count,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  count?: number;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-1.5 border px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber",
        active
          ? "border-amber bg-amber/10 text-amber"
          : disabled
            ? "cursor-not-allowed border-bronze/20 text-wire/50"
            : "border-bronze/40 text-paper-muted hover:border-bronze hover:text-paper",
      )}
    >
      {children}
      {count !== undefined ? (
        <span
          className={cn(
            "border px-1 text-[9px] tabular-nums",
            active ? "border-amber/50 text-amber" : "border-bronze/30 text-wire",
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

/**
 * The one toolbar every data page uses: filters on the left, result range and
 * controls on the right, in a single band directly above the table.
 */
export function DataToolbar({
  filters,
  status,
  right,
}: {
  filters?: ReactNode;
  status?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border border-b-0 border-bronze/40 bg-panel-deep/60 px-3 py-2.5 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-2">{filters}</div>
      <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-wire">
        {status}
        {right}
      </div>
    </div>
  );
}
