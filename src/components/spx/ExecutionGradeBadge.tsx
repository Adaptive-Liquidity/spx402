import { cn } from "@/lib/utils";
import type { Grade } from "@/lib/agents";

const STYLES: Record<Grade, string> = {
  "SPX AAA": "border-verified/70 bg-verified/10 text-verified",
  "SPX AA": "border-verified/70 bg-verified/10 text-verified",
  "SPX A": "border-amber/70 bg-amber/10 text-amber",
  "SPX BBB": "border-amber/70 bg-amber/10 text-amber",
  "SPX BB": "border-amber-dim/70 bg-amber-dim/10 text-amber-dim",
  "SPX B": "border-amber-dim/70 bg-amber-dim/10 text-amber-dim",
  "SPX D": "border-critical/70 bg-critical/10 text-critical",
  SPX404: "border-critical/70 bg-critical/10 text-critical",
};

export function ExecutionGradeBadge({
  grade,
  size = "md",
  className,
}: {
  grade: Grade;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "px-2 py-1 text-[10px]",
    md: "px-3 py-1.5 text-xs",
    lg: "px-4 py-2 text-sm",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 border font-mono font-bold uppercase tracking-widest",
        STYLES[grade],
        sizes[size],
        grade === "SPX404" && "flicker-404",
        className,
      )}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {grade}
    </span>
  );
}
