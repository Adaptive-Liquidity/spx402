// Scoring math — pure functions over already-aggregated counters.
// Server-only.

export interface ScoringInputs {
  totalDepositsCount: number;
  totalBuybacksCount: number;
  totalBurnsCount: number;
  failedWindows: number;
  buybackExecutionRate: number; // 0..1
  burnConfirmationRate: number; // 0..1
  lastIndexedSeconds: number;
  operatorVerified: boolean;
  hasMetadata: boolean;
}

export interface ScoreBreakdown {
  depositConsistency: number; // /20
  buybackExecution: number; // /25
  burnConfirmation: number; // /20
  failedTx: number; // /15
  recency: number; // /10
  metadata: number; // /5
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

export function score(inputs: ScoringInputs): {
  total: number;
  breakdown: ScoreBreakdown;
  grade: Grade;
  verdict: string;
  confidence: "high" | "medium" | "low";
} {
  const breakdown: ScoreBreakdown = {
    depositConsistency: clamp(
      Math.round((Math.min(inputs.totalDepositsCount, 50) / 50) * 20),
      0,
      20,
    ),
    buybackExecution: clamp(
      Math.round(inputs.buybackExecutionRate * 25),
      0,
      25,
    ),
    burnConfirmation: clamp(
      Math.round(inputs.burnConfirmationRate * 20),
      0,
      20,
    ),
    failedTx: clamp(15 - Math.min(inputs.failedWindows, 15), 0, 15),
    recency: clamp(
      Math.round(
        10 * Math.max(0, 1 - inputs.lastIndexedSeconds / (60 * 60 * 6)),
      ),
      0,
      10,
    ),
    metadata: inputs.hasMetadata ? 5 : 0,
    operator: inputs.operatorVerified ? 5 : 0,
  };

  const total =
    breakdown.depositConsistency +
    breakdown.buybackExecution +
    breakdown.burnConfirmation +
    breakdown.failedTx +
    breakdown.recency +
    breakdown.metadata +
    breakdown.operator;

  return {
    total,
    breakdown,
    grade: gradeFor(total, inputs),
    verdict: verdictFor(total, inputs),
    confidence: confidenceFor(inputs),
  };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function gradeFor(total: number, i: ScoringInputs): Grade {
  if (i.totalDepositsCount === 0 && i.totalBurnsCount === 0) return "SPX404";
  if (i.failedWindows > 10) return "SPX D";
  if (total >= 90) return "SPX AAA";
  if (total >= 80) return "SPX AA";
  if (total >= 70) return "SPX A";
  if (total >= 60) return "SPX BBB";
  if (total >= 50) return "SPX BB";
  if (total >= 40) return "SPX B";
  return "SPX D";
}

function verdictFor(total: number, i: ScoringInputs): string {
  if (i.totalDepositsCount === 0)
    return "No on-chain activity observed in the indexed window.";
  if (i.failedWindows > 10)
    return "Repeated failed buyback windows. Operator review required.";
  if (total >= 80) return "Consistent execution and verified buyback/burn cadence.";
  if (total >= 60) return "Acceptable execution with some recency or coverage gaps.";
  return "Execution below the SPX402 baseline. Treat metrics as indicative only.";
}

function confidenceFor(i: ScoringInputs): "high" | "medium" | "low" {
  if (i.totalDepositsCount >= 20 && i.lastIndexedSeconds < 60 * 60) return "high";
  if (i.totalDepositsCount >= 5) return "medium";
  return "low";
}
