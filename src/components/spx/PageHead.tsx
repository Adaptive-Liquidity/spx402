import type { ReactNode } from "react";

/**
 * Compact page header used on every hub tab page.
 *
 * Hub tabs already carry the hub eyebrow/title/tabs band, so tab pages must
 * NOT restate an eyebrow + oversized H1 + blurb. This primitive keeps the
 * page's own H1 (required for SEO and a11y) but at a size that doesn't push
 * the actual data below the fold.
 */
export function PageHead({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-bronze/30 pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-bold tracking-tight text-paper">{title}</h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-paper-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
