import { useState } from "react";
import { GradeCard } from "./GradeCard";
import type { GradeCardModel } from "@/lib/grade-card";
import { cardShareTitle } from "@/lib/grade-card";

export function ShareCard({ card }: { card: GradeCardModel }) {
  const [copied, setCopied] = useState(false);
  const url = `https://${card.url}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const share = async () => {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (!nav.share) return copy();
    try {
      await nav.share({ title: cardShareTitle(card), url });
    } catch {
      /* user dismissed the sheet */
    }
  };

  const canNativeShare =
    typeof navigator !== "undefined" &&
    "share" in navigator &&
    typeof navigator.share === "function";

  return (
    <div className="space-y-3">
      <GradeCard card={card} />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copy}
          className="border border-bronze/70 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-paper-muted hover:border-amber/70 hover:text-amber"
        >
          {copied ? "Link copied" : "Copy link"}
        </button>
        {canNativeShare && (
          <button
            type="button"
            onClick={share}
            className="border border-amber/70 bg-amber/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-amber hover:bg-amber hover:text-panel-deep"
          >
            Share
          </button>
        )}
      </div>
    </div>
  );
}
