import { PROBE_CAPS } from "@/lib/prober/outcomes";

/**
 * Today's prober spend against the daily budget. A tripped breaker is a red
 * card state: SPX402 stops buying rather than exceeding its own limit.
 */
export function BudgetGauge({
  spentTodayUsd,
  dailyBudgetUsd = PROBE_CAPS.dailyBudgetUsd,
}: {
  spentTodayUsd: number;
  dailyBudgetUsd?: number;
}) {
  const pct = Math.min(100, (spentTodayUsd / dailyBudgetUsd) * 100);
  const halted = spentTodayUsd >= dailyBudgetUsd;
  return (
    <div>
      <div className="flex items-baseline justify-between font-mono text-[11px]">
        <span className="uppercase tracking-widest text-wire">Spend today (UTC)</span>
        <span className={halted ? "text-critical" : "text-paper"}>
          ${spentTodayUsd.toFixed(4)} / ${dailyBudgetUsd.toFixed(2)}
        </span>
      </div>
      <div className="mt-2 h-2 w-full border border-bronze/50 bg-panel-deep">
        <div
          className={`h-full ${halted ? "bg-critical" : pct > 66 ? "bg-amber" : "bg-verified/70"}`}
          style={{ width: `${Math.max(pct, spentTodayUsd > 0 ? 2 : 0)}%` }}
        />
      </div>
      <div
        className={`mt-2 font-mono text-[10px] uppercase tracking-widest ${halted ? "text-critical" : "text-wire"}`}
      >
        {halted
          ? "PROBER_BUDGET_HALT — prober halted at daily budget. Discipline is the product."
          : "Budget breaker armed"}
      </div>
    </div>
  );
}
