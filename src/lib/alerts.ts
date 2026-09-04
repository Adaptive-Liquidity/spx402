import { supabase } from "@/integrations/supabase/client";

export const ALERT_EVENT_FIELDS = [
  { key: "event_escrow_created", label: "Escrow created" },
  { key: "event_escrow_released", label: "Escrow released" },
  { key: "event_escrow_canceled", label: "Escrow canceled" },
  { key: "event_bond_deposited", label: "Bond deposited" },
  { key: "event_bond_slashed", label: "Bond slashed" },
  { key: "event_receipt_created", label: "Receipt written" },
  { key: "event_deposit", label: "Deposit" },
  { key: "event_buyback", label: "Buyback" },
  { key: "event_burn", label: "Burn" },
  { key: "event_failed_window", label: "Failed window" },
  { key: "event_config_change", label: "Config change" },
  { key: "event_score_drop", label: "Score drop" },
] as const;

export type AlertEventKey = (typeof ALERT_EVENT_FIELDS)[number]["key"];

export interface AlertSubscription {
  id: string;
  user_id: string;
  mint: string;
  channel: string;
  paused: boolean;
  created_at: string;
  score_drop_threshold: number;
  min_sol_threshold: number;
  event_escrow_created: boolean;
  event_escrow_released: boolean;
  event_escrow_canceled: boolean;
  event_bond_deposited: boolean;
  event_bond_slashed: boolean;
  event_receipt_created: boolean;
  event_deposit: boolean;
  event_buyback: boolean;
  event_burn: boolean;
  event_failed_window: boolean;
  event_config_change: boolean;
  event_score_drop: boolean;
}

export async function fetchSubscriptions(userId: string): Promise<AlertSubscription[]> {
  const { data, error } = await supabase
    .from("alert_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as AlertSubscription[];
}

export async function fetchSubscriptionForMint(
  userId: string,
  mint: string,
): Promise<AlertSubscription | null> {
  const { data, error } = await supabase
    .from("alert_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("mint", mint)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as AlertSubscription) ?? null;
}

export async function createSubscription(
  userId: string,
  mint: string,
): Promise<AlertSubscription> {
  const { data, error } = await supabase
    .from("alert_subscriptions")
    .insert({ user_id: userId, mint })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as AlertSubscription;
}

export async function updateSubscription(
  id: string,
  patch: Partial<Record<AlertEventKey | "paused", boolean>>,
): Promise<void> {
  const { error } = await supabase.from("alert_subscriptions").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteSubscription(id: string): Promise<void> {
  const { error } = await supabase.from("alert_subscriptions").delete().eq("id", id);
  if (error) throw error;
}
