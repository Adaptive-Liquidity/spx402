// EVM / Base x402 decoder — fixture suite E1–E4.
//
// E3 is the critical guard: a non-registry EIP-3009 settlement must produce
// Tier B only and must be impossible to persist or score.

import { describe, expect, it } from "vitest";
import {
  AUTHORIZATION_USED_TOPIC,
  PERMIT_WITNESS_TRANSFER_FROM_SELECTOR,
  TRANSFER_WITH_AUTHORIZATION_SELECTOR,
  decodeEvmX402Tx,
  tierAOnly,
} from "@/lib/indexer/decode-x402-evm.server";
import type { Facilitator } from "@/lib/indexer/facilitators.server";
import { evmFixtureTest } from "./fixtures-evm";

const EMPTY_REGISTRY = new Map<string, Facilitator>();

/** Build a registry that treats the fixture's own sender as a facilitator. */
function registryFor(sender: string): Map<string, Facilitator> {
  const m = new Map<string, Facilitator>();
  m.set(`base:${sender.toLowerCase()}`, {
    id: "test-base-facilitator",
    name: "Test Base Facilitator",
    chain: "base",
    address: sender.toLowerCase(),
    scheme: "exact",
    sourceUrl: "test",
    fixtureId: "test",
    active: true,
  });
  return m;
}

describe("EVM x402 — derived constants", () => {
  it("EIP-3009 transferWithAuthorization selector is 4 bytes", () => {
    expect(TRANSFER_WITH_AUTHORIZATION_SELECTOR).toMatch(/^0x[0-9a-f]{8}$/);
  });
  it("Permit2 permitWitnessTransferFrom selector is 4 bytes", () => {
    expect(PERMIT_WITNESS_TRANSFER_FROM_SELECTOR).toMatch(/^0x[0-9a-f]{8}$/);
  });
  it("AuthorizationUsed topic is a 32-byte hash", () => {
    expect(AUTHORIZATION_USED_TOPIC).toMatch(/^0x[0-9a-f]{64}$/);
  });
});

describe("EVM x402 decoder", () => {
  evmFixtureTest(
    "E1_facilitator_transfer_with_authorization",
    "registry facilitator transferWithAuthorization → Tier A, high confidence",
    (tx) => {
      const events = decodeEvmX402Tx(tx, registryFor(tx.from));
      expect(events).toHaveLength(1);
      const ev = events[0]!;
      expect(ev.chain).toBe("base");
      expect(ev.detectionMethod).toBe("facilitator_sender");
      expect(ev.confidence).toBe("high");
      expect(ev.facilitatorId).toBeTruthy();
      expect(ev.executorWallet).toMatch(/^0x[0-9a-f]{40}$/);
      expect(ev.payerWallet).toMatch(/^0x[0-9a-f]{40}$/);
      expect(ev.amountToken).toBeGreaterThan(0);
      expect(tierAOnly(events)).toHaveLength(1);
    },
  );

  evmFixtureTest(
    "E2_permit2_witness_settlement",
    "registry facilitator Permit2 permitWitnessTransferFrom → Tier A",
    (tx) => {
      const events = decodeEvmX402Tx(tx, registryFor(tx.from));
      expect(events).toHaveLength(1);
      expect(events[0]!.detectionMethod).toBe("facilitator_sender");
      expect(events[0]!.raw.call).toBe("permitWitnessTransferFrom");
      expect(tierAOnly(events)).toHaveLength(1);
    },
  );

  evmFixtureTest(
    "E3_eip3009_non_registry_sender",
    "non-registry EIP-3009 → Tier B only, never scored, never persisted",
    (tx) => {
      const events = decodeEvmX402Tx(tx, EMPTY_REGISTRY);
      expect(events).toHaveLength(1);
      const ev = events[0]!;
      expect(ev.detectionMethod).toBe("eip3009_pattern");
      expect(ev.confidence).toBe("low");
      expect(ev.facilitatorId).toBeNull();

      // THE GUARD: the persistence boundary yields nothing.
      expect(tierAOnly(events)).toHaveLength(0);
      expect(tierAOnly(events).filter((e) => e.confidence === "high")).toHaveLength(0);
    },
  );

  evmFixtureTest(
    "E4_plain_usdc_transfer",
    "plain USDC transfer (no EIP-3009, no Permit2) → zero events",
    (tx) => {
      expect(decodeEvmX402Tx(tx, EMPTY_REGISTRY)).toHaveLength(0);
      expect(decodeEvmX402Tx(tx, registryFor(tx.from))).toHaveLength(0);
    },
  );
});
