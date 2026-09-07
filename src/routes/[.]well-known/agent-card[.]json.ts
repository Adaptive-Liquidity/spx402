// Tier 3 — /.well-known/agent-card.json.
// A2A-style discovery card. Points at the existing machine surfaces
// (/.well-known/x402 for paid resources, /api/public/mcp for tools) rather
// than duplicating them.

import { createFileRoute } from "@tanstack/react-router";
import { buildAgentCard } from "@/lib/machine-copy";

export const Route = createFileRoute("/.well-known/agent-card.json")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        return new Response(JSON.stringify(buildAgentCard(origin), null, 2), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
          },
        });
      },
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }),
    },
  },
});
