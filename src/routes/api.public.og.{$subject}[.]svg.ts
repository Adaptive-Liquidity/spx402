import { createFileRoute } from "@tanstack/react-router";
import { fetchAgent } from "@/lib/agents-db";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/http/rate-limit.server";
import { buildGradeCard, unindexedCard } from "@/lib/grade-card";
import { renderGradeCardSvg } from "@/lib/card/svg";

// Vector rendition of the same grade card used everywhere else.
//
// Rendered as pure SVG on purpose. The previous PNG renderer (@cf-wasm/og)
// initialises satori/resvg WASM with a top-level await; nitro inlines every
// dynamic import into the SSR bundle, so that await was hoisted into the shared
// router chunk and EVERY page (including "/") 500'd on the edge runtime. Link
// unfurls use /api/public/card/<subject>.png, which needs no engine at all.
export const Route = createFileRoute("/api/public/og/{$subject}.svg")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const limited = await enforceRateLimit(request, RATE_LIMITS.badge);
        if (limited.response) return limited.response;

        const subject = params.subject;
        const agent = await fetchAgent(subject).catch(() => null);
        const card = agent ? buildGradeCard(agent) : unindexedCard(subject);

        return new Response(renderGradeCardSvg(card), {
          status: 200,
          headers: {
            "Content-Type": "image/svg+xml; charset=utf-8",
            "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
            ...limited.headers,
          },
        });
      },
    },
  },
});
