import { supabase } from "@/integrations/supabase/client";

export type AlertChannel = "email" | "telegram" | "webhook";

export interface AlertSubscription {
  id: string;
  user_id: string;
  mint: string;
  channel: AlertChannel;
  event_deposit: boolean;
  event_buyback: boolean;
  event_burn: boolean;
  event_failed_window: boolean;
  event_config_change: boolean;
  event_score_drop: boolean;
  min_sol_threshold: number;
  score_drop_threshold: number;
  paused: boolean;
  created_at: string;
  updated_at: string;
}

export type AlertSubscriptionInput = {
  mint: string;
  channel?: AlertChannel;
  event_deposit?: boolean;
  event_buyback?: boolean;
  event_burn?: boolean;
  event_failed_window?: boolean;
  event_config_change?: boolean;
  event_score_drop?: boolean;
  min_sol_threshold?: number;
  score_drop_threshold?: number;
  paused?: boolean;
};

const num = (v: number | string | null | undefined): number =>
  v == null ? 0 : typeof v === "number" ? v : Number(v);

function rowToSub(r: Record<string, unknown>): AlertSubscription {
  return {
    id: r.id as string,
    user_id: r.user_id as string,
    mint: r.mint as string,
    channel: r.channel as AlertChannel,
    event_deposit: !!r.event_deposit,
    event_buyback: !!r.event_buyback,
    event_burn: !!r.event_burn,
    event_failed_window: !!r.event_failed_window,
    event_config_change: !!r.event_config_change,
    event_score_drop: !!r.event_score_drop,
    min_sol_threshold: num(r.min_sol_threshold as number | string | null),
    score_drop_threshold: num(r.score_drop_threshold as number | string | null),
    paused: !!r.paused,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}

export async function fetchAlertSubscriptions(
  userId: string,
): Promise<AlertSubscription[]> {
  const { data, error } = await supabase
    .from("alert_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => rowToSub(r as Record<string, unknown>));
}

export async function fetchAlertSubscriptionForMint(
  userId: string,
  mint: string,
  channel: AlertChannel = "email",
): Promise<AlertSubscription | null> {
  const { data, error } = await supabase
    .from("alert_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("mint", mint)
    .eq("channel", channel)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToSub(data as Record<string, unknown>) : null;
}

export async function upsertAlertSubscription(
  userId: string,
  input: AlertSubscriptionInput,
): Promise<AlertSubscription> {
  const payload = {
    user_id: userId,
    mint: input.mint,
    channel: input.channel ?? "email",
    ...(input.event_deposit !== undefined && { event_deposit: input.event_deposit }),
    ...(input.event_buyback !== undefined && { event_buyback: input.event_buyback }),
    ...(input.event_burn !== undefined && { event_burn: input.event_burn }),
    ...(input.event_failed_window !== undefined && { event_failed_window: input.event_failed_window }),
    ...(input.event_config_change !== undefined && { event_config_change: input.event_config_change }),
    ...(input.event_score_drop !== undefined && { event_score_drop: input.event_score_drop }),
    ...(input.min_sol_threshold !== undefined && { min_sol_threshold: input.min_sol_threshold }),
    ...(input.score_drop_threshold !== undefined && { score_drop_threshold: input.score_drop_threshold }),
    ...(input.paused !== undefined && { paused: input.paused }),
  };
  const { data, error } = await supabase
    .from("alert_subscriptions")
    .upsert(payload, { onConflict: "user_id,mint,channel" })
    .select()
    .single();
  if (error) throw error;
  return rowToSub(data as Record<string, unknown>);
}

export async function updateAlertSubscription(
  id: string,
  patch: Partial<Omit<AlertSubscription, "id" | "user_id" | "mint" | "created_at" | "updated_at">>,
): Promise<AlertSubscription> {
  const { data, error } = await supabase
    .from("alert_subscriptions")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return rowToSub(data as Record<string, unknown>);
}

export async function deleteAlertSubscription(id: string): Promise<void> {
  const { error } = await supabase
    .from("alert_subscriptions")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
