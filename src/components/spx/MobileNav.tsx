import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";

export interface MobileNavItem {
  to: string;
  label: string;
}

export function MobileNav({
  items,
  signedIn,
}: {
  items: readonly MobileNavItem[];
  signedIn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-10 w-10 items-center justify-center border border-bronze/60 text-paper-muted transition-colors hover:border-amber hover:text-amber"
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {open && (
        <div className="fixed inset-x-0 top-[57px] bottom-0 z-50 overflow-y-auto border-t border-bronze/40 bg-background/98 backdrop-blur-md">
          <nav className="flex flex-col divide-y divide-bronze/25 px-4 py-2">
            {items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={close}
                className="py-4 font-mono text-[13px] uppercase tracking-widest text-paper-muted transition-colors hover:text-amber"
                activeProps={{ className: "text-amber" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-col gap-3 px-4 py-6">
            {signedIn ? (
              <Link
                to="/dashboard"
                onClick={close}
                className="border border-amber/80 bg-amber/10 px-4 py-3 text-center font-mono text-[11px] uppercase tracking-widest text-amber"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/signup"
                  onClick={close}
                  className="border border-amber/80 bg-amber/10 px-4 py-3 text-center font-mono text-[11px] uppercase tracking-widest text-amber"
                >
                  Open Terminal
                </Link>
                <Link
                  to="/login"
                  onClick={close}
                  className="border border-bronze/60 px-4 py-3 text-center font-mono text-[11px] uppercase tracking-widest text-paper-muted"
                >
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
