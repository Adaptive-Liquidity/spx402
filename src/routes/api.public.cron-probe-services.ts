// Active Prober cron — the mystery-shopper lane.
//
// Cadence: every 15 minutes.
// Auth:    Authorization: Bearer <CRON_SECRET>
//
// Per run:
//   1. budget check (PROBER_BUDGET_HALT) before anything can spend
//   2. pick due services by tier:
//        address-only : never probed (no endpoint known yet)
//        challenge    : free GET every 6h
//        settlement   : free GET every 6h + paid probe every 24h
//   3. batch caps: 20 challenge probes, 3 settlement probes per run
//   4. NO RETRIES. A failed probe is a datapoint, not an error to paper over.
//
// Hard rules honoured here:
//   - scoring.server.ts is never imported. Probe data is never scored.
//   - every payment is written to probe_run before/with its outcome, so the
//     prober's own spend is reconstructible from the same tables it publishes.

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { checkCronAuth } from "@/lib/indexer/auth.server";
import { budgetState, proberConfig, settlementEnabled } from "@/lib/prober/config.server";
import {
  applyChallengeFacts,
  recordProbe,
  runChallengeProbe,
  runSettlementProbe,
  type ServiceRow,
} from "@/lib/prober/prober.server";
import { PROBER_VERSION, type ProbeOutcome } from "@/lib/prober/outcomes";

const CHALLENGE_INTERVAL_MS = 6 * 60 * 60 * 1000;
const SETTLEMENT_INTERVAL_MS = 24 * 60 * 60 * 1000;
const MAX_CHALLENGE_PROBES = 20;
const MAX_SETTLEMENT_PROBES = 3;

const SERVICE_COLUMNS =
  "id, url, slug, chain, pay_to, facilitator, probe_tier, advertised_amount_usd, active, last_probe_at, last_challenge_probe_at, last_settlement_probe_at";

export const Route = createFileRoute("/api/public/cron-probe-services")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const startedAt = Date.now();
        if (!checkCronAuth(request)) {
          return new Response("unauthorized", { status: 401 });
        }

        const cfg = proberConfig();
        const budget = await budgetState();
        const counts: Record<string, number> = {};
        const bump = (o: ProbeOutcome) => {
          counts[o] = (counts[o] ?? 0) + 1;
        };

        try {
          const { data, error } = await supabaseAdmin
            .from("x402_service")
            .select(SERVICE_COLUMNS)
            .eq("active", true)
            .not("url", "is", null)
            .order("last_probe_at", { ascending: true, nullsFirst: true })
            .limit(200);

          if (error) throw new Error("service query failed");

          const services = (data ?? []) as unknown as ServiceRow[];
          const now = Date.now();
          const due = services.filter((s) => isDue(s.last_challenge_probe_at, now, CHALLENGE_INTERVAL_MS));
          const batch = due.slice(0, MAX_CHALLENGE_PROBES);

          let settlementsRun = 0;
          let spent = 0;
          let drift = 0;
          let gaps = 0;

          for (const service of batch) {
            const { record, result } = await runChallengeProbe(service);
            await recordProbe(record);
            bump(record.outcome);
            if (record.outcome === "config_drift") drift += 1;
            if (result) await applyChallengeFacts(service, result);

            const wantsSettlement =
              result?.outcome === "challenge_valid" &&
              service.probe_tier === "settlement" &&
              settlementsRun < MAX_SETTLEMENT_PROBES &&
              isDue(service.last_settlement_probe_at, now, SETTLEMENT_INTERVAL_MS) &&
              settlementEnabled(service.chain) &&
              !budget.halted;

            if (!wantsSettlement || !result) continue;

            // Re-read the budget between paid probes — no stale allowance.
            const live = await budgetState();
            if (live.halted) {
              break;
            }
            const paid = await runSettlementProbe(service, result, live);
            await recordProbe(paid);
            bump(paid.outcome);
            settlementsRun += 1;
            spent += paid.paidAmountUsd ?? 0;
            if (paid.notes.includes("INDEXER_GAP")) gaps += 1;
          }

          const after = await budgetState();
          const mode = !cfg.enabled
            ? "challenge-only (PROBER_ENABLED=false)"
            : settlementEnabled("solana") || settlementEnabled("base")
              ? "active"
              : "challenge-only (no keys)";

          const notes =
            `${PROBER_VERSION} mode=${mode} services=${services.length} due=${due.length} ` +
            `probed=${batch.length} settlements=${settlementsRun} spent=$${spent.toFixed(4)} ` +
            `budget=$${after.spentTodayUsd.toFixed(4)}/$${after.dailyBudgetUsd}` +
            (after.halted ? " PROBER_BUDGET_HALT" : "") +
            (drift > 0 ? ` config_drift=${drift}` : "") +
            (gaps > 0 ? ` indexer_gaps=${gaps}` : "") +
            ` outcomes=${JSON.stringify(counts)}`;

          const duration = Date.now() - startedAt;
          await heartbeat(true, duration, notes);

          return json(200, {
            ok: true,
            mode,
            services: services.length,
            due: due.length,
            probed: batch.length,
            settlements: settlementsRun,
            outcomes: counts,
            budget: after,
            duration_ms: duration,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "unknown error";
          await heartbeat(false, Date.now() - startedAt, `failed: ${message}`);
          return json(500, { ok: false, error: "probe run failed" });
        }
      },
    },
  },
});

function isDue(last: string | null, now: number, intervalMs: number): boolean {
  if (!last) return true;
  const t = Date.parse(last);
  return Number.isNaN(t) || now - t >= intervalMs;
}

async function heartbeat(ok: boolean, durationMs: number, notes: string) {
  try {
    await supabaseAdmin.from("indexer_runs").insert({
      worker: "prober",
      ok,
      duration_ms: durationMs,
      notes,
    });
  } catch {
    /* heartbeat must never break the request */
  }
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json" },
  });
}
