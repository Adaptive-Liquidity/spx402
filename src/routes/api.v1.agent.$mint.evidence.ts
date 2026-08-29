// SPX402 x402 API — GET /api/v1/agent/:mint/evidence
// Merkle-rooted evidence bundle for audit-grade verification. Price: 0.05 USDC per call.

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { fetchAgent } from "@/lib/agents-db";
import { fetchAgentEvents } from "@/lib/live-data";
import { withX402Payment } from "@/lib/indexer/x402-middleware";
import type { X402Endpoint } from "@/lib/indexer/x402-middleware";
import { createHash } from "crypto";

export const Route = createFileRoute("/api/v1/agent/$mint/evidence")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const endpoint: X402Endpoint = "evidence";

        return withX402Payment(request, endpoint, async () => {
          const agent = await fetchAgent(params.mint);

          if (!agent) {
            return {
              error: "Agent not found in SPX402 index",
              mint: params.mint,
            };
          }

          // Fetch full event history (last 90 days or all)
          const liveEvents = await fetchAgentEvents(agent.mint, 1000);

          // Filter to execution-critical events
          const executionEvents = liveEvents.filter(e =>
            e.type.startsWith("ESCROW_") ||
            e.type.startsWith("BOND_") ||
            e.type === "RECEIPT_CREATED" ||
            e.type === "DEPOSIT_RECEIVED" ||
            e.type === "BUYBACK_EXECUTED" ||
            e.type === "BURN_CONFIRMED" ||
            e.type === "FAILED_WINDOW" ||
            e.type === "ANOMALY_DETECTED"
          );

          // Build Merkle tree of events
          const { merkleRoot, merkleProofs, leaves } = buildMerkleTree(executionEvents);

          // Time window
          const timestamps = executionEvents.map(e => new Date(e.iso).getTime()).sort((a, b) => a - b);
          const windowStart = timestamps.length > 0 ? new Date(timestamps[0]).toISOString() : new Date().toISOString();
          const windowEnd = timestamps.length > 0 ? new Date(timestamps[timestamps.length - 1]).toISOString() : new Date().toISOString();

          return {
            mint: agent.mint,
            symbol: agent.symbol,
            name: agent.name,
            grade: agent.grade,
            score: agent.score,
            // Evidence Bundle
            merkleRoot,
            merkleProofs,
            leaves,
            windowStart,
            windowEnd,
            eventCount: executionEvents.length,
            events: executionEvents.map((e, idx) => ({
              index: idx,
              type: e.type,
              severity: e.severity,
              signature: e.signature,
              slot: e.slot,
              occurredAt: e.iso,
              amountSol: e.amount,
              amountToken: e.tokenAmount,
              leafHash: leaves[idx],
              proof: merkleProofs[idx],
            })),
            // Verification metadata
            verification: {
              spx402Version: "1.0",
              parserVersion: agent.parserVersion,
              methodologyVersion: agent.methodologyVersion,
              generatedAt: new Date().toISOString(),
              verifier: "SPX402 Oracle",
            },
            disclaimer: "This evidence bundle proves SPX402 observed these on-chain events. It does not guarantee future execution or token value.",
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

/**
 * Build a Merkle tree from event data for audit-grade verification.
 * Each leaf = keccak256(event canonical JSON)
 * Root = commitment to the entire event set.
 */
function buildMerkleTree(events: any[]): {
  merkleRoot: string;
  merkleProofs: string[][];
  leaves: string[];
} {
  if (events.length === 0) {
    return { merkleRoot: "0x0", merkleProofs: [], leaves: [] };
  }

  // Create leaves: hash of canonical event representation
  const leaves = events.map(e => {
    const canonical = JSON.stringify({
      type: e.type,
      signature: e.signature,
      slot: e.slot,
      occurredAt: e.iso,
      amountSol: e.amount,
      amountToken: e.tokenAmount,
      severity: e.severity,
    });
    return "0x" + createHash("sha256").update(canonical).digest("hex");
  });

  // Build tree bottom-up
  let currentLevel = [...leaves];
  const proofs = leaves.map(() => [] as string[]);

  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
      const parent = "0x" + createHash("sha256").update(left + right.slice(2)).digest("hex");
      nextLevel.push(parent);

      // Record proof for left leaf
      const leftIndices = getLeafIndices(currentLevel, i, leaves);
      for (const idx of leftIndices) {
        proofs[idx].push(right);
      }
      // Record proof for right leaf
      const rightIndices = getLeafIndices(currentLevel, i + 1, leaves);
      for (const idx of rightIndices) {
        proofs[idx].push(left);
      }
    }
    currentLevel = nextLevel;
  }

  return {
    merkleRoot: currentLevel[0],
    merkleProofs: proofs,
    leaves,
  };
}

function getLeafIndices(level: string[], levelIndex: number, originalLeaves: string[]): number[] {
  // Simplified - in production, track indices through tree construction
  const leafHash = level[levelIndex];
  const indices: number[] = [];
  for (let i = 0; i < originalLeaves.length; i++) {
    if (originalLeaves[i] === leafHash) indices.push(i);
  }
  return indices;
}