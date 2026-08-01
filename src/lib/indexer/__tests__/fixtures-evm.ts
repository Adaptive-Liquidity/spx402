// EVM fixture loader. Same envelope + governance as the Solana loader in
// ./fixtures.ts, but the payload is an `eth_getTransactionByHash` result
// (plus its receipt) rather than a Helius Enhanced Transaction.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { it } from "vitest";
import type { EvmTxInput } from "@/lib/indexer/decode-x402-evm.server";

const FIXTURE_DIR = join(process.cwd(), "src/lib/indexer/__fixtures__");

export interface EvmFixtureEnvelope {
  id: string;
  capturedAt: string | null;
  signature: string | null;
  slot: number | null;
  parserVersionIntroduced: string;
  chain?: string;
  expected: Record<string, unknown>;
  notes: string;
  status?: "CAPTURED" | "SKIPPED";
  skipReason?: string;
}

interface RawEvmTx {
  from: string;
  to: string | null;
  input: string;
  hash: string;
  blockNumber: string;
}

interface EvmFixture {
  _fixture: EvmFixtureEnvelope;
  tx?: RawEvmTx;
  receipt?: Record<string, unknown> | null;
}

function normalize(tx: RawEvmTx): EvmTxInput {
  return {
    from: (tx.from ?? "").toLowerCase(),
    to: (tx.to ?? "").toLowerCase(),
    input: tx.input ?? "0x",
    hash: tx.hash,
    blockNumber: parseInt(tx.blockNumber ?? "0x0", 16),
  };
}

/**
 * Register an EVM fixture-backed test. Runs when captured; otherwise
 * registers a real Vitest skip carrying the documented reason — never a
 * silent pass, never a fabricated transaction.
 */
export function evmFixtureTest(
  id: string,
  title: string,
  fn: (tx: EvmTxInput, envelope: EvmFixtureEnvelope) => void,
): void {
  const p = join(FIXTURE_DIR, `${id}.json`);
  if (!existsSync(p)) {
    it.skip(`${id} — ${title} [NO FIXTURE FILE]`, () => {});
    return;
  }
  const fixture = JSON.parse(readFileSync(p, "utf-8")) as EvmFixture;
  const env = fixture._fixture;
  if (!env) throw new Error(`Fixture "${id}" is missing the _fixture envelope.`);
  if (env.id !== id) {
    throw new Error(`Fixture "${id}" envelope declares a mismatched id "${env.id}".`);
  }
  if (env.status === "SKIPPED") {
    if (!env.skipReason) {
      throw new Error(`Fixture "${id}" is SKIPPED but carries no skipReason.`);
    }
    if (fixture.tx) {
      throw new Error(`Fixture "${id}" is SKIPPED but ships a tx payload.`);
    }
    it.skip(`${id} — ${title} [SKIPPED: ${env.skipReason}]`, () => {});
    return;
  }
  if (!fixture.tx) {
    throw new Error(`Fixture "${id}" is marked CAPTURED but carries no tx payload.`);
  }
  it(`${id} — ${title}`, () => fn(normalize(fixture.tx!), env));
}
