import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { NAV_ROUTES } from "./nav-items";
import { supabase } from "@/integrations/supabase/client";

type AgentHit = { mint: string; symbol: string; name: string; grade: string };

type Item =
  | { kind: "route"; to: string; label: string }
  | { kind: "agent"; mint: string; label: string; detail: string };

export function SearchDialog({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [agents, setAgents] = useState<AgentHit[]>([]);
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  const routes = useMemo(() => {
    const v = q.trim().toLowerCase();
    if (!v) return NAV_ROUTES.slice(0, 6);
    return NAV_ROUTES.filter((r) => r.label.toLowerCase().includes(v)).slice(0, 6);
  }, [q]);

  useEffect(() => {
    const v = q.trim();
    if (v.length < 2) {
      setAgents([]);
      return;
    }
    const id = setTimeout(() => {
      const like = `%${v.replace(/[%_]/g, "")}%`;
      supabase
        .from("agents")
        .select("mint,symbol,name,grade")
        .or(`symbol.ilike.${like},name.ilike.${like},mint.ilike.${like}`)
        .limit(6)
        .then(({ data }) => setAgents((data as AgentHit[] | null) ?? []));
    }, 180);
    return () => clearTimeout(id);
  }, [q]);

  const items: Item[] = useMemo(
    () => [
      ...routes.map((r): Item => ({ kind: "route", to: r.to, label: r.label })),
      ...agents.map(
        (a): Item => ({
          kind: "agent",
          mint: a.mint,
          label: `$${a.symbol}`,
          detail: `${a.name} · ${a.grade}`,
        }),
      ),
    ],
    [routes, agents],
  );

  useEffect(() => setActive(0), [q]);

  const go = (item: Item) => {
    onClose();
    if (item.kind === "route") navigate({ to: item.to });
    else navigate({ to: "/agent/$mint", params: { mint: item.mint } });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[active];
      if (item) go(item);
      else if (q.trim()) {
        onClose();
        navigate({ to: "/agent/$mint", params: { mint: q.trim() } });
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-background/80 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="panel-engraved mt-24 w-full max-w-xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center border-b border-bronze/40">
          <div className="flex items-center pl-4 pr-2 text-amber">
            <Search className="h-4 w-4" aria-hidden />
          </div>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search agents, or jump to a page…"
            aria-label="Search"
            className="flex-1 bg-transparent py-4 font-mono text-sm text-paper placeholder:text-wire focus:outline-none"
          />
          <kbd className="mr-4 border border-bronze/50 px-1.5 py-0.5 font-mono text-[9px] text-wire">
            ESC
          </kbd>
        </div>

        <div className="max-h-[420px] overflow-y-auto p-2">
          {items.length === 0 && (
            <div className="px-3 py-8 text-center font-mono text-xs text-wire">
              No matches. Press Enter to look up a mint directly.
            </div>
          )}
          {items.map((item, i) => (
            <button
              key={item.kind === "route" ? `r:${item.to}` : `a:${item.mint}`}
              type="button"
              onMouseEnter={() => setActive(i)}
              onClick={() => go(item)}
              className={`flex w-full items-center justify-between px-3 py-2.5 text-left font-mono text-xs ${
                i === active ? "bg-panel-deep text-amber" : "text-paper-muted"
              }`}
            >
              <span className="uppercase tracking-widest">
                {item.kind === "route" ? item.label : item.label}
              </span>
              <span className="text-[10px] text-wire">
                {item.kind === "route" ? "PAGE" : item.detail}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
