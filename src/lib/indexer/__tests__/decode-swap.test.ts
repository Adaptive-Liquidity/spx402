// Section C — generalized DEX swap decoder (decode-swap.server.ts).

import { describe, expect } from "vitest";
import { decodeSwapTx } from "@/lib/indexer/decode-swap.server";
import { fixtureTest } from "./fixtures";

function wallets(expected: Record<string, unknown>): string[] {
  const list = (expected.executorWallets as string[] | undefined) ?? [];
  if (list.length === 0) {
    throw new Error("fixture envelope.expected.executorWallets must be populated");
  }
  return list;
}

describe("C — swap decoder", () => {
  fixtureTest("C1_jupiter_swap", "Jupiter swap by a tracked wallet → SWAP event", (tx, env) => {
    const events = decodeSwapTx(tx, wallets(env.expected));
    expect(events).toHaveLength(1);
    expect(events[0].source).toBe(String(env.expected.source));
    expect(events[0].amountSol).toBeCloseTo(Number(env.expected.amountSol), 9);
    expect(events[0].amountToken).toBeGreaterThan(0);
  });

  fixtureTest("C2_raydium_swap", "Raydium swap by a tracked wallet → SWAP event", (tx, env) => {
    const events = decodeSwapTx(tx, wallets(env.expected));
    expect(events).toHaveLength(1);
    expect(events[0].executorWallet).toBe(wallets(env.expected)[0]);
  });

  fixtureTest(
    "C3_non_dex_transfer",
    "non-DEX source (SYSTEM_PROGRAM transfer) → no swap event",
    (tx, env) => {
      expect(decodeSwapTx(tx, wallets(env.expected))).toEqual([]);
    },
  );
});
