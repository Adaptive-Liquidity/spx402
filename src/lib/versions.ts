// Client-safe version constants and the public version changelog.
//
// The authoritative values live in server-only decoder modules; they are
// mirrored here (and kept in lockstep) so audit surfaces can state a version
// without importing server code into the browser bundle.

export const SOLANA_X402_PARSER_VERSION = "v0.2.0";
export const EVM_X402_PARSER_VERSION = "v1.0.0-evm";
export const CORE_PARSER_VERSION = "v0.1.7";
export const FACILITATOR_REGISTRY_VERSION = "v0.3.0";
export const SCORING_VERSION = "spx-score-v0.4.0";
export const CONFIDENCE_VERSION = "spx-confidence-v0.2.0";
export const PROBER_VERSION = "prober v1";

export interface VersionChangelogRow {
  version: string;
  lane: string;
  summary: string;
}

export const VERSION_CHANGELOG: VersionChangelogRow[] = [
  {
    version: "spx-score-v0.4.0",
    lane: "Scoring",
    summary:
      "Added fail-closed Outcome Contract scoring for task executors using awards, fulfillment, on-time evidence, failures, and slashes.",
  },
  {
    version: "v0.1.7",
    lane: "Core decoder",
    summary:
      "Deposit → buyback → burn decoding for tokenized agents, plus failed-window reconciliation.",
  },
  {
    version: "v0.2.0",
    lane: "Detection — Solana",
    summary:
      "Tiered x402 detection: facilitator fee-payer (high confidence) and memo marker (medium). Payer attribution recorded per settlement.",
  },
  {
    version: "spx-score-v0.3.0",
    lane: "Scoring",
    summary:
      "Wash-resistant scoring: counterparty diversity discount, self-payment cap, confidence gates.",
  },
  {
    version: "v1.0.0-evm",
    lane: "Detection — Base/EVM",
    summary:
      "EIP-3009 / Permit2 settlement decoding on Base. Tier A registry sender is scored; Tier B pattern match is discovery-only.",
  },
  {
    version: "prober v1",
    lane: "Active verification",
    summary:
      "SPX402 buys from x402 endpoints to measure challenge validity, settlement and delivery. Probe data is displayed, not scored.",
  },
];
