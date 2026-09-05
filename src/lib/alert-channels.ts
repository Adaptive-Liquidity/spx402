import { supabase } from "@/integrations/supabase/client";
import { sendChannelTest } from "@/lib/alert-channels.functions";

export type ChannelKind = "email" | "webhook" | "slack" | "sms";

export interface AlertChannel {
  id: string;
  user_id: string;
  kind: ChannelKind;
  target: string;
  label: string;
  secret: string | null;
  verified: boolean;
  paused: boolean;
  digest: "instant" | "daily";
  last_delivery_at: string | null;
  last_error: string | null;
  created_at: string;
}

export interface AlertDelivery {
  id: string;
  channel_id: string | null;
  mint: string | null;
  event_type: string | null;
  status: string;
  http_status: number | null;
  error: string | null;
  created_at: string;
}

export const CHANNEL_KINDS: {
  kind: ChannelKind;
  label: string;
  hint: string;
  available: boolean;
}[] = [
  {
    kind: "webhook",
    label: "Webhook",
    hint: "HTTPS endpoint. Signed with HMAC-SHA256 in X-SPX402-Signature.",
    available: true,
  },
  {
    kind: "slack",
    label: "Slack",
    hint: "Paste a Slack incoming webhook URL.",
    available: true,
  },
  {
    kind: "email",
    label: "Email",
    hint: "Needs a verified sending domain — not available yet.",
    available: false,
  },
  {
    kind: "sms",
    label: "Text message",
    hint: "Needs a sending number — not available yet.",
    available: false,
  },
];

export async function fetchChannels(userId: string): Promise<AlertChannel[]> {
  const { data, error } = await supabase
    .from("alert_channels")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as AlertChannel[];
}

export async function createChannel(
  userId: string,
  kind: ChannelKind,
  target: string,
  label: string,
): Promise<AlertChannel> {
  const secret =
    kind === "webhook" ? `whsec_${crypto.randomUUID().replace(/-/g, "")}` : null;
  const { data, error } = await supabase
    .from("alert_channels")
    .insert({ user_id: userId, kind, target: target.trim(), label: label.trim(), secret })
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as AlertChannel;
}

export async function updateChannel(
  id: string,
  patch: Partial<Pick<AlertChannel, "paused" | "digest" | "label">>,
): Promise<void> {
  const { error } = await supabase.from("alert_channels").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteChannel(id: string): Promise<void> {
  const { error } = await supabase.from("alert_channels").delete().eq("id", id);
  if (error) throw error;
}

export async function testChannel(
  id: string,
): Promise<{ ok: boolean; status: string; error: string | null }> {
  return sendChannelTest({ data: { channelId: id } });
}

export async function fetchDeliveries(userId: string): Promise<AlertDelivery[]> {
  const { data, error } = await supabase
    .from("alert_deliveries")
    .select("id, channel_id, mint, event_type, status, http_status, error, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(25);
  if (error) throw error;
  return (data ?? []) as unknown as AlertDelivery[];
}
