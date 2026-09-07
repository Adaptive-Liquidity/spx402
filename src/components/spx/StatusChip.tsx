import { cn } from "@/lib/utils";
import { statusMeta, type StatusKey, type StatusTone } from "@/lib/registration/status";

const TONE: Record<StatusTone, string> = {
  neutral: "border-bronze/60 bg-panel-deep text-paper-muted",
  pending: "border-amber/50 bg-amber/10 text-amber",
  verified: "border-verified/50 bg-verified/10 text-verified",
  warning: "border-amber/70 bg-amber/15 text-amber",
  failure: "border-critical/60 bg-critical/10 text-critical",
  unknown: "border-bronze/40 bg-transparent text-wire",
};

export function StatusChip({
  status,
  className,
  size = "sm",
}: {
  status: StatusKey | string | null | undefined;
  className?: string;
  size?: "sm" | "xs";
}) {
  const meta = statusMeta(status);
  return (
    <span
      title={meta.hint}
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap border font-mono uppercase tracking-widest",
        size === "xs" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-1 text-[10px]",
        TONE[meta.tone],
        className,
      )}
    >
      {meta.label}
    </span>
  );
}

/** Visibility is a status too — separate export keeps call sites readable. */
export function VisibilityBadge({
  visibility,
  className,
}: {
  visibility: string | null | undefined;
  className?: string;
}) {
  return <StatusChip status={visibility} className={className} />;
}
