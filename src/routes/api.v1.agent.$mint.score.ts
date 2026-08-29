// SPX402 x402 API — GET /api/v1/agent/:mint/score
// Lightweight execution grade check. Price: 0.01 USDC per call.

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { fetchAgent } from "@/lib/agents-db";
import { withX402Payment } from "@/lib/indexer/x402-middleware";
import type { X402Endpoint } from "@/lib/indexer/x402-middleware";

export const Route = createFileRoute("/api/v1/agent/$mint/score")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const endpoint: X402Endpoint = "score";

        return withX402Payment(request, endpoint, async () => {
          const agent = await fetchAgent(params.mint);

          if (!agent) {
            return {
              error: "Agent not found in SPX402 index",
              mint: params.mint,
              suggestion: "Submit the mint to /register for analysis",
            };
          }

          return {
            mint: agent.mint,
            symbol: agent.symbol,
            name: agent.name,
            grade: agent.grade,
            score: agent.score,
            confidence: agent.confidence,
            // AEON Execution Primitives
            activeBond: agent.activeBondAmount ?? 0,
            escrowSuccessRate: agent.escrowSuccessRate ?? 0,
            totalSlashed: agent.totalSlashedUsd ?? 0,
            escrowsCompleted: agent.totalEscrowsCompleted ?? 0,
            escrowsFailed: agent.totalEscrowsFailed ?? 0,
            lastIndexed: new Date(Date.now() - agent.lastIndexedSeconds * 1000).toISOString(),
            // Metadata
            operatorVerified: agent.operatorVerified,
            category: agent.category,
            chain: agent.chain,
            methodologyVersion: agent.methodologyVersion,
          };
        });
      },
      OPTIONS: async () => new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Payment, X-API-Key",
        },
      }),
    },
  },
});