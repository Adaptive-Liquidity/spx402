// One-shot scan of the Solana Agent Registry program. Pulls every program
// account, extracts candidate SPL mint pubkeys from the on-chain layout, and
// enqueues new mints into candidate_agents (discovered_via='registry_scan').
//
// The verifier worker then runs Gemini's 4 checks and decides which to
// promote. Anything that isn't actually a tokenized + earning agent will be
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

// Solana Agent Registry program (per Solana Foundation docs).
const SOLANA_AGENT_REGISTRY_PROGRAM_ID =
  "AgentRegV1ZS6QbKFYkD3FEHAqbDpZRnGd8C9z3gBuUq2";

const HELIUS_RPC = "https://mainnet.helius-rpc.com";

// Anchor discriminator is 8 bytes. Most Anchor account layouts start their
// first Pubkey field immediately after. We scan a few common offsets and
// keep any 32-byte slice that base58-decodes into a plausible pubkey.
const PUBKEY_OFFSETS = [8, 40, 72, 104];

export const Route = createFileRoute("/api/public/cron-scan-agent-registry")({
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

        // 1. Fetch every account owned by the registry program.
        const accounts = await getProgramAccounts(heliusKey);
        if (accounts.length === 0) {
          await heartbeat(
            "registry_scan",
            true,
            Date.now() - startedAt,
            `no accounts found for ${SOLANA_AGENT_REGISTRY_PROGRAM_ID}`,
          );
          return json(200, {
            ok: true,
            scanned: 0,
            queued: 0,
            note: "no AgentIdentity accounts on-chain yet (program ID may have changed)",
          });
        }

        // 2. Extract candidate mint pubkeys from each account's data.
        const candidates = new Set<string>();
        for (const acct of accounts) {
          for (const pk of extractPubkeysFromData(acct.data)) {
            candidates.add(pk);
          }
        }

        if (candidates.size === 0) {
          await heartbeat(
            "registry_scan",
            true,
            Date.now() - startedAt,
            `scanned=${accounts.length} extracted=0`,
          );
          return json(200, { ok: true, scanned: accounts.length, queued: 0 });
        }

        // 3. Skip mints we already know about (agents OR existing candidates).
        const candidateList = Array.from(candidates);
        const [{ data: agentsRows }, { data: existingCandidates }] =
          await Promise.all([
            supabaseAdmin.from("agents").select("mint").in("mint", candidateList),
            supabaseAdmin
              .from("candidate_agents")
              .select("mint")
              .in("mint", candidateList),
          ]);
        const known = new Set<string>([
          ...(agentsRows ?? []).map((r) => r.mint),
          ...(existingCandidates ?? []).map((r) => r.mint),
        ]);
        const fresh = candidateList.filter((m) => !known.has(m));

        let queued = 0;
        if (fresh.length > 0) {
          const { data: inserted, error } = await supabaseAdmin
            .from("candidate_agents")
            .insert(
              fresh.map((mint) => ({
                mint,
                discovered_via: "registry_scan",
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
          `scanned=${accounts.length} extracted=${candidates.size} queued=${queued}`,
        );

        return json(200, {
          ok: true,
          scanned: accounts.length,
          extracted: candidates.size,
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
      params: [
        SOLANA_AGENT_REGISTRY_PROGRAM_ID,
        { encoding: "base64", commitment: "confirmed" },
      ],
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
  // Workers + Node both support Buffer via nodejs_compat.
  return new Uint8Array(Buffer.from(b64, "base64"));
}

function extractPubkeysFromData(data: Uint8Array): string[] {
  const out: string[] = [];
  for (const off of PUBKEY_OFFSETS) {
    if (off + 32 > data.length) continue;
    const slice = data.slice(off, off + 32);
    // Reject all-zero or all-0xff slices (sentinel / uninitialized).
    if (slice.every((b) => b === 0)) continue;
    if (slice.every((b) => b === 255)) continue;
    out.push(base58Encode(slice));
  }
  return out;
}

// Minimal base58 encoder (no external dep). Solana pubkey alphabet.
const B58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function base58Encode(bytes: Uint8Array): string {
  if (bytes.length === 0) return "";
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
  // Convert to base58 via repeated division.
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
