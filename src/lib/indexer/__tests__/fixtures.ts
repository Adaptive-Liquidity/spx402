// Fixture loader + envelope contract for the SPX402 decoder fixture suite.
//
// Fixtures are VERBATIM Helius Enhanced Transaction captures. Hand-editing a
// captured `tx` payload is a red card. A case we cannot capture yet is stored
// as an envelope-only stub with `status: "SKIPPED"` and a `skipReason`; the
// corresponding test then registers as a real Vitest skip (never a silent
// pass, never a fabricated transaction).

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { it } from "vitest";
import type { HeliusEnhancedTx } from "@/lib/indexer/helius.server";

export const FIXTURE_DIR = join(process.cwd(), "src/lib/indexer/__fixtures__");

export interface FixtureEnvelope {
  id: string;
  capturedAt: string | null;
  signature: string | null;
  slot: number | null;
  capturedBy: string | null;
  parserVersionIntroduced: string;
  expected: Record<string, unknown>;
  notes: string;
  status?: "CAPTURED" | "SKIPPED";
  skipReason?: string;
}

export interface Fixture {
  _fixture: FixtureEnvelope;
  tx?: HeliusEnhancedTx;
}

export function fixturePath(id: string): string {
  return join(FIXTURE_DIR, `${id}.json`);
}

export function loadFixture(id: string): Fixture {
  const p = fixturePath(id);
  if (!existsSync(p)) {
    throw new Error(
      `Fixture "${id}" not found at ${p}. Capture it with: bun scripts/capture-fixture.ts --id ${id} --signature <sig>`,
    );
  }
  const parsed = JSON.parse(readFileSync(p, "utf-8")) as Fixture;
  assertEnvelope(id, parsed);
  return parsed;
}

function assertEnvelope(id: string, f: Fixture): void {
  const e = f._fixture;
  if (!e) throw new Error(`Fixture "${id}" is missing the mandatory _fixture envelope.`);
  for (const k of [
    "id",
    "capturedAt",
    "signature",
    "slot",
    "parserVersionIntroduced",
    "expected",
    "notes",
  ] as const) {
    if (!(k in e)) {
      throw new Error(`Fixture "${id}" envelope is missing required key "${k}".`);
    }
  }
  if (e.id !== id) {
    throw new Error(`Fixture "${id}" envelope declares a mismatched id "${e.id}".`);
  }
  const captured = e.status !== "SKIPPED";
  if (captured && !f.tx) {
    throw new Error(`Fixture "${id}" is marked CAPTURED but carries no tx payload.`);
  }
  if (!captured && !e.skipReason) {
    throw new Error(`Fixture "${id}" is SKIPPED but carries no skipReason.`);
  }
  if (!captured && f.tx) {
    throw new Error(
      `Fixture "${id}" is SKIPPED but carries a tx payload — a skipped case must not ship a transaction.`,
    );
  }
}

export function isCaptured(id: string): boolean {
  const p = fixturePath(id);
  if (!existsSync(p)) return false;
  const parsed = JSON.parse(readFileSync(p, "utf-8")) as Fixture;
  return parsed._fixture.status !== "SKIPPED" && Boolean(parsed.tx);
}

/**
 * Register a fixture-backed test. Runs when the fixture is captured,
 * otherwise registers a Vitest skip carrying the documented reason.
 */
export function fixtureTest(
  id: string,
  title: string,
  fn: (tx: HeliusEnhancedTx, envelope: FixtureEnvelope) => void,
): void {
  const p = fixturePath(id);
  if (!existsSync(p)) {
    it.skip(`${id} — ${title} [NO FIXTURE FILE]`, () => {});
    return;
  }
  const fixture = loadFixture(id);
  if (fixture._fixture.status === "SKIPPED" || !fixture.tx) {
    it.skip(`${id} — ${title} [SKIPPED: ${fixture._fixture.skipReason}]`, () => {});
    return;
  }
  it(`${id} — ${title}`, () => fn(fixture.tx!, fixture._fixture));
}
