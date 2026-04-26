// Backfill. For each known agent, fetch the latest enhanced transactions
// from Helius for both the deposit address and the mint, decode them, and
// upsert into agent_events. Catches anything the live webhook missed.

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { fetchAddressTxs } from "@/lib/indexer/helius.server";
import { decodeTx } from "@/lib/indexer/decode.server";

export const Route = createFileRoute("/api/public/cron-backfill")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const started = Date.now();
        if (!checkCronAuth(request)) {
          return new Response("unauthorized", { status: 401 });
        }

        const { data: agents } = await supabaseAdmin
          .from("agents")
          .select("mint, deposit_address");

        const lookup = (agents ?? []).map((r) => ({
          mint: r.mint,
          depositAddress: r.deposit_address ?? null,
        }));

        let totalDecoded = 0;
        let totalInserted = 0;

        for (const a of lookup) {
          const targets = [a.mint, a.depositAddress].filter(
            (x): x is string => Boolean(x),
          );
          for (const addr of targets) {
            const txs = await fetchAddressTxs(addr);
            const events = txs.flatMap((tx) => decodeTx(tx, lookup));
            totalDecoded += events.length;
            if (events.length === 0) continue;
            const rows = events.map((e) => ({
              mint: e.mint,
              type: e.type,
              severity: e.severity,
              signature: e.signature,
              slot: e.slot ?? undefined,
              occurred_at: e.occurredAt,
              amount_sol: e.amountSol,
              amount_token: e.amountToken,
              raw: e.raw,
            }));
            const { data } = await supabaseAdmin
              .from("agent_events")
              .upsert(rows, { onConflict: "signature", ignoreDuplicates: true })
              .select("id");
            totalInserted += data?.length ?? 0;
          }
        }

        const duration = Date.now() - started;
        await heartbeat(
          "backfill",
          true,
          duration,
          `agents=${lookup.length} decoded=${totalDecoded} inserted=${totalInserted}`,
        );

        return Response.json({
          ok: true,
          agents: lookup.length,
          decoded: totalDecoded,
          inserted: totalInserted,
          duration_ms: duration,
        });
      },
    },
  },
});

function checkCronAuth(req: Request): boolean {
  const secret = process.env.HELIUS_WEBHOOK_SECRET;
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
