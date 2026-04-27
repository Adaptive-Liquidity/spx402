// Verify pending candidate_agents rows. Promote those that pass the strict
// bar to the agents table. Reject those that fail repeatedly.

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyCandidate } from "@/lib/indexer/verifier.server";
import { checkCronAuth } from "@/lib/indexer/auth.server";
import { fetchAddressTxs } from "@/lib/indexer/helius.server";
import { decodeSwapTx } from "@/lib/indexer/decode-swap.server";
import { decodeX402Tx } from "@/lib/indexer/decode-x402.server";
import type { Json } from "@/integrations/supabase/types";

const MAX_PER_RUN = 10;
const MAX_ATTEMPTS = 5;

export const Route = createFileRoute("/api/public/cron-verify-candidates")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const started = Date.now();
        if (!checkCronAuth(request)) {
          return new Response("unauthorized", { status: 401 });
        }

        const { data: queue } = await supabaseAdmin
          .from("candidate_agents")
          .select(
            "mint, check_attempts, signals, discovered_via, identifier_kind, category, executor_wallet, core_asset",
          )
          .in("status", ["pending", "verifying"])
          .order("last_checked_at", { ascending: true, nullsFirst: true })
          .limit(MAX_PER_RUN);

        let promoted = 0;
        let rejected = 0;
        let stillPending = 0;

        for (const c of queue ?? []) {
          const kind =
            (c.identifier_kind as
              | "mint"
              | "core_asset"
              | "executor_wallet"
              | null) ?? "mint";
          const result = await verifyCandidate(c.mint, {
            discoveredVia: c.discovered_via,
            identifierKind: kind,
          });
          const attempts = (c.check_attempts ?? 0) + 1;

          if (result.passed) {
            await supabaseAdmin.from("agents").upsert(
              {
                mint: c.mint,
                identifier_kind: kind,
                category: c.category ?? "tokenized_buyback",
                executor_wallet: c.executor_wallet ?? null,
                core_asset: c.core_asset ?? null,
                symbol: result.symbol ?? c.mint.slice(0, 4).toUpperCase(),
                name: result.name ?? "Unnamed agent",
                grade: "SPX404",
                status: "active",
                metadata_uri: result.metadataUri,
                confidence: "medium",
                parser_version: "v0.1.7",
              },
              { onConflict: "mint" },
            );
            await supabaseAdmin
              .from("candidate_agents")
              .update({
                status: "verified",
                signals: result.signals as unknown as Json,
                check_attempts: attempts,
                last_checked_at: new Date().toISOString(),
                notes: result.notes,
              })
              .eq("mint", c.mint);

            // Backfill: for executor wallet candidates, immediately seed
            // their agent_events with recent swap + x402 history so they
            // show up on the leaderboard with real numbers on next scoring.
            if (kind === "executor_wallet" && c.executor_wallet) {
              try {
                const wallet = c.executor_wallet;
                const txs = await fetchAddressTxs(wallet);
                const rows: Array<Record<string, unknown>> = [];
                for (const tx of txs) {
                  for (const ev of decodeSwapTx(tx, [wallet])) {
                    rows.push({
                      mint: c.mint,
                      type: "SWAP_EXECUTED",
                      severity: "info",
                      signature: ev.signature,
                      slot: ev.slot ?? undefined,
                      occurred_at: ev.occurredAt,
                      amount_sol: ev.amountSol,
                      amount_token: ev.amountToken,
                      raw: { ...ev.raw, wallet, backfill: true } as never,
                    });
                  }
                  for (const ev of decodeX402Tx(tx, [wallet])) {
                    rows.push({
                      mint: c.mint,
                      type: "X402_PAYMENT_RECEIVED",
                      severity: "success",
                      signature: ev.signature,
                      slot: ev.slot ?? undefined,
                      occurred_at: ev.occurredAt,
                      amount_sol: ev.amountSol,
                      amount_token: ev.amountToken,
                      raw: { ...ev.raw, wallet, backfill: true } as never,
                    });
                  }
                }
                if (rows.length > 0) {
                  await supabaseAdmin
                    .from("agent_events")
                    .upsert(rows as never, {
                      onConflict: "signature",
                      ignoreDuplicates: true,
                    });
                }
              } catch {
                /* backfill is best-effort; scoring picks up later */
              }
            }
            promoted += 1;
          } else if (attempts >= MAX_ATTEMPTS) {
            await supabaseAdmin
              .from("candidate_agents")
              .update({
                status: "rejected",
                signals: result.signals as unknown as Json,
                rejection_reason: "Failed verification bar after max attempts",
                check_attempts: attempts,
                last_checked_at: new Date().toISOString(),
                notes: result.notes,
              })
              .eq("mint", c.mint);
            rejected += 1;
          } else {
            await supabaseAdmin
              .from("candidate_agents")
              .update({
                status: "verifying",
                signals: result.signals as unknown as Json,
                check_attempts: attempts,
                last_checked_at: new Date().toISOString(),
                notes: result.notes,
              })
              .eq("mint", c.mint);
            stillPending += 1;
          }
        }

        const duration = Date.now() - started;
        await supabaseAdmin.from("indexer_runs").insert({
          worker: "verifier",
          ok: true,
          duration_ms: duration,
          notes: `checked=${queue?.length ?? 0} promoted=${promoted} rejected=${rejected} pending=${stillPending}`,
        });

        return Response.json({
          ok: true,
          checked: queue?.length ?? 0,
          promoted,
          rejected,
          stillPending,
          duration_ms: duration,
        });
      },
    },
  },
});
