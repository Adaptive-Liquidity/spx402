import { supabase } from "@/integrations/supabase/client";
import { mintApiKey } from "@/lib/api-keys.functions";
import { TIER_LIMITS, type ApiTier } from "@/lib/api-tiers";

export type { ApiTier };
export { TIER_LIMITS };

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

export async function fetchApiKeys(userId: string): Promise<ApiKeyRow[]> {
  const { data, error } = await supabase
    .from("api_keys")
    .select("id, name, tier, status, key_prefix, daily_limit, created_at, revoked_at, last_used_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ApiKeyRow[];
}

/**
 * Mints a key server-side. The raw secret is returned once and never stored;
 * only its SHA-256 hash is persisted.
 */
export async function createApiKey(
  name: string,
): Promise<{ row: ApiKeyRow; secret: string }> {
  const res = await mintApiKey({ data: { name } });
  return { row: res.row as ApiKeyRow, secret: res.secret };
}

export async function revokeApiKey(id: string): Promise<void> {
  const { error } = await supabase
    .from("api_keys")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export interface ApiUsageRow {
  endpoint: string;
  status: string;
  created_at: string;
}

export async function fetchRecentUsage(userId: string): Promise<ApiUsageRow[]> {
  const { data: keys } = await supabase.from("api_keys").select("id").eq("user_id", userId);
  const ids = (keys ?? []).map((k) => k.id);
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("api_usage")
    .select("endpoint, status, created_at")
    .in("api_key_id", ids)
    .order("created_at", { ascending: false })
    .limit(25);
  if (error) throw error;
  return (data ?? []) as ApiUsageRow[];
}
