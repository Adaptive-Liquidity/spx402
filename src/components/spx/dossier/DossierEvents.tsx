import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Activity } from "lucide-react";
import { EmptyState } from "@/components/spx/EmptyState";
import { Panel } from "@/components/spx/Panel";
import type { Agent } from "@/lib/agents";
import { categoryMeta } from "@/lib/agents/categories";
import { CopyButton, dossierFlags, EVENT_ICON, shortMint } from "./dossier-utils";

type FilterKey =
  | "all"
  | "buyback"
  | "burn"
  | "deposit"
  | "anomaly"
  | "config"
  | "swap"
  | "x402"
  | "outcome"
  | "escrow"
  | "bond";

export function DossierTimeline({ agent }: { agent: Agent }) {
  const cat = categoryMeta(agent.category);
  const flags = dossierFlags(agent);

  const [filter, setFilter] = useState<FilterKey>("all");
  const filtered = agent.events.filter((e) => {
    if (filter === "all") return true;
    if (filter === "buyback") return e.type === "BUYBACK_EXECUTED";
    if (filter === "burn") return e.type === "BURN_CONFIRMED";
    if (filter === "deposit") return e.type === "DEPOSIT_RECEIVED";
    if (filter === "anomaly") return e.type === "ANOMALY_DETECTED" || e.type === "FAILED_WINDOW";
    if (filter === "config") return e.type === "CONFIG_CHANGED";
    if (filter === "swap") return e.type === "SWAP_EXECUTED";
    if (filter === "x402") return e.type === "X402_PAYMENT_RECEIVED";
    if (filter === "outcome") return e.type.startsWith("OC_");
    if (filter === "escrow") return e.type.startsWith("ESCROW_");
    if (filter === "bond") return e.type.startsWith("BOND_") || e.type === "RECEIPT_CREATED";
    return true;
  });

  // Category-aware filter chips: only show what's meaningful for the agent type.
  const filterKeys: FilterKey[] = flags.isTokenized
    ? ["all", "buyback", "burn", "deposit", "anomaly", "config"]
    : flags.hasAeonPrimitives
      ? ["all", "escrow", "bond", "anomaly", "config"]
      : flags.isTaskExecutor
        ? ["all", "outcome", "anomaly"]
        : flags.isExecutor || flags.isRegistered
          ? ["all", "swap", "x402", "anomaly"]
          : ["all", "buyback", "burn", "deposit", "swap", "x402", "anomaly", "config"];

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-12">
      <Panel
        className="lg:col-span-8"
        eyebrow="Proof Timeline"
        title="On-chain execution log"
        right={
          <div className="flex flex-wrap gap-1">
            {filterKeys.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`border px-2 py-1 font-mono text-[10px] uppercase tracking-widest ${
                  filter === f
                    ? "border-amber bg-amber/15 text-amber"
                    : "border-bronze/60 text-paper-muted hover:text-paper"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        }
      >
        {filtered.length === 0 ? (
          <EmptyState
            label="Timeline"
            title="No verifiable execution detected"
            body="The agent may be new, inactive, misconfigured, or not routing activity on-chain. SPX402 only rates what it can prove."
          />
        ) : (
          <ol className="relative">
            <div className="absolute bottom-0 left-[15px] top-0 w-px bg-bronze/40" aria-hidden />
            {filtered.map((e) => {
              const Icon = EVENT_ICON[e.type] ?? Activity;
              const color =
                e.severity === "success"
                  ? "text-verified border-verified/60"
                  : e.severity === "warn"
                    ? "text-amber border-amber/60"
                    : e.severity === "critical"
                      ? "text-critical border-critical/60"
                      : "text-paper border-bronze/60";
              return (
                <li key={e.id} className="relative pb-6 pl-12">
                  <div
                    className={`absolute left-0 top-0 flex h-8 w-8 items-center justify-center border bg-background ${color}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-mono text-xs uppercase tracking-widest text-paper">
                      {e.title}
                    </div>
                    <div className="font-mono text-[11px] text-wire">{e.occurredAt}</div>
                  </div>
                  <p className="mt-1.5 text-sm text-paper-muted">{e.description}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-wire">
                    <span>SLOT {e.slot.toLocaleString()}</span>
                    <span>·</span>
                    <span>SIG {e.signature.slice(0, 8)}…</span>
                    <CopyButton value={e.signature} label="sig" />
                    <span>·</span>
                    <span className={e.confidence === "high" ? "text-verified" : "text-amber"}>
                      {e.confidence} confidence
                    </span>
                    {e.facilitatorId ? (
                      <>
                        <span>·</span>
                        <span
                          className="border border-verified/50 px-1.5 py-0.5 text-verified"
                          title="Tier A detection — settled by a registry facilitator"
                        >
                          via {e.facilitatorId}
                        </span>
                      </>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Panel>

      <div className="lg:col-span-4 space-y-6">
        <Panel eyebrow="Anomaly panel" title="Watchlist signals">
          {agent.failedWindows === 0 ? (
            <div className="font-mono text-sm text-paper-muted">
              No critical anomalies detected.
              <div className="mt-2 text-xs text-wire">This is uncommon. Enjoy it quietly.</div>
            </div>
          ) : agent.grade === "SPX BB" || agent.grade === "SPX B" || agent.grade === "SPX D" ? (
            <div className="space-y-3">
              <div className="border-l-2 border-critical pl-3">
                <div className="font-mono text-xs uppercase tracking-widest text-critical">
                  Execution gap
                </div>
                <p className="mt-1 text-sm text-paper-muted">
                  {agent.failedWindows} failed buyback windows observed. The tape has developed a
                  limp.
                </p>
              </div>
              <div className="border-l-2 border-amber pl-3">
                <div className="font-mono text-xs uppercase tracking-widest text-amber">
                  Operator silence
                </div>
                <p className="mt-1 text-sm text-paper-muted">
                  Operator has not signed a verification. SPX402 cannot attest to control.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="border-l-2 border-amber pl-3">
                <div className="font-mono text-xs uppercase tracking-widest text-amber">
                  Minor drift
                </div>
                <p className="mt-1 text-sm text-paper-muted">
                  {agent.failedWindows} failed windows recorded. SPX402 has opened a file.
                </p>
              </div>
            </div>
          )}
        </Panel>

        <Panel eyebrow="Configuration" title="Agent parameters">
          <dl className="space-y-3 font-mono text-xs">
            {flags.isTokenized ? (
              <>
                <div className="flex justify-between border-b border-bronze/30 pb-2">
                  <dt className="text-wire">BUYBACK_BPS</dt>
                  <dd className="text-paper">{agent.buybackBps}</dd>
                </div>
                <div className="flex justify-between border-b border-bronze/30 pb-2">
                  <dt className="text-wire">LAST CONFIG CHANGE</dt>
                  <dd className="text-paper">{agent.configLastChangedLabel}</dd>
                </div>
                <div className="flex justify-between border-b border-bronze/30 pb-2">
                  <dt className="text-wire">LAST BUYBACK</dt>
                  <dd className="text-paper">{agent.lastBuybackLabel}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-wire">LAST BURN</dt>
                  <dd className="text-paper">{agent.lastBurnLabel}</dd>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between border-b border-bronze/30 pb-2">
                  <dt className="text-wire">CHAIN</dt>
                  <dd className="text-paper">{agent.chain}</dd>
                </div>
                <div className="flex justify-between border-b border-bronze/30 pb-2">
                  <dt className="text-wire">CATEGORY</dt>
                  <dd className="text-paper">{cat.label}</dd>
                </div>
                <div className="flex justify-between border-b border-bronze/30 pb-2">
                  <dt className="text-wire">IDENTIFIER KIND</dt>
                  <dd className="text-paper">{agent.identifierKind}</dd>
                </div>
                {agent.executorWallet && (
                  <div className="flex justify-between border-b border-bronze/30 pb-2">
                    <dt className="text-wire">EXECUTOR</dt>
                    <dd className="text-paper">{shortMint(agent.executorWallet)}</dd>
                  </div>
                )}
                {agent.coreAsset && (
                  <div className="flex justify-between border-b border-bronze/30 pb-2">
                    <dt className="text-wire">MPL ASSET</dt>
                    <dd className="text-paper">{shortMint(agent.coreAsset)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-wire">DECODER</dt>
                  <dd className={cat.decoderLive ? "text-verified" : "text-amber"}>
                    {cat.decoderLive ? "LIVE" : "PENDING"}
                  </dd>
                </div>
              </>
            )}
          </dl>
        </Panel>
      </div>
    </div>
  );
}

export function DossierRawLog({ agent }: { agent: Agent }) {
  return (
    <>
      <Panel className="mt-6" eyebrow="Raw transactions" title="Decoded events">
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="border-b border-bronze/50 text-left text-[10px] uppercase tracking-widest text-wire">
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Event</th>
                <th className="px-3 py-2">Asset</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2">Slot</th>
                <th className="px-3 py-2">Signature</th>
                <th className="px-3 py-2">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {agent.events.map((e) => (
                <tr key={e.id} className="border-b border-bronze/20 hover:bg-panel-deep/40">
                  <td className="px-3 py-2.5 text-paper-muted">{e.occurredAt}</td>
                  <td className="px-3 py-2.5 text-paper">{e.title}</td>
                  <td className="px-3 py-2.5 text-paper-muted">{e.asset ?? "—"}</td>
                  <td className="px-3 py-2.5 text-right text-paper">
                    {e.amount ?? e.tokenAmount ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 text-wire">{e.slot.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-amber">{e.signature.slice(0, 12)}…</td>
                  <td
                    className={`px-3 py-2.5 ${e.confidence === "high" ? "text-verified" : e.confidence === "medium" ? "text-amber" : "text-critical"}`}
                  >
                    {e.confidence}
                  </td>
                </tr>
              ))}
              {agent.events.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-paper-muted">
                    No raw events to display.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* DISCLAIMER */}
      <div className="mt-10 border-l-2 border-bronze bg-panel-deep/60 p-5">
        <div className="label-amber">Disclaimer</div>
        <p className="mt-2 text-sm leading-relaxed text-paper-muted">
          SPX402 verifies observable on-chain events. It does not verify off-chain revenue, service
          quality, future buybacks, token value, or operator intent. A high Transparency Score does
          not mean a token is safe, valuable, or suitable to buy. Buybacks may not occur, may occur
          irregularly, or may stop entirely. Read the full{" "}
          <Link to="/about/disclaimer" className="text-amber hover:underline">
            disclaimer
          </Link>
          .
        </p>
      </div>
    </>
  );
}
