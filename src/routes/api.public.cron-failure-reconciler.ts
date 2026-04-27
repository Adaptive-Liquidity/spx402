// Wave 1b — failure reconciler (cron).
//
// Walks the last 24h of events for every tokenized agent and asserts that
// every DEPOSIT_RECEIVED produced a follow-up BUYBACK_EXECUTED inside the
// declared cadence window. If not, emits FAILED_BUYBACK_WINDOW.
//
// This is the eyes-before-the-trigger layer the SPX402 plan calls out as
// the foundation for everything: scoring, attestations, and (later)
// bonding all depend on negative events being detectable. Without this,
// the platform can only ever show successes.
//
// Tolerance: 60 minutes. Conservative for v0 — we'd rather under-flag
// than create false positives. Per-agent declared cadence will replace
// the global tolerance in a follow-up.

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { checkCronAuth } from "@/lib/indexer/auth.server";

const BUYBACK_TOLERANCE_MS = 60 * 60 * 1000; // 60 min from deposit to buyback
const LOOKBACK_MS = 24 * 60 * 60 * 1000;
// Small grace window — we don't want to flag deposits that just happened
// because the buyback might still be on its way.
const SETTLEMENT_GRACE_MS = 10 * 60 * 1000;

export const Route = createFileRoute("/api/public/cron-failure-reconciler")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const startedAt = Date.now();
        if (!checkCronAuth(request)) {
          return new Response("unauthorized", { status: 401 });
        }

        const since = new Date(Date.now() - LOOKBACK_MS).toISOString();

        // Only tokenized buyback agents implicitly promise a buyback per
        // deposit. Registered/x402 agents have different commitments and
        // are reconciled in follow-up workers.
        const { data: agents } = await supabaseAdmin
          .from("agents")
          .select("mint")
          .eq("category", "tokenized_buyback");

        const minSettlementCutoff = Date.now() - SETTLEMENT_GRACE_MS;

        let flagged = 0;
        let agentsScanned = 0;
        for (const a of agents ?? []) {
          agentsScanned++;
          const { data: events } = await supabaseAdmin
            .from("agent_events")
            .select("type, signature, occurred_at, amount_sol")
            .eq("mint", a.mint)
            .in("type", [
              "DEPOSIT_RECEIVED",
              "BUYBACK_EXECUTED",
              "FAILED_BUYBACK_WINDOW",
            ])
            .gte("occurred_at", since)
            .order("occurred_at", { ascending: true });

          const deposits = (events ?? []).filter(
            (e) => e.type === "DEPOSIT_RECEIVED",
          );
          const buybacks = (events ?? []).filter(
            (e) => e.type === "BUYBACK_EXECUTED",
          );
          const alreadyFailed = new Set(
            (events ?? [])
              .filter((e) => e.type === "FAILED_BUYBACK_WINDOW")
              .map((e) => e.signature),
          );

          for (const d of deposits) {
            const dTime = new Date(d.occurred_at).getTime();
            // Skip very recent deposits — buyback may still be in flight.
            if (dTime > minSettlementCutoff) continue;
            const failureSig = `fbw-${d.signature}`;
            if (alreadyFailed.has(failureSig)) continue;

            const matched = buybacks.find((b) => {
              const t = new Date(b.occurred_at).getTime();
              return t >= dTime && t - dTime <= BUYBACK_TOLERANCE_MS;
            });
            if (!matched) {
              const { error: insertErr } = await supabaseAdmin
                .from("agent_events")
                .upsert(
                  {
                    mint: a.mint,
                    type: "FAILED_BUYBACK_WINDOW",
                    severity: "critical",
                    signature: failureSig,
                    occurred_at: new Date(
                      dTime + BUYBACK_TOLERANCE_MS,
                    ).toISOString(),
                    amount_sol: Number(d.amount_sol ?? 0),
                    amount_token: 0,
                    raw: {
                      sourceSignature: d.signature,
                      depositOccurredAt: d.occurred_at,
                      toleranceMs: BUYBACK_TOLERANCE_MS,
                      reason: "no_buyback_in_tolerance",
                    } as never,
                  },
                  { onConflict: "signature", ignoreDuplicates: true },
                );
              if (!insertErr) flagged++;
            }
          }
        }

        const duration = Date.now() - startedAt;
        await heartbeat(
          "failure_reconciler",
          true,
          duration,
          `agents=${agentsScanned} flagged=${flagged}`,
        );
        return Response.json({
          ok: true,
          agentsScanned,
          flagged,
          duration_ms: duration,
        });
      },
    },
  },
});

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
    /* never let heartbeat break the request */
  }
}
