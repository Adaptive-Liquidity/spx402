import { createFileRoute } from "@tanstack/react-router";
import { fetchAgent } from "@/lib/agents-db";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/http/rate-limit.server";

// Share card for any subject (agent mint, executor wallet, service payee).
//
// Rendered as pure SVG on purpose. The previous PNG renderer (@cf-wasm/og)
// initialises satori/resvg WASM with a top-level await; nitro inlines every
// dynamic import into the SSR bundle, so that await was hoisted into the shared
// router chunk and EVERY page (including "/") 500'd on the edge runtime with
// "Top-level await in module is unsettled". SVG needs no engine and is used by
// the same badge/embeds pipeline as /api/public/badge.
export const Route = createFileRoute("/api/public/og/{$subject}.svg")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const limited = await enforceRateLimit(request, RATE_LIMITS.badge);
        if (limited.response) return limited.response;

        const subject = params.subject;
        const agent = await fetchAgent(subject).catch(() => null);

        const symbol = esc((agent?.symbol ?? "AGENT").slice(0, 12).toUpperCase());
        const name = esc((agent?.name ?? "Unindexed subject").slice(0, 42));
        const grade = agent?.grade ?? "SPX404";
        const score = agent?.score == null ? "—" : String(agent.score);
        const accent = pickGradeColor(grade);
        const short = esc(
          subject.length > 16 ? `${subject.slice(0, 8)}…${subject.slice(-6)}` : subject,
        );

        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${symbol} ${esc(grade)} on SPX402">
<rect width="1200" height="630" fill="#07100c"/>
<g font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif">
  <text x="64" y="92" font-size="28" letter-spacing="6" fill="#3ecf8e">SPX402</text>
  <text x="1136" y="92" font-size="22" letter-spacing="4" fill="#7f9a8c" text-anchor="end">EXECUTION GRADE</text>
  <text x="64" y="330" font-size="76" font-weight="700" fill="#e8f2ec">$${symbol}</text>
  <text x="64" y="376" font-size="30" fill="#9fb5a9">${name}</text>
  <text x="64" y="416" font-size="24" fill="#5f7a6c">${short}</text>
  <rect x="64" y="470" width="${Math.max(220, grade.length * 34 + 64)}" height="96" rx="12" fill="none" stroke="${accent}" stroke-width="3"/>
  <text x="${64 + Math.max(220, grade.length * 34 + 64) / 2}" y="536" font-size="56" font-weight="700" fill="${accent}" text-anchor="middle">${esc(grade)}</text>
  <text x="1136" y="470" font-size="22" letter-spacing="4" fill="#7f9a8c" text-anchor="end">SCORE</text>
  <text x="1136" y="566" font-size="88" font-weight="700" fill="#e8f2ec" text-anchor="end">${esc(score)}</text>
</g>
</svg>`;

        return new Response(svg, {
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

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pickGradeColor(grade: string): string {
  if (grade === "SPX AAA" || grade === "SPX AA") return "#3ecf8e";
  if (grade === "SPX A" || grade === "SPX BBB") return "#e9b53c";
  if (grade === "SPX BB" || grade === "SPX B") return "#c08a2c";
  if (grade === "SPX D" || grade === "SPX404") return "#e2533c";
  return "#a89c84";
}
