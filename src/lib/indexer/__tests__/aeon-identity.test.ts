import { describe, expect, it } from "vitest";
import { isPubliclyListed } from "@/lib/agents/publication";
import { qualifiesForLeaderboard, type Agent } from "@/lib/agents";
import { collectHeliusAccountAddresses } from "@/lib/indexer/helius-watch.server";
import { resolveAeonIngestMint } from "@/lib/registration/upsert-aeon-agent.server";
import { issueAuthorityPdaUpdates, uniqueAddrs } from "@/lib/indexer/aeon-pda.server";
import type { AeonDecodedEvent } from "@/lib/indexer/decode-aeon.server";

function agent(overrides: Partial<Agent> = {}): Agent {
  return {
    mint: "Mint11111111111111111111111111111111111111111111111",
    identifier: "Mint11111111111111111111111111111111111111111111111",
    identifierKind: "executor_wallet",
    chain: "solana",
    category: "aeon_executor",
    executorWallet: "Wall11111111111111111111111111111111111111111",
    coreAsset: null,
    symbol: "TST",
    name: "Test",
    tagline: "",
    grade: "SPX A",
    withheldReason: null,
    score: 80,
    status: "active",
    operatorVerified: true,
    confidence: "high",
    confidenceScore: 0.9,
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
    verdict: "",
    events: [],
    priceSeries: [],
    flagged: false,
    flagReason: null,
    flaggedAt: null,
    publicationStatus: "published",
    aeonCriAddress: null,
    totalSlashedUsd: 0,
    activeBondAmount: 0,
    escrowSuccessRate: 0,
    totalEscrowsCompleted: 0,
    totalEscrowsFailed: 0,
    ...overrides,
  };
}

describe("AEON identity helpers", () => {
  it("hides unpublished from the leaderboard gate", () => {
    expect(isPubliclyListed("unpublished")).toBe(false);
    expect(isPubliclyListed(null)).toBe(true);
    expect(qualifiesForLeaderboard(agent({ publicationStatus: "unpublished" }))).toBe(false);
    expect(qualifiesForLeaderboard(agent({ publicationStatus: "published" }))).toBe(true);
  });

  it("merges onto an existing wallet row instead of minting a CRI duplicate", () => {
    expect(
      resolveAeonIngestMint({
        cri: "Cri11111111111111111111111111111111111111111",
        wallet: "Wall11111111111111111111111111111111111111111",
        existingMintByWallet: "ExistingMint1111111111111111111111111111111",
      }),
    ).toEqual({ mint: "ExistingMint1111111111111111111111111111111", mode: "merge" });
    expect(
      resolveAeonIngestMint({
        cri: "Cri11111111111111111111111111111111111111111",
        wallet: "Wall11111111111111111111111111111111111111111",
        existingMintByWallet: null,
      }),
    ).toEqual({ mint: "Cri11111111111111111111111111111111111111111", mode: "insert" });
  });

  it("collects wallet, CRI and PDAs but never a caller-supplied program id unless passed as extra", () => {
    const program = "AeonProgram111111111111111111111111111111111";
    const addrs = collectHeliusAccountAddresses(
      [
        {
          mint: "Mint11111111111111111111111111111111111111111",
          executor_wallet: "Wall11111111111111111111111111111111111111111",
          aeon_cri_address: "Cri11111111111111111111111111111111111111111",
          aeon_authority_addresses: ["Auth111111111111111111111111111111111111111"],
          aeon_bond_addresses: ["Bond1111111111111111111111111111111111111111"],
        },
      ],
      ["PumpFun11111111111111111111111111111111111111"],
    );
    expect(addrs).toContain("Wall11111111111111111111111111111111111111111");
    expect(addrs).toContain("Cri11111111111111111111111111111111111111111");
    expect(addrs).toContain("Auth111111111111111111111111111111111111111");
    expect(addrs).toContain("Bond1111111111111111111111111111111111111111");
    expect(addrs).not.toContain(program);
  });

  it("dedupes issue_authority PDAs per mint", () => {
    const events = [
      {
        mint: "m1",
        type: "AEON_AUTHORITY_ISSUED",
        raw: { instruction: "issue_authority", authority: "A", bond: "B", agent_identity: "I" },
      },
      {
        mint: "m1",
        type: "BOND_DEPOSITED",
        raw: { instruction: "issue_authority", authority: "A", bond: "B", agent_identity: "I" },
      },
    ] as unknown as AeonDecodedEvent[];
    const updates = issueAuthorityPdaUpdates(events);
    expect(updates.get("m1")).toEqual({
      authorities: ["A"],
      bonds: ["B"],
      identity: "I",
    });
    expect(uniqueAddrs(["A", "A", "", "B"])).toEqual(["A", "B"]);
  });
});
