// Scoring worker. Recompute every agent's score from agent_events counters.
// Call this on a cron (every 5 min). No external auth required because we
// only read public data and update agents derived columns; protected by
// the CRON_SECRET shared secret on the request.

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { score } from "@/lib/indexer/scoring.server";

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
          .select("mint, operator_verified, name, tagline");

        if (!agents || agents.length === 0) {
          await heartbeat("scoring", true, Date.now() - started, "no agents");
          return Response.json({ ok: true, scored: 0 });
        }

        let scored = 0;
        for (const a of agents) {
          const counters = await aggregateCounters(a.mint);
          const result = score({
            ...counters,
            operatorVerified: a.operator_verified ?? false,
            hasMetadata: Boolean(a.name && a.tagline),
          });
          const { error } = await supabaseAdmin
            .from("agents")
            .update({
              score: result.total,
              grade: result.grade,
              verdict: result.verdict,
              confidence: result.confidence,
              score_breakdown: result.breakdown,
              total_deposits_count: counters.totalDepositsCount,
              total_buybacks_count: counters.totalBuybacksCount,
              total_burns_count: counters.totalBurnsCount,
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

  const [{ data: events }, { data: latest }] = await Promise.all([
    supabaseAdmin
      .from("agent_events")
      .select("type, severity, amount_sol, amount_token, occurred_at")
      .eq("mint", mint)
      .gte("occurred_at", since),
    supabaseAdmin
      .from("agent_events")
      .select("occurred_at")
      .eq("mint", mint)
      .order("occurred_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const rows = events ?? [];
  const totalDepositsCount = rows.filter((r) => r.type === "DEPOSIT_RECEIVED").length;
  const totalBuybacksCount = rows.filter((r) => r.type === "BUYBACK_EXECUTED").length;
  const totalBurnsCount = rows.filter((r) => r.type === "BURN_CONFIRMED").length;
  const failedWindows = rows.filter(
    (r) => r.type === "FAILED_WINDOW" || r.type === "ANOMALY_DETECTED",
  ).length;

  const buybackExecutionRate =
    totalDepositsCount === 0
      ? 0
      : Math.min(1, totalBuybacksCount / totalDepositsCount);
  const burnConfirmationRate =
    totalBuybacksCount === 0
      ? 0
      : Math.min(1, totalBurnsCount / totalBuybacksCount);

  const lastIso = latest?.occurred_at ?? null;
  const lastIndexedSeconds = lastIso
    ? Math.max(0, Math.floor((Date.now() - new Date(lastIso).getTime()) / 1000))
    : 60 * 60 * 24 * 30;

  return {
    totalDepositsCount,
    totalBuybacksCount,
    totalBurnsCount,
    failedWindows,
    buybackExecutionRate,
    burnConfirmationRate,
    lastIndexedSeconds,
  };
}

function checkCronAuth(req: Request): boolean {
  const secret = process.env.HELIUS_WEBHOOK_SECRET; // reused as cron shared-secret
  if (!secret) return false;
  const auth = req.headers.get("authorization") ?? "";
  return auth === secret || auth === `Bearer ${secret}`;
}

async function heartbeat(
  worker: string,
  ok: boolean,
  durationMs: number,
  notes: string,
) {
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
