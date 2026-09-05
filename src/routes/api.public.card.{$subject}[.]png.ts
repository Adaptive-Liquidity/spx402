import { createFileRoute } from "@tanstack/react-router";
import { fetchAgent } from "@/lib/agents-db";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/http/rate-limit.server";
import { buildGradeCard, type GradeCardModel } from "@/lib/grade-card";
import { renderGradeCardPng } from "@/lib/card/png.server";

// Raster rendition of the grade card. X, Slack, Discord and LinkedIn do not
// unfurl SVG, so this PNG is what og:image / twitter:image point at.
//   /api/public/card/<mint>.png            → 1200x630
//   /api/public/card/<mint>.png?square=1   → 1080x1080
export const Route = createFileRoute("/api/public/card/{$subject}.png")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const limited = await enforceRateLimit(request, RATE_LIMITS.badge);
        if (limited.response) return limited.response;

        const subject = params.subject;
        const agent = await fetchAgent(subject).catch(() => null);
        const card: GradeCardModel = agent
          ? buildGradeCard(agent)
          : unindexedCard(subject);

        const square = new URL(request.url).searchParams.has("square");
        const png = renderGradeCardPng(
          card,
          square ? { width: 1080, height: 1080 } : { width: 1200, height: 630 },
        );

        return new Response(png as unknown as BodyInit, {
          status: 200,
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
            ...limited.headers,
          },
        });
      },
    },
  },
});

export function unindexedCard(subject: string): GradeCardModel {
  return {
    ticker: "$AGENT",
    mint: subject,
    grade: "SPX404",
    danger: true,
    operator: "UNVERIFIED",
    rows: [
      { label: "Last buyback", value: "NONE" },
      { label: "Last burn", value: "NONE" },
      { label: "Buybacks", value: "0" },
      { label: "Failed windows", value: "0" },
    ],
    url: `spx402.com/agent/${subject}`,
    lastBuyback: "NONE",
  };
}
