// Section A — tokenized decoder (decode.server.ts) fixture tests.
//
// Every case below is backed by a verbatim Helius Enhanced Transaction
// capture in src/lib/indexer/__fixtures__/. Cases without a capture yet are
// registered as explicit skips carrying their reason.

import { describe, expect } from "vitest";
import { decodeTx, type AgentLookup } from "@/lib/indexer/decode.server";
import { decodePumpBuybackReversedTx } from "@/lib/indexer/decode-failure.server";
import { fixtureTest } from "./fixtures";

function agentsFrom(expected: Record<string, unknown>): AgentLookup[] {
  const list = (expected.agents as AgentLookup[] | undefined) ?? [];
  if (list.length === 0) {
    throw new Error("fixture envelope.expected.agents must list the agent lookups");
  }
  return list;
}

describe("A — tokenized decoder", () => {
  fixtureTest("A1_deposit_native_sol", "native SOL deposit → DEPOSIT_RECEIVED", (tx, env) => {
    const events = decodeTx(tx, agentsFrom(env.expected));
    const deposits = events.filter((e) => e.type === "DEPOSIT_RECEIVED");
    expect(deposits).toHaveLength(Number(env.expected.depositCount ?? 1));
    expect(deposits[0].severity).toBe("info");
    expect(deposits[0].signature).toBe(env.signature);
    expect(deposits[0].amountSol).toBeCloseTo(Number(env.expected.amountSol), 9);
  });

  fixtureTest("A2_buyback_pumpfun", "pump.fun buyback → BUYBACK_EXECUTED", (tx, env) => {
    const events = decodeTx(tx, agentsFrom(env.expected));
    const buybacks = events.filter((e) => e.type === "BUYBACK_EXECUTED");
    expect(buybacks).toHaveLength(1);
    expect(buybacks[0].severity).toBe("success");
    expect(buybacks[0].amountToken).toBeGreaterThan(0);
    expect(buybacks[0].amountSol).toBeCloseTo(Number(env.expected.amountSol), 9);
  });

  fixtureTest("A3_burn_confirmed", "SPL burn of a known mint → BURN_CONFIRMED", (tx, env) => {
    const events = decodeTx(tx, agentsFrom(env.expected));
    const burns = events.filter((e) => e.type === "BURN_CONFIRMED");
    expect(burns).toHaveLength(1);
    expect(burns[0].severity).toBe("success");
    expect(burns[0].amountToken).toBe(Number(env.expected.amountToken));
  });

  fixtureTest("A4_burn_token2022", "Token-2022 burnChecked → BURN_CONFIRMED", (tx, env) => {
    const events = decodeTx(tx, agentsFrom(env.expected));
    expect(events.some((e) => e.type === "BURN_CONFIRMED")).toBe(true);
  });

  fixtureTest(
    "A5_buyback_and_burn_same_tx",
    "single tx emitting both BUYBACK_EXECUTED and BURN_CONFIRMED",
    (tx, env) => {
      const types = decodeTx(tx, agentsFrom(env.expected)).map((e) => e.type);
      expect(types).toContain("BUYBACK_EXECUTED");
      expect(types).toContain("BURN_CONFIRMED");
    },
  );

  fixtureTest(
    "A6_failed_pumpfun_tx",
    "errored pump.fun tx for a known mint → ANOMALY_DETECTED",
    (tx, env) => {
      const events = decodeTx(tx, agentsFrom(env.expected));
      const anomalies = events.filter((e) => e.type === "ANOMALY_DETECTED");
      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].severity).toBe("warn");
      // The same tx must also produce the negative PROMISED_BUYBACK_NOT_SETTLED
      // event through the failure decoder.
      const failures = decodePumpBuybackReversedTx(
        tx,
        agentsFrom(env.expected).map((a) => ({ mint: a.mint })),
      );
      expect(failures).toHaveLength(1);
      expect(failures[0].severity).toBe("critical");
    },
  );

  fixtureTest(
    "A7_unrelated_tx_no_events",
    "tx touching no tracked agent → zero events",
    (tx, env) => {
      expect(decodeTx(tx, agentsFrom(env.expected))).toEqual([]);
    },
  );

  fixtureTest(
    "A8_multi_agent_single_tx",
    "one tx crediting two tracked deposit addresses",
    (tx, env) => {
      const events = decodeTx(tx, agentsFrom(env.expected));
      const deposits = events.filter((e) => e.type === "DEPOSIT_RECEIVED");
      expect(deposits.length).toBeGreaterThanOrEqual(2);
      expect(new Set(deposits.map((d) => d.mint)).size).toBe(deposits.length);
    },
  );
});
