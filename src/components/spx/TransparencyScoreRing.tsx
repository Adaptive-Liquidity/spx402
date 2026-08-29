import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function TransparencyScoreRing({
  score,
  size = 180,
  className,
}: {
  score: number | null;
  size?: number;
  className?: string;
}) {
  const [animated, setAnimated] = useState(0);
  const target = score ?? 0;
  const radius = size / 2 - 10;
  const circ = 2 * Math.PI * radius;
  const pct = target / 100;
  const offset = circ * (1 - pct);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const dur = 1200;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      setAnimated(target * eased);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  const colorVar =
    score === null
      ? "var(--critical)"
      : score >= 80
        ? "var(--verified)"
        : score >= 60
          ? "var(--amber)"
          : score >= 40
            ? "var(--amber-dim)"
            : "var(--critical)";

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--bronze-dim)"
          strokeWidth={6}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colorVar}
          strokeWidth={6}
          strokeDasharray={circ}
          strokeDashoffset={score === null ? circ : offset}
          strokeLinecap="butt"
          style={{ transition: "stroke-dashoffset 1.2s ease-out" }}
        />
        {/* tick marks */}
        {Array.from({ length: 40 }).map((_, i) => {
          const angle = (i / 40) * Math.PI * 2;
          const x1 = size / 2 + Math.cos(angle) * (radius - 14);
          const y1 = size / 2 + Math.sin(angle) * (radius - 14);
          const x2 = size / 2 + Math.cos(angle) * (radius - 18);
          const y2 = size / 2 + Math.sin(angle) * (radius - 18);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="var(--bronze-dim)"
              strokeWidth={1}
              opacity={0.6}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="label-mono">SCORE</div>
        <div className="num-display text-5xl font-bold leading-none" style={{ color: colorVar }}>
          {score === null ? "—" : Math.round(animated)}
        </div>
        <div className="label-mono mt-1">/ 100</div>
      </div>
    </div>
  );
}
