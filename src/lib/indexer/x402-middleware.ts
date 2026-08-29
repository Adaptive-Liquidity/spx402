// x402 Middleware — HTTP 402 Payment Required flow for SPX402 API
// Server-only. Handles payment verification, API key auth, and rate limiting.

import { createClient } from "@supabase/supabase-js";
import type { Address } from "viem";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// x402 Configuration
export const X402_CONFIG = {
  // Pricing in USDC (6 decimals)
  PRICES: {
    score: 10_000,      // 0.01 USDC
    dossier: 50_000,    // 0.05 USDC
    evidence: 50_000,   // 0.05 USDC
  } as const,

  // USDC on Base (mainnet)
  PAY_TO: process.env.X402_PAY_TO_ADDRESS as Address,
  NETWORK: "base",
  MAX_DEADLINE_SECONDS: 60 * 60 * 24, // 24 hours

  // Free tier limits (per API key per day)
  FREE_TIER_DAILY_LIMIT: 10,
  PRO_TIER_DAILY_LIMIT: 1_000,
  TEAM_TIER_DAILY_LIMIT: 10_000,
} as const;

export type X402Endpoint = keyof typeof X402_CONFIG.PRICES;

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
  payTo: Address;
  maxDeadline: number;
  extra: Record<string, unknown>;
}

export interface X402PaymentResponse {
  x402Version: 1;
  scheme: "exact";
  network: string;
  payer: Address;
  payload: X402PaymentPayload;
}

/**
 * Verify an x402 payment by checking the transaction on-chain.
 * In production, this would use a proper x402 verifier library.
 * For now, we trust the payment header and verify via Supabase logging.
 */
export async function verifyX402Payment(
  paymentHeader: string,
  expectedAmount: number,
  endpoint: X402Endpoint,
): Promise<{ valid: boolean; payer?: Address; error?: string }> {
  try {
    // Parse the payment header (base64 encoded JSON)
    const decoded = JSON.parse(Buffer.from(paymentHeader, "base64").toString()) as X402PaymentResponse;

    // Basic validation
    if (decoded.x402Version !== 1) {
      return { valid: false, error: "Unsupported x402 version" };
    }
    if (decoded.scheme !== "exact") {
      return { valid: false, error: "Only 'exact' scheme supported" };
    }
    if (decoded.network !== X402_CONFIG.NETWORK) {
      return { valid: false, error: `Wrong network. Expected ${X402_CONFIG.NETWORK}` };
    }
    if (decoded.payload.maxAmountRequired !== expectedAmount.toString()) {
      return { valid: false, error: `Amount mismatch. Expected ${expectedAmount}` };
    }
    if (decoded.payload.payTo.toLowerCase() !== X402_CONFIG.PAY_TO.toLowerCase()) {
      return { valid: false, error: "Invalid payee address" };
    }

    // Check deadline
    const now = Math.floor(Date.now() / 1000);
    if (decoded.payload.maxDeadline < now) {
      return { valid: false, error: "Payment deadline expired" };
    }

    // TODO: In production, verify the actual transaction on Base using a RPC
    // For now, we accept validly structured payments and log them

    return { valid: true, payer: decoded.payer };
  } catch (e) {
    return { valid: false, error: `Invalid payment header: ${e}` };
  }
}

/**
 * Check API key tier and rate limits
 */
export async function checkApiKeyAuth(
  apiKey: string,
): Promise<{ valid: boolean; tier: "free" | "pro" | "team"; dailyLimit: number; usedToday: number } | null> {
  // Look up API key in database
  const { data: keyData, error } = await supabase
    .from("api_keys")
    .select("id, tier, user_id, name, revoked_at")
    .eq("key_hash", hashApiKey(apiKey))
    .maybeSingle();

  if (error || !keyData || keyData.revoked_at) {
    return null;
  }

  const tier = keyData.tier as "free" | "pro" | "team";
  const dailyLimit = tier === "free" ? X402_CONFIG.FREE_TIER_DAILY_LIMIT
    : tier === "pro" ? X402_CONFIG.PRO_TIER_DAILY_LIMIT
    : X402_CONFIG.TEAM_TIER_DAILY_LIMIT;

  // Count usage today
  const today = new Date().toISOString().split("T")[0];
  const { count } = await supabase
    .from("api_usage")
    .select("*", { count: "exact", head: true })
    .eq("api_key_id", keyData.id)
    .gte("created_at", `${today}T00:00:00Z`)
    .lt("created_at", `${today}T23:59:59Z`);

  const usedToday = count ?? 0;

  return { valid: true, tier, dailyLimit, usedToday };
}

function hashApiKey(key: string): string {
  // Simple hash for storage - in production use bcrypt or argon2
  const crypto = await import("crypto");
  return crypto.createHash("sha256").update(key).digest("hex");
}

/**
 * Record API usage for rate limiting
 */
export async function recordApiUsage(
  apiKeyId: string,
  endpoint: X402Endpoint,
  payer: Address | null,
  status: "success" | "payment_required" | "rate_limited" | "error",
): Promise<void> {
  await supabase.from("api_usage").insert({
    api_key_id: apiKeyId,
    endpoint,
    payer: payer ?? null,
    status,
    created_at: new Date().toISOString(),
  });
}

/**
 * Create the HTTP 402 response with payment details
 */
export function createPaymentRequiredResponse(
  endpoint: X402Endpoint,
  resource: string,
  description: string,
): Response {
  const amount = X402_CONFIG.PRICES[endpoint];

  const payload: X402PaymentPayload = {
    x402Version: 1,
    scheme: "exact",
    network: X402_CONFIG.NETWORK,
    maxAmountRequired: amount.toString(),
    resource,
    description,
    mimeType: "application/json",
    outputSchema: getOutputSchema(endpoint),
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address, // USDC on Base
    payTo: X402_CONFIG.PAY_TO,
    maxDeadline: Math.floor(Date.now() / 1000) + X402_CONFIG.MAX_DEADLINE_SECONDS,
    extra: {
      endpoint,
      spx402: true,
    },
  };

  return new Response(JSON.stringify({ x402: payload }), {
    status: 402,
    headers: {
      "Content-Type": "application/json",
      "X-Payment-Required": "true",
      "Access-Control-Allow-Origin": "*",
    },
  });
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
          symbol: { type: "string" },
          name: { type: "string" },
          grade: { type: "string" },
          score: { type: "number" },
          verdict: { type: "string" },
          activeBond: { type: "number" },
          escrowSuccessRate: { type: "number" },
          totalSlashed: { type: "number" },
          escrowsCompleted: { type: "number" },
          escrowsFailed: { type: "number" },
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

/**
 * Main middleware wrapper for x402-protected endpoints
 */
export async function withX402Payment<T>(
  request: Request,
  endpoint: X402Endpoint,
  handler: (context: { payer: Address; apiKeyId?: string }) => Promise<T>,
): Promise<Response> {
  const url = new URL(request.url);
  const resource = url.pathname;

  // Check for API key (for authenticated/rate-limited access)
  const apiKey = request.headers.get("x-api-key");
  let apiKeyContext: { tier: string; dailyLimit: number; usedToday: number; keyId: string } | null = null;

  if (apiKey) {
    const auth = await checkApiKeyAuth(apiKey);
    if (auth) {
      if (auth.usedToday >= auth.dailyLimit) {
        await recordApiUsage(auth.keyId, endpoint, null, "rate_limited");
        return new Response(JSON.stringify({ error: "Daily rate limit exceeded" }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        });
      }
      apiKeyContext = { ...auth, keyId: auth.dailyLimit.toString() }; // keyId stored in dailyLimit field temporarily
    }
  }

  // Check for x402 payment
  const paymentHeader = request.headers.get("x-payment");
  const expectedAmount = X402_CONFIG.PRICES[endpoint];

  if (paymentHeader) {
    const payment = await verifyX402Payment(paymentHeader, expectedAmount, endpoint);
    if (payment.valid && payment.payer) {
      // Payment valid - execute handler
      if (apiKeyContext) {
        await recordApiUsage(apiKeyContext.keyId, endpoint, payment.payer, "success");
      }
      try {
        const result = await handler({ payer: payment.payer, apiKeyId: apiKeyContext?.keyId });
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }
  }

  // No valid payment - return 402
  const descriptions: Record<X402Endpoint, string> = {
    score: "SPX402 Execution Grade — lightweight score, bond, and success rate",
    dossier: "SPX402 Full Agent Dossier — complete terminal data with events and SVG card",
    evidence: "SPX402 Evidence Bundle — Merkle-rooted proof of execution for audit",
  };

  return createPaymentRequiredResponse(endpoint, resource, descriptions[endpoint]);
}