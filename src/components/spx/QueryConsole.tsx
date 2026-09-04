import { Link, useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const EXAMPLES = [
  "Token mint",
  "Creator wallet",
  "Agent deposit address",
  "x402 executor wallet",
];

/**
 * The heavyweight ledger query console. Framed in the same hairline coordinate
 * system as the hero band; rests on the grade dial's chord as a slab of
 * optical crystal.
 */
export function QueryConsole() {
  const [q, setQ] = useState("");
  const [slot, setSlot] = useState(0);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setInterval(() => setSlot((s) => (s + 1) % EXAMPLES.length), 3200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const typing =
        e.target instanceof HTMLElement &&
        ["INPUT", "TEXTAREA"].includes(e.target.tagName);
      if (typing) return;
      if (e.key === "/" || (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = q.trim();
    if (!v) return;
    navigate({ to: "/agent/$mint", params: { mint: v } });
  }

  return (
    <form
      onSubmit={submit}
      role="search"
      aria-label="Query the ledger"
      className={`console-slab relative ${focused ? "is-focused" : ""}`}
    >
      <div className="flex items-stretch">
        <div className="flex items-center pl-5 pr-3 text-amber">
          <Search className="h-4 w-4" aria-hidden />
        </div>

        <div className="relative flex-1">
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            aria-label="Token mint, creator wallet, or deposit address"
            className="w-full bg-transparent py-6 font-mono text-base text-paper caret-amber focus:outline-none"
          />
          {q.length === 0 && (
            <div
              className="pointer-events-none absolute inset-0 flex items-center overflow-hidden"
              aria-hidden
            >
              <span className="mr-2 font-mono text-base text-wire">Query</span>
              <span className="ghost-typist relative block h-6 flex-1">
                {EXAMPLES.map((ex, i) => (
                  <span
                    key={ex}
                    className={`ghost-line ${i === slot ? "is-live" : ""}`}
                    style={{ ["--dir" as string]: i === slot ? "1" : "-1" }}
                  >
                    <span className="ghost-caret" aria-hidden />
                    {ex}
                  </span>
                ))}
              </span>
            </div>
          )}
        </div>

        <div className="hidden items-center pr-3 sm:flex">
          <kbd className="brass-pill" aria-hidden>
            ⌘K
          </kbd>
        </div>

        <button
          type="submit"
          className="border-l border-bronze/60 bg-amber/10 px-7 font-mono text-xs uppercase tracking-[0.2em] text-amber transition-colors hover:bg-amber hover:text-panel-deep"
        >
          Analyze
        </button>
      </div>

      <span className="console-beam" aria-hidden />

      {/* mechanical escape tab, cut into the bottom border */}
      <div className="console-tabrail">
        <Link to="/leaderboard" className="console-tab">
          Browse the leaderboard
        </Link>
        <Link to="/methodology" className="console-tab">
          Methodology
        </Link>
        <Link to="/register" className="console-tab is-primary">
          Register an agent
        </Link>
      </div>
    </form>
  );
}
