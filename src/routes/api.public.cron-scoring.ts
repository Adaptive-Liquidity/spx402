// Scoring worker. Recompute every agent's score from agent_events counters.
// Call this on a cron (every 5 min). No external auth required because we
// only read public data and update agents derived columns; protected by
// the CRON_SECRET shared secret on the request.

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { scorePublication } from "@/lib/indexer/scoring.server";
import { checkCronAuth } from "@/lib/indexer/auth.server";
import { computeRiskScore, RISK_SCORE_MODEL_VERSION } from "@/lib/scoring/risk-score";
import { computeConfidence, CONFIDENCE_MODEL_VERSION } from "@/lib/scoring/confidence";
import { isLiveCategory, type AgentCategory } from "@/lib/agents/categories";
import { aggregateOutcomeContractCounters } from "@/lib/indexer/oc-evidence.server";

// Wave 2 — Failure-decoder coverage by category. Reflects which negative-event
// decoders are actually shipped today. Update this map as new decoders land
// (it directly drives the confidence number, so honesty matters).
const FAILURE_DECODER_COVERAGE: Record<AgentCategory, number> = {
  tokenized_buyback: 1.0, // FAILED_BUYBACK_WINDOW + PROMISED_BUYBACK_NOT_SETTLED shipped
  registered_agent: 0.3, // partial — config/operator change decoders pending
  x402_executor: 0.6, // X402_PAYMENT_REVERTED shipped, refund-decoder pending
  copy_trader: 0,
  task_executor: 0,
  general: 0,
};

// Bucketed identity strength per category. Verified registry membership
// gives the strongest anchor; passive observation the weakest.
function identityStrength(category: AgentCategory, operatorVerified: boolean): number {
  if (category === "registered_agent") return 1.0;
  if (operatorVerified) return 0.85;
  if (category === "tokenized_buyback") return 0.7;
  if (category === "x402_executor") return 0.5;
  return 0.3;
}

// Map the 0..1 numeric confidence to the legacy categorical column so older
// surfaces keep rendering.
function confidenceLabel(score: number): "high" | "medium" | "low" {
  return score >= 0.66 ? "high" : score >= 0.33 ? "medium" : "low";
}

export const Route = createFileRoute("/api/public/cron-scoring")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const started = Date.now();
        if (!checkCronAuth(request)) {
          return new Response("unauthorized", { status: 401 });
        }

        const { data: agents } = await supabaseAdmin
          .from("agents")
          .select(
            "mint, operator_verified, name, tagline, category, identifier_kind, executor_wallet, core_asset",
          );

        if (!agents || agents.length === 0) {
          await heartbeat("scoring", true, Date.now() - started, "no agents");
          return Response.json({ ok: true, scored: 0 });
        }

        let scored = 0;
        for (const a of agents) {
          const counters = await aggregateCounters(a.mint);
          const category =
            (a.category as
              | "tokenized_buyback"
              | "registered_agent"
              | "x402_executor"
              | "copy_trader"
              | "task_executor"
              | "general"
              | null) ?? "tokenized_buyback";
          // For registered agents, the AgentIdentity PDA was confirmed at
          // verify-time; we treat presence in the agents table with the
          // registered_agent category as standing proof until a re-check
          // worker invalidates it.
          const registryProof = category === "registered_agent";
          const result = computeRiskScore({
            ...counters,
            category,
            operatorVerified: a.operator_verified ?? false,
            hasMetadata: Boolean(a.name && a.tagline),
            totalBuybackSol: counters.totalBuybackSol,
            registryProof,
            totalSwapCount: counters.totalSwapCount,
            totalSwapSol: counters.totalSwapSol,
            totalX402Count: counters.totalX402Count,
            totalX402Sol: counters.totalX402Sol,
            totalX402Usdc: counters.totalX402Usdc,
            totalOutcomeOpened: counters.totalOutcomeOpened,
            totalOutcomeAwarded: counters.totalOutcomeAwarded,
            totalOutcomeFulfilled: counters.totalOutcomeFulfilled,
            totalOutcomeFailed: counters.totalOutcomeFailed,
            totalOutcomeSlashed: counters.totalOutcomeSlashed,
            outcomeFulfillmentRate: counters.outcomeFulfillmentRate,
            outcomeAwardDensity: counters.outcomeAwardDensity,
            outcomeOnTimeRate: counters.outcomeOnTimeRate ?? undefined,
            hasPublicCapsule: counters.hasPublicCapsule,
            outcomeEvidenceComplete: counters.outcomeEvidenceComplete,
          });
          // Wave 2 — independent confidence calculation. Counts ONLY evidence
          // signals; never reads the score back. The UI uses confidence_score
          // to decide outlined vs filled grade badges.
          const successCount =
            counters.totalBuybacksCount +
            counters.totalBurnsCount +
            counters.totalSwapCount +
            counters.totalX402Count +
            counters.totalOutcomeFulfilled;
          const failureCount =
            counters.failedWindows +
            counters.failedNegativeCount +
            counters.totalOutcomeFailed +
            counters.totalOutcomeSlashed;
          const totalEvents =
            counters.totalDepositsCount +
            counters.totalOutcomeOpened +
            counters.totalOutcomeAwarded +
            successCount +
            failureCount;
          const conf = computeConfidence({
            category,
            totalEvents,
            successEvents: successCount,
            failureEvents: failureCount,
            distinctEventTypes: counters.distinctEventTypes,
            observationWindowSeconds: counters.observationWindowSeconds,
            lastEventSeconds: counters.lastIndexedSeconds,
            failureDecoderCoverage: FAILURE_DECODER_COVERAGE[category] ?? 0,
            identityResolutionStrength: identityStrength(category, a.operator_verified ?? false),
            unresolvedAnomalies: counters.failedNegativeCount,
          });
          const publication = scorePublication(category, result, isLiveCategory(category));
          const { error } = await supabaseAdmin
            .from("agents")
            .update({
              score: publication.score,
              grade: publication.grade,
              verdict: publication.verdict,
              confidence: confidenceLabel(conf.score),
              confidence_score: conf.score,
              confidence_breakdown: conf.breakdown as unknown as never,
              methodology_version: RISK_SCORE_MODEL_VERSION,
              confidence_model_version: CONFIDENCE_MODEL_VERSION,
              score_breakdown:
                publication.score == null
                  ? ({} as never)
                  : (publication.breakdown as unknown as never),
              total_deposits_count: counters.totalDepositsCount,
              total_buybacks_count: counters.totalBuybacksCount,
              total_burns_count: counters.totalBurnsCount,
              total_deposited_sol: counters.totalDepositedSol,
              total_buyback_sol: counters.totalBuybackSol,
              total_burned_tokens: counters.totalBurnedTokens,
              failed_windows: counters.failedWindows,
              buyback_execution_rate: counters.buybackExecutionRate,
              burn_confirmation_rate: counters.burnConfirmationRate,
              last_indexed_seconds: counters.lastIndexedSeconds,
              scored_at: new Date().toISOString(),
            })
            .eq("mint", a.mint);
          if (!error) scored++;
        }

        const duration = Date.now() - started;
        await heartbeat("scoring", true, duration, `scored=${scored}`);
        return Response.json({ ok: true, scored, duration_ms: duration });
      },
    },
  },
});

async function aggregateCounters(mint: string) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [eventResult, { data: latest }, { data: first }] = await Promise.all([
    supabaseAdmin
      .from("agent_events")
      .select("type, severity, amount_sol, amount_token, occurred_at, raw", {
        count: "exact",
      })
      .eq("mint", mint)
      .gte("occurred_at", since),
    supabaseAdmin
      .from("agent_events")
      .select("occurred_at")
      .eq("mint", mint)
      .order("occurred_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // First-ever event for this subject — drives the observation_window
    // confidence factor. Cheap with the (mint, occurred_at) index.
    supabaseAdmin
      .from("agent_events")
      .select("occurred_at")
      .eq("mint", mint)
      .order("occurred_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const rows = eventResult.data ?? [];
  const outcomeEvidenceComplete = eventResult.count === rows.length;
  const deposits = rows.filter((r) => r.type === "DEPOSIT_RECEIVED");
  const buybacks = rows.filter((r) => r.type === "BUYBACK_EXECUTED");
  const burns = rows.filter((r) => r.type === "BURN_CONFIRMED");
  const swaps = rows.filter((r) => r.type === "SWAP_EXECUTED");
  const x402 = rows.filter((r) => r.type === "X402_PAYMENT_RECEIVED");
  const outcome = aggregateOutcomeContractCounters(rows);
  const totalDepositsCount = deposits.length;
  const totalBuybacksCount = buybacks.length;
  const totalBurnsCount = burns.length;
  // Legacy: only the original FAILED_WINDOW + ANOMALY counters feed the
  // risk-score branch. The Wave 1b negative-event taxonomy is summed
  // separately below so confidence can grow without inflating risk twice.
  const failedWindows = rows.filter(
    (r) => r.type === "FAILED_WINDOW" || r.type === "ANOMALY_DETECTED",
  ).length;
  const failedNegativeCount = rows.filter((r) =>
    [
      "FAILED_BUYBACK_WINDOW",
      "PROMISED_BUYBACK_NOT_SETTLED",
      "X402_PAYMENT_REVERTED",
      "WINDOW_MISSED",
    ].includes(r.type),
  ).length;

  const totalDepositedSol = deposits.reduce((acc, r) => acc + Number(r.amount_sol ?? 0), 0);
  const totalBuybackSol = buybacks.reduce((acc, r) => acc + Number(r.amount_sol ?? 0), 0);
  const totalBurnedTokens = burns.reduce((acc, r) => acc + Number(r.amount_token ?? 0), 0);

  // Generalized swap counters (used for executor categories).
  const totalSwapCount = swaps.length;
  const totalSwapSol = swaps.reduce((acc, r) => acc + Number(r.amount_sol ?? 0), 0);

  // x402 receipt counters. amount_token holds USDC raw units when the
  // receipt was USDC-denominated (see decode-x402.server.ts).
  const totalX402Count = x402.length;
  const totalX402Sol = x402.reduce((acc, r) => acc + Number(r.amount_sol ?? 0), 0);
  const totalX402Usdc = x402.reduce((acc, r) => acc + Number(r.amount_token ?? 0), 0);

  const buybackExecutionRate =
    totalDepositsCount === 0 ? 0 : Math.min(1, totalBuybacksCount / totalDepositsCount);
  const burnConfirmationRate =
    totalBuybacksCount === 0 ? 0 : Math.min(1, totalBurnsCount / totalBuybacksCount);

  const lastIso = latest?.occurred_at ?? null;
  const lastIndexedSeconds = lastIso
    ? Math.max(0, Math.floor((Date.now() - new Date(lastIso).getTime()) / 1000))
    : 60 * 60 * 24 * 30;

  // Distinct event types observed in window — drives parser_coverage.
  const distinctEventTypes = new Set(rows.map((r) => r.type)).size;

  // Observation window: seconds since the very first event for this subject.
  const firstIso = first?.occurred_at ?? null;
  const observationWindowSeconds = firstIso
    ? Math.max(0, Math.floor((Date.now() - new Date(firstIso).getTime()) / 1000))
    : 0;
  return {
    totalDepositsCount,
    totalBuybacksCount,
    totalBurnsCount,
    totalDepositedSol,
    totalBuybackSol,
    totalBurnedTokens,
    failedWindows,
    buybackExecutionRate,
    burnConfirmationRate,
    lastIndexedSeconds,
    totalSwapCount,
    totalSwapSol,
    totalX402Count,
    totalX402Sol,
    totalX402Usdc,
    failedNegativeCount,
    distinctEventTypes,
    observationWindowSeconds,
    ...outcome,
    outcomeEvidenceComplete,
  };
}

async function heartbeat(worker: string, ok: boolean, durationMs: number, notes: string) {
  try {
    await supabaseAdmin.from("indexer_runs").insert({
      worker,
      ok,
      duration_ms: durationMs,
      notes,
    });
  } catch {
    /* */
  }
}
