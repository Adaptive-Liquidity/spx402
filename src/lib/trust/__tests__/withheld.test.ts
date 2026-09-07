import { describe, expect, it } from "vitest";
import { toShadowCategory } from "@/lib/shadow-categories";
import { gradeColor, qualifiesForLeaderboard, type Agent } from "@/lib/agents";

function withheldAgent(): Agent {
  return {
    mint: "Mint11111111111111111111111111111111111111111111111",
    identifier: "Mint11111111111111111111111111111111111111111111111",
    identifierKind: "mint",
    chain: "solana",
    category: "aeon_executor",
    executorWallet: null,
    coreAsset: null,
    symbol: "TST",
    name: "Withheld Agent",
    tagline: "",
    grade: null,
    withheldReason: "aeon_pipeline_disabled",
    score: null,
    status: "active",
    operatorVerified: false,
    confidence: "low",
    confidenceScore: 0,
    methodologyVersion: "",
    confidenceModelVersion: "",
    parserVersion: "",
    lastIndexedSeconds: 0,
    totalDepositsCount: 0,
    totalBuybacksCount: 0,
    totalBurnsCount: 0,
    failedWindows: 0,
    totalDepositedSol: 0,
    totalBuybackSol: 0,
    totalBurnedTokens: 0,
    buybackExecutionRate: 0,
    burnConfirmationRate: 0,
    buybackBps: 0,
    lastBuybackLabel: "",
    lastBurnLabel: "",
    configLastChangedLabel: "",
    scoreBreakdown: {
      escrowCompletion: 0,
      slashableBond: 0,
      failedTx: 0,
      recency: 0,
      operator: 0,
    },
    verdict: "AEON pipeline disabled - grade withheld",
    events: [],
    priceSeries: [],
    flagged: false,
    flagReason: null,
    flaggedAt: null,
    aeonCriAddress: null,
    totalSlashedUsd: 0,
    activeBondAmount: 0,
    escrowSuccessRate: 0,
    totalEscrowsCompleted: 0,
    totalEscrowsFailed: 0,
  };
}

describe("shadow category mapping", () => {
  it("preserves aeon_executor directly (never unknown/general)", () => {
    expect(toShadowCategory("aeon_executor")).toBe("aeon_executor");
  });

  it("maps known database values explicitly", () => {
    expect(toShadowCategory("tokenized_buyback")).toBe("tokenized_buyback");
    expect(toShadowCategory("registered_agent")).toBe("registered_agent");
    expect(toShadowCategory("x402_executor")).toBe("executor");
  });

  it("falls back to unknown for null/unsupported (never silent tokenized_buyback)", () => {
    expect(toShadowCategory(null)).toBe("unknown");
    expect(toShadowCategory("something_new")).toBe("unknown");
  });
});

describe("withheld trust state", () => {
  it("excludes withheld agents from leaderboard eligibility", () => {
    expect(qualifiesForLeaderboard(withheldAgent())).toBe(false);
  });

  it("renders withheld grade with the muted color, never failure red", () => {
    expect(gradeColor(null)).toBe("paper-muted");
    expect(gradeColor("SPX AA")).not.toBe("paper-muted");
  });
});
