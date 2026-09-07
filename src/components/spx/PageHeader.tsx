import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type MetaItem = {
  label: string;
  /** Rendered as-is. Pass a StatusChip for backend-owned states. */
  value: ReactNode;
};

/**
 * The header every interior route uses (design lock §2). Eyebrow, one h1, a
 * one-line standfirst, then a meta strip of backend-owned facts.
 */
export function PageHeader({
  eyebrow,
  title,
  standfirst,
  meta,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  standfirst?: ReactNode;
  meta?: MetaItem[];
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("border-b border-bronze/40 pb-6", className)}>
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          {eyebrow ? <div className="label-amber">{eyebrow}</div> : null}
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-paper lg:text-4xl">
            {title}
          </h1>
          {standfirst ? (
            <p className="mt-3 max-w-[60ch] text-lg leading-relaxed text-paper-muted">
              {standfirst}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>

      {meta && meta.length > 0 ? (
        <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
          {meta.map((item) => (
            <div key={item.label} className="min-w-0">
              <dt className="font-mono text-[10px] uppercase tracking-widest text-wire">
                {item.label}
              </dt>
              <dd className="mt-1 font-mono text-xs tabular-nums text-paper">{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </header>
  );
}

/** Section and subsection headings, so rank never drifts between routes. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  actions,
  level = 2,
  className,
  id,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  level?: 2 | 3;
  className?: string;
  id?: string;
}) {
  const Tag = level === 2 ? "h2" : "h3";
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)} id={id}>
      <div className="min-w-0">
        {eyebrow ? <div className="label-amber">{eyebrow}</div> : null}
        <Tag
          className={cn(
            "font-display text-paper",
            level === 2 ? "text-2xl font-bold" : "text-lg font-semibold",
            eyebrow && "mt-1.5",
          )}
        >
          {title}
        </Tag>
        {description ? (
          <p className="mt-2 max-w-[68ch] text-sm leading-relaxed text-paper-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
