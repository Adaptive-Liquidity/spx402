/** Settlement lane badge. SPX402 never merges identities across chains. */
export function ChainBadge({ chain, size = "md" }: { chain: string; size?: "sm" | "md" }) {
  const isBase = chain === "base";
  const pad = size === "sm" ? "px-2 py-0.5 text-[9px]" : "px-3 py-1.5 text-[10px]";
  return (
    <span
      className={`inline-flex items-center gap-1.5 border font-mono uppercase tracking-widest ${pad} ${
        isBase
          ? "border-[#0052ff]/70 bg-[#0052ff]/10 text-[#7aa2ff]"
          : "border-bronze/70 bg-panel-deep/60 text-paper-muted"
      }`}
      title={`Indexed on the ${chain} settlement lane`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${isBase ? "bg-[#0052ff]" : "bg-amber"}`}
        aria-hidden
      />
      {isBase ? "BASE" : "SOL"}
    </span>
  );
}
