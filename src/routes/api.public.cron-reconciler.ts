// Reconciler. Walks the last 24h of events for each agent, asserts every
// buyback was followed by a burn within tolerance, and emits FAILED_WINDOW
// events when not. Also writes a heartbeat to indexer_runs so the status
// page can show health.

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { checkCronAuth } from "@/lib/indexer/auth.server";

const TOLERANCE_MS = 15 * 60 * 1000; // burn must follow buyback within 15 min

export const Route = createFileRoute("/api/public/cron-reconciler")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const started = Date.now();
        if (!checkCronAuth(request)) {
          return new Response("unauthorized", { status: 401 });
        }

        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: agents } = await supabaseAdmin
          .from("agents")
          .select("mint");

        let flagged = 0;
        for (const a of agents ?? []) {
          const { data: events } = await supabaseAdmin
            .from("agent_events")
            .select("id, type, signature, occurred_at")
            .eq("mint", a.mint)
            .in("type", ["BUYBACK_EXECUTED", "BURN_CONFIRMED", "FAILED_WINDOW"])
            .gte("occurred_at", since)
            .order("occurred_at", { ascending: true });

          const buybacks = (events ?? []).filter((e) => e.type === "BUYBACK_EXECUTED");
          const burns = (events ?? []).filter((e) => e.type === "BURN_CONFIRMED");
          const failed = new Set(
            (events ?? [])
              .filter((e) => e.type === "FAILED_WINDOW")
              .map((e) => e.signature),
          );

          for (const b of buybacks) {
            if (failed.has(b.signature)) continue;
            const bTime = new Date(b.occurred_at).getTime();
            const matched = burns.find((br) => {
              const t = new Date(br.occurred_at).getTime();
              return t >= bTime && t - bTime <= TOLERANCE_MS;
            });
            if (!matched) {
              await supabaseAdmin
                .from("agent_events")
                .upsert(
                  {
                    mint: a.mint,
                    type: "FAILED_WINDOW",
                    severity: "critical",
                    signature: `failwin-${b.signature}`,
                    occurred_at: new Date(bTime + TOLERANCE_MS).toISOString(),
                    amount_sol: 0,
                    amount_token: 0,
                    raw: { sourceSignature: b.signature, reason: "no_burn_in_tolerance" },
                  },
                  { onConflict: "signature", ignoreDuplicates: true },
                );
              flagged++;
            }
          }
        }

        const duration = Date.now() - started;
        await heartbeat("reconciler", true, duration, `flagged=${flagged}`);
        return Response.json({ ok: true, flagged, duration_ms: duration });
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
    /* */
  }
}
