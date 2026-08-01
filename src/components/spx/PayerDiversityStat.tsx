import type { PayerDiversity } from "@/lib/live-data";
import { SCORING_VERSION } from "@/lib/versions";

/**
 * Counterparty stats for x402 agents. Scoring v0.3.0 grades who paid, not how
 * many times — a service with one customer may be excellent, but it has not
 * proven a market.
 */
export function PayerDiversityStat({ diversity }: { diversity: PayerDiversity }) {
  if (diversity.settlements === 0) return null;
  const pct = (v: number | null) => (v == null ? "no data" : `${(v * 100).toFixed(0)}%`);

  return (
    <div className="border border-bronze/50 bg-panel p-5">
      <div className="font-mono text-[10px] uppercase tracking-widest text-wire">
        Counterparty diversity
      </div>
      <dl className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <dd className="num-display text-2xl font-bold text-paper">
            {diversity.uniquePayers.toLocaleString()}
          </dd>
          <dt className="label-mono mt-1">Unique payers</dt>
        </div>
        <div>
          <dd className="num-display text-2xl font-bold text-paper">
            {pct(diversity.topPayerShare)}
          </dd>
          <dt className="label-mono mt-1">Top payer share</dt>
        </div>
        <div>
          <dd className="num-display text-2xl font-bold text-paper">
            {pct(diversity.highConfidenceShare)}
          </dd>
          <dt className="label-mono mt-1">High-confidence share</dt>
        </div>
      </dl>
      <p className="mt-4 font-mono text-[11px] text-wire">
        {SCORING_VERSION} — grades count counterparties, not transactions.
      </p>
      {diversity.legacyUnattributed > 0 && (
        <p className="mt-2 font-mono text-[11px] text-amber">
          legacy — predates payer attribution:{" "}
          {diversity.legacyUnattributed.toLocaleString()} of{" "}
          {diversity.settlements.toLocaleString()} receipts carry no payer
          (parser &lt; v0.2.0).
        </p>
      )}
    </div>
  );
}
