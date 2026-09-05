import { createFileRoute } from "@tanstack/react-router";
import { ImageResponse } from "@cf-wasm/og";
import { fetchAgent } from "@/lib/agents-db";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/http/rate-limit.server";

// Dynamic Open Graph card for any subject (agent mint, executor wallet, service payee).
// Rendered as a real PNG so X, Discord, Slack, Farcaster and the Base App all unfurl it.
export const Route = createFileRoute("/api/public/og/{$subject}.png")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const limited = await enforceRateLimit(request, RATE_LIMITS.badge);
        if (limited.response) return limited.response;

        const subject = params.subject;
        const agent = await fetchAgent(subject).catch(() => null);

        const symbol = (agent?.symbol ?? "AGENT").slice(0, 12).toUpperCase();
        const name = (agent?.name ?? "Unindexed subject").slice(0, 42);
        const grade = agent?.grade ?? "SPX404";
        const score = agent?.score == null ? "—" : String(agent.score);
        const accent = pickGradeColor(grade);
        const short = subject.length > 16 ? `${subject.slice(0, 8)}…${subject.slice(-6)}` : subject;

        const image = new ImageResponse(
          (
            <div
              style={{
                width: "1200px",
                height: "630px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                backgroundColor: "#07100c",
                padding: "64px",
                fontFamily: "sans-serif",
                color: "#e8f2ec",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", fontSize: 28, letterSpacing: 6, color: "#3ecf8e" }}>
                  SPX402
                </div>
                <div style={{ display: "flex", fontSize: 22, letterSpacing: 4, color: "#7f9a8c" }}>
                  EXECUTION GRADE
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: 76, fontWeight: 700 }}>${symbol}</div>
                <div style={{ display: "flex", fontSize: 30, color: "#9fb5a9", marginTop: 8 }}>
                  {name}
                </div>
                <div style={{ display: "flex", fontSize: 24, color: "#5f7a6c", marginTop: 16 }}>
                  {short}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    border: `3px solid ${accent}`,
                    borderRadius: 12,
                    padding: "18px 32px",
                    fontSize: 56,
                    fontWeight: 700,
                    color: accent,
                  }}
                >
                  {grade}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                  <div style={{ display: "flex", fontSize: 22, letterSpacing: 4, color: "#7f9a8c" }}>
                    SCORE
                  </div>
                  <div style={{ display: "flex", fontSize: 88, fontWeight: 700 }}>{score}</div>
                </div>
              </div>
            </div>
          ),
          { width: 1200, height: 630 },
        );

        const png = await image.arrayBuffer();
        return new Response(png, {
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

function pickGradeColor(grade: string): string {
  if (grade === "SPX AAA" || grade === "SPX AA") return "#3ecf8e";
  if (grade === "SPX A" || grade === "SPX BBB") return "#e9b53c";
  if (grade === "SPX BB" || grade === "SPX B") return "#c08a2c";
  if (grade === "SPX D" || grade === "SPX404") return "#e2533c";
  return "#a89c84";
}
