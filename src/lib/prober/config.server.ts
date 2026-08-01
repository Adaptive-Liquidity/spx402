// Active Prober — configuration and safety rails.
//
// SERVER ONLY. Never import from client code.
//
// The prober spends real money. Every guard that keeps that spend bounded
// lives here so it can be reasoned about in one place:
//   - PROBER_ENABLED   master flag; when false, ONLY free challenge probes run
//   - per-probe cap    $0.05, enforced before any signing
//   - daily budget     $10/UTC-day, enforced against probe_run rows
//   - drain tripwire   wallet balance drop with no matching probe_run rows
//
// Secrets (PROBER_SOLANA_KEY / PROBER_BASE_KEY) are read inside functions,
// never at module scope — env is injected per-request in the Worker runtime.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { PROBE_CAPS } from "./outcomes";

export interface ProberConfig {
  /** Master switch. False → challenge-only, no keys touched. */
  enabled: boolean;
  hasSolanaKey: boolean;
  hasBaseKey: boolean;
  /** Public addresses, published on /methodology. Null when unconfigured. */
  solanaWallet: string | null;
  baseWallet: string | null;
}

function envFlag(name: string): boolean {
  const v = process.env[name];
  if (!v) return false;
  const s = v.trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes";
}

export function proberConfig(): ProberConfig {
  return {
    enabled: envFlag("PROBER_ENABLED"),
    hasSolanaKey: Boolean(process.env["PROBER_SOLANA_KEY"]),
    hasBaseKey: Boolean(process.env["PROBER_BASE_KEY"]),
    solanaWallet: process.env["PROBER_SOLANA_WALLET"] ?? null,
    baseWallet: process.env["PROBER_BASE_WALLET"] ?? null,
  };
}

/** Settlement probes require the master flag AND a key for that chain. */
export function settlementEnabled(chain: string): boolean {
  const cfg = proberConfig();
  if (!cfg.enabled) return false;
  return chain === "solana" ? cfg.hasSolanaKey : cfg.hasBaseKey;
}

export function proberWalletFor(chain: string): string | null {
  const cfg = proberConfig();
  return chain === "solana" ? cfg.solanaWallet : cfg.baseWallet;
}

// ---------------------------------------------------------------------------
// Budget
// ---------------------------------------------------------------------------

export interface BudgetState {
  spentTodayUsd: number;
  remainingUsd: number;
  dailyBudgetUsd: number;
  /** True when the circuit breaker has tripped — no further paid probes. */
  halted: boolean;
  paidProbesToday: number;
}

function utcDayStart(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  ).toISOString();
}

/**
 * PROBER_BUDGET_HALT — the circuit breaker.
 *
 * Sums every paid_amount_usd recorded today. On any read failure we halt:
 * an unknown spend is treated as an exhausted budget, never as a free pass.
 */
export async function budgetState(): Promise<BudgetState> {
  const { data, error } = await supabaseAdmin
    .from("probe_run")
    .select("paid_amount_usd")
    .gte("ran_at", utcDayStart())
    .not("paid_amount_usd", "is", null);

  if (error) {
    return {
      spentTodayUsd: PROBE_CAPS.dailyBudgetUsd,
      remainingUsd: 0,
      dailyBudgetUsd: PROBE_CAPS.dailyBudgetUsd,
      halted: true,
      paidProbesToday: 0,
    };
  }

  const rows = data ?? [];
  const spent = rows.reduce((sum, r) => sum + Number(r.paid_amount_usd ?? 0), 0);
  const remaining = Math.max(0, PROBE_CAPS.dailyBudgetUsd - spent);

  return {
    spentTodayUsd: round6(spent),
    remainingUsd: round6(remaining),
    dailyBudgetUsd: PROBE_CAPS.dailyBudgetUsd,
    halted: spent >= PROBE_CAPS.dailyBudgetUsd,
    paidProbesToday: rows.length,
  };
}

/** Can we afford one more probe of this size, right now? */
export function affordable(state: BudgetState, amountUsd: number): boolean {
  if (state.halted) return false;
  if (amountUsd > PROBE_CAPS.perProbeUsd) return false;
  return amountUsd <= state.remainingUsd;
}

// ---------------------------------------------------------------------------
// Wallet-drain tripwire
// ---------------------------------------------------------------------------

export interface DrainCheck {
  tripped: boolean;
  observedDropUsd: number;
  accountedUsd: number;
  unaccountedUsd: number;
  reason: string;
}

/**
 * The prober must be auditable by the same pipeline it uses: every dollar that
 * leaves its wallets has to be reconstructible from probe_run rows. A balance
 * drop larger than the recorded spend (beyond a tolerance for gas/fees) means
 * either a bug or a compromised key — both halt the lane.
 */
export function checkDrain(input: {
  balanceStartUsd: number;
  balanceNowUsd: number;
  recordedSpendUsd: number;
  /** Absolute tolerance for network fees, in USD. */
  feeToleranceUsd?: number;
}): DrainCheck {
  const tolerance = input.feeToleranceUsd ?? 0.02;
  const drop = Math.max(0, input.balanceStartUsd - input.balanceNowUsd);
  const unaccounted = round6(drop - input.recordedSpendUsd - tolerance);

  if (unaccounted <= 0) {
    return {
      tripped: false,
      observedDropUsd: round6(drop),
      accountedUsd: round6(input.recordedSpendUsd),
      unaccountedUsd: 0,
      reason: "fully accounted",
    };
  }

  const relative =
    input.balanceStartUsd > 0 ? unaccounted / input.balanceStartUsd : 1;

  return {
    tripped: relative > PROBE_CAPS.walletDrainPct || unaccounted > 1,
    observedDropUsd: round6(drop),
    accountedUsd: round6(input.recordedSpendUsd),
    unaccountedUsd: unaccounted,
    reason: `unaccounted $${unaccounted.toFixed(4)} (${(relative * 100).toFixed(1)}% of starting balance)`,
  };
}

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}
