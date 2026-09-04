import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  label: string;
  title: string;
  body: ReactNode;
  action?: ReactNode;
  className?: string;
}

/**
 * Designed empty state. Used wherever a lane has no data yet so a blank panel
 * never reads as a bug.
 */
export function EmptyState({ label, title, body, action, className }: EmptyStateProps) {
  return (
    <div className={cn("panel-engraved px-6 py-14 text-center", className)}>
      <div className="label-mono text-wire">{label}</div>
      <h3 className="mt-3 font-display text-xl font-bold text-paper">{title}</h3>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-paper-muted">{body}</p>
      {action ? <div className="mt-6 flex justify-center gap-3">{action}</div> : null}
    </div>
  );
}
