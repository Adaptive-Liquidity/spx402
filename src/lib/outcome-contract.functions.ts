import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface OutcomeContractMetrics {
  totalAwarded: number;
  totalFulfilled: number;
  totalFailed: number;
  totalSlashed: number;
  fulfillmentRate: number | null;
}

const validateMint = (value: unknown): string => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("A mint is required.");
  }
  return value.trim();
};

/** Fetch exact Outcome Contract counts using the server's 30-day scoring window. */
export const fetchOutcomeContractMetrics = createServerFn({ method: "GET" })
  .inputValidator(validateMint)
  .handler(async ({ data: mint }): Promise<OutcomeContractMetrics | null> => {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const eventTypes = ["OC_AWARDED", "OC_FULFILLED", "OC_FAILED", "OC_SLASHED"] as const;
    const results = await Promise.all(
      eventTypes.map((type) =>
        supabaseAdmin
          .from("agent_events")
          .select("id", { count: "exact", head: true })
          .eq("mint", mint)
          .eq("type", type)
          .gte("occurred_at", since),
      ),
    );
    if (results.some(({ error, count }) => error || count == null)) return null;

    const [totalAwarded, totalFulfilled, totalFailed, totalSlashed] = results.map(
      ({ count }) => count ?? 0,
    );
    return {
      totalAwarded,
      totalFulfilled,
      totalFailed,
      totalSlashed,
      fulfillmentRate:
        totalAwarded === 0 ? null : Math.min(100, (totalFulfilled / totalAwarded) * 100),
    };
  });
