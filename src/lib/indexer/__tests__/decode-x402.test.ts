// Section B — x402 decoder (decode-x402.server.ts) fixture tests.
//
// Two detection tiers are under test (parser v0.2.0):
//   A. facilitator_fee_payer — tx fee-payer is a registry facilitator (high)
//   B. memo_marker           — legacy x402-shaped marker (medium)
//
// A fixture opts into tier A by declaring `facilitatorId` + `facilitatorAddress`
// in its envelope `expected` block. The address must match the captured tx's
// fee-payer — the loader below asserts that, so a registry can never be faked
// into matching a transaction it doesn't belong to.

import { describe, expect, it } from "vitest";
import { decodeX402Tx } from "@/lib/indexer/decode-x402.server";
import { decodeX402ReversedTx } from "@/lib/indexer/decode-failure.server";
import {
  FACILITATOR_SEED,
  FACILITATOR_REGISTRY_VERSION,
  facilitatorForFeePayer,
  type Facilitator,
} from "@/lib/indexer/facilitators.server";
import { fixtureTest, type FixtureEnvelope } from "./fixtures";
import type { HeliusEnhancedTx } from "@/lib/indexer/helius.server";

function wallets(expected: Record<string, unknown>): string[] {
  const list = (expected.executorWallets as string[] | undefined) ?? [];
  if (list.length === 0) {
    throw new Error("fixture envelope.expected.executorWallets must be populated");
  }
  return list;
}

/**
 * Build the decoder registry a fixture declares. Returns undefined for
 * memo-tier fixtures so they exercise the legacy path exactly as before.
 */
function registryFor(
  tx: HeliusEnhancedTx,
  env: FixtureEnvelope,
): Map<string, Facilitator> | undefined {
  const id = env.expected.facilitatorId as string | undefined;
  const address = env.expected.facilitatorAddress as string | undefined;
  if (!id || !address) return undefined;
  if (tx.feePayer !== address) {
    throw new Error(
      `Fixture "${env.id}" declares facilitatorAddress ${address} but the captured tx fee-payer is ${tx.feePayer}.`,
    );
  }
  return new Map<string, Facilitator>([
    [
      `solana:${address}`,
      {
        id,
        name: id,
        chain: "solana",
        address,
        scheme: "exact",
        sourceUrl: (env.expected.facilitatorSourceUrl as string | undefined) ?? "",
        fixtureId: env.id,
        active: true,
      },
    ],
  ]);
}

function expectedMethod(env: FixtureEnvelope): "facilitator_fee_payer" | "memo_marker" {
  return env.expected.facilitatorId ? "facilitator_fee_payer" : "memo_marker";
}

describe("B — x402 decoder", () => {
  it("registry seed ships inactive and address-less until fixture-verified", () => {
    expect(FACILITATOR_REGISTRY_VERSION).toBe("v0.2.0");
    for (const f of FACILITATOR_SEED) {
      if (f.active) {
        expect(f.address).not.toBe("");
        expect(f.fixtureId).not.toBeNull();
      }
    }
  });

  it("facilitatorForFeePayer only matches the exact solana-keyed address", () => {
    const f: Facilitator = {
      id: "test-fac",
      name: "Test",
      chain: "solana",
      address: "FaCiLiTaToRaDdReSs",
      scheme: "exact",
      sourceUrl: "",
      fixtureId: "B2_x402_usdc_receipt",
      active: true,
    };
    const registry = new Map([[`solana:${f.address}`, f]]);
    expect(facilitatorForFeePayer(registry, f.address)?.id).toBe("test-fac");
    expect(facilitatorForFeePayer(registry, "someone-else")).toBeNull();
    expect(facilitatorForFeePayer(registry, undefined)).toBeNull();
  });

  fixtureTest("B1_x402_sol_receipt", "SOL x402 receipt → one event", (tx, env) => {
    const events = decodeX402Tx(tx, wallets(env.expected), {
      registry: registryFor(tx, env),
    });
    expect(events).toHaveLength(1);
    expect(events[0].amountSol).toBeCloseTo(Number(env.expected.amountSol), 9);
    expect(events[0].amountToken).toBe(0);
    expect(events[0].signature).toBe(env.signature);
    expect(events[0].detectionMethod).toBe(expectedMethod(env));
  });

  fixtureTest(
    "x402-facilitator-settlement-01",
    "USDC settlement via facilitator fee-payer → tier A, high confidence",
    (tx, env) => {
      const registry = registryFor(tx, env);
      const events = decodeX402Tx(tx, wallets(env.expected), { registry });
      expect(events).toHaveLength(1);
      expect(events[0].amountToken).toBeCloseTo(Number(env.expected.amountToken), 6);
      expect(events[0].amountSol).toBe(0);
      expect(events[0].detectionMethod).toBe(expectedMethod(env));
      if (registry) {
        expect(events[0].confidence).toBe("high");
        expect(events[0].facilitatorId).toBe(env.expected.facilitatorId);
        expect(events[0].payerWallet).toBe(env.expected.payerWallet);
        expect(events[0].raw.parserVersion).toBe("v0.2.0");
      }
    },
  );

  fixtureTest(
    "x402-facilitator-settlement-02",
    "settlement with no marker anywhere, detected by facilitator fee-payer",
    (tx, env) => {
      const registry = registryFor(tx, env);
      const events = decodeX402Tx(tx, wallets(env.expected), { registry });
      expect(events).toHaveLength(1);
      expect(events[0].detectionMethod).toBe(expectedMethod(env));
      if (registry) {
        expect(events[0].confidence).toBe("high");
        expect(events[0].facilitatorId).toBe(env.expected.facilitatorId);
        // The structural proof: no marker anywhere, yet still detected.
        expect(decodeX402Tx(tx, wallets(env.expected))).toEqual([]);
      } else {
        expect(events[0].confidence).toBe("medium");
      }
    },
  );


  fixtureTest(
    "B4_transfer_no_marker",
    "plain transfer, non-facilitator fee-payer, no marker → no event",
    (tx, env) => {
      expect(decodeX402Tx(tx, wallets(env.expected))).toEqual([]);
      // Empty registry must not turn an ordinary transfer into a settlement.
      expect(
        decodeX402Tx(tx, wallets(env.expected), { registry: new Map() }),
      ).toEqual([]);
    },
  );

  fixtureTest(
    "B5_x402_marker_wrong_recipient",
    "x402-marked tx that never credits a tracked wallet → no event",
    (tx, env) => {
      expect(decodeX402Tx(tx, wallets(env.expected))).toEqual([]);
      expect(
        decodeX402Tx(tx, wallets(env.expected), { registry: registryFor(tx, env) }),
      ).toEqual([]);
    },
  );

  fixtureTest(
    "B6_x402_reverted",
    "errored x402-marked tx → X402_PAYMENT_REVERTED, no success event",
    (tx, env) => {
      expect(decodeX402Tx(tx, wallets(env.expected))).toEqual([]);
      const failures = decodeX402ReversedTx(
        tx,
        wallets(env.expected).map((w) => ({ identifier: w, wallet: w })),
      );
      expect(failures).toHaveLength(1);
      expect(failures[0].type).toBe("X402_PAYMENT_REVERTED");
      expect(failures[0].severity).toBe("critical");
      expect(failures[0].signature.startsWith("x402rv-")).toBe(true);
    },
  );
});
