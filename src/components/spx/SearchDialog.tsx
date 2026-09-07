import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { AgentSearchBar } from "./AgentSearchBar";

function isTypingTarget(el: EventTarget | null) {
  const node = el as HTMLElement | null;
  if (!node) return false;
  const tag = node.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || node.isContentEditable === true;
}

/**
 * Header search affordance. The shortcut advertised in the trigger is the only
 * binding: Cmd+K / Ctrl+K, ignored while focus sits in a field. It opens the
 * existing AgentSearchBar rather than a second search surface.
 */
export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => setOpen(false), [path]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "k" && e.key !== "K") return;
      if (!e.metaKey && !e.ctrlKey) return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      setOpen((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search the terminal"
        className="focus-ring hidden items-center gap-2 border border-bronze/60 px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-paper-muted transition-colors duration-[var(--motion-fast)] ease-[var(--ease)] hover:border-amber hover:text-amber lg:inline-flex"
      >
        <Search className="h-3.5 w-3.5" aria-hidden />
        Search
        <kbd className="ml-1 border border-bronze/60 px-1 py-0.5 text-[9px] text-wire">⌘K</kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl border-bronze/60 bg-background p-6">
          <DialogTitle className="label-amber">Query the terminal</DialogTitle>
          <div className="mt-4">
            <AgentSearchBar autoFocus />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
