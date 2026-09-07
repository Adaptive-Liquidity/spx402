import { cn } from "@/lib/utils";

/** Base shimmer block. Shape it like the real content it stands in for (lock §7). */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("block animate-pulse bg-bronze/20 motion-reduce:animate-none", className)}
    />
  );
}

/** Table body placeholder — matches DataTable row height and density. */
export function SkeletonRows({ rows = 8, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div role="status" aria-label="Loading rows" className="border border-bronze/40">
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className={cn(
            "flex items-center gap-4 border-b border-bronze/15 px-3 py-2.5 last:border-0",
            r % 2 ? "bg-panel/60" : "bg-background",
          )}
        >
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={cn("h-3", c === 0 ? "w-40" : "w-20")} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Card / panel placeholder. */
export function SkeletonPanel({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn("border border-bronze/40 bg-panel p-5", className)}
    >
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-4 h-6 w-2/3" />
      <div className="mt-4 space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className={cn("h-3", i === lines - 1 ? "w-1/2" : "w-full")} />
        ))}
      </div>
    </div>
  );
}

/** Long-form document placeholder. */
export function SkeletonDoc() {
  return (
    <div role="status" aria-label="Loading document" className="space-y-4">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <Skeleton className="mt-8 h-5 w-1/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  );
}
