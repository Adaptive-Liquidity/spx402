/**
 * Global coordinate framing. Desktop-only vertical hairlines pinned to the
 * layout container (never viewport chrome, so mobile widths and the sticky
 * header cannot collide with it) plus a fixed micro-grain overlay that kills
 * gradient banding on the deep emerald surfaces.
 */
export function LedgerFrame() {
  return (
    <>
      <div className="ledger-spine hidden lg:block" aria-hidden>
        <span className="spine-rule spine-left" />
        <span className="spine-rule spine-right" />
        <span className="spine-mark spine-mark-tl" />
        <span className="spine-mark spine-mark-tr" />
      </div>
      <div className="ledger-grain" aria-hidden />
    </>
  );
}
