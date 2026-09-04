// Wave 2 — Confidence model (pure function).
//
// `confidence` answers a different question from `risk_score`:
//   "How much evidence supports the score we just produced?"
//
// Range: 0..1. UI must show this *separately* from the score so a brand-new
// agent with two buybacks doesn't masquerade as a high-trust one. Outlined
// vs filled grade badges in the UI are driven by the band thresholds
// returned here (`band: "low" | "medium" | "high"`).
//
// Inputs deliberately exclude the score itself (no `grade_factor`) — that
// was the conflation bug v1 had. Confidence is about the *evidence base*,
// not about whether that evidence looks good.
//
// This file MUST stay pure: no DB calls, no env access, no fetch. The
// scoring worker hands us the already-aggregated counters.

import type { AgentCategory } from "@/lib/agents/categories";

export const CONFIDENCE_MODEL_VERSION = "spx-confidence-v0.2.0";

export interface ConfidenceInputs {
  category: AgentCategory;
  // Counters (last 30d window — same window the scoring worker uses).
  totalEvents: number;
  successEvents: number;
  failureEvents: number;
  // Distinct event types observed for this subject in window.
  distinctEventTypes: number;
  // Lifetime observation: seconds since first seen on chain (capped 90d).
  observationWindowSeconds: number;
  // Recency: seconds since last event.
  lastEventSeconds: number;
  // Indexer health for this subject's category (0..1, 1 = decoders fully shipped).
  failureDecoderCoverage: number;
  // Identity anchoring strength (0..1). 1 = registry-verified or operator-signed,
  // 0.5 = passive observation, 0 = unknown subject.
  identityResolutionStrength: number;
  // Open anomalies that haven't been acknowledged or aged out.
  unresolvedAnomalies: number;
}

export interface ConfidenceBreakdown {
  evidenceDepth: number; // 0..0.30
  observationWindow: number; // 0..0.15
  recency: number; // 0..0.15
  parserCoverage: number; // 0..0.10
  failureDecoderCoverage: number; // 0..0.15
  identityResolution: number; // 0..0.15
  anomalyPenalty: number; // 0..-0.20
}

export interface ConfidenceResult {
  modelVersion: string;
  score: number; // 0..1
  band: "low" | "medium" | "high";
  breakdown: ConfidenceBreakdown;
}

// Per-category expectation of how many distinct event types a healthy
// subject should be producing. Drives the parser_coverage factor.
const EXPECTED_EVENT_TYPES: Record<AgentCategory, number> = {
  tokenized_buyback: 4, // DEPOSIT, BUYBACK, BURN, FAILED_BUYBACK_WINDOW
  registered_agent: 3, // SWAP, X402, CONFIG_CHANGED
  x402_executor: 2, // X402_PAYMENT_RECEIVED, X402_PAYMENT_REVERTED
  aeon_executor: 6, // ESCROW_CREATED/RELEASED/CANCELED, BOND_DEPOSITED/SLASHED, RECEIPT_CREATED
  copy_trader: 2,
  task_executor: 5, // OC_OPENED, OC_AWARDED, OC_FULFILLED, OC_FAILED, OC_SLASHED
  general: 2,
};

/** Compute evidence confidence independently from the execution score. */
export function computeConfidence(inputs: ConfidenceInputs): ConfidenceResult {
  // 1. evidence_depth: log-scaled event count, saturating at ~50 events.
  const evidenceDepth = clamp(0.3 * (Math.log10(1 + inputs.totalEvents) / Math.log10(51)), 0, 0.3);

  // 2. observation_window: linear ramp to 90 days.
  const NINETY_DAYS = 60 * 60 * 24 * 90;
  const observationWindow = clamp(
    0.15 * (Math.min(inputs.observationWindowSeconds, NINETY_DAYS) / NINETY_DAYS),
    0,
    0.15,
  );

  // 3. recency: full credit in first 24h, decays linearly to 0 at 14d.
  const FOURTEEN_DAYS = 60 * 60 * 24 * 14;
  const ONE_DAY = 60 * 60 * 24;
  const recency =
    inputs.lastEventSeconds <= ONE_DAY
      ? 0.15
      : clamp(
          0.15 * (1 - (inputs.lastEventSeconds - ONE_DAY) / (FOURTEEN_DAYS - ONE_DAY)),
          0,
          0.15,
        );

  // 4. parser_coverage: distinct event types observed vs expected for category.
  const expected = EXPECTED_EVENT_TYPES[inputs.category] ?? 2;
  const parserCoverage = clamp(
    0.1 * (Math.min(inputs.distinctEventTypes, expected) / expected),
    0,
    0.1,
  );

  // 5. failure_decoder_coverage: are negative-event decoders shipped for this
  //    category? This is the honesty check — without failure decoders we can't
  //    distinguish "no failures" from "no decoder."
  const failureDecoderCoverage = clamp(0.15 * inputs.failureDecoderCoverage, 0, 0.15);

  // 6. identity_resolution: how well anchored is this subject?
  const identityResolution = clamp(0.15 * inputs.identityResolutionStrength, 0, 0.15);

  // 7. anomaly penalty: each unresolved anomaly costs 5pp confidence, capped.
  const anomalyPenalty = -clamp(0.05 * inputs.unresolvedAnomalies, 0, 0.2);

  const breakdown: ConfidenceBreakdown = {
    evidenceDepth,
    observationWindow,
    recency,
    parserCoverage,
    failureDecoderCoverage,
    identityResolution,
    anomalyPenalty,
  };

  const score = clamp(
    evidenceDepth +
      observationWindow +
      recency +
      parserCoverage +
      failureDecoderCoverage +
      identityResolution +
      anomalyPenalty,
    0,
    1,
  );

  return {
    modelVersion: CONFIDENCE_MODEL_VERSION,
    score,
    band: score >= 0.66 ? "high" : score >= 0.33 ? "medium" : "low",
    breakdown,
  };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
