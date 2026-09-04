import { useState } from "react";
import { Check, Copy } from "lucide-react";

/**
 * Terminal block with a gold verification tick on copy.
 */
export function CopyBlock({
  method,
  endpoint,
  body,
}: {
  method: string;
  endpoint: string;
  body: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={`panel-engraved overflow-hidden ${copied ? "copy-flash" : ""}`}>
      <div className="flex items-center justify-between gap-3 border-b border-bronze/50 bg-panel-deep/60 px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest">
        <span className="text-amber">{method}</span>
        <span className="truncate text-wire">{endpoint}</span>
        <button type="button" onClick={copy} className="copy-tick shrink-0">
          {copied ? (
            <>
              <Check className="h-3 w-3 text-amber" aria-hidden /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" aria-hidden /> Copy
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto bg-panel-deep/30 p-5 font-mono text-[12px] leading-relaxed text-paper">
        {body}
      </pre>
    </div>
  );
}
