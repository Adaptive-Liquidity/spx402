// Supabase-backed data access for agents.
// The agents table is the source of truth; src/lib/agents.ts only holds types
// and the static seed fallback for the home page boot animation.

import { supabase } from "@/integrations/supabase/client";
import { SCORING_VERSION } from "@/lib/versions";
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
  flagged: boolean | null;
  flag_reason: string | null;
  flagged_at: string | null;
};

const num = (v: number | string | null | undefined): number =>
  v == null ? 0 : typeof v === "number" ? v : Number(v);

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
  };
}

function scoreBreakdown(value: unknown): AgentScoreBreakdown {
  const row = value && typeof value === "object" ? (value as Partial<AgentScoreBreakdown>) : {};
  return {
    depositConsistency: num(row.depositConsistency),
    buybackExecution: num(row.buybackExecution),
    burnConfirmation: num(row.burnConfirmation),
    failedTx: num(row.failedTx),
    recency: num(row.recency),
    metadata: num(row.metadata),
    operator: num(row.operator),
  };
}

export async function fetchAllAgents(): Promise<Agent[]> {
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .order("score", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data as AgentRow[]).map(rowToAgent);
}

export async function fetchAgent(mintOrSymbol: string): Promise<Agent | null> {
  const q = mintOrSymbol.trim();
  if (!q) return null;

  // Try exact mint first
  const { data: byMint } = await supabase
    .from("agents")
    .select("*")
    .eq("mint", q)
    .maybeSingle();
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

export async function fetchAgentsByMints(mints: string[]): Promise<Agent[]> {
  if (mints.length === 0) return [];
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .in("mint", mints);
  if (error) throw error;
  return (data as AgentRow[]).map(rowToAgent);
}
