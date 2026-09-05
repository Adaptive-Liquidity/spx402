export type GradeSlice = { grade: string; count: number };

const GRADED = ["SPX AAA", "SPX AA", "SPX A", "SPX BBB", "SPX BB", "SPX B", "SPX D"];
const UNGRADED = "SPX404";

function toneFor(grade: string) {
  if (grade === "SPX D") return "var(--critical)";
  if (grade === "SPX AAA") return "var(--verified)";
  return "var(--wire)";
}

function shortLabel(grade: string) {
  return grade.replace("SPX", "").trim() || "404";
}

/**
 * Grade caliper. One engraved measuring track under the query console,
 * partitioned into two structural zones: the graded arc (AAA→D) and the
 * awaiting-evidence reserve. Reads data already loaded for the page.
 */
export function GradeDial({ slices }: { slices: GradeSlice[] }) {
  const by = new Map(slices.map((s) => [s.grade, s.count]));
  const rows = GRADED.map((grade) => ({ grade, count: by.get(grade) ?? 0 }));
  const awaiting = by.get(UNGRADED) ?? 0;

  return (
    <div className="caliper">
      <div className="caliper-track">
        <div className="caliper-zone caliper-zone-graded" style={{ flexGrow: rows.reduce((sum, row) => sum + row.count, 0) || 1 }}>
          {rows.map((r) => (
            <div
              key={r.grade}
              className="caliper-seg"
              style={{
                flexGrow: r.count,
                background: toneFor(r.grade),
                opacity: r.count === 0 ? 0 : 0.9,
              }}
            >
              <span className="seg-pop">
                <em>{shortLabel(r.grade)}</em>
                {r.count.toLocaleString()} subject{r.count === 1 ? "" : "s"}
                <i>settled execution grade</i>
              </span>
            </div>
          ))}
        </div>
        {awaiting > 0 && (
          <>
            <div className="caliper-notch" aria-hidden />
            <div
              className="caliper-zone caliper-zone-awaiting"
              style={{ flexGrow: awaiting }}
            >
              <div className="caliper-seg caliper-hatch">
                <span className="seg-pop">
                  <em>404</em>
                  {awaiting.toLocaleString()} awaiting evidence
                  <i>no settlement observed yet</i>
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="caliper-ticks" aria-hidden>
        {Array.from({ length: 49 }, (_, i) => (
          <span key={i} className={i % 6 === 0 ? "tick tick-long" : "tick"} />
        ))}
      </div>

      <div className="caliper-scale" aria-hidden>
        {rows.map((r) => (
          <span
            key={r.grade}
            className={`caliper-label ${r.grade === "SPX D" ? "is-failure" : ""} ${r.grade === "SPX AAA" ? "is-pass" : ""}`}
          >
            {shortLabel(r.grade)} {r.count}
          </span>
        ))}
        <span className="caliper-label caliper-label-awaiting">
          404 {awaiting}
        </span>
      </div>
    </div>
  );
}
