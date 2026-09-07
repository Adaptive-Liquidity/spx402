// Supabase-backed data access for agents.
// The agents table is the source of truth; src/lib/agents.ts only holds types
// and the static seed fallback for the home page boot animation.

import { supabase } from "@/integrations/supabase/client";
import { SCORING_VERSION } from "@/lib/versions";
import { qualifiesForLeaderboard } from "./agents";
import type { Agent, AgentEvent, AgentScoreBreakdown, Grade } from "./agents";
import type { AgentCategory, IdentifierKind } from "./agents/categories";

type AgentRow = {
  mint: string;
  identifier_kind: string | null;
  category: string | null;
  executor_wallet: string | null;
  core_asset: string | null;
  symbol: string;
  name: string;
  tagline: string | null;
  grade: string;
  score: number | null;
  status: string;
  operator_verified: boolean;
  confidence: string;
  confidence_score: number | string | null;
  methodology_version: string | null;
  confidence_model_version: string | null;
  parser_version: string;
  last_indexed_seconds: number;
  total_deposits_count: number;
  total_buybacks_count: number;
  total_burns_count: number;
  failed_windows: number;
  total_deposited_sol: number | string;
  total_buyback_sol: number | string;
  total_burned_tokens: number | string;
  buyback_execution_rate: number | string;
  burn_confirmation_rate: number | string;
  buyback_bps: number;
  last_buyback_label: string | null;
  last_burn_label: string | null;
  config_last_changed_label: string | null;
  score_breakdown: unknown;
  verdict: string | null;
  events: unknown;
  price_series: unknown;
  chain?: string | null;
  flagged: boolean | null;
  flag_reason: string | null;
  flagged_at: string | null;
  // AEON primitives
  aeon_cri_address: string | null;
  total_slashed_usd: number | string;
  active_bond_amount: number | string;
  escrow_success_rate: number | string;
  total_escrows_completed: number | string;
  total_escrows_failed: number | string;
};

const num = (v: unknown): number => {
  const parsed =
    typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
};

function rowToAgent(r: AgentRow): Agent {
  // For tokenized agents (default), identifier equals mint. For registered /
  // executor agents the mint column holds the on-chain identifier of that
  // kind (core asset address or executor wallet) — see the migration notes.
  const identifierKind = (r.identifier_kind as IdentifierKind) ?? "mint";
  const category = (r.category as AgentCategory) ?? "tokenized_buyback";
  return {
    mint: r.mint,
    identifier: r.mint,
    identifierKind,
    chain: ((r as unknown as { chain?: string | null }).chain ?? "solana") as Agent["chain"],
    category,
    executorWallet: r.executor_wallet ?? null,
    coreAsset: r.core_asset ?? null,
    symbol: r.symbol,
    name: r.name,
    tagline: r.tagline ?? "",
    grade: r.grade as Grade,
    score: r.score,
    status: (r.status as Agent["status"]) ?? "unknown",
    operatorVerified: r.operator_verified,
    confidence: (r.confidence as Agent["confidence"]) ?? "low",
    confidenceScore: num(r.confidence_score),
    methodologyVersion: r.methodology_version ?? SCORING_VERSION,
    confidenceModelVersion: r.confidence_model_version ?? "spx-confidence-v0.2.0",
    parserVersion: r.parser_version,
    lastIndexedSeconds: r.last_indexed_seconds,
    totalDepositsCount: r.total_deposits_count,
    totalBuybacksCount: r.total_buybacks_count,
    totalBurnsCount: r.total_burns_count,
    failedWindows: r.failed_windows,
    totalDepositedSol: num(r.total_deposited_sol),
    totalBuybackSol: num(r.total_buyback_sol),
    totalBurnedTokens: num(r.total_burned_tokens),
    buybackExecutionRate: num(r.buyback_execution_rate),
    burnConfirmationRate: num(r.burn_confirmation_rate),
    buybackBps: r.buyback_bps,
    lastBuybackLabel: r.last_buyback_label ?? "—",
    lastBurnLabel: r.last_burn_label ?? "—",
    configLastChangedLabel: r.config_last_changed_label ?? "—",
    scoreBreakdown: scoreBreakdown(r.score_breakdown),
    verdict: r.verdict ?? "",
    events: ((r.events as AgentEvent[]) ?? []).map((e) => ({
      ...e,
      slot: typeof e.slot === "number" ? e.slot : Number(e.slot),
    })),
    priceSeries: (r.price_series as { t: string; v: number }[]) ?? [],
    flagged: Boolean(r.flagged),
    flagReason: r.flag_reason ?? null,
    flaggedAt: r.flagged_at ?? null,
    // AEON primitives
    aeonCriAddress: r.aeon_cri_address ?? null,
    totalSlashedUsd: num(r.total_slashed_usd),
    activeBondAmount: num(r.active_bond_amount),
    escrowSuccessRate: num(r.escrow_success_rate),
    totalEscrowsCompleted: num(r.total_escrows_completed),
    totalEscrowsFailed: num(r.total_escrows_failed),
  };
}

function scoreBreakdown(value: unknown): AgentScoreBreakdown {
  const row = value && typeof value === "object" ? (value as Partial<AgentScoreBreakdown>) : {};
  return {
    escrowCompletion: num(row.escrowCompletion),
    slashableBond: num(row.slashableBond),
    failedTx: num(row.failedTx),
    recency: num(row.recency),
    operator: num(row.operator),
  };
}

/**
 * Columns the list pages (home, leaderboard, explore, flagged) actually
 * render. Excludes the heavy per-row blobs (events, price_series,
 * score_breakdown) which only the agent detail route needs — pulling them
 * for every row was the largest payload cost on the three busiest pages.
 */
const AGENT_LIST_COLUMNS = [
  "mint",
  "identifier_kind",
  "category",
  "executor_wallet",
  "core_asset",
  "symbol",
  "name",
  "tagline",
  "grade",
  "score",
  "status",
  "operator_verified",
  "confidence",
  "confidence_score",
  "methodology_version",
  "confidence_model_version",
  "parser_version",
  "last_indexed_seconds",
  "total_deposits_count",
  "total_buybacks_count",
  "total_burns_count",
  "failed_windows",
  "total_deposited_sol",
  "total_buyback_sol",
  "total_burned_tokens",
  "buyback_execution_rate",
  "burn_confirmation_rate",
  "buyback_bps",
  "last_buyback_label",
  "last_burn_label",
  "config_last_changed_label",
  "verdict",
  "flagged",
  "flag_reason",
  "flagged_at",
  "chain",
  "aeon_cri_address",
  "total_slashed_usd",
  "active_bond_amount",
  "escrow_success_rate",
  "total_escrows_completed",
  "total_escrows_failed",
].join(", ");

/** Safety bound so the index payload can never grow without limit. */
const AGENT_INDEX_LIMIT = 5000;

// Short-lived shared cache: home, leaderboard, explore and flagged all load
// the same index, so navigating between them within the TTL reuses one copy
// instead of re-fetching the whole table per route. The in-flight promise is
// cached (not just the result) so concurrent loaders dedupe.
let indexCache: { at: number; promise: Promise<Agent[]> } | null = null;
const INDEX_CACHE_TTL_MS = 30_000;

/** Fetch the slim agent index shared by all list pages, briefly memoized. */
export function fetchAgentIndex(): Promise<Agent[]> {
  if (indexCache && Date.now() - indexCache.at < INDEX_CACHE_TTL_MS) {
    return indexCache.promise;
  }
  const promise = (async () => {
    const { data, error } = await supabase
      .from("agents")
      .select(AGENT_LIST_COLUMNS)
      .order("score", { ascending: false, nullsFirst: false })
      .limit(AGENT_INDEX_LIMIT);
    if (error) throw error;
    return (data as unknown as AgentRow[]).map(rowToAgent);
  })();
  indexCache = { at: Date.now(), promise };
  // A failed fetch must not poison the cache — drop it so the next
  // navigation retries.
  promise.catch(() => {
    if (indexCache?.promise === promise) indexCache = null;
  });
  return promise;
}

export type HomeIndexSummary = {
  featured: Agent[];
  gradeSlices: Array<{ grade: Agent["grade"]; count: number }>;
  unverifiedCount: number;
  totalBonded: number;
  totalSlashed: number;
};

/**
 * Homepage-only projection. The homepage renders three featured agents plus a
 * handful of aggregates, so shipping the entire serialized index to the
 * browser (hundreds of rows, ~45 columns each) was pure payload waste. The
 * reduction happens on the server; the client receives kilobytes.
 */
export async function fetchHomeIndex(): Promise<HomeIndexSummary> {
  const all = await fetchAgentIndex();
  const gradeCounts = new Map<Agent["grade"], number>();
  let unverifiedCount = 0;
  let totalBonded = 0;
  let totalSlashed = 0;
  for (const a of all) {
    gradeCounts.set(a.grade, (gradeCounts.get(a.grade) ?? 0) + 1);
    if (!a.operatorVerified) unverifiedCount++;
    totalBonded += a.activeBondAmount;
    totalSlashed += a.totalSlashedUsd;
  }
  return {
    featured: all.filter(qualifiesForLeaderboard).slice(0, 3),
    gradeSlices: Array.from(gradeCounts, ([grade, count]) => ({ grade, count })),
    unverifiedCount,
    totalBonded,
    totalSlashed,
  };
}



export type LeaderboardIndex = {
  agents: Agent[];
  gateStats: { total: number; excluded: number; flagged: number };
};

/**
 * Leaderboard projection: the board only ever ranks agents that pass the
 * quality gate, so only those rows need to reach the browser. The gate
 * counts are computed here instead of shipping the full index to derive them.
 */
export async function fetchLeaderboardIndex(): Promise<LeaderboardIndex> {
  const all = await fetchAgentIndex();
  const unflagged = all.filter((a) => !a.flagged);
  const passing = unflagged.filter(qualifiesForLeaderboard);
  return {
    agents: passing,
    gateStats: {
      total: all.length,
      excluded: unflagged.length - passing.length,
      flagged: all.length - unflagged.length,
    },
  };
}

/** Resolve one agent by exact mint, symbol, or mint prefix. */
export async function fetchAgent(mintOrSymbol: string): Promise<Agent | null> {
  const q = mintOrSymbol.trim();
  if (!q) return null;

  // Try exact mint first
  const { data: byMint } = await supabase.from("agents").select("*").eq("mint", q).maybeSingle();
  if (byMint) return rowToAgent(byMint as AgentRow);

  // Try symbol (case-insensitive)
  const { data: bySymbol } = await supabase
    .from("agents")
    .select("*")
    .ilike("symbol", q)
    .maybeSingle();
  if (bySymbol) return rowToAgent(bySymbol as AgentRow);

  // Try mint prefix
  const { data: byPrefix } = await supabase
    .from("agents")
    .select("*")
    .ilike("mint", `${q}%`)
    .limit(1)
    .maybeSingle();
  if (byPrefix) return rowToAgent(byPrefix as AgentRow);

  return null;
}

/** Fetch the agents whose identifiers match the supplied mint list. */
export async function fetchAgentsByMints(mints: string[]): Promise<Agent[]> {
  if (mints.length === 0) return [];
  const { data, error } = await supabase.from("agents").select("*").in("mint", mints);
  if (error) throw error;
  return (data as AgentRow[]).map(rowToAgent);
}
