import { createFileRoute, Link } from "@tanstack/react-router";
import { fetchPulseFeed, relativeFromNow, type PulseEntry } from "@/lib/live-data";
import { ArrowDown, ArrowUp, AlertTriangle, Activity } from "lucide-react";

export const Route = createFileRoute("/pulse")({
  head: () => ({
    meta: [
      { title: "Pulse — live score deltas & failures · SPX402" },
      {
        name: "description",
        content:
          "Real-time feed of agent score changes, failure events, and critical incidents observed on-chain by SPX402.",
      },
      { property: "og:title", content: "SPX402 Pulse — live reputation deltas" },
      {
        property: "og:description",
        content:
          "Score moves, failed buybacks, reverted x402 settlements. The chain's read on agent execution, in chronological order.",
      },
    ],
  }),
  loader: () => fetchPulseFeed(80),
  staleTime: 15_000,
  pendingComponent: () => (
    <div className="mx-auto max-w-[1100px] px-4 py-20 text-center font-mono text-xs uppercase tracking-widest text-wire">
      Loading pulse…
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-[1100px] px-4 py-20 text-center">
      <div className="label-amber">Pulse unavailable</div>
      <p className="mt-3 text-paper-muted">{error.message}</p>
    </div>
  ),
  component: PulsePage,
});

function PulsePage() {
  const entries = Route.useLoaderData() as PulseEntry[];

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-12 lg:px-8 lg:py-16">
      <div className="label-amber">Pulse</div>
      <h1 className="mt-3 font-display text-5xl font-bold leading-tight text-paper">
        What just changed.
      </h1>
      <p className="mt-4 max-w-2xl text-paper-muted">
        Score deltas, failure events, and critical incidents — interleaved in chronological order.
        This is the heartbeat of SPX402's evidence layer.
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <div className="font-mono text-[11px] uppercase tracking-widest text-wire">
          {entries.length} entries · last 7 days
        </div>
        <Link
          to="/tape"
          className="font-mono text-[11px] uppercase tracking-widest text-amber hover:underline"
        >
          See full tape →
        </Link>
      </div>

      <div className="mt-6 space-y-2">
        {entries.length === 0 ? (
          <div className="border border-dashed border-bronze/60 p-10 text-center font-mono text-sm text-paper-muted">
            No score deltas or failure events in the last 7 days yet.
            <div className="mt-3 font-mono text-[11px] text-wire">
              Snapshots accumulate daily — this feed gets richer over time.
            </div>
          </div>
        ) : (
          entries.map((e) => <PulseRow key={e.id} entry={e} />)
        )}
      </div>
    </div>
  );
}

function PulseRow({ entry }: { entry: PulseEntry }) {
  if (entry.kind === "score_delta") {
    const delta = entry.scoreDelta ?? 0;
    const positive = delta > 0;
    const Icon = positive ? ArrowUp : ArrowDown;
    return (
      <Link
        to="/agent/$mint"
        params={{ mint: entry.mint }}
        className="block panel-engraved p-4 transition-colors hover:bg-panel/60"
      >
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`flex h-8 w-8 items-center justify-center border ${
              positive
                ? "border-verified/50 bg-verified/10 text-verified"
                : "border-critical/50 bg-critical/10 text-critical"
            }`}
          >
            <Icon className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-display text-lg font-bold text-paper">
                ${entry.symbol ?? entry.mint.slice(0, 6)}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-wire">
                score{" "}
                <span className="text-paper-muted">
                  {entry.fromScore ?? "—"} → {entry.toScore ?? "—"}
                </span>
              </span>
              {entry.fromGrade && entry.toGrade && entry.fromGrade !== entry.toGrade && (
                <span className="font-mono text-[10px] uppercase tracking-widest text-amber">
                  {entry.fromGrade} → {entry.toGrade}
                </span>
              )}
            </div>
            <div className="mt-1 font-mono text-[11px] text-paper-muted">{entry.name ?? "—"}</div>
          </div>
          <div className="text-right">
            <div
              className={`num-display text-xl font-bold ${
                positive ? "text-verified" : "text-critical"
              }`}
            >
              {positive ? "+" : ""}
              {delta}
            </div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-wire">
              {relativeFromNow(entry.occurredAt)}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // failure_event / verified_event
  const isFailure = entry.kind === "failure_event" || entry.severity === "critical";
  const Icon = isFailure ? AlertTriangle : Activity;
  return (
    <Link
      to="/tape/$eventId"
      params={{ eventId: entry.id.replace(/^evt:/, "") }}
      className="block panel-engraved p-4 transition-colors hover:bg-panel/60"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`flex h-8 w-8 items-center justify-center border ${
            isFailure
              ? "border-critical/50 bg-critical/10 text-critical"
              : "border-amber/50 bg-amber/10 text-amber"
          }`}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-mono text-[11px] uppercase tracking-widest text-paper">
              {entry.eventType}
            </span>
            <span className="font-display text-base font-semibold text-paper">
              ${entry.symbol ?? entry.mint.slice(0, 6)}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-wire">
              {entry.severity}
            </span>
          </div>
          <div className="mt-1 font-mono text-[11px] text-paper-muted">
            {entry.name ?? "—"}
            {entry.amountSol != null && entry.amountSol > 0 && (
              <span className="ml-2 text-amber">{entry.amountSol.toFixed(2)} SOL</span>
            )}
          </div>
        </div>
        <div className="text-right font-mono text-[10px] uppercase tracking-widest text-wire">
          {relativeFromNow(entry.occurredAt)}
        </div>
      </div>
    </Link>
  );
}
