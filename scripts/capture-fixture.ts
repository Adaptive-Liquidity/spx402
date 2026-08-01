// Local-only fixture capture tool.
//
// Pulls a VERBATIM Helius Enhanced Transaction and writes it into
// src/lib/indexer/__fixtures__/<id>.json under the mandatory _fixture
// envelope. Never runs in CI. Never hardcodes the API key — it is read from
// process.env.HELIUS_API_KEY.
//
// Usage:
//   HELIUS_API_KEY=... bun scripts/capture-fixture.ts \
//     --id A2_buyback_pumpfun \
//     --signature 5xk... \
//     --expect '{"agents":[{"mint":"...","depositAddress":null}],"amountSol":0.42}' \
//     --notes "pump.fun fee-routed buyback, mainnet"
//
// Hand-editing the captured `tx` payload afterwards is a red card.

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const FIXTURE_DIR = join(process.cwd(), "src/lib/indexer/__fixtures__");
const PARSER_VERSION = "spx-decoder-v1";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

// ── EVM / Base lane. Captures a VERBATIM eth_getTransactionByHash +
// ── eth_getTransactionReceipt pair. Same envelope, same red card on edits.
async function captureBase(
  id: string,
  hash: string,
  expected: Record<string, unknown>,
  notes: string,
) {
  const url = process.env.BASE_RPC_URL;
  if (!url) {
    console.error("BASE_RPC_URL is not set. This tool is local-only and never runs in CI.");
    process.exit(1);
    return;
  }
  const call = async (method: string) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: [hash] }),
    });
    if (!res.ok) {
      console.error(`${method} returned ${res.status}: ${await res.text()}`);
      process.exit(1);
    }
    const body = (await res.json()) as { result?: unknown; error?: { message: string } };
    if (body.error) {
      console.error(`${method} error: ${body.error.message}`);
      process.exit(1);
    }
    return body.result as Record<string, unknown> | null;
  };

  const tx = await call("eth_getTransactionByHash");
  if (!tx) {
    console.error(`No transaction returned for ${hash}.`);
    process.exit(1);
    return;
  }
  const receipt = await call("eth_getTransactionReceipt");

  const fixture = {
    _fixture: {
      id,
      capturedAt: new Date().toISOString(),
      signature: hash,
      slot: tx.blockNumber ? parseInt(String(tx.blockNumber), 16) : null,
      capturedBy: "scripts/capture-fixture.ts --chain base",
      parserVersionIntroduced: "v1.0.0-evm",
      chain: "base",
      expected,
      notes,
      status: "CAPTURED" as const,
    },
    tx,
    receipt,
  };

  mkdirSync(FIXTURE_DIR, { recursive: true });
  const out = join(FIXTURE_DIR, `${id}.json`);
  writeFileSync(out, `${JSON.stringify(fixture, null, 2)}\n`, "utf-8");
  console.log(`Wrote ${out}`);
  console.log("Now run: npm test");
}

async function main() {
  const id = arg("id");
  const signature = arg("signature");
  const expectRaw = arg("expect") ?? "{}";
  const notes = arg("notes") ?? "";
  const chain = arg("chain") ?? "solana";

  if (!id || !signature) {
    console.error("Usage: bun scripts/capture-fixture.ts --id <id> --signature <sig|0xhash> [--chain solana|base] [--expect <json>] [--notes <text>]");
    process.exit(1);
  }

  if (chain === "base") {
    let exp: Record<string, unknown>;
    try {
      exp = JSON.parse(expectRaw);
    } catch {
      console.error("--expect must be valid JSON");
      process.exit(1);
      return;
    }
    await captureBase(id!, signature!, exp, notes);
    return;
  }

  const key = process.env.HELIUS_API_KEY;
  if (!key) {
    console.error("HELIUS_API_KEY is not set. This tool is local-only and never runs in CI.");
    process.exit(1);
  }

  let expected: Record<string, unknown>;
  try {
    expected = JSON.parse(expectRaw);
  } catch {
    console.error("--expect must be valid JSON");
    process.exit(1);
    return;
  }

  const res = await fetch(`https://api.helius.xyz/v0/transactions?api-key=${key}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ transactions: [signature] }),
  });
  if (!res.ok) {
    console.error(`Helius returned ${res.status}: ${await res.text()}`);
    process.exit(1);
  }
  const txs = (await res.json()) as Array<Record<string, unknown>>;
  const tx = txs?.[0];
  if (!tx) {
    console.error(`No enhanced transaction returned for ${signature}.`);
    process.exit(1);
    return;
  }

  const fixture = {
    _fixture: {
      id,
      capturedAt: new Date().toISOString(),
      signature,
      slot: (tx.slot as number | undefined) ?? null,
      capturedBy: "scripts/capture-fixture.ts",
      parserVersionIntroduced: PARSER_VERSION,
      expected,
      notes,
      status: "CAPTURED" as const,
    },
    tx,
  };

  mkdirSync(FIXTURE_DIR, { recursive: true });
  const out = join(FIXTURE_DIR, `${id}.json`);
  writeFileSync(out, `${JSON.stringify(fixture, null, 2)}\n`, "utf-8");
  console.log(`Wrote ${out}`);
  console.log("Now run: npm test");
}

main();
