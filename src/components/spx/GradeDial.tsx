import { useId } from "react";
import type { Grade } from "@/lib/agents";

export interface GradeSlice {
  grade: Grade;
  count: number;
}

const ORDER: Grade[] = [
  "SPX AAA",
  "SPX AA",
  "SPX A",
  "SPX BBB",
  "SPX BB",
  "SPX B",
  "SPX D",
  "SPX404",
];

const CX = 400;
const CY = 6;
const R_OUTER = 262;
const R_INNER = 232;

function polar(r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

/** Etched arc segment between two angles (degrees, 180 → 0 left to right). */
function arcPath(from: number, to: number, rOuter: number, rInner: number) {
  const a = polar(rOuter, from);
  const b = polar(rOuter, to);
  const c = polar(rInner, to);
  const d = polar(rInner, from);
  const large = Math.abs(from - to) > 180 ? 1 : 0;
  return [
    `M ${a.x.toFixed(2)} ${a.y.toFixed(2)}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`,
    `L ${c.x.toFixed(2)} ${c.y.toFixed(2)}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${d.x.toFixed(2)} ${d.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

/**
 * The viewfinder — a 180° precision caliper of the live grade distribution.
 * Renders behind the query console so the console rests on the dial's chord.
 */
export function GradeDial({ slices }: { slices: GradeSlice[] }) {
  const id = useId();
  const byGrade = new Map(slices.map((s) => [s.grade, s.count]));
  const present = ORDER.map((g) => ({ grade: g, count: byGrade.get(g) ?? 0 }));
  const total = present.reduce((n, s) => n + s.count, 0);

  let cursor = 180;
  const segments = present.map((s) => {
    const span = total > 0 ? (s.count / total) * 180 : 180 / present.length;
    const seg = { ...s, from: cursor, to: cursor - span };
    cursor -= span;
    return seg;
  });

  const dominant = present.reduce((best, s) => (s.count > best.count ? s : best), present[0]);
  const dominantSeg = segments.find((s) => s.grade === dominant.grade);
  const halo = dominantSeg ? polar(R_INNER - 26, (dominantSeg.from + dominantSeg.to) / 2) : null;

  const ticks = Array.from({ length: 61 }, (_, i) => 180 - i * 3);

  return (
    <svg
      viewBox="0 0 800 292"
      className="h-full w-full"
      role="img"
      aria-label={
        total > 0
          ? `Live grade distribution across ${total} graded agents. Dominant grade ${dominant.grade}.`
          : "Grade distribution caliper"
      }
      preserveAspectRatio="xMidYMin meet"
    >
      <defs>
        <radialGradient id={`${id}-caustic`}>
          <stop offset="0%" stopColor="var(--amber)" stopOpacity="0.34" />
          <stop offset="100%" stopColor="var(--amber)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-rim`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="var(--amber)" stopOpacity="0.45" />
          <stop offset="100%" stopColor="var(--amber)" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {halo && (
        <circle cx={halo.x} cy={halo.y} r={150} fill={`url(#${id}-caustic)`} className="dial-halo" />
      )}

      {/* etched tick circumference */}
      <g stroke="var(--bronze)" strokeWidth="1">
        {ticks.map((deg, i) => {
          const long = i % 5 === 0;
          const a = polar(R_OUTER + (long ? 14 : 7), deg);
          const b = polar(R_OUTER, deg);
          return (
            <line
              key={deg}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              opacity={long ? 0.72 : 0.32}
            />
          );
        })}
      </g>

      {/* grade buckets as demarcated arcs */}
      <g>
        {segments.map((s) => (
          <path
            key={s.grade}
            d={arcPath(s.from, s.to, R_OUTER, R_INNER)}
            fill={s.count > 0 ? `var(--color-${gradeToken(s.grade)})` : "var(--bronze-dim)"}
            opacity={s.count > 0 ? (s.grade === dominant.grade ? 0.42 : 0.2) : 0.14}
            stroke="var(--panel-deep)"
            strokeWidth="1.5"
          />
        ))}
      </g>

      {/* rim + chord */}
      <path
        d={arcPath(180, 0, R_OUTER + 1, R_OUTER)}
        fill={`url(#${id}-rim)`}
      />
      <line
        x1={CX - R_OUTER}
        y1={CY}
        x2={CX + R_OUTER}
        y2={CY}
        stroke="var(--bronze)"
        strokeWidth="1"
        opacity="0.6"
      />

      {/* bucket labels on the outer edge */}
      <g fontFamily="var(--font-mono)" fontSize="11" letterSpacing="1.5" fill="var(--wire)">
        <text x={CX - R_OUTER - 14} y={CY + 4} textAnchor="end">
          AAA
        </text>
        <text x={CX + R_OUTER + 14} y={CY + 4} textAnchor="start">
          404
        </text>
      </g>
    </svg>
  );
}

function gradeToken(grade: Grade): string {
  if (grade === "SPX AAA" || grade === "SPX AA") return "verified";
  if (grade === "SPX A" || grade === "SPX BBB") return "amber";
  if (grade === "SPX BB" || grade === "SPX B") return "amber-dim";
  return "critical";
}
