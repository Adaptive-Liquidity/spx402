import type { ReactNode } from "react";

/**
 * A collapsible content section. Uses <details> so the content is present in
 * the server-rendered HTML (crawlable, and copy contracts still hold) while
 * keeping long reference pages navigable.
 */
export function DetailSection({
  title,
  meta,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string;
  meta?: string;
  summary?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group border border-bronze/40 bg-panel-deep/30">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-panel-deep focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber">
        <span className="min-w-0">
          <span className="font-display text-base font-semibold text-paper">{title}</span>
          {meta ? (
            <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-wire">
              {meta}
            </span>
          ) : null}
          {summary ? (
            <span className="mt-1 block max-w-3xl text-xs leading-relaxed text-paper-muted">
              {summary}
            </span>
          ) : null}
        </span>
        <span
          aria-hidden
          className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-amber"
        >
          <span className="group-open:hidden">Show</span>
          <span className="hidden group-open:inline">Hide</span>
        </span>
      </summary>
      <div className="border-t border-bronze/30 p-4">{children}</div>
    </details>
  );
}
