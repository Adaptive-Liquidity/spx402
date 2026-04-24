import { cn } from "@/lib/utils";

export function Panel({
  title,
  eyebrow,
  right,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  eyebrow?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("panel-engraved relative", className)}>
      {(title || eyebrow || right) && (
        <header className="flex items-center justify-between border-b border-bronze/50 px-5 py-3">
          <div>
            {eyebrow && <div className="label-amber">{eyebrow}</div>}
            {title && (
              <h2 className="mt-1 font-display text-base font-semibold text-paper">
                {title}
              </h2>
            )}
          </div>
          {right}
        </header>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}
