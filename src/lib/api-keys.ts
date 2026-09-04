import { supabase } from "@/integrations/supabase/client";

export type ApiTier = "free" | "pro" | "team";

export interface ApiKeyRow {
  id: string;
  name: string;
  tier: string;
  status: string;
  key_prefix: string;
  daily_limit: number;
  created_at: string;
  revoked_at: string | null;
  last_used_at: string | null;
}

export const TIER_LIMITS: Record<ApiTier, number> = {
  free: 100,
  pro: 10000,
  team: 100000,
};

export async function fetchApiKeys(userId: string): Promise<ApiKeyRow[]> {
  const { data, error } = await supabase
    .from("api_keys")
    .select("id, name, tier, status, key_prefix, daily_limit, created_at, revoked_at, last_used_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ApiKeyRow[];
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Mints a key in the browser. Only the SHA-256 hash is persisted; the raw
 * secret is returned once to the caller and never stored.
 */
export async function createApiKey(
  userId: string,
  name: string,
  tier: ApiTier = "free",
): Promise<{ row: ApiKeyRow; secret: string }> {
  const secret = `spx_${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().replace(/-/g, "")}`;
  const keyHash = await sha256Hex(secret);
  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      user_id: userId,
      name: name.trim() || "default",
      tier,
      key_hash: keyHash,
      key_prefix: secret.slice(0, 12),
      daily_limit: TIER_LIMITS[tier],
    })
    .select(
      "id, name, tier, status, key_prefix, daily_limit, created_at, revoked_at, last_used_at",
    )
    .single();
  if (error) throw error;
  return { row: data as ApiKeyRow, secret };
}

export async function revokeApiKey(id: string): Promise<void> {
  const { error } = await supabase
    .from("api_keys")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
