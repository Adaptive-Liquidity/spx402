import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { fetchMyRegistrations, type AgentRegistration } from "@/lib/registration/registrations";
import { StatusChip } from "@/components/spx/StatusChip";
import {
  custodyStatusKey,
  incomeRoutingStatusKey,
  walletStatusKey,
} from "@/lib/registration/status";

export const Route = createFileRoute("/_authenticated/dashboard/wallets")({
  head: () => ({
    meta: [
      { title: "Wallets & Income Routing — SPX402" },
      {
        name: "description",
        content:
          "Where each agent's income goes and who controls it: SPX402 Wallet, income wallet, treasury, custody type and verification status.",
      },
    ],
  }),
  component: WalletsPage,
});

function Addr({ value }: { value: string | null }) {
  return (
    <span className="break-all font-mono text-[11px] text-paper">{value || "—"}</span>
  );
}

function WalletsPage() {
  const [rows, setRows] = useState<AgentRegistration[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyRegistrations()
      .then(setRows)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <div className="stage py-8">
      <h1 className="font-display text-3xl font-bold tracking-tight text-paper">
        Wallets &amp; Income Routing
      </h1>
      <p className="mt-3 max-w-2xl text-paper-muted">
        Income routing controls where agent revenue goes. Wallet changes require owner or admin
        approval and are logged. Private keys are never stored or shown.
      </p>

      {error && (
        <div className="mt-6 border-l-2 border-critical/70 bg-critical/10 px-3 py-2 font-mono text-xs text-critical">
          {error}
        </div>
      )}

      {rows && rows.length === 0 && (
        <div className="mt-8 border border-bronze/40 bg-panel p-8 text-center font-mono text-sm text-paper-muted">
          No wallets to show yet. Register an agent to attach an SPX402 Wallet.
        </div>
      )}

      <div className="mt-8 space-y-4">
        {(rows ?? []).map((r) => (
          <div key={r.id} className="panel-engraved p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="font-display text-lg font-semibold text-paper">{r.agent_name}</div>
              <div className="flex flex-wrap gap-2">
                <StatusChip status={walletStatusKey(r.spx402_wallet_status)} size="xs" />
                <StatusChip status={incomeRoutingStatusKey(r.income_routing_status)} size="xs" />
                <StatusChip status={custodyStatusKey(r.wallet_custody_type)} size="xs" />
              </div>
            </div>
            <dl className="mt-4 grid gap-px overflow-hidden border border-bronze/40 bg-bronze/40 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["Controller wallet", r.controller_wallet],
                ["Executor wallet", r.aeon_executor_wallet],
                ["SPX402 Wallet", r.spx402_wallet_address],
                ["Income wallet", r.income_wallet_address],
                ["Treasury wallet", r.treasury_wallet_address],
                ["Recovery / admin wallet", r.recovery_admin_wallet],
              ].map(([label, value]) => (
                <div key={label as string} className="bg-panel px-4 py-3">
                  <dt className="label-mono">{label}</dt>
                  <dd className="mt-1">
                    <Addr value={value as string | null} />
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-3 flex flex-wrap gap-4 font-mono text-[10px] uppercase tracking-widest text-wire">
              <span>Route all income to treasury · {r.route_all_income_to_treasury ? "Yes" : "No"}</span>
              <span>Change authority · {r.routing_change_authority.replace(/_/g, " ")}</span>
              <span>Updated · {new Date(r.updated_at).toISOString().slice(0, 10)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
