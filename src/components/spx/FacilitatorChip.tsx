import { SOLANA_X402_PARSER_VERSION } from "@/lib/versions";

/**
 * Provenance chip for a settlement event: which registry facilitator paid the
 * fee, and how the detection was made. Tier A (fee-payer match) is high
 * confidence; a memo marker is medium and says so.
 */
export function FacilitatorChip({
  facilitatorId,
  detectionMethod,
  parserVersion,
}: {
  facilitatorId: string;
  detectionMethod?: string | null;
  parserVersion?: string | null;
}) {
  const tierA = detectionMethod !== "memo_marker";
  const confidence = tierA ? "high" : "medium";
  const how = tierA ? "facilitator fee-payer match" : "memo marker match";
  return (
    <span
      className={`border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest ${
        tierA ? "border-verified/50 text-verified" : "border-amber/50 text-amber"
      }`}
      title={`Detected by ${how} · confidence ${confidence} · parser ${parserVersion ?? SOLANA_X402_PARSER_VERSION}`}
    >
      via {facilitatorId}
    </span>
  );
}
