// Generates src/lib/fixture-manifest.ts from the captured fixture files.
//
// The fixture corpus lives on disk as JSON captures. The UI (/methodology →
// fixture coverage) needs those counts at render time, and the Worker runtime
// has no repo filesystem — so the manifest is generated into a plain module
// that ships with the bundle.
//
//   bun scripts/gen-fixture-manifest.ts
//
// Re-run it whenever a fixture is captured, skipped, or removed.

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const FIXTURE_DIR = join(process.cwd(), "src/lib/indexer/__fixtures__");
const OUT = join(process.cwd(), "src/lib/fixture-manifest.ts");

interface Envelope {
  id: string;
  capturedAt: string | null;
  signature: string | null;
  parserVersionIntroduced: string;
  chain?: string;
  status?: "CAPTURED" | "SKIPPED";
  skipReason?: string;
  notes?: string;
}

function sectionFor(id: string): string {
  if (/^A\d/.test(id)) return "A · Tokenized buyback lane (Solana)";
  if (/^B\d/.test(id)) return "B · x402 settlement (Solana)";
  if (/^C\d/.test(id)) return "C · Negative controls";
  if (/^E\d/.test(id)) return "E · x402 settlement (Base/EVM)";
  return "F · Facilitator registry captures";
}

const files = readdirSync(FIXTURE_DIR).filter((f) => f.endsWith(".json")).sort();

const entries = files.map((f) => {
  const raw = JSON.parse(readFileSync(join(FIXTURE_DIR, f), "utf-8")) as {
    _fixture: Envelope;
    tx?: unknown;
  };
  const e = raw._fixture;
  const captured = e.status !== "SKIPPED" && Boolean(raw.tx);
  return {
    id: e.id,
    section: sectionFor(e.id),
    chain: e.chain ?? (/^E\d/.test(e.id) ? "base" : "solana"),
    captured,
    capturedAt: e.capturedAt,
    signature: e.signature,
    parserVersionIntroduced: e.parserVersionIntroduced,
    skipReason: e.skipReason ?? null,
  };
});

const body = `// GENERATED FILE — do not edit by hand.
// Regenerate with: bun scripts/gen-fixture-manifest.ts
//
// Every decoder claim on /methodology is pinned to one of these captured
// mainnet transactions. A SKIPPED entry is an honest gap, never a silent pass.

export interface FixtureManifestEntry {
  id: string;
  section: string;
  chain: string;
  captured: boolean;
  capturedAt: string | null;
  signature: string | null;
  parserVersionIntroduced: string;
  skipReason: string | null;
}

export const FIXTURE_MANIFEST: FixtureManifestEntry[] = ${JSON.stringify(entries, null, 2)};

export interface FixtureSectionSummary {
  section: string;
  total: number;
  captured: number;
  skipped: number;
  lastCaptureAt: string | null;
}

export function fixtureSections(): FixtureSectionSummary[] {
  const map = new Map<string, FixtureSectionSummary>();
  for (const f of FIXTURE_MANIFEST) {
    const s = map.get(f.section) ?? {
      section: f.section,
      total: 0,
      captured: 0,
      skipped: 0,
      lastCaptureAt: null,
    };
    s.total += 1;
    if (f.captured) s.captured += 1;
    else s.skipped += 1;
    if (f.capturedAt && (!s.lastCaptureAt || f.capturedAt > s.lastCaptureAt)) {
      s.lastCaptureAt = f.capturedAt;
    }
    map.set(f.section, s);
  }
  return Array.from(map.values()).sort((a, b) => a.section.localeCompare(b.section));
}

export function fixtureTotals(): { total: number; captured: number; lastCaptureAt: string | null } {
  const captured = FIXTURE_MANIFEST.filter((f) => f.captured).length;
  const last = FIXTURE_MANIFEST.map((f) => f.capturedAt).filter(Boolean).sort();
  return {
    total: FIXTURE_MANIFEST.length,
    captured,
    lastCaptureAt: last.length > 0 ? (last[last.length - 1] as string) : null,
  };
}
`;

writeFileSync(OUT, body);
console.log(`wrote ${OUT} — ${entries.length} fixtures, ${entries.filter((e) => e.captured).length} captured`);
