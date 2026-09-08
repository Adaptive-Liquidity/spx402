import type { AgentCategory } from "./agents/categories";

// Shadow-grader category vocabulary (subset used by scripts/shadow-grade.ts).
// Pure module: no env, no network, no side effects — safe to unit-test.
export type ShadowCategory =
  | "tokenized_buyback"
  | "registered_agent"
  | "executor"
  | "aeon_executor"
  | "unknown";

export const SHADOW_CATEGORY_MAP: Record<ShadowCategory, AgentCategory> = {
  tokenized_buyback: "tokenized_buyback",
  registered_agent: "registered_agent",
  executor: "x402_executor",
  aeon_executor: "aeon_executor",
  unknown: "general",
};

/**
 * Map a raw database category value onto the shadow category union.
 * Never forward the raw string: unmapped values become "unknown", never a
 * silent tokenized_buyback. Real aeon_executor rows keep the AEON branch.
 */
export function toShadowCategory(dbCategory: string | null): ShadowCategory {
  switch (dbCategory) {
    case "tokenized_buyback":
      return "tokenized_buyback";
    case "registered_agent":
      return "registered_agent";
    case "x402_executor":
    case "executor":
      return "executor";
    case "aeon_executor":
      return "aeon_executor";
    default:
      return "unknown";
  }
}
