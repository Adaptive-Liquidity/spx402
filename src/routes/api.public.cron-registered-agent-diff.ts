// Wave 1b — registered-agent diff worker (cron, hourly).
//
// Re-scans the on-chain MPL Agent Identity registry, compares each PDA's
// (asset, owner, metadataUri) against the snapshot stored on `agents`,
// and emits OPERATOR_CHANGED / CONFIG_CHANGED events into agent_events.
//
// This is the missing half of Wave 1b Track A — the success-path decoders
// (decodeSwapTx / decodeX402Tx) only fire when those wallets transact,
// and most registered-only agents never trip those paths. Without a diff
// worker the entire registered_agent category stays dark, no matter how
// many we verify.
//
// Idempotent — derived signatures `opch-${asset}-${ts}` /
// `cfgch-${asset}-${ts}` use the start-of-hour epoch so reruns inside the
// same hour collapse via the (signature) upsert constraint.

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { checkCronAuth } from "@/lib/indexer/auth.server";
import {
  diffRegisteredAgent,
  type RegisteredAgentSnapshot,
} from "@/lib/indexer/decode-registered-agent.server";
import { verifyCandidate } from "@/lib/indexer/verifier.server";

const MPL_AGENT_IDENTITY_PROGRAM_ID = "1DREGFgysWYxLnRnKQnwrxnJQeSMk2HmGaC6whw2B2p";
const HELIUS_RPC = "https://mainnet.helius-rpc.com";
const ASSET_OFFSET = 8;
const OWNER_OFFSET = 40;

// Cap per run so we never stall the cron — registered_agents is ~330 today.
// One pass is fine.
const MAX_PER_RUN = 500;

export const Route = createFileRoute("/api/public/cron-registered-agent-diff")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const startedAt = Date.now();
        if (!(await checkCronAuth(request))) {
          return new Response("unauthorized", { status: 401 });
        }
        const heliusKey = process.env.HELIUS_API_KEY;
        if (!heliusKey) {
          return json(500, { ok: false, error: "missing HELIUS_API_KEY" });
        }

        // 1. Pull every PDA. We need both asset and owner offsets.
        const accounts = await getProgramAccounts(heliusKey);
        const onchain = new Map<string, { owner: string | null }>();
        for (const acct of accounts) {
          const asset = base58Slice(acct.data, ASSET_OFFSET, 32);
          const owner = base58Slice(acct.data, OWNER_OFFSET, 32);
          if (!asset) continue;
          onchain.set(asset, { owner });
        }

        if (onchain.size === 0) {
          await heartbeat(
            "registered_agent_diff",
            true,
            Date.now() - startedAt,
            "no PDAs returned from registry",
          );
          return json(200, { ok: true, scanned: 0 });
        }

        // 2. Pull our current snapshot from `agents`.
        const { data: rows } = await supabaseAdmin
          .from("agents")
          .select("mint, identity_owner, metadata_uri")
          .eq("category", "registered_agent")
          .limit(MAX_PER_RUN);

        let seeded = 0;
        let changed = 0;
        let eventsWritten = 0;
        const observedAt = new Date();

        for (const row of rows ?? []) {
          const liveOwner = onchain.get(row.mint)?.owner ?? null;

          // For metadata URI we re-resolve via the verifier — the registry
          // PDA itself doesn't carry the JSON URI we use, the bound asset
          // does. This adds one Helius hop per registered agent per hour
          // which is comfortably within the API budget.
          let liveMetadataUri: string | null = null;
          try {
            const result = await verifyCandidate(row.mint, {
              identifierKind: "core_asset",
            });
            liveMetadataUri = result.metadataUri;
          } catch {
            liveMetadataUri = row.metadata_uri ?? null;
          }

          const prev: RegisteredAgentSnapshot = {
            asset: row.mint,
            identityOwner: row.identity_owner ?? null,
            metadataUri: row.metadata_uri ?? null,
          };
          const next: RegisteredAgentSnapshot = {
            asset: row.mint,
            identityOwner: liveOwner,
            metadataUri: liveMetadataUri,
          };

          // Seed-only path: previous snapshot was empty.
          if (
            !prev.identityOwner &&
            !prev.metadataUri &&
            (next.identityOwner || next.metadataUri)
          ) {
            await supabaseAdmin
              .from("agents")
              .update({
                identity_owner: next.identityOwner,
                metadata_uri: next.metadataUri,
              })
              .eq("mint", row.mint);
            seeded += 1;
            continue;
          }

          const diffs = diffRegisteredAgent(prev, next, observedAt);
          if (diffs.length === 0) continue;

          // Persist updated snapshot first so reruns within the same hour
          // don't re-emit.
          await supabaseAdmin
            .from("agents")
            .update({
              identity_owner: next.identityOwner ?? prev.identityOwner,
              metadata_uri: next.metadataUri ?? prev.metadataUri,
            })
            .eq("mint", row.mint);

          // Insert the diff events. (signature) is the upsert key on
          // agent_events so a hour-collision is naturally idempotent.
          const { error: insertErr } = await supabaseAdmin.from("agent_events").upsert(
            diffs.map((d) => ({
              mint: d.mint,
              type: d.type,
              severity: d.severity,
              signature: d.signature,
              slot: undefined,
              occurred_at: d.occurredAt,
              amount_sol: d.amountSol,
              amount_token: d.amountToken,
              raw: d.raw as never,
              parser_version: "spx-parser-v0.1.7",
            })) as never,
            { onConflict: "signature", ignoreDuplicates: true },
          );
          if (!insertErr) {
            changed += 1;
            eventsWritten += diffs.length;
          }
        }

        const duration = Date.now() - startedAt;
        await heartbeat(
          "registered_agent_diff",
          true,
          duration,
          `pdas=${onchain.size} agents=${rows?.length ?? 0} seeded=${seeded} changed=${changed} events=${eventsWritten}`,
        );

        return json(200, {
          ok: true,
          pdas: onchain.size,
          agents_examined: rows?.length ?? 0,
          seeded,
          changed,
          events_written: eventsWritten,
          duration_ms: duration,
        });
      },
    },
  },
});

interface ProgramAccount {
  pubkey: string;
  data: Uint8Array;
}

async function getProgramAccounts(apiKey: string): Promise<ProgramAccount[]> {
  const res = await fetch(`${HELIUS_RPC}/?api-key=${apiKey}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getProgramAccounts",
      params: [MPL_AGENT_IDENTITY_PROGRAM_ID, { encoding: "base64", commitment: "confirmed" }],
    }),
  });
  if (!res.ok) return [];
  const body = (await res.json()) as {
    result?: Array<{ pubkey: string; account: { data: [string, string] } }>;
  };
  if (!body.result) return [];
  return body.result.map((r) => ({
    pubkey: r.pubkey,
    data: new Uint8Array(Buffer.from(r.account.data[0], "base64")),
  }));
}

function base58Slice(data: Uint8Array, offset: number, len: number): string | null {
  if (data.length < offset + len) return null;
  const slice = data.slice(offset, offset + len);
  if (slice.every((b) => b === 0)) return null;
  if (slice.every((b) => b === 255)) return null;
  return base58Encode(slice);
}

const B58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function base58Encode(bytes: Uint8Array): string {
  if (bytes.length === 0) return "";
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
  const digits: number[] = [];
  for (let i = zeros; i < bytes.length; i++) {
    let carry = bytes[i];
    for (let j = 0; j < digits.length; j++) {
      const x = digits[j] * 256 + carry;
      digits[j] = x % 58;
      carry = Math.floor(x / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  let str = "";
  for (let i = 0; i < zeros; i++) str += "1";
  for (let i = digits.length - 1; i >= 0; i--) str += B58_ALPHABET[digits[i]];
  return str;
}

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

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json" },
  });
}
