// Alert dispatcher — turns newly indexed events into deliveries.
// Runs on pg_cron. Reads a cursor, walks new agent_events, matches them
// against alert_subscriptions and each user's verified channels, delivers,
// and logs every attempt to alert_deliveries.

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { checkCronAuth } from "@/lib/indexer/auth.server";
import {
  deliverAlert,
  EVENT_TO_FLAG,
  summarize,
  type AlertChannelRow,
} from "@/lib/alerts/deliver.server";

const SITE = "https://spx402.com";
const MAX_EVENTS = 200;

export const Route = createFileRoute("/api/public/cron-alert-dispatch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const started = Date.now();
        if (!(await checkCronAuth(request))) {
          return new Response("unauthorized", { status: 401 });
        }

        const { data: state } = await supabaseAdmin
          .from("alert_dispatch_state")
          .select("last_event_at")
          .eq("id", 1)
          .maybeSingle();
        const cursor = state?.last_event_at ?? new Date(Date.now() - 3600_000).toISOString();

        const { data: events, error } = await supabaseAdmin
          .from("agent_events")
          .select("id, mint, type, severity, signature, occurred_at, amount_sol")
          .gt("occurred_at", cursor)
          .order("occurred_at", { ascending: true })
          .limit(MAX_EVENTS);

        if (error) {
          await heartbeat("alert_dispatch", false, Date.now() - started, "db_error");
          return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
        }

        let sent = 0;
        let failed = 0;
        let skipped = 0;
        let newest = cursor;

        if (events && events.length > 0) {
          const mints = [...new Set(events.map((e) => e.mint))];
          const { data: subs } = await supabaseAdmin
            .from("alert_subscriptions")
            .select("*")
            .in("mint", mints)
            .eq("paused", false);

          const userIds = [...new Set((subs ?? []).map((s) => s.user_id as string))];
          const { data: channels } = userIds.length
            ? await supabaseAdmin
                .from("alert_channels")
                .select("*")
                .in("user_id", userIds)
                .eq("paused", false)
                .eq("verified", true)
                .eq("digest", "instant")
            : { data: [] as AlertChannelRow[] };

          for (const ev of events) {
            newest = ev.occurred_at as string;
            const flag = EVENT_TO_FLAG[ev.type as string];
            if (!flag) continue;

            for (const sub of subs ?? []) {
              if (sub.mint !== ev.mint) continue;
              if ((sub as Record<string, unknown>)[flag] !== true) continue;
              const minSol = Number(sub.min_sol_threshold ?? 0);
              if (minSol > 0 && Number(ev.amount_sol ?? 0) < minSol) continue;

              const userChannels = (channels ?? []).filter(
                (c) => (c as AlertChannelRow).user_id === sub.user_id,
              ) as AlertChannelRow[];

              for (const channel of userChannels) {
                const result = await deliverAlert(channel, {
                  event: ev.type as string,
                  mint: ev.mint as string,
                  severity: ev.severity as string | null,
                  signature: ev.signature as string | null,
                  occurredAt: ev.occurred_at as string,
                  amountSol: ev.amount_sol as number | null,
                  url: `${SITE}/agent/${ev.mint}`,
                  summary: summarize(
                    ev.type as string,
                    ev.mint as string,
                    ev.amount_sol as number | null,
                  ),
                });

                if (result.status === "sent") sent++;
                else if (result.status === "failed") failed++;
                else skipped++;

                await supabaseAdmin.from("alert_deliveries").insert({
                  user_id: channel.user_id,
                  channel_id: channel.id,
                  subscription_id: sub.id,
                  event_id: ev.id,
                  mint: ev.mint,
                  event_type: ev.type,
                  status: result.status,
                  http_status: result.httpStatus ?? null,
                  error: result.error ?? null,
                });

                await supabaseAdmin
                  .from("alert_channels")
                  .update({
                    last_delivery_at: new Date().toISOString(),
                    last_error: result.status === "sent" ? null : (result.error ?? null),
                  })
                  .eq("id", channel.id);
              }
            }
          }
        }

        await supabaseAdmin
          .from("alert_dispatch_state")
          .update({ last_event_at: newest, updated_at: new Date().toISOString() })
          .eq("id", 1);

        const duration = Date.now() - started;
        await heartbeat(
          "alert_dispatch",
          true,
          duration,
          `events=${events?.length ?? 0} sent=${sent} failed=${failed} skipped=${skipped}`,
        );

        return Response.json({
          ok: true,
          events: events?.length ?? 0,
          sent,
          failed,
          skipped,
          duration_ms: duration,
        });
      },
    },
  },
});

async function heartbeat(worker: string, ok: boolean, durationMs: number, notes: string) {
  try {
    await supabaseAdmin.from("indexer_runs").insert({ worker, ok, duration_ms: durationMs, notes });
  } catch {
    /* */
  }
}
