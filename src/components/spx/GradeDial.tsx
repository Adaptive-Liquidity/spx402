export type GradeSlice = { grade: string; count: number };

const ORDER = ["AAA", "AA", "A", "BBB", "BB", "B", "D", "404"];

function toneFor(grade: string) {
  if (grade === "AAA" || grade === "AA" || grade === "A") return "var(--color-verified)";
  if (grade === "BBB" || grade === "BB") return "var(--color-amber)";
  if (grade === "B") return "var(--color-amber-dim)";
  return "var(--color-critical)";
}

/**
 * Grade caliper. A single engraved measuring track under the query console:
 * every graded agent we hold, distributed across the grade scale. Reads the
 * data already loaded for the page — no extra query.
 */
export function GradeDial({ slices }: { slices: GradeSlice[] }) {
  const by = new Map(slices.map((s) => [s.grade, s.count]));
  const rows = ORDER.map((grade) => ({ grade, count: by.get(grade) ?? 0 }));
  const total = rows.reduce((n, r) => n + r.count, 0);
  const dominant = rows.reduce((a, b) => (b.count > a.count ? b : a), rows[0]);

  return (
    <div className="caliper" aria-hidden>
      <div className="caliper-track">
        {rows.map((r) => (
          <div
            key={r.grade}
            className="caliper-seg"
            style={{
              flexGrow: total ? Math.max(r.count, total * 0.012) : 1,
              background: toneFor(r.grade),
              opacity: r.count === 0 ? 0.12 : r.grade === dominant.grade ? 0.85 : 0.42,
            }}
          />
        ))}
      </div>
      <div className="caliper-ticks">
        {Array.from({ length: 49 }, (_, i) => (
          <span key={i} className={i % 6 === 0 ? "tick tick-long" : "tick"} />
        ))}
      </div>
      <div className="caliper-scale">
        {rows.map((r) => (
          <span
            key={r.grade}
            className={r.grade === dominant.grade ? "caliper-label is-dominant" : "caliper-label"}
          >
            {r.grade}
            <em>{r.count}</em>
          </span>
        ))}
      </div>
      <div className="caliper-caption">
        Live grade distribution · {total.toLocaleString()} graded subjects
      </div>
    </div>
  );
}
