import { createFileRoute } from "@tanstack/react-router";
import { fetchAgent } from "@/lib/agents-db";

// Embeddable SVG badge for an agent.
// Usage: <img src="https://spx402.com/api/public/badge/<MINT>.svg" />
//
// Public, cacheable, dependency-free. Every embed is a backlink and a
// portable reputation surface that lives wherever the operator pastes it.
export const Route = createFileRoute("/api/public/badge/{$mint}.svg")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const mint = params.mint;
        const agent = await fetchAgent(mint).catch(() => null);

        const symbol = agent?.symbol ?? "AGENT";
        const grade = agent?.grade ?? "SPX404";
        const score = agent?.score ?? null;
        const verified = agent?.operatorVerified ?? false;

        const gradeColor = pickGradeColor(grade);
        const scoreText = score == null ? "—" : String(score);

        const svg = renderBadge({
          symbol: symbol.slice(0, 8).toUpperCase(),
          grade,
          score: scoreText,
          gradeColor,
          verified,
        });

        return new Response(svg, {
          status: 200,
          headers: {
            "Content-Type": "image/svg+xml; charset=utf-8",
            // 5 min edge cache, 1 hour stale-while-revalidate.
            "Cache-Control":
              "public, max-age=300, s-maxage=300, stale-while-revalidate=3600",
          },
        });
      },
    },
  },
});

function pickGradeColor(grade: string): string {
  if (grade === "SPX AAA" || grade === "SPX AA") return "#3ecf8e"; // verified green
  if (grade === "SPX A" || grade === "SPX BBB") return "#e9b53c"; // amber
  if (grade === "SPX BB" || grade === "SPX B") return "#c08a2c"; // amber-dim
  if (grade === "SPX D" || grade === "SPX404") return "#e2533c"; // critical
  return "#a89c84";
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function renderBadge({
  symbol,
  grade,
  score,
  gradeColor,
  verified,
}: {
  symbol: string;
  grade: string;
  score: string;
  gradeColor: string;
  verified: boolean;
}): string {
  const w = 320;
  const h = 96;
  const sym = escapeXml(symbol);
  const gr = escapeXml(grade);
  const sc = escapeXml(score);
  const verifiedBadge = verified
    ? `<g transform="translate(${w - 22}, 12)">
         <circle r="7" fill="#3ecf8e" />
         <path d="M-3 0 L-1 2 L3 -2" stroke="#0c0a08" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round" />
       </g>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="SPX402 ${gr} · ${sc} · ${sym}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#13100c" />
      <stop offset="1" stop-color="#0c0a08" />
    </linearGradient>
  </defs>
  <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="2" fill="url(#bg)" stroke="#3a2f22" />
  <rect x="0" y="0" width="4" height="${h}" fill="${gradeColor}" />
  <text x="20" y="26" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="10" letter-spacing="2" fill="#a89c84">SPX402 · ON-CHAIN REPUTATION</text>
  <text x="20" y="58" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="22" font-weight="700" fill="#f5ecdc">$${sym}</text>
  <text x="20" y="80" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11" letter-spacing="1.5" fill="${gradeColor}">${gr}</text>
  <g transform="translate(${w - 96}, 24)">
    <text x="0" y="14" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="10" letter-spacing="2" fill="#a89c84">SCORE</text>
    <text x="0" y="52" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="34" font-weight="700" fill="${gradeColor}">${sc}</text>
  </g>
  ${verifiedBadge}
</svg>`;
}
