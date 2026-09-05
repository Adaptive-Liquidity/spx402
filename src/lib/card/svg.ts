// SVG rendition of the grade card — same model as the PNG and the on-page card.
// Used by the badge route and in-page embeds (browsers render SVG fine; link
// unfurlers do not, which is what the PNG route is for).

import { CARD_COLORS, type GradeCardModel } from "@/lib/grade-card";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderGradeCardSvg(
  card: GradeCardModel,
  { width = 1200, height = 630 }: { width?: number; height?: number } = {},
): string {
  const u = width / 1200;
  const inset = Math.round(width * 0.033);
  const pad = inset + Math.round(width * 0.03);
  const right = width - pad;
  const gradeColor = card.danger ? CARD_COLORS.blood : CARD_COLORS.bone;
  const mono = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

  const rows = card.rows
    .map((row, i) => {
      const y = Math.round(height * 0.63) + i * Math.round(height * 0.072);
      return `<text x="${pad}" y="${y}" font-size="${Math.round(26 * u)}" fill="${CARD_COLORS.mute}">${esc(row.label.toUpperCase())}</text>
  <text x="${pad + Math.round(width * 0.34)}" y="${y}" font-size="${Math.round(26 * u)}" fill="${CARD_COLORS.bone}">${esc(row.value.toUpperCase())}</text>`;
    })
    .join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(card.ticker)} ${esc(card.grade)} on SPX402">
  <rect width="${width}" height="${height}" fill="${CARD_COLORS.page}"/>
  <rect x="${inset}" y="${inset}" width="${width - inset * 2}" height="${height - inset * 2}" fill="${CARD_COLORS.panel}" stroke="${CARD_COLORS.line}" stroke-width="${Math.max(1, Math.round(2 * u))}"/>
  <rect x="${inset}" y="${inset}" width="${Math.max(3, Math.round(4 * u))}" height="${height - inset * 2}" fill="${card.danger ? CARD_COLORS.blood : CARD_COLORS.metal}"/>
  <g font-family="${mono}" letter-spacing="${1.5 * u}">
  <text x="${pad}" y="${Math.round(height * 0.13)}" font-size="${Math.round(20 * u)}" fill="${CARD_COLORS.metal}">SPX402 · ON-CHAIN REPUTATION</text>
  <text x="${right}" y="${Math.round(height * 0.13)}" font-size="${Math.round(20 * u)}" fill="${CARD_COLORS.mute}" text-anchor="end">EXECUTION GRADE</text>
  <text x="${pad}" y="${Math.round(height * 0.34)}" font-size="${Math.round(84 * u)}" font-weight="700" fill="${CARD_COLORS.bone}">${esc(card.ticker)}</text>
  <text x="${pad}" y="${Math.round(height * 0.47)}" font-size="${Math.round(54 * u)}" font-weight="700" fill="${gradeColor}">${esc(card.grade)}</text>
  <text x="${right}" y="${Math.round(height * 0.47)}" font-size="${Math.round(22 * u)}" fill="${card.operator === "VERIFIED" ? CARD_COLORS.metal : CARD_COLORS.mute}" text-anchor="end">${card.operator}</text>
  ${rows}
  <line x1="${pad}" y1="${height - inset - Math.round(height * 0.09)}" x2="${right}" y2="${height - inset - Math.round(height * 0.09)}" stroke="${CARD_COLORS.line}" stroke-width="${Math.max(1, Math.round(2 * u))}"/>
  <text x="${pad}" y="${height - inset - Math.round(height * 0.04)}" font-size="${Math.round(20 * u)}" fill="${CARD_COLORS.mute}">${esc(card.url)}</text>
  </g>
</svg>`;
}
