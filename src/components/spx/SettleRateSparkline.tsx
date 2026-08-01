import type { SettleRatePoint } from "@/lib/prober-data";

/**
 * Daily settled/attempted for paid probes. Grey bars are days with no probe —
 * an honest gap, never a zero.
 */
export function SettleRateSparkline({
  series,
  height = "h-16",
}: {
  series: SettleRatePoint[];
  height?: string;
}) {
  const withData = series.filter((p) => p.rate != null);
  if (withData.length === 0) {
    return (
      <div className="font-mono text-xs text-wire">
        No paid probes in the last 30 days — no settle rate to plot.
      </div>
    );
  }
  return (
    <div className={`flex ${height} items-end gap-[2px]`}>
      {series.map((p) => (
        <div
          key={p.day}
          title={
            p.rate == null
              ? `${p.day}: no probe`
              : `${p.day}: ${(p.rate * 100).toFixed(0)}% (${p.settled}/${p.attempts})`
          }
          className={`w-full ${
            p.rate == null
              ? "bg-bronze/25"
              : p.rate >= 0.9
                ? "bg-verified/70"
                : p.rate >= 0.5
                  ? "bg-amber/70"
                  : "bg-critical/70"
          }`}
          style={{ height: `${p.rate == null ? 6 : Math.max(8, p.rate * 100)}%` }}
        />
      ))}
    </div>
  );
}
