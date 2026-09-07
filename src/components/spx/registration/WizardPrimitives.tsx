import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="label-mono block">{label}</span>
      {children}
      {hint && <span className="mt-1 block font-mono text-[11px] text-wire">{hint}</span>}
      {error && <span className="mt-1 block font-mono text-[11px] text-critical">{error}</span>}
    </label>
  );
}

export const inputClass =
  "mt-2 w-full border border-bronze/60 bg-panel-deep px-3 py-2.5 font-mono text-sm text-paper outline-none focus:border-amber";

export function OptionCard({
  active,
  title,
  blurb,
  recommended,
  onClick,
}: {
  active: boolean;
  title: string;
  blurb: string;
  recommended?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "bg-panel p-4 text-left transition-colors",
        active ? "ring-1 ring-inset ring-amber" : "hover:bg-panel-deep",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "font-display text-base font-semibold",
            active ? "text-amber" : "text-paper",
          )}
        >
          {title}
        </span>
        {recommended && (
          <span className="border border-verified/50 bg-verified/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-verified">
            Recommended
          </span>
        )}
      </div>
      <p className="mt-2 text-sm text-paper-muted">{blurb}</p>
    </button>
  );
}

export function YesNo({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (v: boolean | null) => void;
}) {
  const opt = (label: string, v: boolean | null) => (
    <button
      type="button"
      onClick={() => onChange(v)}
      className={cn(
        "border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest",
        value === v
          ? "border-amber bg-amber/10 text-amber"
          : "border-bronze/60 text-paper-muted hover:text-paper",
      )}
    >
      {label}
    </button>
  );
  return (
    <div className="flex gap-2">
      {opt("Yes", true)}
      {opt("No", false)}
      {opt("Not answered", null)}
    </div>
  );
}

export function PendingIntegration({ endpoint }: { endpoint: string }) {
  return (
    <div className="mt-4 border-l-2 border-amber/70 bg-amber/5 px-3 py-2.5 font-mono text-[11px] text-amber">
      Not yet returned by the backend. This action becomes available once{" "}
      <code className="text-paper">{endpoint}</code> is live. Nothing is created, verified or
      assumed in the meantime.
    </div>
  );
}
