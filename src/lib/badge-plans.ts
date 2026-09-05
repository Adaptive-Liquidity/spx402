// Operator badge subscription tiers. Browser-safe (no secrets) — shared by
// the checkout UI and the server so displayed price == enforced price.
//
// The honest-grade rule is part of the product, not fine print:
// payment funds continuous monitoring and badge hosting — it never buys or
// inflates an execution grade.

export type BadgeTier = "standard" | "premium";

export interface BadgeTierSpec {
  id: BadgeTier;
  name: string;
  /** Price in USDC base units (6 decimals) per period. */
  priceUsdc: number;
  days: number;
  features: string[];
}

export const BADGE_TIERS: Record<BadgeTier, BadgeTierSpec> = {
  standard: {
    id: "standard",
    name: "Standard",
    priceUsdc: 49_000_000,
    days: 30,
    features: [
      "Live badge with current grade",
      "On-chain EAS attestation on every grade change",
      "Monitoring status shown on the badge",
    ],
  },
  premium: {
    id: "premium",
    name: "Premium",
    priceUsdc: 199_000_000,
    days: 30,
    features: [
      "Everything in Standard",
      "Attestation on operator verification events",
      "Priority monitoring cadence",
      "Badge styling options",
    ],
  },
};

export function isBadgeTier(v: unknown): v is BadgeTier {
  return v === "standard" || v === "premium";
}

/** Verbatim rule — keep this exact wording wherever the badge is sold. */
export const HONEST_GRADE_RULE =
  "Payment funds continuous monitoring and badge hosting — it never buys or inflates an execution grade. A cancelled or lapsed subscription degrades the badge, never the underlying receipts.";
