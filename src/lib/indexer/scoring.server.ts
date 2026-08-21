// Scoring math — pure functions over already-aggregated counters.
// Server-only.
//
// Three execution models are supported, dispatched by `category`:
//
//   1. tokenized_buyback — classic SPX agents.
//      a) Deposit → buyback → burn flow, scored on deposit consistency,
//         buyback execution rate vs deposits, and burn confirmation rate.
//      b) Pump.fun-style fee-buyback flow (no deposits, only buybacks).
//         Auto-detected by deposit count == 0 && buybacks >= 3.
//
//   2. registered_agent — Metaplex MPL Agent Identity. Identity proof is
//      the primary signal; buyback / earnings are bonus.
//
//   3. x402_executor — wallets receiving x402 micropayments. Score weighted
//      on payment volume, recurrence, and recency.
//
// task_executor has a dedicated Outcome Contract branch. Other undecoded
// categories retain the neutral tokenized fallback.

import type { AgentCategory } from "@/lib/agents/categories";

export interface ScoringInputs {
  totalDepositsCount: number;
  totalBuybacksCount: number;
  totalBurnsCount: number;
  failedWindows: number;
  buybackExecutionRate: number; // 0..1 (deposits→buybacks)
  burnConfirmationRate: number; // 0..1 (buybacks→burns)
  lastIndexedSeconds: number;
  operatorVerified: boolean;
  hasMetadata: boolean;
  totalBuybackSol?: number; // optional, used for fee-buyback grading
  // Category-aware extensions (ignored by the legacy tokenized branch).
  category?: AgentCategory;
  // For registered_agent: whether the AgentIdentity PDA is currently
  // resolvable for this asset. Drives the bulk of the score.
  registryProof?: boolean;
  // For x402_executor: aggregate counters from x402_payment_received events.
  totalX402Count?: number;
  totalX402Sol?: number;
  totalX402Usdc?: number;
  // Generalized swap counters (DEX swaps emitted for executor wallets).
  totalSwapCount?: number;
  totalSwapSol?: number;
  // For task_executor: server-observed Outcome Contract evidence.
  totalOutcomeOpened?: number;
  totalOutcomeAwarded?: number;
  totalOutcomeFulfilled?: number;
  totalOutcomeFailed?: number;
  totalOutcomeSlashed?: number;
  outcomeFulfillmentRate?: number;
  outcomeOnTimeRate?: number;
  outcomeAwardDensity?: number;
  hasPublicCapsule?: boolean;
  outcomeEvidenceComplete?: boolean;
}

export interface ScoreBreakdown {
  depositConsistency: number; // /20  (label depends on category)
  buybackExecution: number; // /25  (label depends on category)
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
  return category === "task_executor" && result.grade === "SPX404" ? null : result.total;
}

/** Compute the category-specific execution score and evidence verdict. */
export function score(inputs: ScoringInputs): ScoreResult {
  const category: AgentCategory = inputs.category ?? "tokenized_buyback";

  if (category === "registered_agent") {
    return scoreRegistered(inputs);
  }
  if (category === "x402_executor") {
    return scoreX402(inputs);
  }
  if (category === "task_executor") {
    return scoreOutcomeContract(inputs);
  }
  // tokenized_buyback (default) and any other non-decoded category.
  return scoreTokenized(inputs);
}

// ─────────────────────────────────────────────────────────────────────
// Branch 1: tokenized_buyback (classic + fee-buyback fallback)
// ─────────────────────────────────────────────────────────────────────
function scoreTokenized(inputs: ScoringInputs): ScoreResult {
  const isFeeBuyback = inputs.totalDepositsCount === 0 && inputs.totalBuybacksCount >= 3;
  const buybackSol = inputs.totalBuybackSol ?? 0;

  const depositConsistency = isFeeBuyback
    ? clamp(Math.round((Math.min(inputs.totalBuybacksCount, 20) / 20) * 20), 0, 20)
    : clamp(Math.round((Math.min(inputs.totalDepositsCount, 50) / 50) * 20), 0, 20);

  const buybackExecution = isFeeBuyback
    ? clamp(Math.round((Math.min(buybackSol, 2) / 2) * 25), 0, 25)
    : clamp(Math.round(inputs.buybackExecutionRate * 25), 0, 25);

  const burnConfirmation =
    isFeeBuyback && inputs.totalBurnsCount === 0
      ? 10
      : clamp(Math.round(inputs.burnConfirmationRate * 20), 0, 20);

  const breakdown: ScoreBreakdown = {
    depositConsistency,
    buybackExecution,
    burnConfirmation,
    failedTx: clamp(15 - Math.min(inputs.failedWindows, 15), 0, 15),
    recency: recencyScore(inputs.lastIndexedSeconds, isFeeBuyback ? "long" : "short"),
    metadata: inputs.hasMetadata ? 5 : 0,
    operator: inputs.operatorVerified ? 5 : 0,
  };
  const total = sumBreakdown(breakdown);
  return {
    total,
    breakdown,
    grade: gradeForTokenized(total, inputs),
    verdict: verdictForTokenized(total, inputs),
    confidence: confidenceFor(inputs),
  };
}

function gradeForTokenized(total: number, i: ScoringInputs): Grade {
  if (i.totalDepositsCount === 0 && i.totalBuybacksCount === 0 && i.totalBurnsCount === 0) {
    return "SPX404";
  }
  if (i.failedWindows > 10) return "SPX D";
  return gradeFromTotal(total);
}

function verdictForTokenized(total: number, i: ScoringInputs): string {
  if (i.totalDepositsCount === 0 && i.totalBuybacksCount === 0 && i.totalBurnsCount === 0) {
    return "No on-chain activity observed in the indexed window.";
  }
  if (i.failedWindows > 10) return "Repeated failed buyback windows. Operator review required.";
  if (i.totalDepositsCount === 0 && i.totalBuybacksCount > 0) {
    if (total >= 70) return "Fee-routed buyback agent with consistent on-chain execution.";
    if (total >= 50)
      return "Fee-routed buyback agent — execution observed, cadence still building.";
    return "Fee-routed buyback agent with limited execution history.";
  }
  if (total >= 80) return "Consistent execution and verified buyback/burn cadence.";
  if (total >= 60) return "Acceptable execution with some recency or coverage gaps.";
  return "Execution below the SPX402 baseline. Treat metrics as indicative only.";
}

// ─────────────────────────────────────────────────────────────────────
// Branch 2: registered_agent (Metaplex MPL Agent Identity)
// ─────────────────────────────────────────────────────────────────────
// Score philosophy: identity is the bulk (35pts). Activity boosts (45pts).
// Recency, metadata, operator round it out.
function scoreRegistered(inputs: ScoringInputs): ScoreResult {
  const identityProof = inputs.registryProof ? 35 : 0;
  const swapCount = inputs.totalSwapCount ?? 0;
  const swapSol = inputs.totalSwapSol ?? 0;

  // depositConsistency slot is reused as "identity proof".
  // buybackExecution slot is reused as "swap activity".
  const breakdown: ScoreBreakdown = {
    depositConsistency: clamp(Math.round((identityProof / 35) * 20), 0, 20),
    buybackExecution: clamp(Math.round((Math.min(swapCount, 50) / 50) * 25), 0, 25),
    burnConfirmation: clamp(Math.round((Math.min(swapSol, 5) / 5) * 20), 0, 20),
    failedTx: clamp(15 - Math.min(inputs.failedWindows, 15), 0, 15),
    recency: recencyScore(inputs.lastIndexedSeconds, "long"),
    metadata: inputs.hasMetadata ? 5 : 0,
    operator: inputs.operatorVerified ? 5 : 0,
  };
  const total = sumBreakdown(breakdown);

  let grade: Grade;
  if (!inputs.registryProof && swapCount === 0) {
    grade = "SPX404";
  } else {
    grade = gradeFromTotal(total);
  }
  return {
    total,
    breakdown,
    grade,
    verdict: verdictForRegistered(total, inputs),
    confidence: confidenceFor({
      ...inputs,
      totalDepositsCount: swapCount,
      totalBuybacksCount: 0,
    }),
  };
}

function verdictForRegistered(total: number, i: ScoringInputs): string {
  if (!i.registryProof && (i.totalSwapCount ?? 0) === 0) {
    return "No MPL Agent Identity PDA observed and no recent swap activity.";
  }
  if (!i.registryProof) {
    return "Swap activity observed but MPL Agent Identity PDA not currently resolvable.";
  }
  if (total >= 80) return "Verified Metaplex agent with consistent on-chain execution.";
  if (total >= 60) return "Verified Metaplex agent with moderate activity in the indexed window.";
  return "Verified Metaplex agent — execution still building.";
}

// ─────────────────────────────────────────────────────────────────────
// Branch 3: x402_executor
// ─────────────────────────────────────────────────────────────────────
// Score philosophy: payment volume + recurrence dominate. We treat USDC
// receipts as ~$1 each and SOL receipts at face SOL value (no FX call to
// keep the worker cheap). This is deliberately simple — refine when
// volume warrants.
function scoreX402(inputs: ScoringInputs): ScoreResult {
  const count = inputs.totalX402Count ?? 0;
  const sol = inputs.totalX402Sol ?? 0;
  const usdc = inputs.totalX402Usdc ?? 0;
  // Composite "value" for grading. USDC is in raw token units (6 decimals).
  const usdcValue = usdc / 1_000_000;

  const breakdown: ScoreBreakdown = {
    // depositConsistency = payment recurrence (count, capped at 100).
    depositConsistency: clamp(Math.round((Math.min(count, 100) / 100) * 20), 0, 20),
    // buybackExecution = aggregate receipt volume in SOL-equivalent
    // (capped at 10 SOL or $200 USDC).
    buybackExecution: clamp(Math.round((Math.min(sol + usdcValue / 200, 10) / 10) * 25), 0, 25),
    // burnConfirmation = USDC-share bonus. Stable-denominated revenue is
    // a stronger trust signal than volatile SOL flow.
    burnConfirmation:
      usdcValue > 0 ? clamp(Math.round((Math.min(usdcValue, 100) / 100) * 20), 0, 20) : 0,
    failedTx: clamp(15 - Math.min(inputs.failedWindows, 15), 0, 15),
    recency: recencyScore(inputs.lastIndexedSeconds, "short"),
    metadata: inputs.hasMetadata ? 5 : 0,
    operator: inputs.operatorVerified ? 5 : 0,
  };
  const total = sumBreakdown(breakdown);

  const grade: Grade = count === 0 ? "SPX404" : gradeFromTotal(total);
  return {
    total,
    breakdown,
    grade,
    verdict: verdictForX402(total, count, usdcValue),
    confidence:
      count >= 20 && inputs.lastIndexedSeconds < 60 * 60 * 24
        ? "high"
        : count >= 5
          ? "medium"
          : "low",
  };
}

function verdictForX402(total: number, count: number, usdcValue: number): string {
  if (count === 0) return "No x402 payment receipts observed yet.";
  if (total >= 80)
    return `Active x402 executor — ${count} receipts indexed${usdcValue > 0 ? `, ~$${usdcValue.toFixed(2)} USDC routed` : ""}.`;
  if (total >= 60) return `Live x402 executor with moderate receipt volume (${count} receipts).`;
  return `x402 receipts observed (${count}) — volume still building.`;
}

// ─────────────────────────────────────────────────────────────────────
// Branch 4: task_executor (Outcome Contracts)
// ─────────────────────────────────────────────────────────────────────
function scoreOutcomeContract(inputs: ScoringInputs): ScoreResult {
  const awarded = inputs.totalOutcomeAwarded ?? 0;
  const fulfilled = inputs.totalOutcomeFulfilled ?? 0;
  const failed = inputs.totalOutcomeFailed ?? 0;
  const slashed = inputs.totalOutcomeSlashed ?? 0;
  const evidenceComplete = inputs.outcomeEvidenceComplete === true;
  const hasRateEvidence =
    inputs.outcomeAwardDensity !== undefined && inputs.outcomeFulfillmentRate !== undefined;
  const hasOnTimeEvidence = inputs.outcomeOnTimeRate !== undefined;

  const breakdown: ScoreBreakdown = {
    // awarded-contract density
    depositConsistency: clamp(Math.round((inputs.outcomeAwardDensity ?? 0) * 20), 0, 20),
    // fulfillment rate
    buybackExecution: clamp(Math.round((inputs.outcomeFulfillmentRate ?? 0) * 25), 0, 25),
    // on-time rate; absent until the producer supplies a verifiable deadline
    burnConfirmation: clamp(Math.round((inputs.outcomeOnTimeRate ?? 0) * 20), 0, 20),
    // failures cost 2 points, slashes cost 5.
    failedTx: clamp(15 - failed * 2 - slashed * 5, 0, 15),
    recency: recencyScore(inputs.lastIndexedSeconds, "long"),
    metadata: inputs.hasPublicCapsule ? 5 : 0,
    operator: inputs.operatorVerified ? 5 : 0,
  };
  const total = sumBreakdown(breakdown);
  const outcomeEvents = (inputs.totalOutcomeOpened ?? 0) + awarded + fulfilled + failed + slashed;

  return {
    total,
    breakdown,
    grade:
      awarded === 0 || !evidenceComplete || !hasRateEvidence || !hasOnTimeEvidence
        ? "SPX404"
        : gradeFromTotal(total),
    verdict:
      awarded === 0
        ? "No awarded Outcome Contract evidence observed yet."
        : !evidenceComplete
          ? "Outcome Contract evidence window is incomplete; score withheld."
          : !hasRateEvidence
            ? "Required Outcome Contract rate evidence is unavailable; score withheld."
            : !hasOnTimeEvidence
              ? "Verifiable Outcome Contract deadline evidence is unavailable; score withheld."
              : slashed > 0
                ? `${slashed} Outcome Contract slash event${slashed === 1 ? "" : "s"} observed.`
                : `${fulfilled} of ${awarded} awarded Outcome Contracts fulfilled in the indexed window.`,
    confidence:
      outcomeEvents >= 20 && inputs.lastIndexedSeconds < 60 * 60 * 24
        ? "high"
        : outcomeEvents >= 5
          ? "medium"
          : "low",
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
    b.depositConsistency +
    b.buybackExecution +
    b.burnConfirmation +
    b.failedTx +
    b.recency +
    b.metadata +
    b.operator
  );
}

function recencyScore(lastIndexedSeconds: number, window: "short" | "long"): number {
  // short = 6h, long = 7d
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

function confidenceFor(i: ScoringInputs): "high" | "medium" | "low" {
  const activity = i.totalDepositsCount + i.totalBuybacksCount;
  if (activity >= 20 && i.lastIndexedSeconds < 60 * 60 * 24) return "high";
  if (activity >= 5) return "medium";
  return "low";
}
