import { cn } from "@/lib/utils";
import type { Grade } from "@/lib/agents";

// Wave 2 — Filled vs outlined badges.
// Filled = high-confidence grade (≥0.66). Outlined = low/medium confidence.
// This is the single visual that kills the "looks good = is good" trap.
const FILLED: Record<Grade, string> = {
  "SPX AAA": "border-verified/70 bg-verified/10 text-verified",
  "SPX AA": "border-verified/70 bg-verified/10 text-verified",
  "SPX A": "border-amber/70 bg-amber/10 text-amber",
  "SPX BBB": "border-amber/70 bg-amber/10 text-amber",
  "SPX BB": "border-amber-dim/70 bg-amber-dim/10 text-amber-dim",
  "SPX B": "border-amber-dim/70 bg-amber-dim/10 text-amber-dim",
  "SPX D": "border-critical/70 bg-critical/10 text-critical",
  SPX404: "border-critical/70 bg-critical/10 text-critical",
};

const OUTLINED: Record<Grade, string> = {
  "SPX AAA": "border-dashed border-verified/70 bg-transparent text-verified/80",
  "SPX AA": "border-dashed border-verified/70 bg-transparent text-verified/80",
  "SPX A": "border-dashed border-amber/70 bg-transparent text-amber/80",
  "SPX BBB": "border-dashed border-amber/70 bg-transparent text-amber/80",
  "SPX BB": "border-dashed border-amber-dim/70 bg-transparent text-amber-dim/80",
  "SPX B": "border-dashed border-amber-dim/70 bg-transparent text-amber-dim/80",
  "SPX D": "border-dashed border-critical/70 bg-transparent text-critical/80",
  SPX404: "border-dashed border-critical/70 bg-transparent text-critical/80",
};

export function ExecutionGradeBadge({
  grade,
  size = "md",
  className,
  // Either pass numeric confidenceScore (0..1) OR pass `outlined` directly.
  // Default behavior = filled (preserves current call-sites until they migrate).
  confidenceScore,
  outlined,
}: {
  grade: Grade;
  size?: "sm" | "md" | "lg";
  className?: string;
  confidenceScore?: number;
  outlined?: boolean;
}) {
  const isOutlined =
    outlined ?? (typeof confidenceScore === "number" && confidenceScore < 0.66);
  const palette = isOutlined ? OUTLINED : FILLED;
  const sizes = {
    sm: "px-2 py-1 text-[10px]",
    md: "px-3 py-1.5 text-xs",
    lg: "px-4 py-2 text-sm",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 border font-mono font-bold uppercase tracking-widest",
        palette[grade],
        sizes[size],
        grade === "SPX404" && "flicker-404",
        className,
      )}
      title={
        typeof confidenceScore === "number"
          ? `Confidence ${(confidenceScore * 100).toFixed(0)}%`
          : undefined
      }
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {grade}
    </span>
  );
}
