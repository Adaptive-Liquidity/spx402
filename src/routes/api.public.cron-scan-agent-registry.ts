// One-shot scan of the Metaplex MPL Agent Registry program. Pulls every
// AgentIdentity PDA, extracts the bound MPL Core asset address, and enqueues
// it as a candidate with identifier_kind='core_asset' and
// category='registered_agent'.
//
// The verifier then checks the AgentIdentity PDA exists for that asset and
// promotes it. Anything that doesn't actually have a registered identity is
// rejected — so it's safe to cast a wide net here.
//
// Auth: Authorization: <HELIUS_WEBHOOK_SECRET>  (or Bearer <secret>)
//
// Usage:
//   POST /api/public/cron-scan-agent-registry
//
// Designed to be called from pg_cron once an hour.

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { checkCronAuth } from "@/lib/indexer/auth.server";

// Metaplex MPL Agent Identity program (verified mainnet program ID, March 2026).
// Source: https://developers.metaplex.com/smart-contracts/mpl-agent
// Same address on Mainnet and Devnet.
const MPL_AGENT_IDENTITY_PROGRAM_ID = "1DREGFgysWYxLnRnKQnwrxnJQeSMk2HmGaC6whw2B2p";

const HELIUS_RPC = "https://mainnet.helius-rpc.com";

// AgentIdentity PDA layout (per @metaplex-foundation/mpl-agent-registry):
//   [8] discriminator
//   [32] asset (MPL Core asset pubkey)         <- offset 8
//   [32] owner / authority                     <- offset 40
//   ... rest is uri + plugin lifecycle hooks
const ASSET_OFFSET = 8;

export const Route = createFileRoute("/api/public/cron-scan-agent-registry")({
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

        // 1. Fetch every AgentIdentity account owned by the program.
        const accounts = await getProgramAccounts(heliusKey);
        if (accounts.length === 0) {
          await heartbeat(
            "registry_scan",
            true,
            Date.now() - startedAt,
            `no AgentIdentity accounts on-chain yet for ${MPL_AGENT_IDENTITY_PROGRAM_ID}`,
          );
          return json(200, {
            ok: true,
            scanned: 0,
            queued: 0,
            note: "no AgentIdentity accounts on-chain yet",
          });
        }

        // 2. Extract the bound Core asset from each account's data.
        const assets = new Set<string>();
        for (const acct of accounts) {
          const asset = extractAssetFromData(acct.data);
          if (asset) assets.add(asset);
        }

        if (assets.size === 0) {
          await heartbeat(
            "registry_scan",
            true,
            Date.now() - startedAt,
            `scanned=${accounts.length} extracted=0`,
          );
          return json(200, { ok: true, scanned: accounts.length, queued: 0 });
        }

        // 3. Skip assets we already know about.
        const assetList = Array.from(assets);
        const [{ data: agentsRows }, { data: existingCandidates }] = await Promise.all([
          supabaseAdmin.from("agents").select("mint").in("mint", assetList),
          supabaseAdmin.from("candidate_agents").select("mint").in("mint", assetList),
        ]);
        const known = new Set<string>([
          ...(agentsRows ?? []).map((r) => r.mint),
          ...(existingCandidates ?? []).map((r) => r.mint),
        ]);
        const fresh = assetList.filter((m) => !known.has(m));

        let queued = 0;
        if (fresh.length > 0) {
          const { data: inserted, error } = await supabaseAdmin
            .from("candidate_agents")
            .insert(
              fresh.map((asset) => ({
                mint: asset,
                identifier_kind: "core_asset",
                category: "registered_agent",
                core_asset: asset,
                discovered_via: "mpl_registry_scan",
                status: "pending",
              })),
            )
            .select("mint");
          if (!error && inserted) queued = inserted.length;
        }

        const duration = Date.now() - startedAt;
        await heartbeat(
          "registry_scan",
          true,
          duration,
          `scanned=${accounts.length} extracted=${assets.size} queued=${queued}`,
        );

        return json(200, {
          ok: true,
          scanned: accounts.length,
          extracted: assets.size,
          queued,
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
    data: base64ToBytes(r.account.data[0]),
  }));
}

function base64ToBytes(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, "base64"));
}

function extractAssetFromData(data: Uint8Array): string | null {
  if (data.length < ASSET_OFFSET + 32) return null;
  const slice = data.slice(ASSET_OFFSET, ASSET_OFFSET + 32);
  if (slice.every((b) => b === 0)) return null;
  if (slice.every((b) => b === 255)) return null;
  return base58Encode(slice);
}

// Minimal base58 encoder (no external dep). Solana pubkey alphabet.
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
