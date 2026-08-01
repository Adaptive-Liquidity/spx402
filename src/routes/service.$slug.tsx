// Active prober — per-service probe transcript.
//
// One URL per x402 service. Everything the prober did to this endpoint, in
// order, with latency, outcome, and the transaction it paid with. Probe data
// is evidence for readers, not an input to any score.

import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { Panel } from "@/components/spx/Panel";
import { relativeFromNow } from "@/lib/live-data";
import {
  fetchProbeRuns,
  fetchServiceBySlug,
  settleRateSeries,
  type ProbeRunRow,
  type SettleRatePoint,
  type X402ServiceRow,
} from "@/lib/prober-data";
import { outcomeLabel, outcomeTone, PROBE_USER_AGENT } from "@/lib/prober/outcomes";

export const Route = createFileRoute("/service/$slug")({
  head: ({ loaderData }) => {
    const d = loaderData as unknown as { service: X402ServiceRow } | undefined;
    const host = d?.service.url ? safeHost(d.service.url) : "service";
    return {
      meta: [
        { title: `${host} — x402 probe transcript · SPX402` },
        {
          name: "description",
          content: `Active-verification transcript for ${host}: challenge validity, settlement rate, delivery and latency, measured by the SPX402 prober.`,
        },
        { property: "og:title", content: `${host} — x402 probe transcript` },
        {
          property: "og:description",
          content:
            "Every probe SPX402 has run against this x402 service, with outcome, latency and paid transaction.",
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  loader: async ({ params }) => {
    const service = await fetchServiceBySlug(params.slug);
    if (!service) throw notFound();
    const runs = await fetchProbeRuns(service.id, 200);
    return { service, runs, series: settleRateSeries(runs) };
  },
  staleTime: 60_000,
  component: ServicePage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <div className="label-amber">Unknown service</div>
      <p className="mt-3 text-paper-muted">
        No x402 service with that slug is in the SPX402 registry.
      </p>
      <Link
        to="/status"
        className="mt-6 inline-block border border-amber/80 bg-amber/10 px-5 py-3 font-mono text-xs uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep"
      >
        Prober status
      </Link>
    </div>
  ),
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="label-amber">Service error</div>
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

function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function toneClass(outcome: string): string {
  switch (outcomeTone(outcome)) {
    case "verified":
      return "text-verified border-verified/60 bg-verified/10";
    case "critical":
      return "text-critical border-critical/60 bg-critical/10";
    case "amber":
      return "text-amber border-amber/60 bg-amber/10";
    default:
      return "text-paper-muted border-bronze/60 bg-panel-deep";
  }
}

function Sparkline({ series }: { series: SettleRatePoint[] }) {
  const withData = series.filter((p) => p.rate != null);
  if (withData.length === 0) {
    return (
      <div className="font-mono text-xs text-wire">
        No paid probes in the last 30 days — no settle-rate to plot.
      </div>
    );
  }
  return (
    <div className="flex h-16 items-end gap-[2px]">
      {series.map((p) => (
        <div
          key={p.day}
          title={
            p.rate == null
              ? `${p.day}: no probe`
              : `${p.day}: ${(p.rate * 100).toFixed(0)}% (${p.settled}/${p.attempts})`
          }
          className={`w-full ${p.rate == null ? "bg-bronze/25" : p.rate >= 0.9 ? "bg-verified/70" : p.rate >= 0.5 ? "bg-amber/70" : "bg-critical/70"}`}
          style={{ height: `${p.rate == null ? 6 : Math.max(8, p.rate * 100)}%` }}
        />
      ))}
    </div>
  );
}

function ServicePage() {
  const { service, runs, series } = Route.useLoaderData() as {
    service: X402ServiceRow;
    runs: ProbeRunRow[];
    series: SettleRatePoint[];
  };

  const settlementRuns = runs.filter((r) => r.probeKind === "settlement");
  const settled = settlementRuns.filter((r) => r.outcome === "settled").length;
  const challengeRuns = runs.filter((r) => r.probeKind === "challenge");
  const validChallenges = challengeRuns.filter((r) => r.challengeValid).length;

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-12 lg:px-8 lg:py-16">
      <div className="label-amber">x402 service · active verification</div>
      <h1 className="mt-3 break-all font-display text-4xl font-bold text-paper">
        {service.url ? safeHost(service.url) : (service.payTo ?? "unknown service")}
      </h1>
      {service.url && (
        <div className="mt-2 break-all font-mono text-xs text-wire">{service.url}</div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel eyebrow="Registry" title="Service facts">
          <dl className="space-y-2 font-mono text-xs">
            <Row l="Chain" v={service.chain} />
            <Row l="Pay to" v={service.payTo ?? "unknown"} />
            <Row l="Facilitator" v={service.facilitator ?? "unknown"} />
            <Row l="Probe tier" v={service.probeTier} />
            <Row
              l="Advertised price"
              v={
                service.advertisedAmountUsd == null
                  ? "unknown"
                  : `$${service.advertisedAmountUsd.toFixed(6)}`
              }
            />
            <Row l="Discovered via" v={service.discoveredVia} />
            <Row
              l="Last probed"
              v={service.lastProbeAt ? relativeFromNow(service.lastProbeAt) : "never"}
            />
          </dl>
        </Panel>

        <Panel eyebrow="Measured" title="Probe summary">
          <dl className="space-y-2 font-mono text-xs">
            <Row l="Challenge probes" v={String(challengeRuns.length)} />
            <Row
              l="Well-formed challenges"
              v={
                challengeRuns.length === 0
                  ? "no data"
                  : `${validChallenges}/${challengeRuns.length}`
              }
            />
            <Row l="Paid probes" v={String(settlementRuns.length)} />
            <Row
              l="Settled + delivered"
              v={
                settlementRuns.length === 0
                  ? "no data"
                  : `${settled}/${settlementRuns.length}`
              }
            />
            <Row
              l="Total paid"
              v={`$${runs.reduce((s, r) => s + (r.paidAmountUsd ?? 0), 0).toFixed(4)}`}
            />
          </dl>
        </Panel>

        <Panel eyebrow="30 days" title="Settle rate">
          <Sparkline series={series} />
          <p className="mt-3 font-mono text-[11px] text-wire">
            Bars are daily settled/attempted for paid probes. Grey = no probe
            that day. Probe data is not scored.
          </p>
        </Panel>
      </div>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-bold text-paper">Transcript</h2>
        <p className="mt-2 text-sm text-paper-muted">
          Every probe SPX402 has run against this endpoint. The prober always
          identifies itself as{" "}
          <code className="font-mono text-xs text-paper">{PROBE_USER_AGENT}</code>.
        </p>

        {runs.length === 0 ? (
          <div className="mt-6 border border-bronze/50 bg-panel p-6 font-mono text-sm text-paper-muted">
            No probes recorded for this service yet.
          </div>
        ) : (
          <div className="mt-6 overflow-hidden border border-bronze/50">
            {runs.map((r, i) => (
              <div
                key={r.id}
                className={`grid grid-cols-12 items-center gap-3 px-4 py-3 ${i % 2 ? "bg-panel" : "bg-background"}`}
              >
                <div className="col-span-3 font-mono text-[11px] text-wire">
                  {relativeFromNow(r.ranAt)}
                  <div className="text-[10px] uppercase tracking-widest">
                    {r.probeKind}
                  </div>
                </div>
                <div className="col-span-3">
                  <span
                    className={`inline-block border px-2 py-1 font-mono text-[11px] uppercase tracking-widest ${toneClass(r.outcome)}`}
                  >
                    {outcomeLabel(r.outcome)}
                  </span>
                </div>
                <div className="col-span-2 font-mono text-[11px] text-paper-muted">
                  {r.httpStatus ?? "—"}
                  {r.verifyMs != null ? ` · ${r.verifyMs}ms` : ""}
                  {r.settleMs != null ? ` · settle ${r.settleMs}ms` : ""}
                </div>
                <div className="col-span-2 font-mono text-[11px] text-paper-muted">
                  {r.paidAmountUsd ? `$${r.paidAmountUsd.toFixed(6)}` : "free"}
                </div>
                <div className="col-span-2 break-all font-mono text-[10px] text-wire">
                  {r.txSignature ? `${r.txSignature.slice(0, 14)}…` : r.notes ? r.notes.slice(0, 60) : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="mt-10 border border-bronze/50 bg-panel-deep p-5 text-sm text-paper-muted">
        Probe results describe what SPX402 experienced as a paying customer.
        They are published as evidence and are{" "}
        <strong className="text-paper">not part of any score</strong> in this
        release. See{" "}
        <Link to="/methodology" className="text-amber hover:underline">
          methodology → active verification
        </Link>
        .
      </div>
    </div>
  );
}

function Row({ l, v }: { l: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-bronze/30 pb-1.5">
      <dt className="uppercase tracking-widest text-wire">{l}</dt>
      <dd className="break-all text-right text-paper">{v}</dd>
    </div>
  );
}
