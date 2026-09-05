// Server-side API key minting. The browser never inserts into `api_keys`;
// the tier — and therefore the daily quota — is decided here.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { TIER_LIMITS } from "@/lib/api-tiers";

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const mintApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name?: string }) => ({
    name: (input?.name ?? "").toString().slice(0, 64),
  }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    // Self-service keys are always issued on the free tier. Higher tiers are
    // granted out of band once billing exists — never chosen by the caller.
    const tier = "free" as const;

    const { count } = await supabaseAdmin
      .from("api_keys")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "active");
    if ((count ?? 0) >= 5) {
      throw new Error("Key limit reached — revoke an existing key first.");
    }

    const secret = `spx_${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().replace(/-/g, "")}`;
    const keyHash = await sha256Hex(secret);

    const { data: row, error } = await supabaseAdmin
      .from("api_keys")
      .insert({
        user_id: userId,
        name: data.name.trim() || "default",
        tier,
        key_hash: keyHash,
        key_prefix: secret.slice(0, 12),
        daily_limit: TIER_LIMITS[tier],
      })
      .select(
        "id, name, tier, status, key_prefix, daily_limit, created_at, revoked_at, last_used_at",
      )
      .single();

    if (error) throw new Error("Could not issue key");

    return { row, secret };
  });
