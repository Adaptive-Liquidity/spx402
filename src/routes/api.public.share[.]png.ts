import { createFileRoute } from "@tanstack/react-router";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/http/rate-limit.server";
import { renderBrandCardPng } from "@/lib/card/png.server";

// Site-wide social preview image. Agent dossiers point at their own grade
// card; every other public page points here, so a shared link never unfurls
// as an empty summary_large_image card.
export const Route = createFileRoute("/api/public/share.png")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const limited = await enforceRateLimit(request, RATE_LIMITS.badge);
        if (limited.response) return limited.response;

        const png = renderBrandCardPng({
          headline: "Agents lie. The ledger does not.",
          subline: "Execution grades from settled on-chain evidence",
          url: "spx402.com",
        });

        return new Response(png as unknown as BodyInit, {
          status: 200,
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
            ...limited.headers,
          },
        });
      },
    },
  },
});
