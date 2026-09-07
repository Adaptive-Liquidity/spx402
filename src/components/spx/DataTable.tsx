import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: string;
  /** Tailwind width/alignment classes applied to both th and td. */
  className?: string;
  /** Hide below the given breakpoint, e.g. "sm" | "md" | "lg". */
  hideBelow?: "sm" | "md" | "lg";
  align?: "left" | "right";
  cell: (row: T) => ReactNode;
};

const HIDE: Record<string, string> = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
};

/**
 * The single table primitive used by every data page (tape, explore, flagged,
 * operators, leaderboard). Real <table> semantics, sticky header, zebra rows,
 * and a compact/comfortable density switch.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  dense = true,
  empty,
  loading,
  caption,
}: {
  columns: Array<Column<T>>;
  rows: T[];
  rowKey: (row: T) => string;
  dense?: boolean;
  empty?: ReactNode;
  loading?: boolean;
  caption?: string;
}) {
  const pad = dense ? "px-3 py-1.5" : "px-3 py-3";

  return (
    <div className="overflow-x-auto border border-bronze/40">
      <table className="w-full border-collapse text-left">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr className="border-b border-bronze/40 bg-panel-deep">
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={cn(
                  "px-3 py-2 font-mono text-[10px] font-normal uppercase tracking-widest text-wire",
                  c.align === "right" && "text-right",
                  c.hideBelow && HIDE[c.hideBelow],
                  c.className,
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className={i % 2 ? "bg-panel" : "bg-background"}>
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(pad, c.hideBelow && HIDE[c.hideBelow], c.className)}
                  >
                    <span className="block h-3 w-full max-w-[8rem] animate-pulse bg-bronze/20" />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center font-mono text-xs text-paper-muted"
              >
                {empty ?? "No rows match these filters."}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => {
              const cells = columns.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    pad,
                    "font-mono text-xs text-paper",
                    c.align === "right" && "text-right tabular-nums",
                    c.hideBelow && HIDE[c.hideBelow],
                    c.className,
                  )}
                >
                  {c.cell(row)}
                </td>
              ));
              return (
                <tr
                  key={rowKey(row)}
                  className={cn(
                    "border-b border-bronze/15 transition-colors last:border-0 hover:bg-panel-deep",
                    i % 2 ? "bg-panel/60" : "bg-background",
                  )}
                >
                  {cells}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

/** Prev / next pager shown under every paginated table. */
export function Pager({
  page,
  pageCount,
  total,
  from,
  to,
  onPage,
}: {
  page: number;
  pageCount: number;
  total: number;
  from: number;
  to: number;
  onPage: (page: number) => void;
}) {
  if (total === 0) return null;
  return (
    <div className="flex items-center justify-between gap-3 border border-t-0 border-bronze/40 bg-panel-deep/60 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-wire">
      <span className="tabular-nums">
        {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="border border-bronze/40 px-2.5 py-1 transition-colors enabled:hover:border-amber enabled:hover:text-amber disabled:opacity-30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber"
        >
          ← Prev
        </button>
        <span className="tabular-nums text-paper-muted">
          {page} / {pageCount}
        </span>
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= pageCount}
          className="border border-bronze/40 px-2.5 py-1 transition-colors enabled:hover:border-amber enabled:hover:text-amber disabled:opacity-30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
