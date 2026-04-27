// Scoring math — pure functions over already-aggregated counters.
// Server-only.
//
// Two execution models are supported:
//   1. Deposit → buyback → burn flow (classic SPX agents). Score considers
//      deposit consistency, buyback execution rate vs deposits, and burn
//      confirmation rate vs buybacks.
//   2. Fee-buyback flow (pump.fun-style tokenized agents). No deposits land
//      in a wallet — the protocol routes a percentage of trade fees into
//      buybacks directly. We score these on buyback volume and recurrence.
//
// We auto-detect model by checking deposit count: if zero deposits but >=3
// buybacks observed, we score as fee-buyback so they aren't auto-graded
// SPX404.

export interface ScoringInputs {
  totalDepositsCount: number;
  totalBuybacksCount: number;
  totalBurnsCount: number;
  failedWindows: number;
  buybackExecutionRate: number; // 0..1 (deposits→buybacks); for fee-buyback we synthesize this from cadence
  burnConfirmationRate: number; // 0..1 (buybacks→burns)
  lastIndexedSeconds: number;
  operatorVerified: boolean;
  hasMetadata: boolean;
  totalBuybackSol?: number; // optional, used for fee-buyback grading
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
  const isFeeBuyback =
    inputs.totalDepositsCount === 0 && inputs.totalBuybacksCount >= 3;
  const buybackSol = inputs.totalBuybackSol ?? 0;

  // Deposit consistency: for fee-buyback agents, derive a "consistency proxy"
  // from buyback recurrence (>=20 buybacks = full credit).
  const depositConsistency = isFeeBuyback
    ? clamp(Math.round((Math.min(inputs.totalBuybacksCount, 20) / 20) * 20), 0, 20)
    : clamp(Math.round((Math.min(inputs.totalDepositsCount, 50) / 50) * 20), 0, 20);

  // Buyback execution: for fee-buyback, score on SOL volume (>=2 SOL = full).
  // For deposit-flow, score on deposit→buyback rate.
  const buybackExecution = isFeeBuyback
    ? clamp(Math.round((Math.min(buybackSol, 2) / 2) * 25), 0, 25)
    : clamp(Math.round(inputs.buybackExecutionRate * 25), 0, 25);

  // Burn confirmation: pump.fun protocol may not emit on-chain burns; if no
  // burns observed but buybacks are present, give partial credit (10/20)
  // rather than zero. Real burns still earn full credit.
  const burnConfirmation = isFeeBuyback && inputs.totalBurnsCount === 0
    ? 10
    : clamp(Math.round(inputs.burnConfirmationRate * 20), 0, 20);

  const breakdown: ScoreBreakdown = {
    depositConsistency,
    buybackExecution,
    burnConfirmation,
    failedTx: clamp(15 - Math.min(inputs.failedWindows, 15), 0, 15),
    recency: clamp(
      Math.round(
        // Fee-buyback agents are evaluated on a 7-day recency window
        // (long-tail), classic deposit agents on a 6-hour window (live).
        10 *
          Math.max(
            0,
            1 -
              inputs.lastIndexedSeconds /
                (isFeeBuyback ? 60 * 60 * 24 * 7 : 60 * 60 * 6),
          ),
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
  // SPX404 = no observable execution at all (no deposits, no buybacks, no burns)
  if (
    i.totalDepositsCount === 0 &&
    i.totalBuybacksCount === 0 &&
    i.totalBurnsCount === 0
  ) {
    return "SPX404";
  }
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
  if (
    i.totalDepositsCount === 0 &&
    i.totalBuybacksCount === 0 &&
    i.totalBurnsCount === 0
  ) {
    return "No on-chain activity observed in the indexed window.";
  }
  if (i.failedWindows > 10)
    return "Repeated failed buyback windows. Operator review required.";
  if (i.totalDepositsCount === 0 && i.totalBuybacksCount > 0) {
    if (total >= 70)
      return "Fee-routed buyback agent with consistent on-chain execution.";
    if (total >= 50)
      return "Fee-routed buyback agent — execution observed, cadence still building.";
    return "Fee-routed buyback agent with limited execution history.";
  }
  if (total >= 80) return "Consistent execution and verified buyback/burn cadence.";
  if (total >= 60) return "Acceptable execution with some recency or coverage gaps.";
  return "Execution below the SPX402 baseline. Treat metrics as indicative only.";
}

function confidenceFor(i: ScoringInputs): "high" | "medium" | "low" {
  const activity = i.totalDepositsCount + i.totalBuybacksCount;
  if (activity >= 20 && i.lastIndexedSeconds < 60 * 60 * 24) return "high";
  if (activity >= 5) return "medium";
  return "low";
}
