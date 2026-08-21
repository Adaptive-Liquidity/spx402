// Wave 2 — Risk-score (pure function).
//
// `risk_score` is the answer to "how good or bad does this subject look?"
// Range: 0..100. It maps to a Grade (SPX AAA … SPX D / SPX404).
//
// This is intentionally a thin wrapper over the existing per-category
// scoring branches in `src/lib/indexer/scoring.server.ts` so we don't fork
// the math during the rename. Once Wave 3 (snapshots) lands we'll inline
// the branches here and version-stamp every output.
//
// Key invariant: this file MUST stay pure (no DB, no env, no fetch). It is
// the unit-testable surface for the score model.

import {
  score as legacyScore,
  type ScoringInputs,
  type ScoreResult,
} from "@/lib/indexer/scoring.server";

export const RISK_SCORE_MODEL_VERSION = "spx-score-v0.4.0";

export interface RiskScoreResult {
  modelVersion: string;
  total: number; // 0..100
  grade: ScoreResult["grade"];
  verdict: string;
  breakdown: ScoreResult["breakdown"];
}

/** Compute a version-stamped risk score from category-aware scoring inputs. */
export function computeRiskScore(inputs: ScoringInputs): RiskScoreResult {
  const r = legacyScore(inputs);
  return {
    modelVersion: RISK_SCORE_MODEL_VERSION,
    total: r.total,
    grade: r.grade,
    verdict: r.verdict,
    breakdown: r.breakdown,
  };
}
