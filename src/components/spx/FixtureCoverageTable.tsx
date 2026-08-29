import { fixtureSections, fixtureTotals } from "@/lib/fixture-manifest";

/** Decoder claims pinned to captured mainnet transactions, by suite section. */
export function FixtureCoverageTable() {
  const sections = fixtureSections();
  const totals = fixtureTotals();

  return (
    <div>
      <div className="overflow-x-auto border border-bronze/50">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-bronze/40 bg-panel-deep font-mono text-[10px] uppercase tracking-widest text-wire">
              <th className="px-4 py-2 font-normal">Suite section</th>
              <th className="px-4 py-2 font-normal">Captured</th>
              <th className="px-4 py-2 font-normal">Awaiting capture</th>
              <th className="px-4 py-2 font-normal">Last capture</th>
            </tr>
          </thead>
          <tbody className="font-mono text-xs">
            {sections.map((s, i) => (
              <tr key={s.section} className={i % 2 ? "bg-panel" : "bg-background"}>
                <td className="px-4 py-2.5 text-paper">{s.section}</td>
                <td className="px-4 py-2.5 text-verified">
                  {s.captured}/{s.total}
                </td>
                <td className="px-4 py-2.5 text-paper-muted">{s.skipped > 0 ? s.skipped : "—"}</td>
                <td className="px-4 py-2.5 text-paper-muted">
                  {s.lastCaptureAt ? s.lastCaptureAt.slice(0, 10) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 font-mono text-[11px] text-wire">
        {totals.captured} of {totals.total} fixtures captured
        {totals.lastCaptureAt ? ` · last capture ${totals.lastCaptureAt.slice(0, 10)}` : ""}. A case
        we cannot capture yet is recorded as a skip with a reason — never a fabricated transaction,
        never a silent pass.
      </p>
    </div>
  );
}
