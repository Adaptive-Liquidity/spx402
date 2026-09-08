import { describe, expect, it } from "vitest";
import { aggregateAeonCounters } from "../aeon-counters";

describe("aggregateAeonCounters", () => {
  it("derives escrow rates from release vs cancel events", () => {
    const c = aggregateAeonCounters([
      { type: "ESCROW_CREATED", amount_token: 1 },
      { type: "ESCROW_RELEASED", amount_token: 1 },
      { type: "ESCROW_RELEASED", amount_token: 1 },
      { type: "ESCROW_CANCELED", amount_token: 1 },
    ]);
    expect(c.totalEscrowsCompleted).toBe(2);
    expect(c.totalEscrowsFailed).toBe(1);
    expect(c.escrowSuccessRate).toBeCloseTo(2 / 3);
  });

  it("nets bond deposits minus slashes using 6-decimal token units", () => {
    const c = aggregateAeonCounters([
      { type: "BOND_DEPOSITED", amount_token: 5_000_000 },
      { type: "BOND_SLASHED", amount_token: 1_000_000 },
    ]);
    expect(c.activeBondAmount).toBeCloseTo(4);
    expect(c.totalSlashedUsd).toBeCloseTo(1);
  });

  it("ignores non-AEON types", () => {
    const c = aggregateAeonCounters([
      { type: "DEPOSIT_RECEIVED", amount_token: 99 },
      { type: "X402_PAYMENT_RECEIVED", amount_token: 99 },
    ]);
    expect(c).toEqual({
      totalEscrowsCompleted: 0,
      totalEscrowsFailed: 0,
      escrowSuccessRate: 0,
      activeBondAmount: 0,
      totalSlashedUsd: 0,
      totalAeonPayments: 0,
      totalReceipts: 0,
    });
  });
});
