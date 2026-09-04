import { useEffect, useState } from "react";

/**
 * System telemetry readout. Full pill on desktop, compact status dot below
 * 1024px so it never crowds the navigation. Clock is client-only to avoid a
 * hydration mismatch.
 */
export function Telemetry() {
  const [utc, setUtc] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setUtc(new Date().toISOString().slice(11, 19));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="telemetry" title="System status">
      <span className="telemetry-dot" aria-hidden />
      <span className="telemetry-text">
        System: Nominal
        <span className="telemetry-sep" aria-hidden>
          ·
        </span>
        UTC {utc ?? "--:--:--"}
      </span>
      <span className="telemetry-short">Nominal</span>
    </div>
  );
}
