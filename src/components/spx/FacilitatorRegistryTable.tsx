import type { FacilitatorRow } from "@/lib/live-data";
import { ChainBadge } from "@/components/spx/ChainBadge";

/**
 * The full facilitator registry, rendered from the `facilitators` table.
 * Anyone can audit who we trust: add or remove a row and this page changes.
 */
export function FacilitatorRegistryTable({
  facilitators,
}: {
  facilitators: FacilitatorRow[];
}) {
  if (facilitators.length === 0) {
    return (
      <div className="border border-bronze/50 bg-panel p-6 font-mono text-sm text-paper-muted">
        The registry is empty. No facilitator is trusted for Tier A detection,
        so no settlement is scored as high confidence.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto border border-bronze/50">
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead>
          <tr className="border-b border-bronze/40 bg-panel-deep font-mono text-[10px] uppercase tracking-widest text-wire">
            <th className="px-4 py-2 font-normal">Facilitator</th>
            <th className="px-4 py-2 font-normal">Chain</th>
            <th className="px-4 py-2 font-normal">Address</th>
            <th className="px-4 py-2 font-normal">Source</th>
            <th className="px-4 py-2 font-normal">Fixture</th>
            <th className="px-4 py-2 font-normal">State</th>
          </tr>
        </thead>
        <tbody className="font-mono text-xs">
          {facilitators.map((f, i) => (
            <tr key={f.id} className={i % 2 ? "bg-panel" : "bg-background"}>
              <td className="px-4 py-2.5 text-paper">
                {f.name}
                <div className="text-[10px] text-wire">{f.id}</div>
              </td>
              <td className="px-4 py-2.5">
                <ChainBadge chain={f.chain} size="sm" />
              </td>
              <td className="break-all px-4 py-2.5 text-paper-muted">
                {f.address || "—"}
              </td>
              <td className="px-4 py-2.5">
                {f.sourceUrl ? (
                  <a
                    href={f.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber hover:underline"
                  >
                    published list ↗
                  </a>
                ) : (
                  <span className="text-wire">—</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-paper-muted">{f.fixtureId ?? "—"}</td>
              <td className="px-4 py-2.5">
                <span
                  className={
                    f.active
                      ? "border border-verified/60 px-2 py-0.5 uppercase tracking-widest text-verified"
                      : "border border-wire/60 px-2 py-0.5 uppercase tracking-widest text-paper-muted"
                  }
                >
                  {f.active ? "active" : "inactive"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
