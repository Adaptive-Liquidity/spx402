// SPX402 x402 API — GET /api/v1/agent/:mint/dossier
// Full agent dossier with events and SVG terminal card. Price: 0.05 USDC per call.

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { fetchAgent } from "@/lib/agents-db";
import { fetchAgentEvents } from "@/lib/live-data";
import { withX402Payment } from "@/lib/indexer/x402-middleware";
import type { X402Endpoint } from "@/lib/indexer/x402-middleware";

export const Route = createFileRoute("/api/v1/agent/$mint/dossier")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const endpoint: X402Endpoint = "dossier";

        return withX402Payment(request, endpoint, async () => {
          const agent = await fetchAgent(params.mint);

          if (!agent) {
            return {
              error: "Agent not found in SPX402 index",
              mint: params.mint,
              suggestion: "Submit the mint to /register for analysis",
            };
          }

          // Fetch live events
          const liveEvents = await fetchAgentEvents(agent.mint, 200);

          // Generate SVG terminal card (simplified version)
          const svgCard = generateTerminalCardSVG(agent, liveEvents);

          return {
            mint: agent.mint,
            identifier: agent.identifier,
            identifierKind: agent.identifierKind,
            chain: agent.chain,
            category: agent.category,
            symbol: agent.symbol,
            name: agent.name,
            tagline: agent.tagline,
            grade: agent.grade,
            score: agent.score,
            status: agent.status,
            confidence: agent.confidence,
            confidenceScore: agent.confidenceScore,
            operatorVerified: agent.operatorVerified,
            // AEON Execution Primitives
            activeBond: agent.activeBondAmount ?? 0,
            escrowSuccessRate: agent.escrowSuccessRate ?? 0,
            totalSlashed: agent.totalSlashedUsd ?? 0,
            escrowsCompleted: agent.totalEscrowsCompleted ?? 0,
            escrowsFailed: agent.totalEscrowsFailed ?? 0,
            // Legacy metrics (for backward compat)
            totalDepositsCount: agent.totalDepositsCount,
            totalBuybacksCount: agent.totalBuybacksCount,
            totalBurnsCount: agent.totalBurnsCount,
            failedWindows: agent.failedWindows,
            buybackExecutionRate: agent.buybackExecutionRate,
            burnConfirmationRate: agent.burnConfirmationRate,
            buybackBps: agent.buybackBps,
            // Timestamps
            lastIndexed: new Date(Date.now() - agent.lastIndexedSeconds * 1000).toISOString(),
            parserVersion: agent.parserVersion,
            methodologyVersion: agent.methodologyVersion,
            // Events
            events: liveEvents.map((e) => ({
              type: e.type,
              severity: e.severity,
              signature: e.signature,
              amount: e.amountSol,
              tokenAmount: e.amountToken,
              slot: e.slot,
              facilitatorId: e.facilitatorId,
              occurredAt: e.occurredAt,
            })),
            // SVG Terminal Card for embedding
            svgCard,
            // Disclaimer
            disclaimer:
              "SPX402 grades observable on-chain execution only. Not investment advice. Past performance ≠ future results.",
          };
        });
      },
      OPTIONS: async () =>
        new Response(null, {
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

function generateTerminalCardSVG(agent: any, events: any[]): string {
  const gradeColor = getGradeColor(agent.grade);
  const shortMint = `${agent.mint.slice(0, 6)}…${agent.mint.slice(-6)}`;
  const timestamp = new Date().toISOString().slice(0, 19).replace("T", " ");

  // Count event types
  const escrowEvents = events.filter((e) => e.type.startsWith("ESCROW_")).length;
  const bondEvents = events.filter((e) => e.type.startsWith("BOND_")).length;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1A1A18"/>
      <stop offset="100%" stop-color="#0B0B0A"/>
    </linearGradient>
  </defs>
  
  <rect width="800" height="600" fill="url(#bg)"/>
  <rect x="20" y="20" width="760" height="560" fill="none" stroke="#7A5A28" stroke-width="2" rx="4"/>
  <rect x="22" y="22" width="756" height="556" fill="none" stroke="#F5A623" stroke-width="0.5" rx="3"/>

  <!-- Header -->
  <text x="50" y="65" font-family="'IBM Plex Mono', monospace" font-size="11" fill="#F5A623" letter-spacing="2">SPX402 DOSSIER / ${timestamp}</text>
  
  <!-- Agent Identity -->
  <text x="50" y="110" font-family="'Space Grotesk', sans-serif" font-size="28" font-weight="bold" fill="#E8E8E0">$${agent.symbol} — ${agent.name}</text>
  <text x="50" y="135" font-family="'IBM Plex Mono', monospace" font-size="11" fill="#B8B8AA">MINT: ${shortMint}  |  CHAIN: ${agent.chain.toUpperCase()}  |  CATEGORY: ${agent.category.toUpperCase()}</text>

  <!-- Grade Badge -->
  <rect x="50" y="160" width="180" height="50" rx="4" fill="${gradeColor}" opacity="0.15" stroke="${gradeColor}" stroke-width="2"/>
  <text x="140" y="195" font-family="'Space Grotesk', sans-serif" font-size="24" font-weight="bold" fill="${gradeColor}" text-anchor="middle">${agent.grade}</text>
  <text x="140" y="218" font-family="'IBM Plex Mono', monospace" font-size="10" fill="#B8B8AA" text-anchor="middle">EXECUTION GRADE</text>

  <!-- Score -->
  <circle cx="650" cy="195" r="50" stroke="#24231F" stroke-width="10" fill="none"/>
  <circle cx="650" cy="195" r="50" stroke="${gradeColor}" stroke-width="10" fill="none" stroke-dasharray="${(agent.score / 100) * 314} 314" stroke-linecap="round" transform="rotate(-90 650 195)"/>
  <text x="650" y="190" font-family="'Space Grotesk', sans-serif" font-size="24" font-weight="bold" fill="#E8E8E0" text-anchor="middle">${agent.score}</text>
  <text x="650" y="215" font-family="'IBM Plex Mono', monospace" font-size="10" fill="#B8B8AA" text-anchor="middle">SCORE</text>

  <!-- Key Metrics -->
  <g font-family="'IBM Plex Mono', monospace">
    <text x="50" y="250" font-size="10" fill="#6F6F64">ACTIVE BOND</text>
    <text x="50" y="270" font-size="16" font-weight="bold" fill="${agent.activeBondAmount >= 10000 ? "#27AE60" : "#C0392B"}">$${(agent.activeBondAmount ?? 0).toLocaleString()}</text>

    <text x="250" y="250" font-size="10" fill="#6F6F64">ESCROW SUCCESS</text>
    <text x="250" y="270" font-size="16" font-weight="bold" fill="${agent.escrowSuccessRate >= 0.95 ? "#27AE60" : "#F5A623"}">${((agent.escrowSuccessRate ?? 0) * 100).toFixed(1)}%</text>

    <text x="450" y="250" font-size="10" fill="#6F6F64">TOTAL SLASHED</text>
    <text x="450" y="270" font-size="16" font-weight="bold" fill="${agent.totalSlashedUsd > 0 ? "#C0392B" : "#27AE60"}">$${(agent.totalSlashedUsd ?? 0).toLocaleString()}</text>

    <text x="620" y="250" font-size="10" fill="#6F6F64">ESCROWS DONE</text>
    <text x="620" y="270" font-size="16" font-weight="bold" fill="#E8E8E0">${agent.totalEscrowsCompleted ?? 0}</text>
  </g>

  <!-- Verdict -->
  <rect x="50" y="300" width="700" height="80" rx="4" fill="#24231F" stroke="#7A5A28" stroke-width="1"/>
  <text x="70" y="325" font-family="'IBM Plex Mono', monospace" font-size="11" fill="#F5A623">VERDICT</text>
  <text x="70" y="355" font-family="'Space Grotesk', sans-serif" font-size="13" fill="#E8E8E0" width="680">${agent.verdict}</text>

  <!-- Recent Events -->
  <text x="50" y="410" font-family="'IBM Plex Mono', monospace" font-size="11" fill="#F5A623" letter-spacing="1">RECENT EXECUTION LOG</text>
  <g font-family="'IBM Plex Mono', monospace" font-size="9">
    ${events
      .slice(0, 10)
      .map((e, i) => {
        const color =
          e.severity === "success"
            ? "#27AE60"
            : e.severity === "warn"
              ? "#F5A623"
              : e.severity === "critical"
                ? "#C0392B"
                : "#B8B8AA";
        const y = 430 + i * 16;
        return `
        <text x="50" y="${y}" fill="#6F6F64">${e.occurredAt?.slice(0, 16) || ""}</text>
        <text x="180" y="${y}" fill="${color}">${e.type}</text>
        <text x="380" y="${y}" fill="${color}">${e.amount ? (e.amount > 0 ? "+" : "") + e.amount.toFixed(4) + " SOL" : ""}</text>
        <text x="520" y="${y}" fill="${color}">${e.tokenAmount ? e.tokenAmount.toLocaleString() + " tokens" : ""}</text>
        <text x="680" y="${y}" fill="#6F6F64">${e.signature?.slice(0, 12) || ""}…</text>
      `;
      })
      .join("")}
  </g>

  <!-- Footer -->
  <text x="50" y="580" font-family="'IBM Plex Mono', monospace" font-size="9" fill="#6F6F64">spx402.xyz/agent/${agent.mint}  ·  Payment required. Proof provided.  ·  Not financial advice.</text>
</svg>`;
}

function getGradeColor(grade: string): string {
  if (grade === "SPX AAA" || grade === "SPX AA") return "#27AE60";
  if (grade === "SPX A" || grade === "SPX BBB") return "#F5A623";
  if (grade === "SPX BB" || grade === "SPX B") return "#F5A623";
  if (grade === "SPX D") return "#C0392B";
  return "#6F6F64";
}
