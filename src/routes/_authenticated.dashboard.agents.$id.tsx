import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  fetchRegistration,
  setupChecklist,
  type AgentRegistration,
} from "@/lib/registration/registrations";
import { StatusChip } from "@/components/spx/StatusChip";
import {
  aeonStatusKey,
  custodyStatusKey,
  incomeRoutingStatusKey,
  operatorStatusKey,
  visibilityStatusKey,
  walletStatusKey,
} from "@/lib/registration/status";
import { Check, Minus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/agents/$id")({
  head: () => ({
    meta: [
      { title: "Agent workspace — SPX402" },
      {
        name: "description",
        content:
          "Private workspace for a registered agent: identity, SPX402 Wallet, income routing, verification and publication readiness.",
      },
    ],
  }),
  component: AgentWorkspace,
});

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="bg-panel px-4 py-3">
      <dt className="label-mono">{label}</dt>
      <dd className="mt-1 break-all font-mono text-xs text-paper">{value || "Not provided"}</dd>
    </div>
  );
}

function AgentWorkspace() {
  const { id } = Route.useParams();
  const [reg, setReg] = useState<AgentRegistration | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRegistration(id)
      .then(setReg)
      .catch((e: Error) => setError(e.message));
  }, [id]);

  if (error)
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="border-l-2 border-critical/70 bg-critical/10 px-3 py-2 font-mono text-xs text-critical">
          {error}
        </div>
      </div>
    );

  if (!reg)
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 font-mono text-sm text-wire">Loading…</div>
    );

  const checklist = setupChecklist(reg);

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-8 lg:px-8">
      <Link
        to="/dashboard/agents"
        className="font-mono text-[10px] uppercase tracking-widest text-wire hover:text-amber"
      >
        ← My Agents
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-bold tracking-tight text-paper">
          {reg.agent_name}
        </h1>
        <StatusChip status={visibilityStatusKey(reg.visibility_status)} />
      </div>
      <p className="mt-3 max-w-2xl text-paper-muted">
        {reg.agent_description ||
          "No description provided. This workspace is visible only to you until the agent is published."}
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <StatusChip status={aeonStatusKey(reg.aeon_identity_status)} />
        <StatusChip status={walletStatusKey(reg.spx402_wallet_status)} />
        <StatusChip status={incomeRoutingStatusKey(reg.income_routing_status)} />
        <StatusChip status={operatorStatusKey(reg.operator_verification_status)} />
        <StatusChip status={custodyStatusKey(reg.wallet_custody_type)} />
      </div>

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold text-paper">Setup progress</h2>
        <ul className="mt-4 grid gap-px overflow-hidden border border-bronze/40 bg-bronze/40 sm:grid-cols-2">
          {checklist.map((c) => (
            <li key={c.label} className="flex items-center gap-2 bg-panel px-4 py-3">
              {c.done ? (
                <Check className="h-3.5 w-3.5 text-verified" />
              ) : (
                <Minus className="h-3.5 w-3.5 text-wire" />
              )}
              <span className={c.done ? "text-sm text-paper" : "text-sm text-paper-muted"}>
                {c.label}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold text-paper">Identity and wallets</h2>
        <dl className="mt-4 grid gap-px overflow-hidden border border-bronze/40 bg-bronze/40 sm:grid-cols-2">
          <Row label="AEON CRI / identity" value={reg.aeon_cri} />
          <Row label="AEON executor wallet" value={reg.aeon_executor_wallet} />
          <Row label="Controller wallet" value={reg.controller_wallet} />
          <Row label="Operator signer" value={reg.operator_signer_wallet} />
          <Row label="SPX402 Wallet" value={reg.spx402_wallet_address} />
          <Row label="Income wallet" value={reg.income_wallet_address} />
          <Row label="Treasury wallet" value={reg.treasury_wallet_address} />
          <Row label="Recovery / admin wallet" value={reg.recovery_admin_wallet} />
        </dl>
        <p className="mt-3 font-mono text-[11px] text-wire">
          SPX402 never stores or displays private keys or seed phrases.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold text-paper">Evidence readiness</h2>
        <dl className="mt-4 grid gap-px overflow-hidden border border-bronze/40 bg-bronze/40 sm:grid-cols-2">
          {[
            "Decoded event count",
            "Observation window",
            "Evidence floor status",
            "Trust status",
            "Grade",
            "Attestation",
          ].map((label) => (
            <div key={label} className="bg-panel px-4 py-3">
              <dt className="label-mono">{label}</dt>
              <dd className="mt-1">
                <StatusChip status="unknown" />
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 font-mono text-[11px] text-wire">
          These values appear once the indexer returns them for this subject. SPX402 does not
          estimate them.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold text-paper">Publication readiness</h2>
        <p className="mt-3 text-sm text-paper-muted">
          Publication requires operator verification and an evidence record. Until both exist, this
          agent stays out of the registry, leaderboard, public API, sitemap and Genesis Record.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <StatusChip status={visibilityStatusKey(reg.visibility_status)} />
          <StatusChip status={reg.publication_status === "published" ? "public" : "private"} />
        </div>
      </section>
    </div>
  );
}
