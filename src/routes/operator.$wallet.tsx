import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { fetchOperatorProfile, relativeFromNow, type OperatorAgentSummary } from "@/lib/live-data";
import { AlertTriangle, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/operator/$wallet")({
  head: ({ params }) => ({
    meta: [
      { title: `Operator ${shortWallet(params.wallet)} — SPX402` },
      {
        name: "description",
        content: `Operator profile for ${params.wallet}. Multi-agent execution history, aggregate trust signals, and on-chain accountability.`,
      },
      {
        property: "og:title",
        content: `Operator ${shortWallet(params.wallet)} — SPX402`,
      },
      {
        property: "og:description",
        content: "Multi-agent operator profile. Aggregate execution. Public accountability.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        property: "og:image",
        content: `https://spx402.com/api/public/og/${params.wallet}.png`,
      },
      {
        name: "twitter:image",
        content: `https://spx402.com/api/public/og/${params.wallet}.png`,
      },
    ],
  }),
  loader: async ({ params }) => {
    const profile = await fetchOperatorProfile(params.wallet);
    if (!profile) throw notFound();
    return profile;
  },
  staleTime: 30_000,
  pendingComponent: () => (
    <div className="mx-auto max-w-[1200px] px-4 py-20 text-center font-mono text-xs uppercase tracking-widest text-wire">
      Loading operator…
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-[1200px] px-4 py-20 text-center">
      <div className="label-amber">Operator not found</div>
      <p className="mt-3 text-paper-muted">No verified operator wallet matches that address yet.</p>
      <Link to="/explore" className="mt-6 inline-block text-amber underline">
        Browse all agents →
      </Link>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-[1200px] px-4 py-20 text-center">
      <div className="label-amber">Operator unavailable</div>
      <p className="mt-3 text-paper-muted">{error.message}</p>
    </div>
  ),
  component: OperatorProfilePage,
});

function shortWallet(w: string) {
  return w.length > 12 ? `${w.slice(0, 4)}…${w.slice(-4)}` : w;
}

function OperatorProfilePage() {
  const profile = Route.useLoaderData() as NonNullable<
    Awaited<ReturnType<typeof fetchOperatorProfile>>
  >;
  const { wallet, agents, aggregate, recentEvents } = profile;

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-12 lg:px-8 lg:py-16">
      <div className="label-amber">Operator</div>
      <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-paper">
        {shortWallet(wallet)}
      </h1>
      <div className="mt-2 font-mono text-[11px] uppercase tracking-widest text-wire break-all">
        {wallet}
      </div>

      {/* AGGREGATE */}
      <section className="mt-10 grid gap-px overflow-hidden border border-bronze/40 bg-bronze/40 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Agents operated" value={String(aggregate.agentCount)} />
        <Stat
          label="Avg score"
          value={aggregate.avgScore == null ? "—" : String(aggregate.avgScore)}
        />
        <Stat label="Avg confidence" value={`${Math.round(aggregate.avgConfidence * 100)}%`} />
        <Stat label="Best grade" value={aggregate.bestGrade ?? "—"} tone="amber" />
        <Stat
          label="Failure events 30d"
          value={String(aggregate.failureEvents)}
          tone={aggregate.failureEvents > 0 ? "critical" : "default"}
        />
        <Stat label="Buyback SOL" value={aggregate.totalBuybackSol.toFixed(2)} tone="amber" />
      </section>

      {aggregate.flaggedCount > 0 && (
        <div className="mt-6 flex items-center gap-3 border border-critical/50 bg-critical/5 p-4 font-mono text-sm text-critical">
          <AlertTriangle className="h-5 w-5" />
          <span>
            {aggregate.flaggedCount} of this operator's agents are currently flagged. Review each
            dossier before trusting downstream.
          </span>
        </div>
      )}

      {/* AGENTS LIST */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-bold text-paper">Agents under this operator</h2>
        <div className="mt-6 space-y-2">
          {agents.map((a) => (
            <OperatorAgentCard key={a.mint} agent={a} />
          ))}
        </div>
      </section>

      {/* RECENT EVENTS */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-bold text-paper">Recent execution</h2>
        <p className="mt-2 max-w-2xl text-paper-muted">
          Last 30 events across all agents operated by this wallet.
        </p>
        <div className="mt-6 panel-engraved overflow-hidden">
          {recentEvents.length === 0 ? (
            <div className="p-8 text-center font-mono text-sm text-paper-muted">
              No events recorded in the last 30 days.
            </div>
          ) : (
            <ul className="divide-y divide-bronze/30">
              {recentEvents.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                  <span
                    className={`font-mono text-[10px] uppercase tracking-widest ${
                      e.severity === "critical" || e.severity === "warning"
                        ? "text-critical"
                        : e.severity === "success"
                          ? "text-verified"
                          : "text-wire"
                    }`}
                  >
                    {e.severity}
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-widest text-paper">
                    {e.type}
                  </span>
                  <Link
                    to="/agent/$mint"
                    params={{ mint: e.mint }}
                    className="font-mono text-[11px] text-amber hover:underline"
                  >
                    {shortWallet(e.mint)}
                  </Link>
                  {e.amountSol > 0 && (
                    <span className="font-mono text-[11px] text-paper-muted">
                      {e.amountSol.toFixed(3)} SOL
                    </span>
                  )}
                  <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-wire">
                    {relativeFromNow(e.occurredAt)}
                  </span>
                  <Link
                    to="/tape/$eventId"
                    params={{ eventId: e.id }}
                    className="font-mono text-[10px] uppercase tracking-widest text-amber hover:underline"
                  >
                    evidence ↗
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "amber" | "critical";
}) {
  const toneCls =
    tone === "amber" ? "text-amber" : tone === "critical" ? "text-critical" : "text-paper";
  return (
    <div className="bg-panel p-5">
      <div className="font-mono text-[10px] uppercase tracking-widest text-wire">{label}</div>
      <div className={`mt-2 num-display text-2xl font-bold ${toneCls}`}>{value}</div>
    </div>
  );
}

function OperatorAgentCard({ agent }: { agent: OperatorAgentSummary }) {
  return (
    <Link
      to="/agent/$mint"
      params={{ mint: agent.mint }}
      className="flex flex-wrap items-center gap-4 panel-engraved p-4 transition-colors hover:bg-panel/60"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-lg font-bold text-paper">${agent.symbol}</span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-wire">
            {agent.grade}
          </span>
          {agent.flagged && (
            <span className="font-mono text-[10px] uppercase tracking-widest text-critical">
              flagged
            </span>
          )}
        </div>
        <div className="mt-1 truncate font-mono text-[11px] text-paper-muted">{agent.name}</div>
      </div>
      <div className="text-right">
        <div className="num-display text-xl font-bold text-paper">{agent.score ?? "—"}</div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-wire">
          conf {Math.round(agent.confidenceScore * 100)}%
        </div>
      </div>
      <div className="text-right">
        <div className="num-display text-base text-amber">
          {agent.totalBuybackSol.toFixed(2)} SOL
        </div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-wire">
          {agent.totalBuybacksCount} buybacks · {agent.failedWindows} failed
        </div>
      </div>
      <ExternalLink className="h-4 w-4 text-wire" />
    </Link>
  );
}
