// Dependency-free indexed-PNG renderer for the SPX402 grade card.
//
// X, Slack and most unfurlers do not render SVG, so the share image has to be a
// raster. This writes an 8-bit palette PNG by hand (deflate via node:zlib, which
// the edge runtime supports) — no WASM, no image library, no top-level await.

import { deflateSync } from "node:zlib";
import { CARD_COLORS, type GradeCardModel } from "@/lib/grade-card";
import { GLYPH_H, GLYPH_W, glyph, textWidth } from "./font";

const PALETTE: readonly string[] = [
  CARD_COLORS.page,
  CARD_COLORS.panel,
  CARD_COLORS.line,
  CARD_COLORS.bone,
  CARD_COLORS.mute,
  CARD_COLORS.metal,
  CARD_COLORS.blood,
];

const PAGE = 0,
  PANEL = 1,
  LINE = 2,
  BONE = 3,
  MUTE = 4,
  METAL = 5,
  BLOOD = 6;

class IndexCanvas {
  readonly px: Uint8Array;
  constructor(
    readonly w: number,
    readonly h: number,
    fill = PAGE,
  ) {
    this.px = new Uint8Array(w * h).fill(fill);
  }

  rect(x: number, y: number, w: number, h: number, color: number) {
    const x0 = Math.max(0, x | 0);
    const y0 = Math.max(0, y | 0);
    const x1 = Math.min(this.w, (x + w) | 0);
    const y1 = Math.min(this.h, (y + h) | 0);
    for (let yy = y0; yy < y1; yy++) {
      this.px.fill(color, yy * this.w + x0, yy * this.w + x1);
    }
  }

  frame(x: number, y: number, w: number, h: number, t: number, color: number) {
    this.rect(x, y, w, t, color);
    this.rect(x, y + h - t, w, t, color);
    this.rect(x, y, t, h, color);
    this.rect(x + w - t, y, t, h, color);
  }

  text(text: string, x: number, y: number, scale: number, color: number) {
    let cx = x;
    for (const ch of text) {
      const rows = glyph(ch);
      for (let ry = 0; ry < GLYPH_H; ry++) {
        const row = rows[ry]!;
        for (let rx = 0; rx < GLYPH_W; rx++) {
          if (row[rx] === "#") this.rect(cx + rx * scale, y + ry * scale, scale, scale, color);
        }
      }
      cx += (GLYPH_W + 1) * scale;
    }
  }

  textRight(text: string, right: number, y: number, scale: number, color: number) {
    this.text(text, right - textWidth(text, scale), y, scale, color);
  }
}

// ---------------------------------------------------------------- PNG writer

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function encodeIndexedPng(canvas: IndexCanvas): Uint8Array {
  const { w, h, px } = canvas;

  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, w);
  dv.setUint32(4, h);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 3; // color type: indexed
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const plte = new Uint8Array(PALETTE.length * 3);
  PALETTE.forEach((hex, i) => {
    const [r, g, b] = hexToRgb(hex);
    plte[i * 3] = r;
    plte[i * 3 + 1] = g;
    plte[i * 3 + 2] = b;
  });

  // Scanlines with filter byte 0 (None) — the art is flat colour, so filtering
  // buys nothing that deflate does not already get.
  const raw = new Uint8Array((w + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w + 1)] = 0;
    raw.set(px.subarray(y * w, (y + 1) * w), y * (w + 1) + 1);
  }
  const idat = new Uint8Array(deflateSync(Buffer.from(raw), { level: 9 }));

  return concat([
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("PLTE", plte),
    chunk("IDAT", idat),
    chunk("IEND", new Uint8Array(0)),
  ]);
}

// ------------------------------------------------------------- card renderer

function sanitize(s: string): string {
  return s.toUpperCase().replace(/[^\x20-\x7E·…]/g, "");
}

export function renderGradeCardPng(
  card: GradeCardModel,
  { width = 1200, height = 630 }: { width?: number; height?: number } = {},
): Uint8Array {
  const c = new IndexCanvas(width, height, PAGE);

  const s = Math.max(1, Math.round(width / 400));
  const inset = Math.round(width * 0.033);
  const pad = inset + Math.round(width * 0.03);
  const right = width - pad;

  c.rect(inset, inset, width - inset * 2, height - inset * 2, PANEL);
  c.frame(inset, inset, width - inset * 2, height - inset * 2, Math.max(1, s - 1), LINE);
  // Grade rail down the left edge of the panel.
  c.rect(inset, inset, Math.max(3, s), height - inset * 2, card.danger ? BLOOD : METAL);

  const gradeColor = card.danger ? BLOOD : BONE;

  c.text("SPX402 · ON-CHAIN REPUTATION", pad, Math.round(height * 0.1), s, METAL);
  c.textRight("EXECUTION GRADE", right, Math.round(height * 0.1), s, MUTE);

  c.text(sanitize(card.ticker), pad, Math.round(height * 0.21), s * 4, BONE);

  const gradeY = Math.round(height * 0.4);
  const gradeScale = Math.max(2, Math.round(s * 2.6));
  c.text(sanitize(card.grade), pad, gradeY, gradeScale, gradeColor);

  // Operator chip, right aligned against the grade line.
  const chip = card.operator;
  const chipScale = s;
  const chipW = textWidth(chip, chipScale) + chipScale * 8;
  const chipH = GLYPH_H * chipScale + chipScale * 6;
  const chipX = right - chipW;
  const chipY = gradeY + Math.round((GLYPH_H * gradeScale - chipH) / 2);
  c.frame(chipX, chipY, chipW, chipH, Math.max(1, s - 1), card.operator === "VERIFIED" ? METAL : LINE);
  c.text(
    chip,
    chipX + chipScale * 4,
    chipY + chipScale * 3,
    chipScale,
    card.operator === "VERIFIED" ? METAL : MUTE,
  );

  const rowScale = Math.max(1, Math.round(s * 1.4));
  const rowsTop = Math.round(height * 0.57);
  const rowGap = Math.round(height * 0.082);
  const valueX = pad + Math.round(width * 0.34);
  card.rows.forEach((row, i) => {
    const y = rowsTop + i * rowGap;
    c.text(sanitize(row.label), pad, y, rowScale, MUTE);
    c.text(sanitize(row.value), valueX, y, rowScale, BONE);
  });

  const footY = height - inset - Math.round(height * 0.055);
  c.rect(pad, footY - Math.round(height * 0.03), right - pad, Math.max(1, s - 2), LINE);
  c.text(sanitize(card.url), pad, footY, s, MUTE);

  return encodeIndexedPng(c);
}
