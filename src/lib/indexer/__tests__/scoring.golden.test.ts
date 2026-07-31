// Section F — synthetic scoring golden tests.
//
// Pure functions only: no network, no fixtures, no DB. These pin the score
// model's boundaries so any change to `scoring.server.ts` forces a
// reviewable diff.

import { describe, it, expect } from "vitest";
import {
  score,
  type ScoringInputs,
  type ScoreResult,
} from "@/lib/indexer/scoring.server";

const SIX_HOURS = 60 * 60 * 6;
const SEVEN_DAYS = 60 * 60 * 24 * 7;

function base(overrides: Partial<ScoringInputs> = {}): ScoringInputs {
  return {
    totalDepositsCount: 0,
    totalBuybacksCount: 0,
    totalBurnsCount: 0,
    failedWindows: 0,
    buybackExecutionRate: 0,
    burnConfirmationRate: 0,
    lastIndexedSeconds: 0,
    operatorVerified: false,
    hasMetadata: false,
    ...overrides,
  };
}

/**
 * Build a tokenized (non fee-buyback) input that lands on an exact total.
 *
 * Fixed contributions: failedTx = 5 (failedWindows 10, still under the
 * SPX D override at >10), recency = 10, metadata = 5, operator = 5 → 30.
 * Variable: burnConfirmation (0..20) + buybackExecution (0..25) +
 * depositConsistency (0..20) → total range 30..95.
 */
function tokenizedAtTotal(target: number): ScoringInputs {
  let remaining = target - 30;
  if (remaining < 0 || remaining > 65) {
    throw new Error(`target ${target} outside constructible range 30..95`);
  }
  const burnPts = Math.min(remaining, 20);
  remaining -= burnPts;
  const buybackPts = Math.min(remaining, 25);
  remaining -= buybackPts;
  const depositPts = remaining; // ≤ 20
  const deposits = depositPts === 0 ? 1 : Math.round(depositPts / 0.4);

  return base({
    totalDepositsCount: deposits,
    totalBuybacksCount: 1,
    totalBurnsCount: 1,
    failedWindows: 10,
    buybackExecutionRate: buybackPts / 25,
    burnConfirmationRate: burnPts / 20,
    lastIndexedSeconds: 0,
    operatorVerified: true,
    hasMetadata: true,
    category: "tokenized_buyback",
  });
}

describe("F1 — grade boundary sweep", () => {
  const cases: Array<[number, string]> = [
    [89, "SPX AA"],
    [90, "SPX AAA"],
    [79, "SPX A"],
    [80, "SPX AA"],
    [69, "SPX BBB"],
    [70, "SPX A"],
    [59, "SPX BB"],
    [60, "SPX BBB"],
    [49, "SPX B"],
    [50, "SPX BB"],
    [39, "SPX D"],
    [40, "SPX B"],
  ];

  for (const [target, grade] of cases) {
    it(`total ${target} → ${grade}`, () => {
      const r = score(tokenizedAtTotal(target));
      expect(r.total).toBe(target); // builder must hit the total exactly
      expect(r.grade).toBe(grade);
    });
  }
});

describe("F2 — SPX404 conditions per branch", () => {
  it("tokenized: zero deposits, buybacks and burns → SPX404", () => {
    const r = score(base({ category: "tokenized_buyback" }));
    expect(r.grade).toBe("SPX404");
    expect(r.verdict).toBe("No on-chain activity observed in the indexed window.");
  });

  it("tokenized: any single counter non-zero → not SPX404", () => {
    expect(score(base({ category: "tokenized_buyback", totalBurnsCount: 1 })).grade).not.toBe(
      "SPX404",
    );
    expect(
      score(base({ category: "tokenized_buyback", totalDepositsCount: 1 })).grade,
    ).not.toBe("SPX404");
  });

  it("x402: zero receipts → SPX404", () => {
    const r = score(base({ category: "x402_executor", totalX402Count: 0 }));
    expect(r.grade).toBe("SPX404");
    expect(r.verdict).toBe("No x402 payment receipts observed yet.");
  });

  it("x402: one receipt → not SPX404", () => {
    expect(
      score(base({ category: "x402_executor", totalX402Count: 1, totalX402Sol: 0.01 })).grade,
    ).not.toBe("SPX404");
  });

  it("registered: no registry proof and no swaps → SPX404", () => {
    const r = score(
      base({ category: "registered_agent", registryProof: false, totalSwapCount: 0 }),
    );
    expect(r.grade).toBe("SPX404");
    expect(r.verdict).toBe(
      "No MPL Agent Identity PDA observed and no recent swap activity.",
    );
  });

  it("registered: registry proof alone lifts out of SPX404", () => {
    expect(
      score(base({ category: "registered_agent", registryProof: true })).grade,
    ).not.toBe("SPX404");
  });

  it("registered: swaps alone lift out of SPX404 but flag missing PDA", () => {
    const r = score(
      base({ category: "registered_agent", registryProof: false, totalSwapCount: 4 }),
    );
    expect(r.grade).not.toBe("SPX404");
    expect(r.verdict).toBe(
      "Swap activity observed but MPL Agent Identity PDA not currently resolvable.",
    );
  });
});

describe("F3 — SPX D override on repeated failed windows", () => {
  it("failedWindows > 10 forces SPX D regardless of total", () => {
    const r = score(
      base({
        totalDepositsCount: 50,
        totalBuybacksCount: 50,
        totalBurnsCount: 50,
        buybackExecutionRate: 1,
        burnConfirmationRate: 1,
        failedWindows: 11,
        operatorVerified: true,
        hasMetadata: true,
      }),
    );
    expect(r.grade).toBe("SPX D");
    expect(r.verdict).toBe(
      "Repeated failed buyback windows. Operator review required.",
    );
  });

  it("failedWindows === 10 does not trigger the override", () => {
    const r = score(
      base({
        totalDepositsCount: 50,
        totalBuybacksCount: 50,
        totalBurnsCount: 50,
        buybackExecutionRate: 1,
        burnConfirmationRate: 1,
        failedWindows: 10,
        operatorVerified: true,
        hasMetadata: true,
      }),
    );
    expect(r.grade).not.toBe("SPX D");
  });
});

describe("F4 — fee-buyback auto-detect edges", () => {
  const feeInputs = (buybacks: number) =>
    base({
      totalDepositsCount: 0,
      totalBuybacksCount: buybacks,
      totalBurnsCount: 0,
      totalBuybackSol: 2,
      lastIndexedSeconds: 0,
      category: "tokenized_buyback",
    });

  it("deposits=0 and buybacks=3 flips into the fee-buyback branch", () => {
    const r = score(feeInputs(3));
    // Fee-buyback branch: deposit slot is driven by buyback COUNT, buyback
    // slot by buyback SOL, and burn slot gets the 10pt no-burn allowance.
    expect(r.breakdown.depositConsistency).toBe(3);
    expect(r.breakdown.buybackExecution).toBe(25);
    expect(r.breakdown.burnConfirmation).toBe(10);
    expect(r.verdict).toContain("Fee-routed buyback agent");
  });

  it("deposits=0 and buybacks=2 does NOT flip", () => {
    const r = score(feeInputs(2));
    expect(r.breakdown.depositConsistency).toBe(0);
    expect(r.breakdown.buybackExecution).toBe(0);
    expect(r.breakdown.burnConfirmation).toBe(0);
    expect(r.verdict).toContain("Fee-routed buyback agent");
  });

  it("any deposit blocks the fee-buyback branch even with many buybacks", () => {
    const r = score(
      base({
        totalDepositsCount: 1,
        totalBuybacksCount: 20,
        totalBuybackSol: 2,
        buybackExecutionRate: 0,
      }),
    );
    expect(r.breakdown.buybackExecution).toBe(0); // rate-driven, not SOL-driven
    expect(r.breakdown.burnConfirmation).toBe(0); // no 10pt allowance
  });
});

describe("F5 — recency window edges", () => {
  const tokenized = (secs: number) =>
    score(base({ totalDepositsCount: 1, totalBurnsCount: 1, lastIndexedSeconds: secs }))
      .breakdown.recency;

  const feeBuyback = (secs: number) =>
    score(
      base({
        totalDepositsCount: 0,
        totalBuybacksCount: 3,
        lastIndexedSeconds: secs,
      }),
    ).breakdown.recency;

  it("short window (6h): 0s → 10, half → 5, exactly 6h → 0", () => {
    expect(tokenized(0)).toBe(10);
    expect(tokenized(SIX_HOURS / 2)).toBe(5);
    expect(tokenized(SIX_HOURS)).toBe(0);
  });

  it("short window: one second either side of the boundary", () => {
    expect(tokenized(SIX_HOURS - 1)).toBe(0);
    expect(tokenized(SIX_HOURS + 1)).toBe(0);
    expect(tokenized(1)).toBe(10);
  });

  it("long window (7d): 0s → 10, half → 5, exactly 7d → 0", () => {
    expect(feeBuyback(0)).toBe(10);
    expect(feeBuyback(SEVEN_DAYS / 2)).toBe(5);
    expect(feeBuyback(SEVEN_DAYS)).toBe(0);
  });

  it("long window: one second either side of the boundary", () => {
    expect(feeBuyback(SEVEN_DAYS - 1)).toBe(0);
    expect(feeBuyback(SEVEN_DAYS + 1)).toBe(0);
  });

  it("recency never goes negative past the window", () => {
    expect(tokenized(SIX_HOURS * 100)).toBe(0);
    expect(feeBuyback(SEVEN_DAYS * 100)).toBe(0);
  });
});

describe("F6 — confidence buckets", () => {
  it("tokenized: >=20 activity and <24h → high", () => {
    expect(
      score(base({ totalDepositsCount: 20, lastIndexedSeconds: 60 })).confidence,
    ).toBe("high");
  });
  it("tokenized: >=5 activity → medium", () => {
    expect(
      score(base({ totalDepositsCount: 5, lastIndexedSeconds: 60 })).confidence,
    ).toBe("medium");
  });
  it("tokenized: sparse activity → low", () => {
    expect(score(base({ totalDepositsCount: 1 })).confidence).toBe("low");
  });
  it("x402: 20 receipts and fresh → high, 5 → medium, 1 → low", () => {
    const c = (n: number, secs = 60) =>
      score(
        base({ category: "x402_executor", totalX402Count: n, lastIndexedSeconds: secs }),
      ).confidence;
    expect(c(20)).toBe("high");
    expect(c(5)).toBe("medium");
    expect(c(1)).toBe("low");
  });
});

describe("F7 — full ScoreResult regression pin (one per branch)", () => {
  it("tokenized canonical", () => {
    const r: ScoreResult = score(
      base({
        totalDepositsCount: 40,
        totalBuybacksCount: 30,
        totalBurnsCount: 25,
        failedWindows: 2,
        buybackExecutionRate: 0.75,
        burnConfirmationRate: 0.83,
        lastIndexedSeconds: 3600,
        operatorVerified: true,
        hasMetadata: true,
        category: "tokenized_buyback",
      }),
    );
    expect(r).toMatchInlineSnapshot(`
      {
        "breakdown": {
          "buybackExecution": 19,
          "burnConfirmation": 17,
          "depositConsistency": 16,
          "failedTx": 13,
          "metadata": 5,
          "operator": 5,
          "recency": 8,
        },
        "confidence": "high",
        "grade": "SPX AA",
        "total": 83,
        "verdict": "Consistent execution and verified buyback/burn cadence.",
      }
    `);
  });

  it("registered canonical", () => {
    const r = score(
      base({
        category: "registered_agent",
        registryProof: true,
        totalSwapCount: 25,
        totalSwapSol: 2.5,
        failedWindows: 0,
        lastIndexedSeconds: 60 * 60 * 24,
        hasMetadata: true,
        operatorVerified: false,
      }),
    );
    expect(r).toMatchInlineSnapshot(`
      {
        "breakdown": {
          "buybackExecution": 13,
          "burnConfirmation": 10,
          "depositConsistency": 20,
          "failedTx": 15,
          "metadata": 5,
          "operator": 0,
          "recency": 9,
        },
        "confidence": "high",
        "grade": "SPX A",
        "total": 72,
        "verdict": "Verified Metaplex agent with moderate activity in the indexed window.",
      }
    `);
  });

  it("x402 canonical", () => {
    const r = score(
      base({
        category: "x402_executor",
        totalX402Count: 50,
        totalX402Sol: 3,
        totalX402Usdc: 40_000_000, // 40 USDC (6 decimals)
        failedWindows: 1,
        lastIndexedSeconds: 60 * 60,
        hasMetadata: true,
        operatorVerified: true,
      }),
    );
    expect(r).toMatchInlineSnapshot(`
      {
        "breakdown": {
          "buybackExecution": 8,
          "burnConfirmation": 8,
          "depositConsistency": 10,
          "failedTx": 14,
          "metadata": 5,
          "operator": 5,
          "recency": 8,
        },
        "confidence": "high",
        "grade": "SPX BBB",
        "total": 58,
        "verdict": "Live x402 executor with moderate receipt volume (50 receipts).",
      }
    `);
  });
});

describe("F8 — undecoded categories fall back to the tokenized branch", () => {
  for (const category of ["copy_trader", "task_executor", "general"] as const) {
    it(`${category} scores identically to tokenized_buyback`, () => {
      const inputs = base({
        totalDepositsCount: 10,
        totalBuybacksCount: 4,
        totalBurnsCount: 3,
        buybackExecutionRate: 0.4,
        burnConfirmationRate: 0.75,
      });
      expect(score({ ...inputs, category })).toEqual(
        score({ ...inputs, category: "tokenized_buyback" }),
      );
    });
  }
});
