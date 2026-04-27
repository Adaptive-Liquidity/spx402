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
  extractPumpFunMints,
  type HeliusEnhancedTx,
} from "@/lib/indexer/helius.server";
import { decodeTx, type DecodedEvent } from "@/lib/indexer/decode.server";
import { decodeSwapTx } from "@/lib/indexer/decode-swap.server";
import { decodeX402Tx } from "@/lib/indexer/decode-x402.server";

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
            raw: e.raw as never,
          }));
          // Avoid double-counting if the same signature is replayed.
          const { data, error } = await supabaseAdmin
            .from("agent_events")
            .upsert(rows, { onConflict: "signature", ignoreDuplicates: true })
            .select("id");
          if (!error && data) inserted = data.length;
        }

        // Phase B discovery: enqueue any NEW Pump.fun-touching mints into
        // candidate_agents so the verifier can grade them. We skip mints we
        // already track as agents or candidates.
        const knownMints = new Set<string>(agents.map((a) => a.mint));
        const discovered = new Set<string>();
        for (const tx of txs) {
          for (const m of extractPumpFunMints(tx)) {
            if (!knownMints.has(m)) discovered.add(m);
          }
        }
        let queued = 0;
        if (discovered.size > 0) {
          const { data: existingCandidates } = await supabaseAdmin
            .from("candidate_agents")
            .select("mint")
            .in("mint", Array.from(discovered));
          const alreadyCandidate = new Set(
            (existingCandidates ?? []).map((r) => r.mint),
          );
          const fresh = Array.from(discovered).filter(
            (m) => !alreadyCandidate.has(m),
          );
          if (fresh.length > 0) {
            const { data: inserted2, error: insErr } = await supabaseAdmin
              .from("candidate_agents")
              .insert(
                fresh.map((mint) => ({
                  mint,
                  discovered_via: "helius_stream",
                  status: "pending",
                })),
              )
              .select("mint");
            if (!insErr && inserted2) queued = inserted2.length;
          }
        }

        const duration = Date.now() - startedAt;
        await heartbeat(
          "webhook_ingest",
          true,
          duration,
          `txs=${txs.length} events=${events.length} inserted=${inserted} queued=${queued}`,
        );

        return Response.json({
          ok: true,
          received: txs.length,
          decoded: events.length,
          inserted,
          queued,
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
