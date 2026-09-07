import { createFileRoute } from "@tanstack/react-router";
import { fetchAgent } from "@/lib/agents-db";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/http/rate-limit.server";
import { buildGradeCard, unindexedCard } from "@/lib/grade-card";
import { renderGradeCardSvg } from "@/lib/card/svg";

// Embeddable badge for an agent — the same grade card as the dossier and the
// share image, at embed size.
// Usage: <img src="https://spx402.com/api/public/badge/<MINT>.svg" />
export const Route = createFileRoute("/api/public/badge/{$mint}.svg")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const limited = await enforceRateLimit(request, RATE_LIMITS.badge);
        if (limited.response) return limited.response;

        const mint = params.mint;
        const agent = await fetchAgent(mint).catch(() => null);
        const card = agent ? buildGradeCard(agent) : unindexedCard(mint);

        const rendered = renderGradeCardSvg(card, { width: 600, height: 600 });

        // Carry the verification permalink inside the file itself: an <img>
        // embed strips links, so anyone who saves or re-hosts the badge can
        // still find the attestation record it claims to represent.
        const verifyUrl = `https://spx402.com/verify/${mint}`;
        const svg = rendered.replace(
          /(<svg\b[^>]*>)/,
          `$1<desc>SPX402 grade card. Verify the on-chain attestations at ${verifyUrl}</desc>`,
        );

        return new Response(svg, {
          status: 200,
          headers: {
            "Content-Type": "image/svg+xml; charset=utf-8",
            // 5 min edge cache, 1 hour stale-while-revalidate.
            "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=3600",
            ...limited.headers,
          },
        });
      },
    },
  },
});
