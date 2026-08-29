// SPX402 User API — GET /api/public/user/api-keys
// List user's API keys with usage stats

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/user/api-keys")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const token = authHeader.slice(7);
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !user) {
          return new Response(JSON.stringify({ ok: false, error: "invalid token" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { data: keys, error } = await supabaseAdmin
          .from("api_keys")
          .select("id, name, tier, status, daily_limit, created_at, revoked_at, expires_at, last_used_at, metadata")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Get usage stats for each key
        const keysWithUsage = await Promise.all(
          (keys ?? []).map(async (key) => {
            const { data: usage } = await supabaseAdmin.rpc("get_api_key_usage", { p_key_id: key.id });
            return { ...key, usage: usage?.[0] ?? { used_today: 0, used_this_month: 0, total_calls: 0 } };
          })
        );

        return new Response(JSON.stringify({ ok: true, keys: keysWithUsage }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});