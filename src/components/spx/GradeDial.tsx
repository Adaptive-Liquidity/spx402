import { gradeColor, type Grade } from "@/lib/agents";

export type GradeSlice = { grade: string; count: number };

const GRADED = ["SPX AAA", "SPX AA", "SPX A", "SPX BBB", "SPX BB", "SPX B", "SPX D"];
const UNGRADED = "SPX404";

function toneFor(grade: string) {
  return `var(--color-${gradeColor(grade as Grade)})`;
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
  const graded = rows.reduce((n, r) => n + r.count, 0);
  const awaiting = by.get(UNGRADED) ?? 0;
  const total = graded + awaiting;

  // The graded arc always holds at least 15% of the track so a small pool of
  // graded subjects stays legible next to a large awaiting reserve.
  const rawShare = total ? graded / total : 1;
  const gradedShare = Math.max(rawShare, 0.15);
  const dominant = rows.reduce((a, b) => (b.count > a.count ? b : a), rows[0]);

  return (
    <div className="caliper">
      <div className="caliper-track">
        <div className="caliper-zone caliper-zone-graded" style={{ flexGrow: gradedShare }}>
          {rows.map((r) => (
            <div
              key={r.grade}
              className="caliper-seg"
              style={{
                flexGrow: graded ? Math.max(r.count, graded * 0.03) : 1,
                background: toneFor(r.grade),
                opacity: r.count === 0 ? 0.14 : r.grade === dominant.grade ? 0.9 : 0.45,
              }}
            >
              <span className="seg-pop">
                <em>{shortLabel(r.grade)}</em>
                {r.count.toLocaleString()} subject{r.count === 1 ? "" : "s"}
                <i>{graded ? `${Math.round((r.count / graded) * 100)}% of graded` : "no density"}</i>
              </span>
            </div>
          ))}
        </div>
        {awaiting > 0 && (
          <>
            <div className="caliper-notch" aria-hidden />
            <div
              className="caliper-zone caliper-zone-awaiting"
              style={{ flexGrow: Math.max(1 - gradedShare, 0.02) }}
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
            className={r.grade === dominant.grade ? "caliper-label is-dominant" : "caliper-label"}
          >
            {shortLabel(r.grade)}
            <em>{r.count}</em>
          </span>
        ))}
        <span className="caliper-label caliper-label-awaiting">
          404<em>{awaiting}</em>
        </span>
      </div>

      <div className="caliper-caption">
        <span className="text-amber">{graded.toLocaleString()} graded</span>
        <span className="caliper-caption-sep" aria-hidden>
          ·
        </span>
        <span>{awaiting.toLocaleString()} awaiting evidence</span>
      </div>
    </div>
  );
}
