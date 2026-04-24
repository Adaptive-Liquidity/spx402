import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState } from "react";

export function AgentSearchBar({
  size = "md",
  autoFocus = false,
}: {
  size?: "md" | "lg";
  autoFocus?: boolean;
}) {
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = q.trim();
    if (!v) return;
    navigate({ to: "/agent/$mint", params: { mint: v } });
  }

  const tall = size === "lg" ? "py-5 text-base" : "py-3.5 text-sm";

  return (
    <form
      onSubmit={submit}
      className="relative w-full"
      role="search"
      aria-label="Analyze tokenized agent"
    >
      <div className="panel-engraved flex items-stretch">
        <div className="flex items-center pl-4 pr-2 text-amber">
          <Search className="h-4 w-4" aria-hidden />
        </div>
        <input
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Paste token mint, creator wallet, or Agent Deposit Address…"
          className={`flex-1 bg-transparent font-mono ${tall} text-paper placeholder:text-wire focus:outline-none`}
          aria-label="Token mint, creator wallet, or deposit address"
        />
        <button
          type="submit"
          className={`group relative ml-2 flex items-center gap-2 border-l border-bronze/60 bg-amber/10 px-5 font-mono text-xs uppercase tracking-widest text-amber transition-colors hover:bg-amber hover:text-panel-deep ${tall}`}
        >
          Analyze
          <span aria-hidden className="text-current">→</span>
        </button>
      </div>
      <p className="mt-3 px-1 font-mono text-[11px] uppercase tracking-widest text-wire">
        Supports pump.fun Tokenized Agents first. More jurisdictions later.
      </p>
    </form>
  );
}
