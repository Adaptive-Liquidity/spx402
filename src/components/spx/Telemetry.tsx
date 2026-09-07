import { useEffect, useState } from "react";
import { fetchLatestIndexerRuns, relativeFromNow } from "@/lib/live-data";
import { CORE_PARSER_VERSION } from "@/lib/versions";

/** Anything older than this and the pipeline is not keeping up. */
const LAG_THRESHOLD_MS = 30 * 60 * 1000;

type Health =
  | { state: "unknown" }
  | { state: "nominal"; freshness: string }
  | { state: "lagging"; freshness: string }
  | { state: "no-heartbeat" };

/**
 * The single system status readout for the whole site: real UTC clock plus
 * honest indexer freshness read from the worker heartbeats. Client-only so the
 * clock cannot cause a hydration mismatch. No other surface prints status.
 */
export function Telemetry() {
  const [utc, setUtc] = useState<string | null>(null);
  const [health, setHealth] = useState<Health>({ state: "unknown" });

  useEffect(() => {
    const tick = () => setUtc(new Date().toISOString().slice(11, 19));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const read = async () => {
      const runs = await fetchLatestIndexerRuns();
      if (cancelled) return;
      const newest = Object.values(runs)
        .filter((r): r is NonNullable<typeof r> => r != null)
        .map((r) => r.ranAt)
        .sort()
        .at(-1);
      if (!newest) {
        setHealth({ state: "no-heartbeat" });
        return;
      }
      const age = Date.now() - new Date(newest).getTime();
      const freshness = relativeFromNow(newest);
      setHealth(age > LAG_THRESHOLD_MS ? { state: "lagging", freshness } : { state: "nominal", freshness });
    };
    void read();
    const t = setInterval(() => void read(), 60_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const label =
    health.state === "nominal"
      ? `Indexed ${health.freshness}`
      : health.state === "lagging"
        ? `Indexer lagging · last ${health.freshness}`
        : health.state === "no-heartbeat"
          ? "No heartbeat"
          : "Reading heartbeat";

  const short =
    health.state === "nominal"
      ? health.freshness
      : health.state === "lagging"
        ? "Lagging"
        : health.state === "no-heartbeat"
          ? "No heartbeat"
          : "—";

  const dotTone =
    health.state === "nominal"
      ? "bg-verified"
      : health.state === "lagging"
        ? "bg-amber"
        : health.state === "no-heartbeat"
          ? "bg-critical"
          : "bg-wire";

  return (
    <div className="telemetry hidden 2xl:inline-flex" title={`Parser ${CORE_PARSER_VERSION}`}>
      <span className={`telemetry-dot ${dotTone}`} aria-hidden />
      <span className="telemetry-text">
        {label}
        <span className="telemetry-sep" aria-hidden>
          ·
        </span>
        UTC {utc ?? "--:--:--"}
      </span>
      <span className="telemetry-short">{short}</span>
    </div>
  );
}
