import type { ReactNode } from "react";

/**
 * ComingSoon — wraps any interactive element (button, link, card),
 * disables clicks, and reveals a thin red diagonal banner across the
 * element on hover/focus. Use this for features that are visible in the
 * UI on purpose but not yet shipped.
 */
export function ComingSoon({
  children,
  label = "Coming soon",
  className = "",
}: {
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <span
      role="group"
      aria-label={label}
      title={label}
      tabIndex={0}
      className={`group relative inline-block cursor-not-allowed select-none align-top focus:outline-none ${className}`}
    >
      {/* Block all pointer + keyboard interaction with the wrapped node */}
      <span className="pointer-events-none block opacity-70 transition-opacity duration-150 group-hover:opacity-40 group-focus:opacity-40">
        {children}
      </span>

      {/* Subtle red banner — hidden until hover/focus */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-0 right-0 top-1/2 z-10 flex -translate-y-1/2 items-center justify-center opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus:opacity-100"
      >
        <span
          className="w-full border-y border-critical/80 bg-critical/85 py-1 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-paper shadow-[0_0_24px_-6px_var(--color-critical,theme(colors.red.500))]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, rgba(0,0,0,0.18) 0 4px, transparent 4px 8px)",
          }}
        >
          {label}
        </span>
      </span>
    </span>
  );
}
