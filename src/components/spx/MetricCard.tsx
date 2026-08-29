import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  suffix,
  hint,
  tone = "default",
  className,
}: {
  label: string;
  value: React.ReactNode;
  suffix?: string;
  hint?: string;
  tone?: "default" | "verified" | "critical" | "amber";
  className?: string;
}) {
  const valueColor =
    tone === "verified"
      ? "text-verified"
      : tone === "critical"
        ? "text-critical"
        : tone === "amber"
          ? "text-amber"
          : "text-paper";
  return (
    <div className={cn("panel-engraved relative p-5", className)}>
      <div className="label-mono">{label}</div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className={cn("num-display text-3xl font-semibold leading-none", valueColor)}>
          {value}
        </span>
        {suffix && (
          <span className="font-mono text-xs uppercase tracking-widest text-wire">{suffix}</span>
        )}
      </div>
      {hint && (
        <div className="mt-3 font-mono text-[11px] uppercase tracking-wider text-wire">{hint}</div>
      )}
    </div>
  );
}
