// SPX402 Admin API — POST /api/public/admin-add-api-key
// Create new API key for authenticated user

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { checkAdminAuth } from "@/lib/indexer/auth.server";

export const Route = createFileRoute("/api/public/admin-add-api-key")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!checkAdminAuth(request)) {
          return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        let body: { name: string; tier: "free" | "pro" | "team"; expiresInDays?: number };
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ ok: false, error: "invalid json" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { name, tier, expiresInDays } = body;
        if (!name || !tier) {
          return new Response(JSON.stringify({ ok: false, error: "name and tier required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Get user from auth
        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          return new Response(JSON.stringify({ ok: false, error: "missing auth token" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const token = authHeader.slice(7);
        const {
          data: { user },
          error: authError,
        } = await supabaseAdmin.auth.getUser(token);
        if (authError || !user) {
          return new Response(JSON.stringify({ ok: false, error: "invalid token" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Call the database function to create the key
        const expiresAt = expiresInDays
          ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
          : null;

        const { data, error } = await supabaseAdmin.rpc("create_api_key", {
          p_user_id: user.id,
          p_name: name,
          p_tier: tier,
          p_expires_at: expiresAt,
        });

        if (error) {
          return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const [result] = data as Array<{ key_id: string; api_key: string; key_hash: string }>;

        return new Response(
          JSON.stringify({
            ok: true,
            keyId: result.key_id,
            apiKey: result.api_key, // Only returned ONCE!
            name,
            tier,
            expiresAt,
            warning: "Store this key securely. It will not be shown again.",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      },
    },
  },
});
