// Channel test-send. Verification happens by proving we can actually reach
// the destination — a channel only becomes verified after a successful test.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const sendChannelTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { channelId: string }) => ({ channelId: String(input.channelId) }))
  .handler(async ({ data, context }) => {
    const { deliverAlert, channelUnavailableReason } = await import("@/lib/alerts/deliver.server");
    type Row = import("@/lib/alerts/deliver.server").AlertChannelRow;

    const { data: channel, error } = await context.supabase
      .from("alert_channels")
      .select("*")
      .eq("id", data.channelId)
      .maybeSingle();
    if (error || !channel) throw new Error("Channel not found");
    const row = channel as unknown as Row;

    const unavailable = channelUnavailableReason(row.kind);
    if (unavailable) {
      return { ok: false, status: "skipped" as const, error: unavailable };
    }

    const result = await deliverAlert(row, {
      event: "TEST_ALERT",
      mint: "SPX402TEST",
      occurredAt: new Date().toISOString(),
      url: "https://spx402.com/dashboard/alerts",
      summary: "Test alert from SPX402 — your channel is wired up correctly.",
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("alert_deliveries").insert({
      user_id: context.userId,
      channel_id: row.id,
      status: result.status === "sent" ? "test" : "failed",
      event_type: "TEST_ALERT",
      http_status: result.httpStatus ?? null,
      error: result.error ?? null,
    });

    await supabaseAdmin
      .from("alert_channels")
      .update({
        verified: result.status === "sent",
        last_delivery_at: new Date().toISOString(),
        last_error: result.status === "sent" ? null : (result.error ?? null),
      })
      .eq("id", row.id);

    return { ok: result.status === "sent", status: result.status, error: result.error ?? null };
  });
