// Wave 1a — canonical execution tape.
//
// Paginated, filterable view of every event the indexer has produced.
// This is the public ledger that grades, attestations, and (later)
// bonds must reconcile against.

import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { fetchTape, relativeFromNow, type TapeRow } from "@/lib/live-data";
import { CATEGORIES, categoryLabel } from "@/lib/agents/categories";
import { useState, useEffect } from "react";

const SEVERITIES: Array<{ id: string | null; label: string }> = [
  { id: null, label: "All" },
  { id: "success", label: "Success" },
  { id: "info", label: "Info" },
  { id: "warn", label: "Warn" },
  { id: "critical", label: "Critical" },
];

export const Route = createFileRoute("/tape")({
  head: () => ({
    meta: [
      { title: "Execution Tape — SPX402" },
      {
        name: "description",
        content:
          "The canonical evidence ledger for every Solana agent SPX402 indexes. Every row is a permalinked piece of execution evidence.",
      },
      { property: "og:title", content: "SPX402 Execution Tape" },
      {
        property: "og:description",
        content:
          "The canonical on-chain evidence ledger for Solana agents. Every grade is explainable from the tape.",
      },
    ],
  }),
  loader: () => fetchTape({ limit: 200 }),
  staleTime: 15_000,
  component: TapePage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="label-amber">Tape error</div>
        <p className="mt-3 text-paper-muted">{error.message}</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 border border-amber/80 bg-amber/10 px-5 py-3 font-mono text-xs uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep"
        >
          Retry
        </button>
      </div>
    );
  },
});

function severityTone(sev: string): string {
  if (sev === "success") return "text-verified";
  if (sev === "critical") return "text-critical";
  if (sev === "warn") return "text-amber";
  return "text-paper-muted";
}

function TapePage() {
  const initial = Route.useLoaderData() as TapeRow[];
  const [rows, setRows] = useState<TapeRow[]>(initial);
  const [category, setCategory] = useState<string | null>(null);
  const [severity, setSeverity] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const fresh = await fetchTape({
        limit: 200,
        category,
        severity,
      });
      if (!cancelled) {
        setRows(fresh);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [category, severity]);

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-12 lg:px-8 lg:py-16">
      <div className="label-amber">Execution Tape</div>
      <h1 className="mt-3 font-display text-4xl font-bold text-paper sm:text-5xl">
        Every grade is explainable from the tape.
      </h1>
      <p className="mt-4 max-w-2xl text-paper-muted">
        Canonical evidence ledger. Every row is a permalinked on-chain event the indexer observed.
        SPX402 only rates what the chain can prove — this is the proof.
      </p>

      {/* Filters */}
      <div className="mt-10 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-widest text-wire">
            Category:
          </span>
          <button
            onClick={() => setCategory(null)}
            className={`border px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest transition-colors ${
              category === null
                ? "border-amber bg-amber/10 text-amber"
                : "border-bronze/60 text-paper-muted hover:border-amber hover:text-amber"
            }`}
          >
            All
          </button>
          {CATEGORIES.filter((c) => c.decoderLive).map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`border px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest transition-colors ${
                category === c.id
                  ? "border-amber bg-amber/10 text-amber"
                  : "border-bronze/60 text-paper-muted hover:border-amber hover:text-amber"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-widest text-wire">
            Severity:
          </span>
          {SEVERITIES.map((s) => (
            <button
              key={s.label}
              onClick={() => setSeverity(s.id)}
              className={`border px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest transition-colors ${
                severity === s.id
                  ? "border-amber bg-amber/10 text-amber"
                  : "border-bronze/60 text-paper-muted hover:border-amber hover:text-amber"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="mt-8 overflow-hidden border border-bronze/40">
        <div className="grid grid-cols-12 gap-2 border-b border-bronze/40 bg-panel-deep px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-wire">
          <div className="col-span-3">Type</div>
          <div className="col-span-3">Subject</div>
          <div className="col-span-2 hidden sm:block">Category</div>
          <div className="col-span-2 hidden sm:block">Amount</div>
          <div className="col-span-9 sm:col-span-2 text-right">When</div>
        </div>
        {loading ? (
          <div className="px-4 py-12 text-center font-mono text-xs text-paper-muted">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-12 text-center font-mono text-xs text-paper-muted">
            No events match these filters.
          </div>
        ) : (
          <ul>
            {rows.map((r, i) => (
              <li key={r.id} className={`${i % 2 ? "bg-panel" : "bg-background"}`}>
                <Link
                  to="/tape/$eventId"
                  params={{ eventId: r.id }}
                  className="grid grid-cols-12 items-center gap-2 px-4 py-3 font-mono text-xs hover:bg-panel-deep"
                >
                  <div className={`col-span-3 truncate ${severityTone(r.severity)}`}>{r.type}</div>
                  <div className="col-span-3 truncate text-paper">
                    {r.agentSymbol
                      ? `$${r.agentSymbol}`
                      : `${r.mint.slice(0, 4)}…${r.mint.slice(-4)}`}
                  </div>
                  <div className="col-span-2 hidden text-paper-muted sm:block">
                    {categoryLabel(r.agentCategory)}
                  </div>
                  <div className="col-span-2 hidden text-paper-muted sm:block">
                    {r.amountSol > 0 ? `${r.amountSol.toFixed(2)} SOL` : "—"}
                  </div>
                  <div className="col-span-9 text-right text-wire sm:col-span-2">
                    {relativeFromNow(r.occurredAt)}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-6 font-mono text-[11px] text-wire">
        Showing the most recent {rows.length} events. Pagination ships next wave.
      </p>
    </div>
  );
}
