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
import { decodeAeonWebhookBatch } from "@/lib/indexer/aeon-lookup.server";
import { AGENT_EVENTS_ON_CONFLICT, toAgentEventRow } from "@/lib/indexer/agent-event-row";
import { resolveAeonProgramId } from "@/lib/trust/config";
import { decodeSwapTx } from "@/lib/indexer/decode-swap.server";
import { decodeX402Tx } from "@/lib/indexer/decode-x402.server";
import {
  decodePumpBuybackReversedTx,
  decodeX402ReversedTx,
} from "@/lib/indexer/decode-failure.server";

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
          .select(
            "mint, deposit_address, executor_wallet, identifier_kind, category, aeon_cri_address",
          );
        const agents = (agentsRows ?? []).map((r) => ({
          mint: r.mint,
          depositAddress: r.deposit_address ?? null,
        }));
        // Build executor wallet -> identifier (mint column) mapping for
        // wallet-centric agents (executor_wallet kind, registered, etc.).
        const executorAgents = (agentsRows ?? [])
          .filter((r) => !!r.executor_wallet)
          .map((r) => ({
            identifier: r.mint, // we store identifier in `mint` column
            wallet: r.executor_wallet as string,
            category: r.category ?? "registered_agent",
          }));
        const executorWallets = executorAgents.map((e) => e.wallet);

        const events: DecodedEvent[] = [];
        for (const tx of txs) {
          events.push(...decodeTx(tx, agents));
        }

        // AEON Execution Primitive decoding. Guard-gated: an unconfigured
        // or invalid AEON_PROGRAM_ID skips AEON decoding without affecting
        // other decoders. resolveAeonProgramId() throws on invalid production
        // config, so resolve defensively here; boot/health surfacing owns the
        // failure (see /api/public/health), not per-request 500s.
        let aeonCfg: ReturnType<typeof resolveAeonProgramId>;
        let aeonSkipDetail: string | null = null;
        try {
          aeonCfg = resolveAeonProgramId();
        } catch (e) {
          aeonCfg = { enabled: false, reason: "invalid_config" } as const;
          aeonSkipDetail = e instanceof Error ? e.message.slice(0, 200) : "invalid_config";
        }
        const aeonEvents: DecodedEvent[] = [];
        if (!aeonCfg.enabled) {
          // Single skip heartbeat per request (detail prefers the throw
          // message when the guard itself rejected the config).
          await heartbeat("webhook_ingest_aeon_skip", true, 0, aeonSkipDetail ?? aeonCfg.reason);
        }
        if (aeonCfg.enabled) {
          const aeonAgentRows = (agentsRows ?? []).filter(
            (r) => !!r.aeon_cri_address || !!r.executor_wallet,
          );
          const aeonMints = aeonAgentRows.map((r) => r.mint);
          let ownershipEvents: Array<{ mint: string; type: string; raw: unknown }> = [];
          if (aeonMints.length > 0) {
            const { data: ownershipRows } = await supabaseAdmin
              .from("agent_events")
              .select("mint, type, raw")
              .in("mint", aeonMints)
              .in("type", ["AEON_AUTHORITY_ISSUED", "BOND_DEPOSITED"]);
            ownershipEvents = ownershipRows ?? [];
          }
          for (const ev of decodeAeonWebhookBatch(
            txs,
            aeonAgentRows,
            ownershipEvents,
            aeonCfg.programId,
          )) {
            aeonEvents.push({
              mint: ev.mint,
              type: ev.type,
              severity: ev.severity,
              signature: ev.signature,
              slot: ev.slot,
              occurredAt: ev.occurredAt,
              amountSol: ev.amountSol,
              amountToken: ev.amountToken,
              eventUid: ev.eventUid,
              raw: ev.raw,
            });
          }
        }

        // Wallet-centric: SWAP_EXECUTED + X402_PAYMENT_RECEIVED.
        // We map back from executor wallet to its agent identifier (stored
        // in the `mint` column) so the events table keeps a single FK shape.
        const walletEvents: DecodedEvent[] = [];
        if (executorWallets.length > 0) {
          for (const tx of txs) {
            for (const ev of decodeSwapTx(tx, executorWallets)) {
              const a = executorAgents.find((e) => e.wallet === ev.executorWallet);
              if (!a) continue;
              walletEvents.push({
                mint: a.identifier,
                type: "SWAP_EXECUTED",
                severity: "info",
                signature: ev.signature,
                slot: ev.slot,
                occurredAt: ev.occurredAt,
                amountSol: ev.amountSol,
                amountToken: ev.amountToken,
                raw: { ...ev.raw, wallet: ev.executorWallet },
              });
            }
            for (const ev of decodeX402Tx(tx, executorWallets)) {
              const a = executorAgents.find((e) => e.wallet === ev.executorWallet);
              if (!a) continue;
              walletEvents.push({
                mint: a.identifier,
                type: "X402_PAYMENT_RECEIVED",
                severity: "success",
                signature: ev.signature,
                slot: ev.slot,
                occurredAt: ev.occurredAt,
                amountSol: ev.amountSol,
                amountToken: ev.amountToken,
                raw: { ...ev.raw, wallet: ev.executorWallet },
              });
            }
          }
        }

        // Wave 1b — per-tx failure decoders. These run alongside the
        // success-path decoders so a single ingest pass can emit both
        // success and failure rows for the same tx batch.
        const failureEvents: DecodedEvent[] = [];
        const executorIdentities = executorAgents.map((e) => ({
          identifier: e.identifier,
          wallet: e.wallet,
        }));
        for (const tx of txs) {
          for (const ev of decodePumpBuybackReversedTx(tx, agents)) {
            failureEvents.push({
              mint: ev.mint,
              type: ev.type,
              severity: ev.severity,
              signature: ev.signature,
              slot: ev.slot,
              occurredAt: ev.occurredAt,
              amountSol: ev.amountSol,
              amountToken: ev.amountToken,
              raw: ev.raw,
            });
          }
          for (const ev of decodeX402ReversedTx(tx, executorIdentities)) {
            failureEvents.push({
              mint: ev.identifier,
              type: ev.type,
              severity: ev.severity,
              signature: ev.signature,
              slot: ev.slot,
              occurredAt: ev.occurredAt,
              amountSol: ev.amountSol,
              amountToken: ev.amountToken,
              raw: ev.raw,
            });
          }
        }

        const allEvents = [...events, ...walletEvents, ...failureEvents, ...aeonEvents];

        let inserted = 0;
        if (allEvents.length > 0) {
          const rows = allEvents.map((e) =>
            toAgentEventRow({
              mint: e.mint,
              type: e.type,
              severity: e.severity,
              signature: e.signature,
              slot: e.slot,
              occurredAt: e.occurredAt,
              amountSol: e.amountSol,
              amountToken: e.amountToken,
              raw: e.raw,
              eventUid: e.eventUid,
            }),
          );
          // Avoid double-counting on Helius retries (event_uid, not signature).
          const { data, error } = await supabaseAdmin
            .from("agent_events")
            .upsert(rows as never, {
              onConflict: AGENT_EVENTS_ON_CONFLICT,
              ignoreDuplicates: true,
            })
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
          const alreadyCandidate = new Set((existingCandidates ?? []).map((r) => r.mint));
          const fresh = Array.from(discovered).filter((m) => !alreadyCandidate.has(m));
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

async function heartbeat(worker: string, ok: boolean, durationMs: number, notes: string) {
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
