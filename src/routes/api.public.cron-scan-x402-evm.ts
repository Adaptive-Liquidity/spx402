// Base (EVM) x402 settlement scan. Cursor-resumable, log-first.
//
// Pipeline:
//   1. cursor ← indexer_state('evm_x402_cursor')  [first run: latest - 5000]
//   2. eth_getLogs AuthorizationUsed on Base USDC, cursor → latest (chunked)
//   3. per log → eth_getTransactionByHash → decodeEvmX402Tx
//   4. Tier A → agent_events for known agents (idempotent on tx hash);
//      unknown payees → candidate_agents (chain 'base')
//   5. Tier B → counted only. NEVER persisted, never scored. A single
//      unknown sender over the threshold is named in the heartbeat as a
//      candidate facilitator for scripts/discover-facilitators.ts.
//   6. cursor advances ONLY on a fully successful run.
//
// Auth: Authorization: Bearer <CRON_SECRET>
// Cadence: every 15 minutes.

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { checkCronAuth } from "@/lib/indexer/auth.server";
import {
  decodeEvmX402Tx,
  tierAOnly,
  AUTHORIZATION_USED_TOPIC,
  EVM_X402_PARSER_VERSION,
  type EvmX402Event,
} from "@/lib/indexer/decode-x402-evm.server";
import { getActiveFacilitators } from "@/lib/indexer/facilitators.server";
import {
  BASE_USDC,
  getBlockNumber,
  getBlockTimestamp,
  getLogs,
  getTransactionByHash,
  hasBaseRpc,
  readCursor,
  writeCursor,
} from "@/lib/indexer/evm.server";

const FIRST_RUN_LOOKBACK = 5000;
/** Max blocks per run so a cold cursor cannot stall the worker. */
const MAX_BLOCKS_PER_RUN = 20_000;
/** Tier B sender volume that flags a candidate facilitator. */
const CANDIDATE_FACILITATOR_THRESHOLD = 50;

export const Route = createFileRoute("/api/public/cron-scan-x402-evm")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const startedAt = Date.now();
        if (!(await checkCronAuth(request))) {
          return new Response("unauthorized", { status: 401 });
        }
        if (!hasBaseRpc()) {
          await heartbeat(false, Date.now() - startedAt, "missing BASE_RPC_URL — Base lane idle");
          return json(500, { ok: false, error: "missing BASE_RPC_URL" });
        }

        const registry = await getActiveFacilitators("base");

        try {
          const latest = await getBlockNumber();
          const stored = await readCursor();
          const fromBlock = stored ? stored + 1 : Math.max(0, latest - FIRST_RUN_LOOKBACK);
          const toBlock = Math.min(latest, fromBlock + MAX_BLOCKS_PER_RUN - 1);

          if (fromBlock > toBlock) {
            await heartbeat(
              true,
              Date.now() - startedAt,
              `registry=${registry.size} cursor=${stored ?? "none"} blocks=0 up-to-date`,
            );
            return json(200, { ok: true, blocks: 0, cursor: stored });
          }

          const logs = await getLogs({
            address: BASE_USDC,
            topics: [AUTHORIZATION_USED_TOPIC],
            fromBlock,
            toBlock,
          });

          const seenTx = new Set<string>();
          const tierA: EvmX402Event[] = [];
          let tierB = 0;
          const tierBSenders = new Map<string, number>();

          for (const log of logs) {
            const hash = log.transactionHash;
            if (!hash || seenTx.has(hash)) continue;
            seenTx.add(hash);

            const tx = await getTransactionByHash(hash);
            if (!tx) continue;
            const occurredAt = await getBlockTimestamp(tx.blockNumber);
            const events = decodeEvmX402Tx(tx, registry, { occurredAt });
            for (const ev of events) {
              if (ev.detectionMethod === "facilitator_sender") {
                tierA.push(ev);
              } else {
                tierB += 1;
                const sender = String(ev.raw.sender ?? "");
                tierBSenders.set(sender, (tierBSenders.get(sender) ?? 0) + 1);
              }
            }
          }

          // HARD BOUNDARY — only Tier A can reach persistence.
          const scored = tierAOnly(tierA);

          let persisted = 0;
          const unknownPayees = new Set<string>();
          for (const ev of scored) {
            const { data: agent } = await supabaseAdmin
              .from("agents")
              .select("mint")
              .eq("executor_wallet", ev.executorWallet)
              .maybeSingle();
            if (!agent) {
              unknownPayees.add(ev.executorWallet);
              continue;
            }
            const { error } = await supabaseAdmin.from("agent_events").upsert(
              {
                mint: agent.mint,
                chain: "base",
                type: "X402_PAYMENT_RECEIVED",
                severity: "info",
                signature: ev.txHash,
                slot: ev.blockNumber,
                occurred_at: ev.occurredAt,
                amount_sol: 0,
                amount_token: ev.amountToken,
                parser_version: EVM_X402_PARSER_VERSION,
                raw: ev.raw as Record<string, string | number | boolean | null>,
              },
              { onConflict: "signature", ignoreDuplicates: true },
            );
            if (!error) persisted += 1;
          }

          // Queue unknown Tier A payees as Base executor candidates.
          let queued = 0;
          const payeeList = Array.from(unknownPayees);
          if (payeeList.length > 0) {
            const { data: existing } = await supabaseAdmin
              .from("candidate_agents")
              .select("mint")
              .in("mint", payeeList);
            const known = new Set((existing ?? []).map((r) => r.mint));
            const fresh = payeeList.filter((w) => !known.has(w));
            if (fresh.length > 0) {
              const { data: inserted } = await supabaseAdmin
                .from("candidate_agents")
                .insert(
                  fresh.map((wallet) => ({
                    mint: wallet,
                    chain: "base",
                    identifier_kind: "executor_wallet",
                    category: "x402_executor",
                    executor_wallet: wallet,
                    discovered_via: "x402_evm_scan",
                    status: "pending",
                  })),
                )
                .select("mint");
              queued = inserted?.length ?? 0;
            }
          }

          // Advance the cursor ONLY after every step above succeeded.
          await writeCursor(toBlock);

          const hot = Array.from(tierBSenders.entries())
            .filter(([, n]) => n > CANDIDATE_FACILITATOR_THRESHOLD)
            .map(([s, n]) => `${s}(${n})`);
          const notes =
            `registry=${registry.size} blocks=${toBlock - fromBlock + 1} logs=${logs.length} ` +
            `tierA=${scored.length} tierB=${tierB} persisted=${persisted} queued=${queued} ` +
            `cursor=${toBlock}` +
            (hot.length > 0 ? ` candidate_facilitators=${hot.join(",")}` : "") +
            (registry.size === 0 ? " mode=report-only" : "");

          const duration = Date.now() - startedAt;
          await heartbeat(true, duration, notes);
          return json(200, {
            ok: true,
            mode: registry.size === 0 ? "report-only" : "active",
            fromBlock,
            toBlock,
            logs: logs.length,
            tierA: scored.length,
            tierB,
            persisted,
            queued,
            duration_ms: duration,
          });
        } catch (err) {
          // Cursor is NOT advanced — the next run re-reads the same range and
          // is idempotent on tx hash.
          const message = err instanceof Error ? err.message : "unknown error";
          await heartbeat(false, Date.now() - startedAt, `failed: ${message}`);
          return json(500, { ok: false, error: "scan failed" });
        }
      },
    },
  },
});

async function heartbeat(ok: boolean, durationMs: number, notes: string) {
  try {
    await supabaseAdmin.from("indexer_runs").insert({
      worker: "evm_x402_scan",
      ok,
      duration_ms: durationMs,
      notes,
    });
  } catch {
    /* never let heartbeat break the request */
  }
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json" },
  });
}
