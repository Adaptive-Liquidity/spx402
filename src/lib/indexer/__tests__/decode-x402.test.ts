// Section B — x402 decoder (decode-x402.server.ts) fixture tests.

import { describe, expect } from "vitest";
import { decodeX402Tx } from "@/lib/indexer/decode-x402.server";
import { decodeX402ReversedTx } from "@/lib/indexer/decode-failure.server";
import { fixtureTest } from "./fixtures";

function wallets(expected: Record<string, unknown>): string[] {
  const list = (expected.executorWallets as string[] | undefined) ?? [];
  if (list.length === 0) {
    throw new Error("fixture envelope.expected.executorWallets must be populated");
  }
  return list;
}

describe("B — x402 decoder", () => {
  fixtureTest("B1_x402_sol_receipt", "SOL x402 receipt → one event", (tx, env) => {
    const events = decodeX402Tx(tx, wallets(env.expected));
    expect(events).toHaveLength(1);
    expect(events[0].amountSol).toBeCloseTo(Number(env.expected.amountSol), 9);
    expect(events[0].amountToken).toBe(0);
    expect(events[0].signature).toBe(env.signature);
  });

  fixtureTest("B2_x402_usdc_receipt", "USDC x402 receipt → token amount only", (tx, env) => {
    const events = decodeX402Tx(tx, wallets(env.expected));
    expect(events).toHaveLength(1);
    expect(events[0].amountToken).toBeCloseTo(Number(env.expected.amountToken), 6);
    expect(events[0].amountSol).toBe(0);
  });

  fixtureTest("B3_x402_memo_marker", "x402 marker only in SPL Memo payload", (tx, env) => {
    expect(decodeX402Tx(tx, wallets(env.expected))).toHaveLength(1);
  });

  fixtureTest(
    "B4_transfer_no_marker",
    "plain transfer to an executor wallet with no x402 marker → no event",
    (tx, env) => {
      expect(decodeX402Tx(tx, wallets(env.expected))).toEqual([]);
    },
  );

  fixtureTest(
    "B5_x402_marker_wrong_recipient",
    "x402-marked tx that never credits a tracked wallet → no event",
    (tx, env) => {
      expect(decodeX402Tx(tx, wallets(env.expected))).toEqual([]);
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
