import { useCallback, useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { formatTxSignature, truncateAddress } from "@/lib/format";

/** Copy any short string with one consistent affordance. */
export function CopyToClipboard({
  value,
  label = "Copy",
  className,
  children,
}: {
  value: string;
  label?: string;
  className?: string;
  children?: ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    void navigator.clipboard.writeText(value).then(() => setCopied(true));
  }, [value]);

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Copied" : label}
      className={cn(
        "focus-ring inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-wire transition-colors duration-[var(--motion-fast)] hover:text-amber",
        className,
      )}
    >
      {children ?? (copied ? "Copied" : label)}
    </button>
  );
}

/**
 * Truncated on-chain identifier with an optional copy control and explorer link.
 * Never renders a raw untruncated address inline.
 */
export function WalletAddress({
  address,
  kind = "address",
  explorer,
  copy = true,
  className,
}: {
  address: string | null | undefined;
  kind?: "address" | "signature";
  /** Absolute explorer URL. Omit to render plain text. */
  explorer?: string;
  copy?: boolean;
  className?: string;
}) {
  const display = kind === "signature" ? formatTxSignature(address) : truncateAddress(address);

  if (!address) {
    return <span className={cn("font-mono text-xs text-wire", className)}>{display}</span>;
  }

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {explorer ? (
        <a
          href={explorer}
          target="_blank"
          rel="noreferrer noopener"
          title={address}
          className="focus-ring font-mono text-xs text-paper underline decoration-bronze/50 underline-offset-4 transition-colors hover:text-amber"
        >
          {display}
        </a>
      ) : (
        <span title={address} className="font-mono text-xs text-paper">
          {display}
        </span>
      )}
      {copy ? <CopyToClipboard value={address} /> : null}
    </span>
  );
}
