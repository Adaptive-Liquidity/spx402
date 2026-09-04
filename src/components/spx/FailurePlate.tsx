/**
 * The diagnostic plate. Fifteen failure patterns rendered as one monolithic
 * monospaced board rather than a grid of cards; hovering a row activates a
 * crosshair guide rule.
 */
export function FailurePlate({ patterns }: { patterns: string[] }) {
  return (
    <div className="failure-plate">
      <div className="failure-plate-head">
        <span>ID</span>
        <span>Pattern</span>
        <span className="hidden sm:block">Class</span>
      </div>
      <ul>
        {patterns.map((p, i) => (
          <li key={p} className="failure-row">
            <span className="failure-id">{String(i + 1).padStart(2, "0")}</span>
            <span className="failure-name">{p}</span>
            <span className="failure-class hidden sm:block">
              {i < 5 ? "SETTLEMENT" : i < 10 ? "INTEGRITY" : "BEHAVIOURAL"}
            </span>
            <span className="failure-crosshair" aria-hidden />
          </li>
        ))}
      </ul>
    </div>
  );
}
