// Attester gas-reserve watchdog.
//
// The EAS attester key pays its own microscopic Base ETH gas to stamp
// attestations. If it runs dry, badge minting stalls silently — so this sweep
// reads the balance and raises an operator alert before that can happen.

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { checkCronAuth } from "@/lib/indexer/auth.server";
import { checkAttesterBalance } from "@/lib/eas.server";

export const Route = createFileRoute("/api/public/cron-attester-health")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const started = Date.now();
        if (!(await checkCronAuth(request))) {
          return new Response("unauthorized", { status: 401 });
        }

        let balance;
        try {
          balance = await checkAttesterBalance();
        } catch (e) {
          await heartbeat(
            false,
            Date.now() - started,
            `balance read failed: ${String(e).slice(0, 120)}`,
          );
          return Response.json({ ok: false, error: "balance read failed" }, { status: 200 });
        }

        if (!balance.configured) {
          await heartbeat(true, Date.now() - started, "attester not configured");
          return Response.json({ ok: true, configured: false });
        }

        if (balance.low) {
          // Surface it on the pipeline heartbeat AND as an alert-worthy event.
          await supabaseAdmin.from("indexer_runs").insert({
            worker: "attester-health",
            ok: false,
            duration_ms: Date.now() - started,
            notes: `LOW GAS: attester ${balance.address} holds ${balance.balanceEth} ETH on Base — top up to keep badge attestations minting`,
          });
          return Response.json({
            ok: true,
            configured: true,
            low: true,
            address: balance.address,
            balanceEth: balance.balanceEth,
          });
        }

        // Independent retry for skipped badge_activated stamps. Runs here
        // (not in scoring) because it is decoupled from grades: retries use
        // freshly-read agent state. Skipped entirely while gas is low.
        let retried = { processed: 0, minted: 0, rescheduled: 0 };
        try {
          const { processDueActivationRetries } = await import("@/lib/badge-attestation-queue");
          const { supabaseActivationQueueStore } =
            await import("@/lib/badge-attestation-queue.server");
          const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
          const { attestSubject } = await import("@/lib/eas.server");
          retried = await processDueActivationRetries({
            store: supabaseActivationQueueStore,
            readAgent: async (mint: string) => {
              const { data, error } = await admin
                .from("agents")
                .select("grade, score, withheld_reason")
                .eq("mint", mint)
                .maybeSingle();
              if (error || !data) return null;
              const row = data as unknown as {
                grade: string | null;
                score: number | null;
                withheld_reason: string | null;
              };
              return {
                grade: row.grade ?? null,
                score: row.score ?? null,
                withheldReason: row.withheld_reason ?? null,
              };
            },
            attest: async (mint: string, grade: string, score: number) => {
              try {
                const res = await attestSubject(mint, "badge_activated", grade, score);
                return res.ok
                  ? { ok: true as const }
                  : { ok: false as const, error: res.reason ?? "attest not ok" };
              } catch (e) {
                return { ok: false as const, error: String(e).slice(0, 200) };
              }
            },
          });
        } catch (e) {
          console.error(
            "[attester-health] activation retry sweep failed:",
            String(e).slice(0, 200),
          );
        }

        await heartbeat(
          true,
          Date.now() - started,
          `attester ok: ${balance.balanceEth} ETH; activation retries minted=${retried.minted} rescheduled=${retried.rescheduled}`,
        );
        return Response.json({
          ok: true,
          configured: true,
          low: false,
          address: balance.address,
          balanceEth: balance.balanceEth,
          activationRetries: retried,
        });
      },
    },
  },
});

async function heartbeat(ok: boolean, durationMs: number, notes: string) {
  try {
    await supabaseAdmin.from("indexer_runs").insert({
      worker: "attester-health",
      ok,
      duration_ms: durationMs,
      notes,
    });
  } catch {
    /* */
  }
}
