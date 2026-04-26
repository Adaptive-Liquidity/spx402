// One-shot Helius webhook management. Call this with the shared secret to
// create-or-update a single Enhanced Transactions webhook that points at
// /api/public/webhook-helius and watches the Pump.fun program plus every
// known agent mint + deposit address.
//
// Usage:
//   POST /api/public/helius-webhook-setup
//   Authorization: <HELIUS_WEBHOOK_SECRET>
//
// Optional query params:
//   ?webhookUrl=https://spx402.com/api/public/webhook-helius   (override)
//   ?network=mainnet|devnet                                     (default mainnet)
//
// Returns the webhookID. Call again any time agents are added/removed.

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { PUMPFUN_PROGRAM_ID } from "@/lib/indexer/helius.server";

const HELIUS_API_BASE = "https://api.helius.xyz/v0";

interface HeliusWebhook {
  webhookID: string;
  webhookURL: string;
  accountAddresses: string[];
  transactionTypes: string[];
  webhookType: string;
  authHeader?: string;
}

export const Route = createFileRoute("/api/public/helius-webhook-setup")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        }),
      GET: async ({ request }) => handle(request, "list"),
      POST: async ({ request }) => handle(request, "upsert"),
      DELETE: async ({ request }) => handle(request, "delete"),
    },
  },
});

async function handle(
  request: Request,
  action: "list" | "upsert" | "delete",
): Promise<Response> {
  const sharedSecret = process.env.HELIUS_WEBHOOK_SECRET;
  const heliusKey = process.env.HELIUS_API_KEY;

  if (!sharedSecret || !heliusKey) {
    return json(500, {
      ok: false,
      error: "Missing HELIUS_API_KEY or HELIUS_WEBHOOK_SECRET in server env.",
    });
  }
  const auth = request.headers.get("authorization") ?? "";
  if (auth !== sharedSecret && auth !== `Bearer ${sharedSecret}`) {
    return json(401, { ok: false, error: "unauthorized" });
  }

  const url = new URL(request.url);
  const webhookUrl =
    url.searchParams.get("webhookUrl") ??
    `${url.origin}/api/public/webhook-helius`;

  // Pull every agent mint + deposit address.
  const { data: agents } = await supabaseAdmin
    .from("agents")
    .select("mint, deposit_address");
  const agentAddrs = new Set<string>();
  for (const a of agents ?? []) {
    if (a.mint) agentAddrs.add(a.mint);
    if (a.deposit_address) agentAddrs.add(a.deposit_address);
  }
  // Always watch Pump.fun program so we can attribute buybacks even before
  // an agent is registered.
  agentAddrs.add(PUMPFUN_PROGRAM_ID);
  const accountAddresses = Array.from(agentAddrs);

  // Find an existing SPX402 webhook (by URL match) so we update instead of
  // creating duplicates.
  const existing = await listWebhooks(heliusKey);
  const ours = existing.find((w) => w.webhookURL === webhookUrl);

  if (action === "list") {
    return json(200, {
      ok: true,
      webhookUrl,
      existing: ours ?? null,
      allWebhooks: existing.map((w) => ({
        id: w.webhookID,
        url: w.webhookURL,
        addresses: w.accountAddresses.length,
      })),
      proposedAddresses: accountAddresses,
    });
  }

  if (action === "delete") {
    if (!ours) return json(404, { ok: false, error: "no webhook to delete" });
    const res = await fetch(
      `${HELIUS_API_BASE}/webhooks/${ours.webhookID}?api-key=${heliusKey}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      return json(res.status, {
        ok: false,
        error: `helius delete failed: ${await res.text()}`,
      });
    }
    return json(200, { ok: true, deleted: ours.webhookID });
  }

  // upsert
  if (accountAddresses.length === 0) {
    return json(400, {
      ok: false,
      error: "no addresses to watch (no agents seeded yet)",
    });
  }

  const body = {
    webhookURL: webhookUrl,
    transactionTypes: ["ANY"],
    accountAddresses,
    webhookType: "enhanced",
    authHeader: sharedSecret,
  };

  let webhookID: string;
  let mode: "created" | "updated";
  if (ours) {
    const res = await fetch(
      `${HELIUS_API_BASE}/webhooks/${ours.webhookID}?api-key=${heliusKey}`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      return json(res.status, {
        ok: false,
        error: `helius update failed: ${await res.text()}`,
      });
    }
    const w = (await res.json()) as HeliusWebhook;
    webhookID = w.webhookID;
    mode = "updated";
  } else {
    const res = await fetch(`${HELIUS_API_BASE}/webhooks?api-key=${heliusKey}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      return json(res.status, {
        ok: false,
        error: `helius create failed: ${await res.text()}`,
      });
    }
    const w = (await res.json()) as HeliusWebhook;
    webhookID = w.webhookID;
    mode = "created";
  }

  await supabaseAdmin.from("indexer_runs").insert({
    worker: "webhook_setup",
    ok: true,
    duration_ms: 0,
    notes: `${mode} webhook ${webhookID} addresses=${accountAddresses.length}`,
  });

  return json(200, {
    ok: true,
    mode,
    webhookID,
    webhookURL: webhookUrl,
    addresses: accountAddresses.length,
  });
}

async function listWebhooks(apiKey: string): Promise<HeliusWebhook[]> {
  const res = await fetch(`${HELIUS_API_BASE}/webhooks?api-key=${apiKey}`);
  if (!res.ok) return [];
  return (await res.json()) as HeliusWebhook[];
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
