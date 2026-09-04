import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Single-gesture band reveal. The whole band opens from its own median rule
 * through one clip expansion — no per-child cascade. Honours reduced motion
 * (the CSS resolves to the finished frame with no animation).
 */
export function Aperture({
  children,
  as: Tag = "div",
  className,
  immediate = false,
}: {
  children: ReactNode;
  as?: "div" | "section" | "li";
  className?: string;
  /** Open on mount rather than on scroll — used for the hero band. */
  immediate?: boolean;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (immediate) {
      const id = requestAnimationFrame(() => setOpen(true));
      return () => cancelAnimationFrame(id);
    }
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setOpen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setOpen(true);
            io.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.04 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [immediate]);

  return (
    <Tag ref={ref as never} className={cn("aperture", open && "is-open", className)}>
      {children}
    </Tag>
  );
}
