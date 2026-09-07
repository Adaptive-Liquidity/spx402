import { ProbeStatusPanel } from "@/components/spx/ProbeStatusPanel";
import type { ProbeRunRow, SettleRatePoint, X402ServiceRow } from "@/lib/prober-data";

export function DossierProbe({
  service,
  series,
  lastRun,
}: {
  service: X402ServiceRow | null;
  series: SettleRatePoint[];
  lastRun: ProbeRunRow | null;
}) {
  if (!service) return null;
  return <ProbeStatusPanel service={service} series={series} lastRun={lastRun} />;
}
