// One-shot scan for x402 payment receipts on Solana mainnet.
//
// Strategy: pull recent signatures touching the SPL Memo programs (v1 + v2),
// fetch the parsed transactions through Helius enhanced API, run them through
// the same x402 decoder used in the webhook, and extract recipient wallets we
// haven't seen yet. Each fresh recipient is enqueued as an `executor_wallet`
// candidate with category `x402_executor`. The verifier then promotes wallets
// that have ≥1 receipt; cron-verify-candidates handles the backfill.
//
// This is intentionally conservative: false negatives are fine (the next sweep
// will catch them). False positives would inflate the leaderboard, so the
// X402_PATTERNS regex in decode-x402.server.ts is the gate of last resort.
//
// Auth: Authorization: <HELIUS_WEBHOOK_SECRET>  (or Bearer <secret>)
//
// Usage:
//   POST /api/public/cron-scan-x402
//
// Designed to be called from pg_cron once an hour.

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { checkCronAuth } from "@/lib/indexer/auth.server";
import {
  decodeX402Tx,
  type X402DetectionMethod,
  type X402Event,
} from "@/lib/indexer/decode-x402.server";
import {
  getActiveFacilitators,
  facilitatorAddressList,
} from "@/lib/indexer/facilitators.server";
import {
  fetchEnhancedTxs,
  type HeliusEnhancedTx,
} from "@/lib/indexer/helius.server";

const HELIUS_RPC = "https://mainnet.helius-rpc.com";

// Both SPL Memo program IDs. Most x402 implementations attach an SPL memo
// instruction with the receipt header on the same tx as the SOL/USDC transfer.
const MEMO_PROGRAMS = [
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr", // v1
  "Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo", // v2
];

// Cap how many signatures we ask for per program per run. Helius caps at 1000;
// 250 is plenty for an hourly sweep and keeps the parse phase under budget.
const SIGS_PER_PROGRAM = 250;

// We send Helius enhanced-tx requests in batches to stay under 100/req limit.
const ENHANCED_BATCH = 100;

export const Route = createFileRoute("/api/public/cron-scan-x402")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const startedAt = Date.now();
        if (!checkCronAuth(request)) {
          return new Response("unauthorized", { status: 401 });
        }
        const heliusKey = process.env.HELIUS_API_KEY;
        if (!heliusKey) {
          return json(500, { ok: false, error: "missing HELIUS_API_KEY" });
        }

        // 1. Pull recent signatures for BOTH discovery surfaces:
        //      a. SPL Memo programs (legacy, catches self-labeling flows)
        //      b. every ACTIVE facilitator fee-payer wallet (structural detection)
        const registry = await getActiveFacilitators("solana");
        const facAddresses = facilitatorAddressList(registry);

        const sigSet = new Set<string>();
        for (const programId of MEMO_PROGRAMS) {
          const sigs = await getRecentSignatures(heliusKey, programId);
          for (const s of sigs) sigSet.add(s);
        }
        for (const addr of facAddresses) {
          const sigs = await getRecentSignatures(heliusKey, addr);
          for (const s of sigs) sigSet.add(s);
        }
        if (sigSet.size === 0) {
          await heartbeat(
            "x402_scan",
            true,
            Date.now() - startedAt,
            `facilitators=${facAddresses.length} no signatures returned`,
          );
          return json(200, { ok: true, scanned: 0, queued: 0 });
        }

        // 2. Fetch enhanced txs in batches and run them through the x402 decoder.
        const sigs = Array.from(sigSet);
        const recipients = new Map<string, X402DetectionMethod>();
        let parsed = 0;
        let persisted = 0;
        for (let i = 0; i < sigs.length; i += ENHANCED_BATCH) {
          const batch = sigs.slice(i, i + ENHANCED_BATCH);
          const txs = await fetchEnhancedTxs(batch);
          parsed += txs.length;
          for (const tx of txs) {
            const candidates = collectReceivers(tx).filter(
              (w) => !facAddresses.includes(w),
            );
            if (candidates.length === 0) continue;
            const events = decodeX402Tx(tx, candidates, { registry });
            for (const ev of events) {
              // Facilitator-tier detection wins the tag when both fire.
              const prev = recipients.get(ev.executorWallet);
              if (prev !== "facilitator_fee_payer") {
                recipients.set(ev.executorWallet, ev.detectionMethod);
              }
              // Also persist settlements for wallets we ALREADY track —
              // discovery shouldn't be the only path events reach agent_events.
              if (await persistSettlementIfKnownAgent(ev)) persisted += 1;
            }
          }
        }

        if (recipients.size === 0) {
          await heartbeat(
            "x402_scan",
            true,
            Date.now() - startedAt,
            `facilitators=${facAddresses.length} parsed=${parsed} no x402 receipts`,
          );
          return json(200, { ok: true, scanned: parsed, queued: 0 });
        }

        // 3. Skip wallets we already know about (as agents or candidates).
        const recipientList = Array.from(recipients.keys());
        const [{ data: agentsByExec }, { data: agentsByMint }, { data: existingCands }] =
          await Promise.all([
            supabaseAdmin
              .from("agents")
              .select("executor_wallet")
              .in("executor_wallet", recipientList),
            supabaseAdmin.from("agents").select("mint").in("mint", recipientList),
            supabaseAdmin
              .from("candidate_agents")
              .select("mint")
              .in("mint", recipientList),
          ]);
        const known = new Set<string>([
          ...(agentsByExec ?? []).map((r) => r.executor_wallet).filter((v): v is string => !!v),
          ...(agentsByMint ?? []).map((r) => r.mint),
          ...(existingCands ?? []).map((r) => r.mint),
        ]);
        const fresh = recipientList.filter((w) => !known.has(w));

        let queued = 0;
        if (fresh.length > 0) {
          const { data: inserted, error } = await supabaseAdmin
            .from("candidate_agents")
            .insert(
              fresh.map((wallet) => ({
                mint: wallet,
                identifier_kind: "executor_wallet",
                category: "x402_executor",
                executor_wallet: wallet,
                discovered_via:
                  recipients.get(wallet) === "facilitator_fee_payer"
                    ? "x402_facilitator_scan"
                    : "x402_scan",
                status: "pending",
              })),
            )
            .select("mint");
          if (!error && inserted) queued = inserted.length;
        }


        const duration = Date.now() - startedAt;
        await heartbeat(
          "x402_scan",
          true,
          duration,
          `facilitators=${facAddresses.length} signatures=${sigSet.size} parsed=${parsed} recipients=${recipients.size} persisted=${persisted} queued=${queued}`,
        );
        return json(200, {
          ok: true,
          facilitators: facAddresses.length,
          signatures: sigSet.size,
          parsed,
          recipients: recipients.size,
          persisted,
          queued,
          duration_ms: duration,
        });
      },
    },
  },
});

// Persist a settlement for a wallet we already track as an agent. Signature is
// unique on agent_events, so webhook/cron overlap is idempotent by conflict.
async function persistSettlementIfKnownAgent(ev: X402Event): Promise<boolean> {
  try {
    const { data: agent } = await supabaseAdmin
      .from("agents")
      .select("mint")
      .eq("executor_wallet", ev.executorWallet)
      .maybeSingle();
    if (!agent) return false;
    const { error } = await supabaseAdmin.from("agent_events").upsert(
      {
        mint: agent.mint,
        type: "X402_PAYMENT_RECEIVED",
        severity: "info",
        signature: ev.signature,
        slot: ev.slot,
        occurred_at: ev.occurredAt,
        amount_sol: ev.amountSol,
        amount_token: ev.amountToken,
        raw: { ...ev.raw, confidence: ev.confidence },
      },
      { onConflict: "signature", ignoreDuplicates: true },
    );
    return !error;
  } catch {
    return false;
  }
}


async function getRecentSignatures(
  apiKey: string,
  programId: string,
): Promise<string[]> {
  try {
    const res = await fetch(`${HELIUS_RPC}/?api-key=${apiKey}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getSignaturesForAddress",
        params: [programId, { limit: SIGS_PER_PROGRAM }],
      }),
    });
    if (!res.ok) return [];
    const body = (await res.json()) as {
      result?: Array<{ signature: string; err: unknown }>;
    };
    return (body.result ?? [])
      .filter((r) => r.err === null)
      .map((r) => r.signature);
  } catch {
    return [];
  }
}


// Collect every wallet that received SOL or USDC in this tx — those are the
// only candidates a real x402 receipt could point at.
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
function collectReceivers(tx: HeliusEnhancedTx): string[] {
  const out = new Set<string>();
  for (const t of tx.nativeTransfers ?? []) {
    if (t.toUserAccount && (t.amount ?? 0) > 0) out.add(t.toUserAccount);
  }
  for (const t of tx.tokenTransfers ?? []) {
    if (t.mint === USDC_MINT && t.toUserAccount && (t.tokenAmount ?? 0) > 0) {
      out.add(t.toUserAccount);
    }
  }
  return Array.from(out);
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
    /* never let heartbeat break the request */
  }
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json" },
  });
}
