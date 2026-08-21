// Wave 1a — event permalink.
// One URL per event. This is the contract that makes every grade,
// attestation, and (later) slash explainable from the tape.

import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { fetchTapeEventWithRaw, relativeFromNow } from "@/lib/live-data";
import { categoryLabel } from "@/lib/agents/categories";

export const Route = createFileRoute("/tape/$eventId")({
  head: ({ loaderData }) => {
    const r = loaderData as unknown as Awaited<ReturnType<typeof fetchTapeEventWithRaw>>;
    const subject = r?.agentSymbol ? `$${r.agentSymbol}` : "agent";
    const title = r ? `${r.type} · ${subject} — SPX402 Tape` : "Event — SPX402 Tape";
    return {
      meta: [
        { title },
        {
          name: "description",
          content:
            "Permalinked SPX402 execution evidence. Every row on the tape is independently verifiable on-chain.",
        },
      ],
    };
  },
  loader: async ({ params }) => {
    const r = await fetchTapeEventWithRaw(params.eventId);
    if (!r) throw notFound();
    return r;
  },
  staleTime: 60_000,
  component: TapeEventPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <div className="label-amber">Not on the tape</div>
      <p className="mt-3 text-paper-muted">
        That event id is not in the SPX402 ledger.
      </p>
      <Link
        to="/tape"
        className="mt-6 inline-block border border-amber/80 bg-amber/10 px-5 py-3 font-mono text-xs uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep"
      >
        Browse the tape
      </Link>
    </div>
  ),
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="label-amber">Event error</div>
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
  if (sev === "success") return "text-verified border-verified/60 bg-verified/10";
  if (sev === "critical") return "text-critical border-critical/60 bg-critical/10";
  if (sev === "warn") return "text-amber border-amber/60 bg-amber/10";
  return "text-paper-muted border-bronze/60 bg-panel-deep";
}

function TapeEventPage() {
  const r = Route.useLoaderData() as NonNullable<
    Awaited<ReturnType<typeof fetchTapeEventWithRaw>>
  >;
  const subject = r.agentSymbol
    ? `$${r.agentSymbol}`
    : `${r.mint.slice(0, 4)}…${r.mint.slice(-4)}`;

  return (
    <div className="mx-auto max-w-[900px] px-4 py-12 lg:px-8 lg:py-16">
      <Link
        to="/tape"
        className="font-mono text-[11px] uppercase tracking-widest text-amber hover:underline"
      >
        ← Tape
      </Link>

      <div className="mt-6 flex items-start justify-between gap-4">
        <div>
          <div className="label-amber">Event</div>
          <h1 className="mt-2 font-display text-3xl font-bold text-paper sm:text-4xl">
            {r.type}
          </h1>
          <p className="mt-3 font-mono text-sm text-paper-muted">
            {r.agentName ?? r.mint} · {categoryLabel(r.agentCategory)}
          </p>
        </div>
        <span
          className={`whitespace-nowrap border px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest ${severityTone(r.severity)}`}
        >
          {r.severity}
        </span>
      </div>

      <div className="mt-10 grid gap-px overflow-hidden border border-bronze/40 bg-bronze/40 sm:grid-cols-2">
        <Field label="Subject" value={subject} mono />
        <Field label="Mint / Identifier" value={r.mint} mono truncate />
        <Field label="Occurred" value={`${relativeFromNow(r.occurredAt)} · ${new Date(r.occurredAt).toISOString()}`} mono />
        <Field label="Slot" value={r.slot != null ? r.slot.toLocaleString() : "—"} mono />
        <Field
          label="Amount (SOL)"
          value={r.amountSol > 0 ? r.amountSol.toFixed(6) : "—"}
          mono
        />
        <Field
          label="Amount (token)"
          value={r.amountToken > 0 ? r.amountToken.toLocaleString() : "—"}
          mono
        />
        <Field label="Parser" value={r.parserVersion} mono />
        <Field label="Signature" value={r.signature} mono truncate />
      </div>

      <div className="mt-8">
        <div className="label-amber">Verify on-chain</div>
        {r.signature.startsWith("oc-") ? (
          <p className="mt-3 font-mono text-xs text-paper-muted">
            This is authenticated Flok Outcome Contract evidence, not a Solana transaction. Verify
            the source envelope and hashes in the raw payload below.
          </p>
        ) : r.signature.startsWith("fbw-") ||
        r.signature.startsWith("pbns-") ||
        r.signature.startsWith("x402rv-") ||
        r.signature.startsWith("failwin-") ? (
          <p className="mt-3 font-mono text-xs text-paper-muted">
            This is a derived event written by the failure reconciler. The
            source signature is in the raw payload below — open it on
            Solscan to inspect the underlying transaction.
          </p>
        ) : (
          <a
            href={`https://solscan.io/tx/${r.signature}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block border border-amber/80 bg-amber/10 px-5 py-3 font-mono text-xs uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep"
          >
            Open on Solscan ↗
          </a>
        )}
      </div>

      <div className="mt-10">
        <div className="label-amber">Raw evidence</div>
        <pre className="mt-3 overflow-x-auto border border-bronze/40 bg-panel-deep p-5 font-mono text-[11px] leading-relaxed text-paper">
          {JSON.stringify(r.raw, null, 2)}
        </pre>
      </div>

      <div className="mt-10 border-t border-bronze/40 pt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
        <Link
          to="/agent/$mint"
          params={{ mint: r.mint }}
          className="font-mono text-[11px] uppercase tracking-widest text-amber hover:underline"
        >
          Open agent dossier →
        </Link>
        {/* Wave 1c — machine-readable evidence record for this event. */}
        <a
          href={`/api/public/evidence/${r.id}`}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-[11px] uppercase tracking-widest text-paper-muted hover:text-amber hover:underline"
        >
          Evidence JSON ↗
        </a>
        <a
          href={`/api/public/agent/${r.mint}/evidence`}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-[11px] uppercase tracking-widest text-paper-muted hover:text-amber hover:underline"
        >
          Subject evidence bundle ↗
        </a>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
  truncate,
}: {
  label: string;
  value: string;
  mono?: boolean;
  truncate?: boolean;
}) {
  return (
    <div className="bg-panel p-4">
      <div className="label-mono">{label}</div>
      <div
        className={`mt-1 ${mono ? "font-mono" : ""} text-sm text-paper ${truncate ? "truncate" : "break-all"}`}
      >
        {value}
      </div>
    </div>
  );
}
