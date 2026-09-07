// Tier 3 — /llms.txt. Curated map of SPX402 for language models.
// Generated from the same constants the pages use; never hand-maintained.

import { createFileRoute } from "@tanstack/react-router";
import { buildLlmsTxt } from "@/lib/machine-copy";

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        return new Response(buildLlmsTxt(origin), {
          status: 200,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
          },
        });
      },
    },
  },
});
