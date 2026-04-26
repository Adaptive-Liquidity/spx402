// Helius webhook ingest. External services POST decoded transactions here.
// We verify the shared secret, decode each tx, write events, update agent
// counters, and write a heartbeat to indexer_runs.
//
// Configure on Helius:
//   URL    : https://<your-host>/api/public/webhook-helius
//   Auth   : the value of HELIUS_WEBHOOK_SECRET (shared secret) OR HMAC sig
//   Type   : Enhanced Transactions
//   Filters: every known agent deposit address + every agent mint + Pump.fun program

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  verifyHeliusSignature,
  type HeliusEnhancedTx,
} from "@/lib/indexer/helius.server";
import { decodeTx, type DecodedEvent } from "@/lib/indexer/decode.server";

export const Route = createFileRoute("/api/public/webhook-helius")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const startedAt = Date.now();
        const rawBody = await request.text();
        const auth = request.headers.get("authorization");

        if (!verifyHeliusSignature(auth, rawBody)) {
          await heartbeat("webhook_ingest", false, Date.now() - startedAt, "bad signature");
          return new Response("invalid signature", { status: 401 });
        }

        let txs: HeliusEnhancedTx[];
        try {
          const parsed = JSON.parse(rawBody);
          txs = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          return new Response("invalid json", { status: 400 });
        }

        // Load the agent lookup table once.
        const { data: agentsRows } = await supabaseAdmin
          .from("agents")
          .select("mint, deposit_address");
        const agents = (agentsRows ?? []).map((r) => ({
          mint: r.mint,
          depositAddress: r.deposit_address ?? null,
        }));

        const events: DecodedEvent[] = [];
        for (const tx of txs) {
          events.push(...decodeTx(tx, agents));
        }

        let inserted = 0;
        if (events.length > 0) {
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
          // Avoid double-counting if the same signature is replayed.
          const { data, error } = await supabaseAdmin
            .from("agent_events")
            .upsert(rows, { onConflict: "signature", ignoreDuplicates: true })
            .select("id");
          if (!error && data) inserted = data.length;
        }

        const duration = Date.now() - startedAt;
        await heartbeat(
          "webhook_ingest",
          true,
          duration,
          `txs=${txs.length} events=${events.length} inserted=${inserted}`,
        );

        return Response.json({
          ok: true,
          received: txs.length,
          decoded: events.length,
          inserted,
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
