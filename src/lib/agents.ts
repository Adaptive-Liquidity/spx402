// SPX402 Agent types.
// The `agents` table in Lovable Cloud is the single source of truth.
// All concrete data is loaded via src/lib/agents-db.ts.
// This file holds ONLY shared TypeScript types — no demo data lives in the app.

import type { AgentCategory, IdentifierKind } from "./agents/categories";

export type Grade =
  | "SPX AAA"
  | "SPX AA"
  | "SPX A"
  | "SPX BBB"
  | "SPX BB"
  | "SPX B"
  | "SPX D"
  | "SPX404";

export type EventType =
  | "DEPOSIT_RECEIVED"
  | "BUYBACK_EXECUTED"
  | "BURN_CONFIRMED"
  | "CONFIG_CHANGED"
  | "FAILED_WINDOW"
  | "ANOMALY_DETECTED"
  | "OPERATOR_VERIFIED"
  | "SWAP_EXECUTED"
  | "X402_PAYMENT_RECEIVED"
  | "TASK_COMPLETED"
  | "OC_OPENED"
  | "OC_AWARDED"
  | "OC_FULFILLED"
  | "OC_FAILED"
  | "OC_SLASHED"
  // Wave 1b — failure decoder negative-event taxonomy.
  | "FAILED_BUYBACK_WINDOW"
  | "PROMISED_BUYBACK_NOT_SETTLED"
  | "X402_PAYMENT_REVERTED"
  | "WINDOW_MISSED";

export type Severity = "info" | "warn" | "critical" | "success";

export interface AgentEvent {
  id: string;
  type: EventType;
  severity: Severity;
  title: string;
  description: string;
  signature: string;
  asset?: string;
  amount?: number;
  tokenAmount?: number;
  slot: number;
  confidence: "high" | "medium" | "low";
  /** Registry facilitator whose fee-payer proved this settlement (Tier A). */
  facilitatorId?: string | null;

  occurredAt: string; // relative label
  iso: string;
}

export interface AgentScoreBreakdown {
  depositConsistency: number; // out of 20
  buybackExecution: number; // out of 25
  burnConfirmation: number; // out of 20
  failedTx: number; // out of 15
  recency: number; // out of 10
  metadata: number; // out of 5
  operator: number; // out of 5
}

export interface Agent {
  mint: string;
  // The on-chain identifier we score. For tokenized agents this equals `mint`.
  // For registered agents it's the MPL Core asset. For executor agents it's
  // the wallet address.
  identifier: string;
  identifierKind: IdentifierKind;
  /** Settlement chain this subject is indexed on. Lanes are never merged. */
  chain: "solana" | "base";
  category: AgentCategory;
  executorWallet: string | null;
  coreAsset: string | null;
  symbol: string;
  name: string;
  tagline: string;
  grade: Grade;
  score: number | null;
  status: "active" | "degraded" | "stale" | "inactive" | "unknown";
  operatorVerified: boolean;
  confidence: "high" | "medium" | "low";
  // Wave 2 — numeric confidence (0..1). The categorical `confidence` field
  // above is derived from this (≥0.66 high, ≥0.33 medium, else low).
  confidenceScore: number;
  methodologyVersion: string;
  confidenceModelVersion: string;
  parserVersion: string;
  lastIndexedSeconds: number;
  totalDepositsCount: number;
  totalBuybacksCount: number;
  totalBurnsCount: number;
  failedWindows: number;
  totalDepositedSol: number;
  totalBuybackSol: number;
  totalBurnedTokens: number;
  buybackExecutionRate: number;
  burnConfirmationRate: number;
  buybackBps: number;
  lastBuybackLabel: string;
  lastBurnLabel: string;
  configLastChangedLabel: string;
  scoreBreakdown: AgentScoreBreakdown;
  verdict: string;
  events: AgentEvent[];
  priceSeries: { t: string; v: number }[];
  flagged: boolean;
  flagReason: string | null;
  flaggedAt: string | null;
}

// ─────────────────────────────────────────────────────────────────────
// Quality gates: which grades qualify for which surfaces.
// LEADERBOARD = high-trust public board. Hides D/404 and any flagged agents.
// EXPLORE     = full visible index. Includes everything except flagged agents.
// FLAGGED     = the dedicated /flagged page only.
// ─────────────────────────────────────────────────────────────────────
const LEADERBOARD_GRADES: ReadonlySet<Grade> = new Set([
  "SPX AAA",
  "SPX AA",
  "SPX A",
  "SPX BBB",
  "SPX BB",
]);

export function qualifiesForLeaderboard(agent: Agent): boolean {
  if (agent.flagged) return false;
  if (!LEADERBOARD_GRADES.has(agent.grade)) return false;
  if ((agent.score ?? 0) < 50) return false;
  return true;
}

export function isLowGrade(agent: Agent): boolean {
  return agent.grade === "SPX D" || agent.grade === "SPX404";
}

export function gradeColor(grade: Grade): string {
  if (grade === "SPX AAA" || grade === "SPX AA") return "verified";
  if (grade === "SPX A" || grade === "SPX BBB") return "amber";
  if (grade === "SPX BB" || grade === "SPX B") return "amber-dim";
  if (grade === "SPX D" || grade === "SPX404") return "critical";
  return "paper-muted";
}
