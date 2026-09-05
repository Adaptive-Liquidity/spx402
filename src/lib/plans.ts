// Paid plans settled in USDC on Base. Shared by the browser (Base Pay button,
// pricing copy) and the server (payment verification), so the price a caller
// is shown can never drift from the price the server enforces.

import type { ApiTier } from "@/lib/api-tiers";
import { TIER_LIMITS } from "@/lib/api-tiers";

export type PlanId = "pro" | "team";

export interface PlanSpec {
  id: PlanId;
  name: string;
  /** Price in USDC base units (6 decimals). */
  priceUsdc: number;
  /** API tier granted for the period. */
  tier: ApiTier;
  /** Days of access bought by one payment. */
  days: number;
}

export const PLANS: Record<PlanId, PlanSpec> = {
  pro: { id: "pro", name: "Pro", priceUsdc: 49_000_000, tier: "pro", days: 30 },
  team: { id: "team", name: "Team", priceUsdc: 149_000_000, tier: "team", days: 30 },
};

export function isPlanId(v: unknown): v is PlanId {
  return v === "pro" || v === "team";
}

export function planDailyLimit(plan: PlanSpec): number {
  return TIER_LIMITS[plan.tier];
}

/** Human price, e.g. 49_000_000 -> "49.00". */
export function formatUsdc(baseUnits: number): string {
  return (baseUnits / 1_000_000).toFixed(2);
}

/** USDC on Base mainnet (browser-safe copy of the server constant). */
export const BASE_USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913" as const;

/** Base mainnet. */
export const BASE_CHAIN_ID = 8453;
export const BASE_CHAIN_ID_HEX = "0x2105";
