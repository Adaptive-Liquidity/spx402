// x402 Middleware — HTTP 402 Payment Required flow for SPX402 API.
// Server-only.
//
// Two ways to be authorised:
//   1. A valid, active API key (`x-api-key`) inside its daily quota. Access
//      is granted immediately; every call is metered.
//   2. A keyless x402 payment (`x-payment`) carrying a Base transaction hash.
//      The transaction is verified ON-CHAIN — right recipient, right asset,
//      sufficient amount, confirmed, recent, and not already spent on another
//      call. Self-declared payment payloads are never trusted.

import { createClient } from "@supabase/supabase-js";
import { createPublicClient, decodeEventLog, http, parseAbiItem, type Address } from "viem";
import { ENDPOINT_PRICES, TIER_LIMITS, type ApiTier, type X402Endpoint } from "@/lib/api-tiers";

export type { X402Endpoint };

/** USDC on Base mainnet. */
export const BASE_USDC_ADDRESS = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913" as const;

const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)",
);

export const X402_CONFIG = {
  PRICES: ENDPOINT_PRICES,
  NETWORK: "base",
  /** A settlement older than this is not accepted as payment for a new call. */
  MAX_PAYMENT_AGE_SECONDS: 60 * 60 * 24,
  MAX_DEADLINE_SECONDS: 60 * 60 * 24,
  TIER_LIMITS,
} as const;

/** Base blocks are ~2s; 2 confirmations is cheap insurance against a reorg. */
const MIN_CONFIRMATIONS = 2;


function payToAddress(): string | null {
  const v = process.env["X402_PAY_TO_ADDRESS"];
  return v ? v.toLowerCase() : null;
}

function admin() {
  return createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_SERVICE_ROLE_KEY"]!);
}

export interface X402PaymentPayload {
  x402Version: 1;
  scheme: "exact";
  network: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: "application/json";
  outputSchema: Record<string, unknown>;
  asset: Address;
  payTo: Address | null;
  maxDeadline: number;
  extra: Record<string, unknown>;
}

/** Pulls a Base tx hash out of whatever shape the caller sent. */
function extractTxHash(header: string): string | null {
  const direct = header.trim();
  if (/^0x[0-9a-fA-F]{64}$/.test(direct)) return direct.toLowerCase();
  try {
    const decoded = JSON.parse(Buffer.from(header, "base64").toString()) as Record<string, unknown>;
    const candidates = [
      decoded["txHash"],
      decoded["transactionHash"],
      (decoded["payload"] as Record<string, unknown> | undefined)?.["txHash"],
      ((decoded["payload"] as Record<string, unknown> | undefined)?.["extra"] as
        | Record<string, unknown>
        | undefined)?.["txHash"],
    ];
    for (const c of candidates) {
      if (typeof c === "string" && /^0x[0-9a-fA-F]{64}$/.test(c)) return c.toLowerCase();
    }
  } catch {
    // fall through
  }
  return null;
}

/**
 * Verify an x402 payment against Base. Returns the payer when the settlement
 * is real, unspent and sufficient.
 */
export async function verifyX402Payment(
  paymentHeader: string,
  expectedAmount: number,
  endpoint: X402Endpoint,
  resource: string,
): Promise<{ valid: boolean; payer?: Address; error?: string }> {
  const payTo = payToAddress();
  if (!payTo) return { valid: false, error: "Payments are not configured on this deployment" };

  const rpcUrl = process.env["BASE_RPC_URL"];
  if (!rpcUrl) return { valid: false, error: "Payments are not configured on this deployment" };

  const txHash = extractTxHash(paymentHeader);
  if (!txHash) return { valid: false, error: "x-payment must carry a Base transaction hash" };

  const client = createPublicClient({ transport: http(rpcUrl) });

  let receipt;
  try {
    receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` });
  } catch {
    return { valid: false, error: "Transaction not found on Base" };
  }
  if (receipt.status !== "success") return { valid: false, error: "Transaction reverted" };

  // Sum USDC actually delivered to our address in this transaction.
  let paid = 0n;
  let payer: string | null = null;
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== BASE_USDC_ADDRESS) continue;
    try {
      const parsed = decodeEventLog({ abi: [TRANSFER_EVENT], data: log.data, topics: log.topics });
      const args = parsed.args as unknown as { from: string; to: string; value: bigint };
      if (args.to.toLowerCase() !== payTo) continue;
      paid += args.value;
      payer ??= args.from.toLowerCase();
    } catch {
      continue;
    }
  }
  if (paid === 0n) return { valid: false, error: "No USDC payment to the SPX402 address" };
  if (paid < BigInt(expectedAmount)) {
    return { valid: false, error: `Underpaid. Expected ${expectedAmount} USDC base units` };
  }

  // Freshness + reorg safety. A settlement in the newest block can still be
  // re-orged out after we've handed over the response, so require a small
  // confirmation depth before we treat it as final.
  try {
    const [block, head] = await Promise.all([
      client.getBlock({ blockNumber: receipt.blockNumber }),
      client.getBlockNumber(),
    ]);
    const confirmations = Number(head - receipt.blockNumber) + 1;
    if (confirmations < MIN_CONFIRMATIONS) {
      return { valid: false, error: "Payment is not confirmed yet — retry in a few seconds" };
    }
    const age = Math.floor(Date.now() / 1000) - Number(block.timestamp);
    if (age > X402_CONFIG.MAX_PAYMENT_AGE_SECONDS) {
      return { valid: false, error: "Payment is too old" };
    }
  } catch {
    return { valid: false, error: "Could not read the settlement block" };
  }

  // Replay protection — a settlement buys exactly one call.
  const { error: claimError } = await admin().from("x402_payments").insert({
    tx_hash: txHash,
    chain: "base",
    payer,
    pay_to: payTo,
    amount: Number(paid),
    endpoint,
    resource,
  });
  if (claimError) {
    return { valid: false, error: "This payment has already been used" };
  }

  return { valid: true, payer: (payer ?? "0x") as Address };
}

export async function checkApiKeyAuth(apiKey: string): Promise<{
  valid: boolean;
  tier: ApiTier;
  dailyLimit: number;
  usedToday: number;
  keyId: string;
} | null> {
  let supabase;
  try {
    supabase = admin();
  } catch (e) {
    console.error("[x402] supabase client unavailable", e);
    return null;
  }
  const { data: keyData, error } = await supabase
    .from("api_keys")
    .select("id, tier, status, revoked_at, expires_at, daily_limit")
    .eq("key_hash", await hashApiKey(apiKey))
    .maybeSingle();

  if (error || !keyData || keyData.revoked_at || keyData.status !== "active") return null;
  if (keyData.expires_at && new Date(keyData.expires_at).getTime() < Date.now()) return null;

  const tier = (keyData.tier as ApiTier) ?? "free";
  const dailyLimit = (keyData.daily_limit as number) || TIER_LIMITS[tier];

  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("api_usage")
    .select("*", { count: "exact", head: true })
    .eq("api_key_id", keyData.id)
    .gte("created_at", since.toISOString());

  return { valid: true, tier, dailyLimit, usedToday: count ?? 0, keyId: keyData.id };
}

async function hashApiKey(key: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function recordApiUsage(
  apiKeyId: string | null,
  endpoint: X402Endpoint,
  payer: string | null,
  status: "success" | "payment_required" | "rate_limited" | "error",
): Promise<void> {
  // Keyed calls record against the key; keyless paid calls record against the
  // payer so the traction dashboard sees real network usage either way.
  if (!apiKeyId && !payer) return;
  await admin().from("api_usage").insert({
    api_key_id: apiKeyId,
    endpoint,
    payer,
    status,
  });
}

export function createPaymentRequiredResponse(
  endpoint: X402Endpoint,
  resource: string,
  description: string,
): Response {
  const amount = X402_CONFIG.PRICES[endpoint];
  const payTo = payToAddress();

  const payload: X402PaymentPayload = {
    x402Version: 1,
    scheme: "exact",
    network: X402_CONFIG.NETWORK,
    maxAmountRequired: amount.toString(),
    resource,
    description,
    mimeType: "application/json",
    outputSchema: getOutputSchema(endpoint),
    asset: BASE_USDC_ADDRESS as Address,
    payTo: (payTo as Address) ?? null,
    maxDeadline: Math.floor(Date.now() / 1000) + X402_CONFIG.MAX_DEADLINE_SECONDS,
    extra: {
      endpoint,
      spx402: true,
      settlement:
        "Send USDC on Base to payTo (direct transfer or EIP-3009 transferWithAuthorization relayed by any facilitator), then retry with x-payment: <txHash>",
      alternative: "Or send an API key as x-api-key",
      // Explicit policy: SPX402 sponsors nothing. The caller funds their own
      // USDC settlement and all execution/gas fees — no paymaster, no free
      // compute, no subsidized gas envelopes.
      gasPolicy:
        "Caller-funded settlement only. SPX402 does not sponsor gas via any paymaster; callers and agents bring their own funds.",
      inputSchema: getInputSchema(endpoint),
      discoverable: true,
    },
  };

  return new Response(
    JSON.stringify({
      x402: payload,
      ...(payTo ? {} : { note: "Keyless payment is not enabled yet — use an API key." }),
    }),
    {
      status: 402,
      headers: {
        "Content-Type": "application/json",
        "X-Payment-Required": "true",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}

function getInputSchema(endpoint: X402Endpoint): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      mint: {
        type: "string",
        description:
          "Agent identifier — Solana mint, MPL core asset, or executor wallet, depending on the agent's identifier_kind.",
      },
    },
    required: ["mint"],
    additionalProperties: false,
    _endpoint: endpoint,
  };
}

function getOutputSchema(endpoint: X402Endpoint): Record<string, unknown> {
  switch (endpoint) {
    case "score":
      return {
        type: "object",
        properties: {
          mint: { type: "string" },
          grade: { type: "string" },
          score: { type: "number" },
          activeBond: { type: "number" },
          escrowSuccessRate: { type: "number" },
          totalSlashed: { type: "number" },
          confidence: { type: "string" },
          lastIndexed: { type: "string" },
        },
        required: ["mint", "grade", "score"],
      };
    case "dossier":
      return {
        type: "object",
        properties: {
          mint: { type: "string" },
          grade: { type: "string" },
          score: { type: "number" },
          verdict: { type: "string" },
          events: { type: "array" },
          svgCard: { type: "string" },
        },
        required: ["mint", "grade", "score"],
      };
    case "evidence":
      return {
        type: "object",
        properties: {
          mint: { type: "string" },
          merkleRoot: { type: "string" },
          windowStart: { type: "string" },
          windowEnd: { type: "string" },
          eventCount: { type: "number" },
          events: { type: "array" },
        },
        required: ["mint", "merkleRoot", "windowStart", "windowEnd"],
      };
  }
}

const DESCRIPTIONS: Record<X402Endpoint, string> = {
  score: "SPX402 Execution Grade — lightweight score, bond, and success rate",
  dossier: "SPX402 Full Agent Dossier — complete terminal data with events and SVG card",
  evidence: "SPX402 Evidence Bundle — Merkle-rooted proof of execution for a subject",
};

function ok(result: unknown, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      ...extraHeaders,
    },
  });
}

/**
 * Main middleware wrapper for x402-protected endpoints.
 */
export async function withX402Payment<T>(
  request: Request,
  endpoint: X402Endpoint,
  handler: (context: { payer: Address | null; apiKeyId?: string }) => Promise<T>,
): Promise<Response> {
  const url = new URL(request.url);
  const resource = url.pathname;

  // ── 1. API key path.
  const apiKey = request.headers.get("x-api-key") ?? bearerKey(request);
  if (apiKey) {
    let auth: Awaited<ReturnType<typeof checkApiKeyAuth>> = null;
    try {
      auth = await checkApiKeyAuth(apiKey);
    } catch (e) {
      console.error("[x402] key lookup failed", e);
      return new Response(JSON.stringify({ error: "Key verification unavailable" }), {
        status: 503,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
    if (!auth) {
      return new Response(JSON.stringify({ error: "Invalid or revoked API key" }), {
        status: 401,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
    if (auth.usedToday >= auth.dailyLimit) {
      await recordApiUsage(auth.keyId, endpoint, null, "rate_limited");
      return new Response(
        JSON.stringify({
          error: "Daily rate limit exceeded",
          dailyLimit: auth.dailyLimit,
          usedToday: auth.usedToday,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "X-RateLimit-Limit": String(auth.dailyLimit),
            "X-RateLimit-Remaining": "0",
          },
        },
      );
    }
    try {
      const result = await handler({ payer: null, apiKeyId: auth.keyId });
      await recordApiUsage(auth.keyId, endpoint, null, "success");
      return ok(result, {
        "X-RateLimit-Limit": String(auth.dailyLimit),
        "X-RateLimit-Remaining": String(Math.max(0, auth.dailyLimit - auth.usedToday - 1)),
      });
    } catch {
      await recordApiUsage(auth.keyId, endpoint, null, "error");
      return new Response(JSON.stringify({ error: "Internal error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // ── 2. Keyless pay-per-call path.
  const paymentHeader = request.headers.get("x-payment");
  if (paymentHeader) {
    const payment = await verifyX402Payment(
      paymentHeader,
      X402_CONFIG.PRICES[endpoint],
      endpoint,
      resource,
    );
    if (!payment.valid) {
      return new Response(JSON.stringify({ error: payment.error ?? "Payment not verified" }), {
        status: 402,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
    try {
      const result = await handler({ payer: payment.payer ?? null });
      await recordApiUsage(null, endpoint, payment.payer ?? null, "success");
      return ok(result);
    } catch {
      await recordApiUsage(null, endpoint, payment.payer ?? null, "error");
      return new Response(JSON.stringify({ error: "Internal error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  return createPaymentRequiredResponse(endpoint, resource, DESCRIPTIONS[endpoint]);
}

function bearerKey(request: Request): string | null {
  const h = request.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  const v = h.slice(7).trim();
  return v.startsWith("spx_") ? v : null;
}
