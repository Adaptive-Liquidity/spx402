import { lazy, Suspense } from "react";
import { Link } from "@tanstack/react-router";
import { MetricCard } from "@/components/spx/MetricCard";
import { Panel } from "@/components/spx/Panel";
import { PayerDiversityStat } from "@/components/spx/PayerDiversityStat";
import type { Agent } from "@/lib/agents";
import { categoryMeta } from "@/lib/agents/categories";
import type { OutcomeContractMetrics } from "@/lib/outcome-contract.functions";
import type { PayerDiversity } from "@/lib/live-data";
import { dossierFlags } from "./dossier-utils";

// Charting library is heavy and only tokenized agents render a price chart —
// load it on demand instead of shipping it with every dossier visit.
const PriceContextChart = lazy(() => import("@/components/spx/PriceContextChart"));

export function DossierMetricStrip({
  agent,
  outcomeMetrics,
}: {
  agent: Agent;
  outcomeMetrics: OutcomeContractMetrics | null;
}) {
  const cat = categoryMeta(agent.category);
  const flags = dossierFlags(agent);

  // Aggregate counts for non-tokenized metric cards.
  const swapCount = agent.events.filter((e) => e.type === "SWAP_EXECUTED").length;
  const x402Count = agent.events.filter((e) => e.type === "X402_PAYMENT_RECEIVED").length;
  const swapSol = agent.events
    .filter((e) => e.type === "SWAP_EXECUTED")
    .reduce((s, e) => s + (e.amount ?? 0), 0);
  const x402Sol = agent.events
    .filter((e) => e.type === "X402_PAYMENT_RECEIVED")
    .reduce((s, e) => s + (e.amount ?? 0), 0);
  const x402Usdc = agent.events
    .filter((e) => e.type === "X402_PAYMENT_RECEIVED")
    .reduce((s, e) => s + (e.tokenAmount ?? 0), 0);
  const outcomeAwarded = outcomeMetrics?.totalAwarded ?? null;
  const outcomeFulfilled = outcomeMetrics?.totalFulfilled ?? null;
  const outcomeFailed = outcomeMetrics?.totalFailed ?? null;
  const outcomeSlashed = outcomeMetrics?.totalSlashed ?? null;
  const outcomeFulfillmentRate = outcomeMetrics?.fulfillmentRate ?? null;
  const outcomeOnTimePillar =
    agent.score == null || agent.grade === "SPX404"
      ? null
      : (agent.scoreBreakdown.escrowCompletion / 40) * 100;

  return (
    <>
      {/* CATEGORY + CLAIM STRIP */}
      <div className="mt-6 panel-engraved flex flex-wrap items-center justify-between gap-4 px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="label-mono">Category</span>
          <span className="border border-amber/60 bg-amber/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-amber">
            {cat.longLabel}
          </span>
          <span className="font-mono text-[11px] text-wire">{cat.blurb}</span>
        </div>
        {!agent.operatorVerified && (
          <Link
            to="/registry/operators"
            className="focus-ring inline-flex items-center gap-2 border border-amber/70 bg-amber/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-amber hover:bg-amber hover:text-panel-deep"
          >
            Is this your agent? Verify operator → climb the leaderboard
          </Link>
        )}
      </div>

      {/* METRIC CARDS — category aware */}
      {flags.isTokenized ? (
        (() => {
          // Pump.fun fee-buyback model has no explicit DEPOSIT_RECEIVED events,
          // so rate denominators collapse to 0 even when buybacks are firing.
          // Surface "—" instead of a misleading 0.0% in those cases.
          const isFeeModel = agent.totalDepositsCount === 0 && agent.totalBuybacksCount > 0;
          const buybackRateDisplay = isFeeModel
            ? "—"
            : `${(agent.buybackExecutionRate * 100).toFixed(1)}`;
          const burnRateDisplay =
            agent.totalBuybacksCount === 0
              ? "—"
              : `${(agent.burnConfirmationRate * 100).toFixed(1)}`;
          return (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <MetricCard
                label="Total Deposits"
                value={agent.totalDepositsCount.toLocaleString()}
              />
              <MetricCard
                label="Buybacks Confirmed"
                value={agent.totalBuybacksCount.toLocaleString()}
                tone="verified"
              />
              <MetricCard
                label="Burns Confirmed"
                value={agent.totalBurnsCount.toLocaleString()}
                tone="verified"
              />
              <MetricCard
                label="Failed Windows"
                value={agent.failedWindows.toString()}
                tone={agent.failedWindows > 10 ? "critical" : "amber"}
              />
              <MetricCard
                label={isFeeModel ? "Buyback Rate (fee model)" : "Buyback Rate"}
                value={buybackRateDisplay}
                suffix={isFeeModel ? undefined : "%"}
              />
              <MetricCard
                label="Burn Confirm Rate"
                value={burnRateDisplay}
                suffix={agent.totalBuybacksCount === 0 ? undefined : "%"}
              />
            </div>
          );
        })()
      ) : flags.hasAeonPrimitives ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <MetricCard
            label="Escrows Completed"
            value={agent.totalEscrowsCompleted?.toLocaleString() ?? "—"}
            tone="verified"
          />
          <MetricCard
            label="Escrow Success Rate"
            value={`${((agent.escrowSuccessRate ?? 0) * 100).toFixed(1)}%`}
            tone={agent.escrowSuccessRate && agent.escrowSuccessRate >= 0.95 ? "verified" : "amber"}
          />
          <MetricCard
            label="Active Bond (AEON)"
            value={`${(agent.activeBondAmount ?? 0).toLocaleString()}`}
            tone={agent.activeBondAmount && agent.activeBondAmount >= 10000 ? "verified" : "amber"}
          />
          <MetricCard
            label="Total Slashed (AEON)"
            value={`${(agent.totalSlashedUsd ?? 0).toLocaleString()}`}
            tone={agent.totalSlashedUsd && agent.totalSlashedUsd > 0 ? "critical" : "verified"}
          />
          <MetricCard
            label="Failed Windows"
            value={agent.failedWindows.toString()}
            tone={agent.failedWindows > 10 ? "critical" : "amber"}
          />
          <MetricCard
            label="Escrows Failed"
            value={agent.totalEscrowsFailed?.toLocaleString() ?? "—"}
            tone={
              agent.totalEscrowsFailed && agent.totalEscrowsFailed > 0 ? "critical" : "verified"
            }
          />
        </div>
      ) : flags.isTaskExecutor ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <MetricCard
            label="OC Awards"
            value={outcomeAwarded == null ? "—" : outcomeAwarded.toLocaleString()}
            tone={outcomeAwarded != null && outcomeAwarded > 0 ? "verified" : "amber"}
          />
          <MetricCard
            label="OC Fulfilled"
            value={outcomeFulfilled == null ? "—" : outcomeFulfilled.toLocaleString()}
            tone={outcomeFulfilled != null && outcomeFulfilled > 0 ? "verified" : "amber"}
          />
          <MetricCard
            label="Fulfillment Rate"
            value={outcomeFulfillmentRate == null ? "—" : outcomeFulfillmentRate.toFixed(1)}
            suffix={outcomeFulfillmentRate == null ? undefined : "%"}
          />
          <MetricCard
            label="On-time Pillar"
            value={outcomeOnTimePillar == null ? "—" : outcomeOnTimePillar.toFixed(0)}
            suffix={outcomeOnTimePillar == null ? undefined : "%"}
          />
          <MetricCard
            label="OC Failures"
            value={outcomeFailed == null ? "—" : outcomeFailed.toLocaleString()}
            tone={outcomeFailed != null && outcomeFailed > 0 ? "critical" : "verified"}
          />
          <MetricCard
            label="OC Slashes"
            value={outcomeSlashed == null ? "—" : outcomeSlashed.toLocaleString()}
            tone={outcomeSlashed != null && outcomeSlashed > 0 ? "critical" : "verified"}
          />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <MetricCard label="Swaps Executed" value={swapCount.toLocaleString()} tone="verified" />
          <MetricCard label="Swap Volume" value={swapSol.toFixed(3)} suffix="SOL" />
          <MetricCard
            label="x402 Receipts"
            value={x402Count.toLocaleString()}
            tone={x402Count > 0 ? "verified" : "amber"}
          />
          <MetricCard
            label="x402 Revenue"
            value={x402Usdc > 0 ? (x402Usdc / 1_000_000).toFixed(2) : x402Sol.toFixed(3)}
            suffix={x402Usdc > 0 ? "USDC" : "SOL"}
          />
          <MetricCard
            label={flags.isRegistered ? "MPL Registered" : "Identity"}
            value={flags.isRegistered ? "YES" : agent.operatorVerified ? "VERIFIED" : "—"}
            tone={flags.isRegistered || agent.operatorVerified ? "verified" : "amber"}
          />
          <MetricCard
            label="Failed Windows"
            value={agent.failedWindows.toString()}
            tone={agent.failedWindows > 10 ? "critical" : "amber"}
          />
        </div>
      )}
    </>
  );
}

export function DossierPriceContext({ agent }: { agent: Agent }) {
  const flags = dossierFlags(agent);
  if (!flags.isTokenized || agent.priceSeries.length === 0) return null;
  return (
    <Panel
      className="mt-6"
      eyebrow="Price context"
      title="Market data shown for context only"
      right={
        <span className="font-mono text-[10px] uppercase tracking-widest text-wire">
          Excluded from Transparency Score
        </span>
      }
    >
      <Suspense fallback={<div className="h-64 animate-pulse bg-panel/40" />}>
        <PriceContextChart data={agent.priceSeries} />
      </Suspense>
    </Panel>
  );
}

export function DossierDemand({ diversity }: { diversity: PayerDiversity }) {
  if (diversity.uniquePayers <= 0) return null;
  return (
    <Panel className="mt-6" eyebrow="Demand" title="Who is paying">
      <PayerDiversityStat diversity={diversity} />
    </Panel>
  );
}
