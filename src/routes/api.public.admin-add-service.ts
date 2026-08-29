// Admin service-registry insert path.
//
// POST /api/public/admin-add-service
//   Authorization: Bearer <CRON_SECRET | HELIUS_ADMIN_SECRET>
//   { "url": "https://api.example.com/paid", "chain": "base",
//     "payTo": "0x…", "facilitator": "…", "probeTier": "challenge" }
//
// Also exposes the enumeration seeder so address-only services can be
// (re)built from the passive lanes without waiting for the cron.
//   POST { "action": "seed" }

import { createFileRoute } from "@tanstack/react-router";
import { checkAdminAuth } from "@/lib/indexer/auth.server";
import { seedServicesFromLanes, upsertServiceByUrl } from "@/lib/prober/enumerate.server";

export const Route = createFileRoute("/api/public/admin-add-service")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!checkAdminAuth(request)) {
          return new Response("unauthorized", { status: 401 });
        }

        let body: Record<string, unknown>;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return json(400, { ok: false, error: "invalid json" });
        }

        if (body["action"] === "seed") {
          const result = await seedServicesFromLanes();
          return json(200, { ok: true, action: "seed", ...result });
        }

        const url = typeof body["url"] === "string" ? body["url"] : null;
        if (!url) return json(400, { ok: false, error: "url required" });

        const chain = body["chain"] === "base" ? "base" : "solana";
        const probeTier = body["probeTier"] === "settlement" ? "settlement" : "challenge";

        const result = await upsertServiceByUrl({
          url,
          chain,
          payTo: typeof body["payTo"] === "string" ? body["payTo"] : null,
          facilitator: typeof body["facilitator"] === "string" ? body["facilitator"] : null,
          discoveredVia:
            typeof body["discoveredVia"] === "string"
              ? (body["discoveredVia"] as string)
              : "manual_admin",
          probeTier,
        });

        return json(result.ok ? 200 : 400, result);
      },
    },
  },
});

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json" },
  });
}
