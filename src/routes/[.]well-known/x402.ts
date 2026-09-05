// Tier 1 §1 — x402 discovery manifest.
//
// GET /.well-known/x402
//
// Machine-readable catalog of every pay-per-call resource SPX402 serves.
// This is what the x402 Bazaar, MCP servers, AgentKit, and any x402-aware
// runtime crawls to learn what we sell, at what price, on which network —
// without anyone writing manual 402-retry and payment-signing code.
//
// Policy note (kept in the payload so no integrator can miss it): SPX402 is
// strictly pay-per-call with zero free tier on these resources. We do NOT
// sponsor gas via any paymaster — callers and agents fund their own USDC
// settlement and all execution fees.

import { createFileRoute } from "@tanstack/react-router";
import { ENDPOINT_PRICES } from "@/lib/api-tiers";
import { BASE_USDC_ADDRESS, X402_CONFIG } from "@/lib/indexer/x402-middleware";

interface ResourceDef {
  endpoint: keyof typeof ENDPOINT_PRICES;
  path: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
}

const MINT_INPUT: Record<string, unknown> = {
  type: "object",
  properties: {
    mint: {
      type: "string",
      description:
        "Agent identifier — Solana mint, MPL core asset, or executor wallet, depending on identifier_kind.",
    },
  },
  required: ["mint"],
  additionalProperties: false,
};

const RESOURCES: ResourceDef[] = [
  {
    endpoint: "score",
    path: "/api/v1/agent/{mint}/score",
    description: "SPX402 Execution Grade — lightweight score, bond, and success rate",
    inputSchema: MINT_INPUT,
    outputSchema: {
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
    },
  },
  {
    endpoint: "dossier",
    path: "/api/v1/agent/{mint}/dossier",
    description:
      "SPX402 Full Agent Dossier — complete terminal data with events and SVG card",
    inputSchema: MINT_INPUT,
    outputSchema: {
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
    },
  },
  {
    endpoint: "evidence",
    path: "/api/v1/agent/{mint}/evidence",
    description: "SPX402 Evidence Bundle — Merkle-rooted proof of execution for a subject",
    inputSchema: MINT_INPUT,
    outputSchema: {
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
    },
  },
];

const POLICIES = {
  settlement:
    "Caller-funded only. Pay in USDC on Base to the resource's payTo address — direct transfer or EIP-3009 transferWithAuthorization relayed by any facilitator — then retry with x-payment: <txHash>.",
  gas: "SPX402 does not sponsor gas via any paymaster. Callers and agents supply their own USDC settlement and execution fees; there is no free tier and no subsidized compute.",
  replay: "One settlement buys exactly one call; transaction hashes are single-use.",
};

export const Route = createFileRoute("/.well-known/x402")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const body = {
          x402Version: 1,
          provider: "SPX402",
          homepage: origin,
          generated_at: new Date().toISOString(),
          resources: RESOURCES.map((r) => ({
            resource: `${origin}${r.path}`,
            type: "http",
            method: "GET",
            x402Version: 1,
            description: r.description,
            mimeType: "application/json",
            inputSchema: r.inputSchema,
            outputSchema: r.outputSchema,
            accepts: [
              {
                scheme: "exact",
                network: X402_CONFIG.NETWORK,
                maxAmountRequired: ENDPOINT_PRICES[r.endpoint].toString(),
                asset: BASE_USDC_ADDRESS,
                payTo: process.env["X402_PAY_TO_ADDRESS"] ?? null,
                maxDeadlineSeconds: X402_CONFIG.MAX_DEADLINE_SECONDS,
                extra: { endpoint: r.endpoint, spx402: true },
              },
            ],
          })),
          policies: POLICIES,
          links: {
            verifiedFeed: `${origin}/api/public/verified`,
            mcp: `${origin}/api/public/mcp`,
            methodology: `${origin}/methodology`,
          },
        };
        return new Response(JSON.stringify(body, null, 2), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            // Discovery data changes rarely — let CDNs and crawlers cache it.
            "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
          },
        });
      },
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }),
    },
  },
});
