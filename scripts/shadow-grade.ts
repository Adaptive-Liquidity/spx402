#!/usr/bin/env bun
/**
 * SPX402 Shadow Grade Script
 *
 * Scans top public Solana agents (pump.fun tokenized agents + Solana Agent Registry)
 * and grades them using the AEON execution model. Since most use insecure hot wallets
 * without AEON escrows/bonds, they will score poorly (SPX D / SPX404).
 *
 * Outputs:
 * - JSON report with all grades
 * - SVG Terminal Cards for social publishing
 * - CSV for manual review
 *
 * Usage:
 *   bun run scripts/shadow-grade.ts
 *   bun run scripts/shadow-grade.ts --post-to-x
 *   bun run scripts/shadow-grade.ts --limit 25
 */

import { createClient } from "@supabase/supabase-js";
import { computeRiskScore, type ScoringInputs } from "../src/lib/scoring/risk-score";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve } from "path";

// ─────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const HELIUS_API_KEY = process.env.HELIUS_API_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !HELIUS_API_KEY) {
  console.error("❌ Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, HELIUS_API_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const OUTPUT_DIR = resolve(process.cwd(), "shadow-grade-output");
if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

// ─────────────────────────────────────────────────────────────────────
// Helius Enhanced Transaction Fetching
// ─────────────────────────────────────────────────────────────────────

interface HeliusEnhancedTx {
  signature: string;
  slot: number;
  timestamp: number;
  feePayer: string;
  nativeTransfers: Array<{ fromUserAccount: string; toUserAccount: string; amount: number }>;
  tokenTransfers: Array<{ mint: string; fromUserAccount: string; toUserAccount: string; tokenAmount: number }>;
  instructions: Array<{ programId: string; accounts: string[]; data: string }>;
  transactionError: string | null;
  source: string;
  description: string;
}

async function fetchAgentTransactions(mint: string, daysBack: number = 30): Promise<HeliusEnhancedTx[]> {
  const url = `https://api.helius.xyz/v0/addresses/${mint}/transactions?api-key=${HELIUS_API_KEY}&limit=1000`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`⚠️  Helius error for ${mint}: ${res.status}`);
    return [];
  }
  const txs = await res.json();
  const cutoff = Date.now() - daysBack * 24 * 60 * 60 * 1000;
  return txs.filter((tx: HeliusEnhancedTx) => tx.timestamp * 1000 > cutoff);
}

// ─────────────────────────────────────────────────────────────────────
// AEON Grading Logic (mirrors the production scoring)
// ─────────────────────────────────────────────────────────────────────

interface ShadowAgent {
  mint: string;
  symbol: string;
  name: string;
  category: "tokenized_buyback" | "registered_agent" | "executor" | "unknown";
  depositAddress: string | null;
  executorWallet: string | null;
  // On-chain counters (from Helius)
  totalDeposits: number;
  totalBuybacks: number;
  totalBurns: number;
  failedWindows: number;
  totalSlashedUsd: number; // Always 0 for non-AEON agents
  activeBondAmount: number; // Always 0 for non-AEON agents
  escrowsCompleted: number;
  escrowsFailed: number;
  escrowSuccessRate: number;
  operatorVerified: boolean;
  lastIndexedSeconds: number;
  // Computed
  grade: string;
  score: number;
  verdict: string;
}

function computeShadowGrade(agent: ShadowAgent): ShadowAgent {
  // For non-AEON agents, they have NO escrows, NO bonds, NO receipts
  // They fall back to the legacy tokenized_buyback model but with
  // the reality that they have 0 bonds and 0 escrows

  const inputs: ScoringInputs = {
    totalDepositsCount: agent.totalDeposits,
    totalBuybacksCount: agent.totalBuybacks,
    totalBurnsCount: agent.totalBurns,
    failedWindows: agent.failedWindows,
    lastIndexedSeconds: agent.lastIndexedSeconds,
    operatorVerified: agent.operatorVerified,
    hasMetadata: true, // assume they have basic metadata
    // AEON primitives - all zero for non-AEON agents
    totalEscrowsCompleted: agent.escrowsCompleted,
    totalEscrowsFailed: agent.escrowsFailed,
    escrowSuccessRate: agent.escrowSuccessRate,
    activeBondAmount: agent.activeBondAmount,
    totalSlashedUsd: agent.totalSlashedUsd,
    category: agent.category as any,
  };

  const result = computeRiskScore(inputs);

  return {
    ...agent,
    grade: result.grade,
    score: result.total,
    verdict: result.verdict,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Data Sources: Top Agents (fetch from Supabase for testing)
// ─────────────────────────────────────────────────────────────────────

async function fetchSupabaseDemoAgents(limit: number = 30): Promise<ShadowAgent[]> {
  try {
    const { data, error } = await supabase
      .from("agents")
      .select("mint, symbol, name, category, aeon_cri_address, active_bond_amount, total_slashed_usd, escrow_success_rate, total_escrows_completed, total_escrows_failed")
      .limit(limit);

    if (error) throw error;

    return (data ?? []).map((a: any) => ({
      mint: a.mint,
      symbol: a.symbol,
      name: a.name,
      category: a.category ?? "tokenized_buyback",
      depositAddress: null,
      executorWallet: null,
      totalDeposits: 0,
      totalBuybacks: 0,
      totalBurns: 0,
      failedWindows: 0,
      totalSlashedUsd: Number(a.total_slashed_usd ?? 0),
      activeBondAmount: Number(a.active_bond_amount ?? 0),
      escrowsCompleted: Number(a.total_escrows_completed ?? 0),
      escrowsFailed: Number(a.total_escrows_failed ?? 0),
      escrowSuccessRate: Number(a.escrow_success_rate ?? 0),
      operatorVerified: false,
      lastIndexedSeconds: 0,
      grade: "SPX404",
      score: 0,
      verdict: "",
    }));
  } catch {
    return [];
  }
}

async function fetchTopPumpFunAgents(limit: number = 30): Promise<ShadowAgent[]> {
  return [];
}

async function fetchSolanaAgentRegistryAgents(limit: number = 30): Promise<ShadowAgent[]> {
  return [];
}

// ─────────────────────────────────────────────────────────────────────
// Helius Backfill: Populate on-chain counters for each agent
// ─────────────────────────────────────────────────────────────────────

async function backfillAgentCounters(agent: ShadowAgent): Promise<ShadowAgent> {
  const txs = await fetchAgentTransactions(agent.mint, 30);

  let totalDeposits = 0;
  let totalBuybacks = 0;
  let totalBurns = 0;
  let failedWindows = 0;

  // Simple heuristics - in production use the full decoder
  for (const tx of txs) {
    // Count SOL deposits to the mint/deposit address
    const nativeReceived = tx.nativeTransfers
      .filter(t => t.toUserAccount === agent.mint || t.toUserAccount === agent.depositAddress)
      .reduce((sum, t) => sum + t.amount, 0);
    if (nativeReceived > 0) totalDeposits++;

    // Count SPL burns of this mint
    const burns = tx.tokenTransfers
      .filter(t => t.mint === agent.mint && t.tokenAmount < 0);
    if (burns.length > 0) totalBurns += burns.length;

    // Count pump.fun buybacks (simplified)
    if (tx.instructions.some(ix => ix.programId === "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P")) {
      const tokensIn = tx.tokenTransfers.filter(t => t.mint === agent.mint && t.tokenAmount > 0);
      if (tokensIn.length > 0) totalBuybacks++;
    }

    // Failed transactions touching the mint
    if (tx.transactionError && tx.instructions.some(ix => ix.programId === "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P")) {
      failedWindows++;
    }
  }

  return {
    ...agent,
    totalDeposits,
    totalBuybacks,
    totalBurns,
    failedWindows,
    lastIndexedSeconds: Math.floor((Date.now() - (txs[0]?.timestamp ?? Date.now()) * 1000) / 1000),
  };
}

// ─────────────────────────────────────────────────────────────────────
// SVG Terminal Card Generation
// ─────────────────────────────────────────────────────────────────────

function generateTerminalCardSVG(agent: ShadowAgent): string {
  const gradeColor = getGradeColor(agent.grade);
  const shortMint = `${agent.mint.slice(0, 6)}…${agent.mint.slice(-6)}`;
  const timestamp = new Date().toISOString().slice(0, 19).replace("T", " ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1A1A18"/>
      <stop offset="100%" stop-color="#0B0B0A"/>
    </linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  
  <!-- Background -->
  <rect width="800" height="500" fill="url(#bg)"/>
  <rect width="800" height="500" fill="url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22 opacity=%220.03%22/%3E%3C/svg%3E')"/>
  
  <!-- Scanlines -->
  <g opacity="0.08">
    ${Array.from({length: 500}, (_, i) => i % 4 === 0 ? `<line x1="0" y1="${i}" x2="800" y2="${i}" stroke="#F5A623" stroke-width="0.5"/>` : "").join("")}
  </g>

  <!-- Border -->
  <rect x="20" y="20" width="760" height="460" fill="none" stroke="#7A5A28" stroke-width="2" rx="4"/>
  <rect x="22" y="22" width="756" height="456" fill="none" stroke="#F5A623" stroke-width="0.5" rx="3"/>

  <!-- Header -->
  <text x="50" y="65" font-family="'IBM Plex Mono', monospace" font-size="11" fill="#F5A623" letter-spacing="2">SPX402 TERMINAL / SHADOW GRADE</text>
  <text x="50" y="85" font-family="'IBM Plex Mono', monospace" font-size="10" fill="#B8B8AA">SHADOW AUDIT / NOT PRODUCTION / ${timestamp}</text>
  
  <!-- Agent Info -->
  <text x="50" y="130" font-family="'Space Grotesk', sans-serif" font-size="28" font-weight="bold" fill="#E8E8E0">$${agent.symbol} — ${agent.name}</text>
  <text x="50" y="155" font-family="'IBM Plex Mono', monospace" font-size="11" fill="#B8B8AA">MINT: ${shortMint}  |  CATEGORY: ${agent.category.toUpperCase()}</text>

  <!-- Grade Badge -->
  <rect x="50" y="180" width="180" height="50" rx="4" fill="${gradeColor}" opacity="0.15" stroke="${gradeColor}" stroke-width="2"/>
  <text x="140" y="215" font-family="'Space Grotesk', sans-serif" font-size="24" font-weight="bold" fill="${gradeColor}" text-anchor="middle">${agent.grade}</text>
  <text x="140" y="238" font-family="'IBM Plex Mono', monospace" font-size="14" fill="#E8E8E0" text-anchor="middle">EXECUTION GRADE</text>

  <!-- Score Ring (simplified) -->
  <circle cx="650" cy="215" r="60" stroke="#24231F" stroke-width="12" fill="none"/>
  <circle cx="650" cy="215" r="60" stroke="${gradeColor}" stroke-width="12" fill="none" stroke-dasharray="${(agent.score / 100) * 377} 377" stroke-linecap="round" transform="rotate(-90 650 215)"/>
  <text x="650" y="210" font-family="'Space Grotesk', sans-serif" font-size="28" font-weight="bold" fill="#E8E8E0" text-anchor="middle">${agent.score}</text>
  <text x="650" y="230" font-family="'IBM Plex Mono', monospace" font-size="10" fill="#B8B8AA" text-anchor="middle">TRANSPARENCY SCORE</text>

  <!-- Metrics Grid -->
  <g font-family="'IBM Plex Mono', monospace">
    ${[
      ["ESCROWS SETTLED", agent.escrowsCompleted.toString(), "verified"],
      ["SUCCESS RATE", `${(agent.escrowSuccessRate * 100).toFixed(1)}%`, agent.escrowSuccessRate >= 0.95 ? "verified" : "amber"],
      ["ACTIVE BOND", `$${agent.activeBondAmount.toLocaleString()}`, agent.activeBondAmount > 0 ? "verified" : "critical"],
      ["TOTAL SLASHED", `$${agent.totalSlashedUsd.toLocaleString()}`, agent.totalSlashedUsd > 0 ? "critical" : "verified"],
      ["FAILED WINDOWS", agent.failedWindows.toString(), agent.failedWindows > 10 ? "critical" : "amber"],
      ["OPERATOR", agent.operatorVerified ? "VERIFIED" : "UNVERIFIED", agent.operatorVerified ? "verified" : "critical"],
    ].map(([label, value, tone], i) => {
      const x = 50 + (i % 3) * 250;
      const y = 290 + Math.floor(i / 3) * 90;
      const valueColor = tone === "verified" ? "#27AE60" : tone === "amber" ? "#F5A623" : "#C0392B";
      return `
        <text x="${x}" y="${y}" font-size="9" fill="#6F6F64">${label}</text>
        <text x="${x}" y="${y + 22}" font-size="18" font-weight="bold" fill="${valueColor}">${value}</text>
      `;
    }).join("")}
  </g>

  <!-- Verdict -->
  <rect x="50" y="400" width="700" height="70" rx="4" fill="#24231F" stroke="#7A5A28" stroke-width="1"/>
  <text x="70" y="425" font-family="'IBM Plex Mono', monospace" font-size="11" fill="#F5A623">VERDICT</text>
  <text x="70" y="450" font-family="'Space Grotesk', sans-serif" font-size="14" fill="#E8E8E0" width="680">${agent.verdict}</text>

  <!-- Footer -->
  <text x="50" y="490" font-family="'IBM Plex Mono', monospace" font-size="9" fill="#6F6F64">spx402.xyz/agent/${agent.mint}  ·  Payment required. Proof provided.</text>
</svg>`;
}

function getGradeColor(grade: string): string {
  if (grade === "SPX AAA" || grade === "SPX AA") return "#27AE60";
  if (grade === "SPX A" || grade === "SPX BBB") return "#F5A623";
  if (grade === "SPX BB" || grade === "SPX B") return "#F5A623";
  if (grade === "SPX D") return "#C0392B";
  return "#6F6F64";
}

// ─────────────────────────────────────────────────────────────────────
// Main Execution
// ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌑 SPX402 Shadow Grade — Starting audit...\n");

  // Parse CLI args
  const args = process.argv.slice(2);
  const limit = parseInt(args.find(a => a.startsWith("--limit="))?.split("=")[1] ?? "50");
  const postToX = args.includes("--post-to-x");

  // Fetch demo agents from Supabase (for testing)
  console.log("📡 Fetching demo agents from Supabase...");
  const demoAgents = await fetchSupabaseDemoAgents(limit);

  const agents = demoAgents.slice(0, limit);

  console.log(`\n🔍 Backfilling on-chain counters for ${agents.length} agents...\n`);

  // Backfill and grade
  const gradedAgents: ShadowAgent[] = [];
  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];
    console.log(`  [${i + 1}/${agents.length}] ${agent.symbol} (${agent.mint.slice(0, 8)}...)`);
    const backfilled = await backfillAgentCounters(agent);
    const graded = computeShadowGrade(backfilled);
    gradedAgents.push(graded);

    // Generate SVG card
    const svg = generateTerminalCardSVG(graded);
    writeFileSync(resolve(OUTPUT_DIR, `${agent.symbol}_${agent.mint.slice(0, 8)}.svg`), svg);
  }

  // Sort by score descending
  gradedAgents.sort((a, b) => b.score - a.score);

  // Write JSON report
  const report = {
    generatedAt: new Date().toISOString(),
    totalAgents: gradedAgents.length,
    gradeDistribution: gradedAgents.reduce((acc, a) => {
      acc[a.grade] = (acc[a.grade] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    agents: gradedAgents,
  };
  writeFileSync(resolve(OUTPUT_DIR, "shadow-grade-report.json"), JSON.stringify(report, null, 2));

  // Write CSV
  const csvHeader = "Mint,Symbol,Name,Category,Grade,Score,Verdict,Escrows,SuccessRate,ActiveBond,TotalSlashed,FailedWindows,OperatorVerified\n";
  const csvRows = gradedAgents.map(a => 
    `${a.mint},${a.symbol},${a.name},${a.category},${a.grade},${a.score},"${a.verdict}",${a.escrowsCompleted},${(a.escrowSuccessRate*100).toFixed(1)},${a.activeBondAmount},${a.totalSlashedUsd},${a.failedWindows},${a.operatorVerified}`
  ).join("\n");
  writeFileSync(resolve(OUTPUT_DIR, "shadow-grade-report.csv"), csvHeader + csvRows);

  // Summary
  console.log("\n📊 SHADOW GRADE COMPLETE\n");
  console.log("Grade Distribution:");
  for (const [grade, count] of Object.entries(report.gradeDistribution)) {
    console.log(`  ${grade}: ${count}`);
  }
  console.log(`\n📁 Output: ${OUTPUT_DIR}`);
  console.log(`   - shadow-grade-report.json`);
  console.log(`   - shadow-grade-report.csv`);
  console.log(`   - ${gradedAgents.length} SVG terminal cards`);

  // Top/bottom
  console.log("\n🏆 TOP 5 (Least Bad):");
  gradedAgents.slice(0, 5).forEach((a, i) => console.log(`  ${i+1}. $${a.symbol} — ${a.grade} (${a.score})`));

  console.log("\n💀 BOTTOM 5 (Worst):");
  gradedAgents.slice(-5).reverse().forEach((a, i) => console.log(`  ${i+1}. $${a.symbol} — ${a.grade} (${a.score})`));

  if (postToX) {
    console.log("\n🐦 Posting to X/Twitter... (not implemented in this version)");
    // TODO: Implement X API posting with media upload
  }
}

main().catch(console.error);