// Scoring math — pure functions over already-aggregated counters.
// Server-only.
//
// AEON Execution Model:
//   Agents are graded on their ability to execute AEON escrows and maintain
//   active slashable bonds. The pure tokenomics (buyback/burn) model is deprecated.
//
// Formula:
//   - 40% Escrow Completion Rate
//   - 30% Active Slashable Bond
//   - 15% Failed/Errored Transaction Rate
//   - 10% Uptime/Recency
//   - 5% Operator Verification

import type { AgentCategory } from "@/lib/agents/categories";

export interface ScoringInputs {
  totalDepositsCount: number;
  totalBuybacksCount: number;
  totalBurnsCount: number;
  failedWindows: number;
  lastIndexedSeconds: number;
  operatorVerified: boolean;
  hasMetadata: boolean;
  
  // AEON Execution Primitives
  totalEscrowsCompleted?: number;
  totalEscrowsFailed?: number;
  escrowSuccessRate?: number; // 0..1
  activeBondAmount?: number; // in USD
  totalSlashedUsd?: number;
  
  category?: AgentCategory;
  registryProof?: boolean;
}

export interface ScoreBreakdown {
  escrowCompletion: number; // /40
  slashableBond: number; // /30
  failedTx: number; // /15
  recency: number; // /10
  operator: number; // /5
}

export type Grade =
  | "SPX AAA"
  | "SPX AA"
  | "SPX A"
  | "SPX BBB"
  | "SPX BB"
  | "SPX B"
  | "SPX D"
  | "SPX404";

export interface ScoreResult {
  total: number;
  breakdown: ScoreBreakdown;
  grade: Grade;
  verdict: string;
  confidence: "high" | "medium" | "low";
}

/** Return the nullable score persisted for a category's public grade. */
export function scoreForPersistence(
  category: AgentCategory,
  result: Pick<ScoreResult, "grade" | "total">,
): number | null {
  return result.grade === "SPX404" ? null : result.total;
}

export function scorePublication(
  category: AgentCategory,
  result: Pick<ScoreResult, "grade" | "total" | "verdict" | "breakdown">,
  decoderLive: boolean,
): Pick<ScoreResult, "grade" | "verdict" | "breakdown"> & { score: number | null } {
  return {
    score: scoreForPersistence(category, result),
    grade: result.grade,
    verdict: result.verdict,
    breakdown: result.breakdown,
  };
}

/** Compute the execution score and evidence verdict. */
export function score(inputs: ScoringInputs): ScoreResult {
  return scoreAeonExecution(inputs);
}

// ─────────────────────────────────────────────────────────────────────
// Unified AEON Execution Scoring
// ─────────────────────────────────────────────────────────────────────
function scoreAeonExecution(inputs: ScoringInputs): ScoreResult {
  const escrowsCompleted = inputs.totalEscrowsCompleted ?? 0;
  const escrowsFailed = inputs.totalEscrowsFailed ?? 0;
  const successRate = inputs.escrowSuccessRate ?? 0;
  const activeBond = inputs.activeBondAmount ?? 0;
  const slashedUsd = inputs.totalSlashedUsd ?? 0;
  const totalEscrows = escrowsCompleted + escrowsFailed;

  // 40% Escrow Completion Rate
  const escrowCompletion = totalEscrows > 0 
    ? clamp(Math.round(successRate * 40), 0, 40)
    : 0;

  // 30% Active Slashable Bond
  // Cap at $10,000 USD for max points, but heavily penalize slashed history
  let slashableBond = clamp(Math.round((activeBond / 10000) * 30), 0, 30);
  if (slashedUsd > 0) {
    slashableBond = Math.max(0, slashableBond - clamp(Math.round((slashedUsd / 1000) * 10), 0, 30));
  }

  // 15% Failed/Errored Transaction Rate
  // Penalize normal failed windows (general errors) and failed escrows
  const failures = inputs.failedWindows + escrowsFailed;
  const failedTx = clamp(15 - failures * 3, 0, 15);

  const breakdown: ScoreBreakdown = {
    escrowCompletion,
    slashableBond,
    failedTx,
    recency: recencyScore(inputs.lastIndexedSeconds, "short"),
    operator: inputs.operatorVerified ? 5 : 0,
  };

  const total = sumBreakdown(breakdown);
  
  let grade: Grade;
  if (totalEscrows === 0 && activeBond === 0 && inputs.totalDepositsCount === 0) {
    grade = "SPX404";
  } else {
    grade = gradeFromTotal(total);
  }

  return {
    total,
    breakdown,
    grade,
    verdict: verdictForAeon(total, totalEscrows, successRate, activeBond, slashedUsd),
    confidence: confidenceFor(totalEscrows, inputs.lastIndexedSeconds),
  };
}

// ─────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────
function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function sumBreakdown(b: ScoreBreakdown): number {
  return (
    b.escrowCompletion +
    b.slashableBond +
    b.failedTx +
    b.recency +
    b.operator
  );
}

function recencyScore(lastIndexedSeconds: number, window: "short" | "long"): number {
  const w = window === "short" ? 60 * 60 * 6 : 60 * 60 * 24 * 7;
  return clamp(Math.round(10 * Math.max(0, 1 - lastIndexedSeconds / w)), 0, 10);
}

function gradeFromTotal(total: number): Grade {
  if (total >= 90) return "SPX AAA";
  if (total >= 80) return "SPX AA";
  if (total >= 70) return "SPX A";
  if (total >= 60) return "SPX BBB";
  if (total >= 50) return "SPX BB";
  if (total >= 40) return "SPX B";
  return "SPX D";
}

function confidenceFor(totalEvents: number, lastIndexedSeconds: number): "high" | "medium" | "low" {
  if (totalEvents >= 20 && lastIndexedSeconds < 60 * 60 * 24) return "high";
  if (totalEvents >= 5) return "medium";
  return "low";
}

function verdictForAeon(total: number, escrows: number, successRate: number, bond: number, slashed: number): string {
  if (escrows === 0 && bond === 0) return "No verifiable AEON escrows or bonds observed. Agent operates in the dark.";
  if (slashed > 0) return `Agent has had $${slashed.toFixed(2)} in bonds slashed due to failed execution. Extreme caution.`;
  if (total >= 80) return `Verified execution. ${escrows} escrows settled (${Math.round(successRate * 100)}% success) with $${bond.toFixed(2)} bonded.`;
  if (total >= 60) return `Execution observed. ${escrows} escrows settled. Monitor for consistency.`;
  return `Execution below the SPX402 baseline. Treat metrics as indicative only.`;
}
