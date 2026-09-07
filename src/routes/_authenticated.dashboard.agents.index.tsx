import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { fetchMyRegistrations, type AgentRegistration } from "@/lib/registration/registrations";
import { StatusChip } from "@/components/spx/StatusChip";
import {
  aeonStatusKey,
  operatorStatusKey,
  visibilityStatusKey,
  walletStatusKey,
} from "@/lib/registration/status";

export const Route = createFileRoute("/_authenticated/dashboard/agents/")({
  head: () => ({
    meta: [
      { title: "My Agents — SPX402" },
      {
        name: "description",
        content:
          "Every agent you have registered on SPX402: identity, wallet, income routing, verification and publication readiness.",
      },
    ],
  }),
  component: MyAgents,
});

function MyAgents() {
  const [rows, setRows] = useState<AgentRegistration[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyRegistrations()
      .then(setRows)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <div className="stage section">
      <h1 className="font-display text-3xl font-bold tracking-tight text-paper">My Agents</h1>
      <p className="mt-3 max-w-2xl text-paper-muted">
        Private agents stay private. Nothing here appears in the registry, leaderboard, public API,
        sitemap or Genesis Record until you publish it.
      </p>

      <div className="mt-6">
        <Link
          to="/build/register"
          className="inline-flex border border-amber/80 bg-amber/10 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep"
        >
          Register Agent
        </Link>
      </div>

      {error && (
        <div className="mt-6 border-l-2 border-critical/70 bg-critical/10 px-3 py-2 font-mono text-xs text-critical">
          {error}
        </div>
      )}

      {rows && rows.length === 0 && (
        <div className="mt-8 border border-bronze/40 bg-panel p-8 text-center">
          <p className="font-mono text-sm text-paper-muted">
            No agents registered yet. Registration is where an agent gets its identity, its wallet
            and its first status.
          </p>
        </div>
      )}

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {(rows ?? []).map((r) => (
          <Link
            key={r.id}
            to="/dashboard/agents/$id"
            params={{ id: r.id }}
            className="panel-engraved block p-5 transition-colors hover:bg-panel-deep/60"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-display text-lg font-semibold text-paper">{r.agent_name}</div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-wire">
                  {r.agent_type} · {r.ecosystem}
                </div>
              </div>
              <StatusChip status={visibilityStatusKey(r.visibility_status)} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusChip status={aeonStatusKey(r.aeon_identity_status)} size="xs" />
              <StatusChip status={walletStatusKey(r.spx402_wallet_status)} size="xs" />
              <StatusChip status={operatorStatusKey(r.operator_verification_status)} size="xs" />
              <StatusChip status="unknown" size="xs" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
