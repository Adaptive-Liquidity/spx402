// Backfill. For each known agent, fetch the latest enhanced transactions
// from Helius for deposit/mint/wallet/CRI/known PDAs, decode them, and
// upsert into agent_events. Catches anything the live webhook missed.
// Never fetches by AEON program ID.

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { fetchAddressTxs } from "@/lib/indexer/helius.server";
import { decodeTx } from "@/lib/indexer/decode.server";
import { checkCronAuth } from "@/lib/indexer/auth.server";
import { AGENT_EVENTS_ON_CONFLICT, toAgentEventRow } from "@/lib/indexer/agent-event-row";
import {
  AEON_OWNERSHIP_EVENT_TYPES,
  AEON_OWNERSHIP_PAGE_SIZE,
  decodeAeonWebhookBatch,
  fetchAeonOwnershipEvents,
  type AeonAgentRow,
} from "@/lib/indexer/aeon-lookup.server";
import {
  issueAuthorityPdaUpdates,
  persistIssueAuthorityPdas,
  uniqueAddrs,
} from "@/lib/indexer/aeon-pda.server";
import { collectHeliusAccountAddresses } from "@/lib/indexer/helius-watch.server";
import { resolveAeonProgramId } from "@/lib/trust/config";

export const Route = createFileRoute("/api/public/cron-backfill")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const started = Date.now();
        if (!(await checkCronAuth(request))) {
          return new Response("unauthorized", { status: 401 });
        }

        const { data: agents } = await supabaseAdmin
          .from("agents")
          .select(
            "mint, deposit_address, executor_wallet, core_asset, category, aeon_cri_address, aeon_agent_identity, aeon_authority_addresses, aeon_bond_addresses",
          );

        const lookup = (agents ?? []).map((r) => ({
          mint: r.mint,
          depositAddress: r.deposit_address ?? null,
        }));
        const aeonRows: AeonAgentRow[] = (agents ?? []).filter(
          (r) => r.category === "aeon_executor",
        );

        let aeonCfg: ReturnType<typeof resolveAeonProgramId>;
        try {
          aeonCfg = resolveAeonProgramId();
        } catch {
          aeonCfg = { enabled: false, reason: "invalid_config" } as const;
        }

        let ownershipEvents: Array<{ mint: string; type: string; raw: unknown }> = [];
        if (aeonCfg.enabled && aeonRows.length > 0) {
          const ownership = await fetchAeonOwnershipEvents(async (afterId) => {
            let q = supabaseAdmin
              .from("agent_events")
              .select("id, mint, type, raw", { count: "exact" })
              .in(
                "mint",
                aeonRows.map((r) => r.mint),
              )
              .in("type", [...AEON_OWNERSHIP_EVENT_TYPES])
              .order("id", { ascending: true })
              .limit(AEON_OWNERSHIP_PAGE_SIZE);
            if (afterId) q = q.gt("id", afterId);
            const { data, error, count } = await q;
            return { data, error, count };
          });
          if (ownership.ok) ownershipEvents = ownership.rows;
        }

        let totalDecoded = 0;
        let totalInserted = 0;
        const seenAddrs = new Set<string>();

        for (const a of agents ?? []) {
          const targets = collectHeliusAccountAddresses([a]);
          for (const addr of targets) {
            if (seenAddrs.has(addr)) continue;
            seenAddrs.add(addr);
            const txs = await fetchAddressTxs(addr);
            const events = txs.flatMap((tx) => decodeTx(tx, lookup));
            let aeonDecoded =
              aeonCfg.enabled && aeonRows.length > 0
                ? decodeAeonWebhookBatch(txs, aeonRows, ownershipEvents, aeonCfg.programId)
                : [];
            if (aeonDecoded.length > 0) {
              await persistIssueAuthorityPdas(supabaseAdmin, aeonDecoded);
              const pdaUpdates = issueAuthorityPdaUpdates(aeonDecoded);
              for (const [mint, pdas] of pdaUpdates) {
                const row = aeonRows.find((r) => r.mint === mint);
                if (!row) continue;
                row.aeon_authority_addresses = uniqueAddrs([
                  ...(row.aeon_authority_addresses ?? []),
                  ...pdas.authorities,
                ]);
                row.aeon_bond_addresses = uniqueAddrs([
                  ...(row.aeon_bond_addresses ?? []),
                  ...pdas.bonds,
                ]);
                if (pdas.identity) row.aeon_agent_identity = pdas.identity;
              }
            }
            const allEvents = [
              ...events,
              ...aeonDecoded.map((e) => ({
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
              })),
            ];
            totalDecoded += allEvents.length;
            if (allEvents.length === 0) continue;
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
                eventUid: "eventUid" in e ? e.eventUid : undefined,
              }),
            );
            const { data } = await supabaseAdmin
              .from("agent_events")
              .upsert(rows as never, {
                onConflict: AGENT_EVENTS_ON_CONFLICT,
                ignoreDuplicates: true,
              })
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

async function heartbeat(worker: string, ok: boolean, durationMs: number, notes: string) {
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
