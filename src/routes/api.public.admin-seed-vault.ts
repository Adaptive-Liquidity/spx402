// One-shot endpoint: copy process.env.CRON_SECRET into Vault as
// 'spx_cron_secret' so pg_cron jobs can read it. Authorize with the
// HELIUS_ADMIN_SECRET fallback so a bootstrap operator can run this
// exactly once per rotation.
//
// Safe to call repeatedly: vault.update_secret is idempotent.
//
// DELETE THIS FILE after the first successful run if you prefer not
// to keep a self-service rotation surface.

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { checkAdminAuth } from "@/lib/indexer/auth.server";

export const Route = createFileRoute("/api/public/admin-seed-vault")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!checkAdminAuth(request)) {
          return new Response("unauthorized", { status: 401 });
        }
        const cronSecret = process.env.CRON_SECRET;
        if (!cronSecret || cronSecret.length < 16) {
          return Response.json(
            { ok: false, error: "CRON_SECRET not set or too short" },
            { status: 500 },
          );
        }

        // Try to update first; if no row exists yet, create it.
        const { data: existing } = await supabaseAdmin
          .schema("vault" as never)
          .from("secrets" as never)
          .select("id, name")
          .eq("name", "spx_cron_secret")
          .maybeSingle();

        if (existing) {
          const { error } = await supabaseAdmin.rpc(
            "update_secret" as never,
            {
              secret_id: (existing as { id: string }).id,
              new_secret: cronSecret,
              new_name: "spx_cron_secret",
              new_description: "SPX402 cron bearer token",
            } as never,
          );
          if (error) {
            console.error("[seed-vault] update failed:", error);
            return Response.json(
              { ok: false, error: "vault_update_failed" },
              { status: 500 },
            );
          }
          return Response.json({ ok: true, action: "updated" });
        }

        const { error } = await supabaseAdmin.rpc(
          "create_secret" as never,
          {
            new_secret: cronSecret,
            new_name: "spx_cron_secret",
            new_description: "SPX402 cron bearer token",
          } as never,
        );
        if (error) {
          console.error("[seed-vault] create failed:", error);
          return Response.json(
            { ok: false, error: "vault_create_failed" },
            { status: 500 },
          );
        }
        return Response.json({ ok: true, action: "created" });
      },
    },
  },
});
