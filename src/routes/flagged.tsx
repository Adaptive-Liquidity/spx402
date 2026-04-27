import { createFileRoute, Link } from "@tanstack/react-router";
import { AgentRow } from "@/components/spx/AgentRow";
import { fetchAllAgents } from "@/lib/agents-db";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/flagged")({
  head: () => ({
    meta: [
      { title: "Flagged Agents — SPX402" },
      {
        name: "description",
        content:
          "Public registry of agents flagged by SPX402 for impersonation, rug signals, or other trust violations. Transparent chain of custody.",
      },
      { property: "og:title", content: "Flagged agents — SPX402" },
      {
        property: "og:description",
        content:
          "Trust signaling, on the record. Every flagged agent on SPX402, with the reason it was flagged.",
      },
    ],
  }),
  loader: async () => {
    const all = await fetchAllAgents();
    return all.filter((a) => a.flagged);
  },
  staleTime: 60_000,
  pendingComponent: () => (
    <div className="mx-auto max-w-[1200px] px-4 py-20 text-center font-mono text-xs uppercase tracking-widest text-wire">
      Loading flagged registry…
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-[1200px] px-4 py-20 text-center">
      <div className="label-amber">Registry unavailable</div>
      <p className="mt-3 text-paper-muted">{error.message}</p>
    </div>
  ),
  component: FlaggedPage,
});

function FlaggedPage() {
  const flagged = Route.useLoaderData();

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-12 lg:px-8 lg:py-16">
      <div className="border border-critical/60 bg-critical/10 p-6">
        <div className="flex items-start gap-4">
          <AlertTriangle className="mt-1 h-6 w-6 flex-shrink-0 text-critical" />
          <div>
            <div className="label-amber !text-critical">Trust violation registry</div>
            <h1 className="mt-2 font-display text-4xl font-bold leading-tight text-paper">
              Flagged agents.
            </h1>
            <p className="mt-3 max-w-2xl text-paper-muted">
              Agents listed here have been flagged by SPX402 for impersonation,
              rug signals, deceptive metadata, or other trust violations. They
              do not appear on the leaderboard, the explorer, or the homepage
              tape. Their dossier pages remain accessible at their direct mint
              URL with a permanent warning banner — so the chain of custody
              stays public and auditable.
            </p>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-widest text-wire">
              Disagree with a flag? Email <span className="text-amber">disputes@spx402.com</span> with the mint and on-chain evidence.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-10">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="label-amber">Currently flagged</div>
            <p className="mt-1 text-sm text-paper-muted">
              {flagged.length === 0
                ? "Zero flags currently active. The registry is clean."
                : "Each entry shows the mint, last-known grade, and the reason it was flagged."}
            </p>
          </div>
          <span className="font-mono text-xs uppercase tracking-widest text-wire">
            {flagged.length} flagged
          </span>
        </div>

        <div className="mt-6 space-y-4">
          {flagged.length === 0 ? (
            <div className="border border-dashed border-bronze/60 p-10 text-center font-mono text-sm text-paper-muted">
              No flagged agents in the registry.
              <div className="mt-3">
                <Link to="/leaderboard" className="text-amber underline">
                  Return to leaderboard →
                </Link>
              </div>
            </div>
          ) : (
            flagged.map((a) => (
              <div key={a.mint} className="space-y-2">
                <AgentRow agent={a} />
                {a.flagReason && (
                  <div className="border-l-2 border-critical bg-critical/5 px-4 py-2 font-mono text-xs text-critical">
                    Flag reason: {a.flagReason}
                    {a.flaggedAt && (
                      <span className="ml-3 text-wire">
                        · {new Date(a.flaggedAt).toISOString().slice(0, 10)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
