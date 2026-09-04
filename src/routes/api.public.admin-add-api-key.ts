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

        // Mint the key here — the raw secret is returned once and only its
        // SHA-256 hash is persisted.
        const expiresAt = expiresInDays
          ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
          : null;

        const rawKey = `spx_${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().replace(/-/g, "")}`;
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawKey));
        const keyHash = Array.from(new Uint8Array(digest))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        const dailyLimit = tier === "team" ? 100000 : tier === "pro" ? 10000 : 100;

        const { data, error } = await supabaseAdmin
          .from("api_keys")
          .insert({
            user_id: user.id,
            name,
            tier,
            key_hash: keyHash,
            key_prefix: rawKey.slice(0, 12),
            daily_limit: dailyLimit,
            expires_at: expiresAt,
          })
          .select("id")
          .single();

        if (error) {
          return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const result = { key_id: data.id, api_key: rawKey, key_hash: keyHash };


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
