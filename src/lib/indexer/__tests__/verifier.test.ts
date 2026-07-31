// Section E — verifier promotion-bar tests (verifier.server.ts).
//
// The verifier is the only decoder-adjacent module that talks to the network.
// We stub `fetch` at the boundary — no live Helius calls, no API key, and no
// fabricated transaction payloads beyond the minimal RPC envelopes the
// verifier reads.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { verifyCandidate } from "@/lib/indexer/verifier.server";

const WALLET = "3nGWCUcHiPUpZKA3Cyu95XySEwbfrDQdWJRLPk8FMfXe";
const ASSET = "4kbLbEDLFm9rGCbcuJq5Ryv9UwVJj7QsSg4bLzTz5g6t";

type Route = (url: string, init?: RequestInit) => unknown;

function stubFetch(route: Route) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : String(input);
      const body = route(url, init);
      return new Response(JSON.stringify(body ?? {}), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }),
  );
}

/** Minimal DEX swap tx shaped exactly as the Helius Enhanced API returns it. */
function swapTx(i: number) {
  return {
    signature: `swapsig${i}`,
    slot: 300_000_000 + i,
    timestamp: 1_772_000_000 + i,
    source: "JUPITER",
    feePayer: WALLET,
    nativeTransfers: [{ fromUserAccount: WALLET, toUserAccount: "pool", amount: 100_000 }],
    tokenTransfers: [
      { mint: "So11111111111111111111111111111111111111112", toUserAccount: WALLET, tokenAmount: 5 },
    ],
    instructions: [],
  };
}

describe("E — verifier promotion bar", () => {
  beforeEach(() => {
    vi.stubEnv("HELIUS_API_KEY", "test-key-not-a-real-secret");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("E1 — executor wallet with 3+ swaps and no x402 passes", async () => {
    stubFetch((url) => (url.includes("/transactions") ? [swapTx(1), swapTx(2), swapTx(3)] : {}));
    const r = await verifyCandidate(WALLET, { identifierKind: "executor_wallet" });
    expect(r.signals.swap_activity).toBe(true);
    expect(r.signals.x402_activity).toBe(false);
    expect(r.passed).toBe(true);
    expect(r.notes).toContain("kind=executor_wallet");
  });

  it("E2 — executor wallet with only 2 swaps fails the bar", async () => {
    stubFetch((url) => (url.includes("/transactions") ? [swapTx(1), swapTx(2)] : {}));
    const r = await verifyCandidate(WALLET, { identifierKind: "executor_wallet" });
    expect(r.signals.swap_activity).toBe(true);
    expect(r.passed).toBe(false);
  });

  it("E3 — registered agent passes on a resolvable AgentIdentity PDA", async () => {
    stubFetch((url, init) => {
      const method = init?.body ? JSON.parse(String(init.body)).method : null;
      if (method === "getProgramAccounts") return { result: [{ pubkey: "pda" }] };
      if (method === "getAsset") return { result: { content: { json_uri: null, metadata: {} } } };
      return {};
    });
    const r = await verifyCandidate(ASSET, { identifierKind: "core_asset" });
    expect(r.signals.registered_identity).toBe(true);
    expect(r.passed).toBe(true);
  });

  it("E4 — registered agent fails when no PDA resolves", async () => {
    stubFetch((url, init) => {
      const method = init?.body ? JSON.parse(String(init.body)).method : null;
      if (method === "getProgramAccounts") return { result: [] };
      if (method === "getAsset") return { result: { content: { json_uri: null, metadata: {} } } };
      return {};
    });
    const r = await verifyCandidate(ASSET, { identifierKind: "core_asset" });
    expect(r.signals.registered_identity).toBe(false);
    expect(r.passed).toBe(false);
  });

  it("E5 — tokenized mint needs earnings AND one identity proof", async () => {
    // No earnings, no identity proofs → must not promote.
    stubFetch((url, init) => {
      if (url.includes("/transactions")) return [];
      const method = init?.body ? JSON.parse(String(init.body)).method : null;
      if (method === "getProgramAccounts") return { result: [] };
      if (method === "getAsset") return { result: { content: { json_uri: null, metadata: {} } } };
      return {};
    });
    const r = await verifyCandidate(ASSET, { identifierKind: "mint" });
    expect(r.signals.on_chain_earnings).toBe(false);
    expect(r.passed).toBe(false);
    expect(r.notes).toContain("kind=mint");
  });
});
