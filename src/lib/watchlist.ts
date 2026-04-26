import { supabase } from "@/integrations/supabase/client";

export interface WatchlistRow {
  id: string;
  user_id: string;
  mint: string;
  label: string | null;
  created_at: string;
}

export async function fetchWatchlist(userId: string): Promise<WatchlistRow[]> {
  const { data, error } = await supabase
    .from("watchlist")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as WatchlistRow[];
}

export async function addToWatchlist(
  userId: string,
  mint: string,
  label?: string,
): Promise<WatchlistRow> {
  const { data, error } = await supabase
    .from("watchlist")
    .insert({ user_id: userId, mint, label: label ?? null })
    .select()
    .single();
  if (error) throw error;
  return data as WatchlistRow;
}

export async function removeFromWatchlist(
  userId: string,
  mint: string,
): Promise<void> {
  const { error } = await supabase
    .from("watchlist")
    .delete()
    .eq("user_id", userId)
    .eq("mint", mint);
  if (error) throw error;
}

export async function isOnWatchlist(
  userId: string,
  mint: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("watchlist")
    .select("id")
    .eq("user_id", userId)
    .eq("mint", mint)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}
