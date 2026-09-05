// Single source of truth for API tiers, quotas and per-call prices.
// Imported by both browser code (dashboard, docs, pricing) and the
// server-side x402 middleware so the numbers can never drift apart.

export type ApiTier = "free" | "pro" | "team";

/** Calls per API key per UTC day. */
export const TIER_LIMITS: Record<ApiTier, number> = {
  free: 100,
  pro: 10_000,
  team: 100_000,
};

/** Per-call price in USDC base units (6 decimals) for keyless x402 calls. */
export const ENDPOINT_PRICES = {
  score: 10_000, // 0.01 USDC
  dossier: 50_000, // 0.05 USDC
  evidence: 50_000, // 0.05 USDC
} as const;

export type X402Endpoint = keyof typeof ENDPOINT_PRICES;

export function usdc(amount: number): string {
  return (amount / 1_000_000).toFixed(2);
}
