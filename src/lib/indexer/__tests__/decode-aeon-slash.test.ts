import { describe, expect, it } from "vitest";
import bs58 from "bs58";
import {
  aeonEventDiscBytes,
  aeonInstructionAccountNames,
  aeonInstructionDiscBytes,
} from "../aeon-idl";
import { decodeAeonTx } from "../decode-aeon.server";
import { AEON_PROGRAM_ID_DEVNET } from "../../trust/config";
import { SPL_TOKEN_PROGRAM_ID, type HeliusEnhancedTx } from "../helius.server";

const SIG = "sigSlash11111111111111111111111111111111111111111111111111111111";
const SLASHER_MINT = "SlasherMint11111111111111111111111111111111111";
const SLASHER_WALLET = "SlasherWall1111111111111111111111111111111111";
const BONDED_MINT = "BondedMint11111111111111111111111111111111111";
const BONDED_WALLET = "BondedWall11111111111111111111111111111111111";
const AUTHORITY_PDA = "AuthPda1111111111111111111111111111111111111";
const BOND_PDA = "BondPda11111111111111111111111111111111111111";
const BOND_VAULT = "BondVault11111111111111111111111111111111111";
const DESTINATION = "Dest11111111111111111111111111111111111111111";
const CONFIG = "Config111111111111111111111111111111111111111";
const AEON_MINT = "AeonMint1111111111111111111111111111111111111";
const IDENTITY = "Identity111111111111111111111111111111111111";
const CRI = "CriPda111111111111111111111111111111111111111";
const OTHER_PROGRAM = "FakeBond111111111111111111111111111111111111";

const SLASH_ACCOUNTS = [
  SLASHER_WALLET,
  CONFIG,
  AUTHORITY_PDA,
  BOND_PDA,
  BOND_VAULT,
  DESTINATION,
  AEON_MINT,
  SPL_TOKEN_PROGRAM_ID,
];

function u64le(n: number): Buffer {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(BigInt(n));
  return b;
}

function encodeIx(name: string, args: Buffer): string {
  const disc = aeonInstructionDiscBytes(name);
  if (!disc) throw new Error(`missing IDL instruction ${name}`);
  return bs58.encode(Buffer.concat([Buffer.from(disc), args]));
}

function bondSlashedLog(amount: number, authorityId = 7): string {
  const disc = aeonEventDiscBytes("BondSlashed");
  if (!disc) throw new Error("missing BondSlashed event");
  const payload = Buffer.concat([
    Buffer.from(disc),
    u64le(authorityId),
    u64le(amount),
    Buffer.alloc(32, 2),
  ]);
  return `Program data: ${payload.toString("base64")}`;
}

function aeonInvokeLogs(inner: string[], programId = AEON_PROGRAM_ID_DEVNET): string[] {
  return [
    `Program ${programId} invoke [1]`,
    `Program ${SPL_TOKEN_PROGRAM_ID} invoke [2]`,
    `Program ${SPL_TOKEN_PROGRAM_ID} success`,
    ...inner,
    `Program ${programId} success`,
  ];
}

function slashTx(overrides: Partial<HeliusEnhancedTx> = {}): HeliusEnhancedTx {
  return {
    signature: SIG,
    slot: 11,
    timestamp: 1_700_000_100,
    logMessages: aeonInvokeLogs([bondSlashedLog(500_000)]),
    instructions: [
      {
        programId: AEON_PROGRAM_ID_DEVNET,
        data: encodeIx("slash_bond", u64le(7)),
        accounts: SLASH_ACCOUNTS,
      },
    ],
    ...overrides,
  };
}

const slasherAgent = {
  mint: SLASHER_MINT,
  aeonCriAddress: null,
  executorWallet: SLASHER_WALLET,
};

const bondedAgent = {
  mint: BONDED_MINT,
  aeonCriAddress: CRI,
  executorWallet: BONDED_WALLET,
  aeonAgentIdentity: IDENTITY,
  aeonAuthorityAddress: AUTHORITY_PDA,
  aeonBondAddress: BOND_PDA,
  aeonAuthorityAddresses: [AUTHORITY_PDA],
  aeonBondAddresses: [BOND_PDA],
};

describe("slash_bond attribution and amount", () => {
  it("pins slash_bond account order from the IDL (authority/bond, not slasher)", () => {
    expect(aeonInstructionAccountNames("slash_bond")).toEqual([
      "slasher",
      "config",
      "authority",
      "bond",
      "bond_vault",
      "destination",
      "aeon_mint",
      "token_program",
    ]);
  });

  it("attributes BOND_SLASHED to the bonded authority, never the tracked slasher", () => {
    const events = decodeAeonTx(slashTx(), [slasherAgent, bondedAgent], AEON_PROGRAM_ID_DEVNET);
    expect(events).toHaveLength(1);
    expect(events[0]?.mint).toBe(BONDED_MINT);
    expect(events[0]?.type).toBe("BOND_SLASHED");
    expect(events.map((e) => e.mint)).not.toContain(SLASHER_MINT);
  });

  it("emits nothing when only the slasher wallet is tracked", () => {
    const events = decodeAeonTx(slashTx(), [slasherAgent], AEON_PROGRAM_ID_DEVNET);
    expect(events).toEqual([]);
  });

  it("records the slashed amount from the BondSlashed program event, not ix args", () => {
    const events = decodeAeonTx(slashTx(), [slasherAgent, bondedAgent], AEON_PROGRAM_ID_DEVNET);
    expect(events[0]?.amountToken).toBe(500_000);
    expect(events[0]?.raw.parsedData).toEqual({ authority_id: 7 });
  });

  it("ignores a fake BondSlashed emitted by another program first", () => {
    const events = decodeAeonTx(
      slashTx({
        logMessages: [
          `Program ${OTHER_PROGRAM} invoke [1]`,
          bondSlashedLog(9_000_000),
          `Program ${OTHER_PROGRAM} success`,
          ...aeonInvokeLogs([bondSlashedLog(500_000)]),
        ],
      }),
      [bondedAgent],
      AEON_PROGRAM_ID_DEVNET,
    );
    expect(events[0]?.amountToken).toBe(500_000);
  });

  it("does not use a tx-wide vault delta as scoring truth", () => {
    const events = decodeAeonTx(
      slashTx({
        logMessages: [],
        accountData: [
          {
            account: BOND_VAULT,
            tokenBalanceChanges: [
              {
                tokenAccount: BOND_VAULT,
                rawTokenAmount: { tokenAmount: "-250000", decimals: 6 },
              },
            ],
          },
        ],
      }),
      [bondedAgent],
      AEON_PROGRAM_ID_DEVNET,
    );
    expect(events).toHaveLength(1);
    expect(events[0]?.amountToken).toBe(0);
  });

  it("shared-vault two slashes with no events or inners score 0, not a combined delta", () => {
    const events = decodeAeonTx(
      {
        signature: SIG,
        slot: 11,
        timestamp: 1_700_000_100,
        logMessages: [],
        accountData: [
          {
            account: BOND_VAULT,
            tokenBalanceChanges: [
              {
                tokenAccount: BOND_VAULT,
                rawTokenAmount: { tokenAmount: "-750000", decimals: 6 },
              },
            ],
          },
        ],
        instructions: [
          {
            programId: AEON_PROGRAM_ID_DEVNET,
            data: encodeIx("slash_bond", u64le(7)),
            accounts: SLASH_ACCOUNTS,
          },
          {
            programId: AEON_PROGRAM_ID_DEVNET,
            data: encodeIx("slash_bond", u64le(7)),
            accounts: SLASH_ACCOUNTS,
          },
        ],
      },
      [bondedAgent],
      AEON_PROGRAM_ID_DEVNET,
    );
    expect(events.map((e) => e.amountToken)).toEqual([0, 0]);
  });

  it("emits no success-path AEON events when transactionError is present", () => {
    const events = decodeAeonTx(
      slashTx({ transactionError: "InstructionError" }),
      [slasherAgent, bondedAgent],
      AEON_PROGRAM_ID_DEVNET,
    );
    expect(events).toEqual([]);
  });

  it("still emits BOND_SLASHED when transactionError is null", () => {
    const events = decodeAeonTx(
      slashTx({ transactionError: null }),
      [slasherAgent, bondedAgent],
      AEON_PROGRAM_ID_DEVNET,
    );
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("BOND_SLASHED");
  });

  it("records the slashed amount from a parsed inner SPL transfer off the vault", () => {
    const events = decodeAeonTx(
      {
        signature: SIG,
        slot: 11,
        timestamp: 1_700_000_100,
        instructions: [
          {
            programId: AEON_PROGRAM_ID_DEVNET,
            data: encodeIx("slash_bond", u64le(7)),
            accounts: SLASH_ACCOUNTS,
            innerInstructions: [
              {
                programId: SPL_TOKEN_PROGRAM_ID,
                parsed: {
                  type: "transfer",
                  info: { source: BOND_VAULT, destination: DESTINATION, amount: "125000" },
                },
              },
            ],
          },
        ],
      },
      [bondedAgent],
      AEON_PROGRAM_ID_DEVNET,
    );
    expect(events[0]?.amountToken).toBe(125_000);
  });

  it("matches each batched slash_bond to its own BondSlashed amount, not the first log", () => {
    const bondedMint2 = "BondedMint22222222222222222222222222222222222";
    const authority2 = "AuthPda2222222222222222222222222222222222222";
    const bond2 = "BondPda22222222222222222222222222222222222222";
    const vault2 = "BondVault22222222222222222222222222222222222";
    const slashAccounts2 = [
      SLASHER_WALLET,
      CONFIG,
      authority2,
      bond2,
      vault2,
      DESTINATION,
      AEON_MINT,
      SPL_TOKEN_PROGRAM_ID,
    ];
    const secondAgent = {
      mint: bondedMint2,
      aeonCriAddress: null,
      executorWallet: BONDED_WALLET,
      aeonAuthorityAddress: authority2,
      aeonBondAddress: bond2,
    };
    const events = decodeAeonTx(
      {
        signature: SIG,
        slot: 11,
        timestamp: 1_700_000_100,
        logMessages: [
          ...aeonInvokeLogs([bondSlashedLog(500_000, 7)]),
          ...aeonInvokeLogs([bondSlashedLog(125_000, 9)]),
        ],
        instructions: [
          {
            programId: AEON_PROGRAM_ID_DEVNET,
            data: encodeIx("slash_bond", u64le(7)),
            accounts: SLASH_ACCOUNTS,
          },
          {
            programId: AEON_PROGRAM_ID_DEVNET,
            data: encodeIx("slash_bond", u64le(9)),
            accounts: slashAccounts2,
          },
        ],
      },
      [bondedAgent, secondAgent],
      AEON_PROGRAM_ID_DEVNET,
    );
    expect(events).toHaveLength(2);
    const byMint = Object.fromEntries(events.map((e) => [e.mint, e.amountToken]));
    expect(byMint[BONDED_MINT]).toBe(500_000);
    expect(byMint[bondedMint2]).toBe(125_000);
  });

  it("consumes BondSlashed logs in order when two slashes share an authority_id", () => {
    const events = decodeAeonTx(
      {
        signature: SIG,
        slot: 11,
        timestamp: 1_700_000_100,
        logMessages: [
          ...aeonInvokeLogs([bondSlashedLog(100_000, 7)]),
          ...aeonInvokeLogs([bondSlashedLog(200_000, 7)]),
        ],
        instructions: [
          {
            programId: AEON_PROGRAM_ID_DEVNET,
            data: encodeIx("slash_bond", u64le(7)),
            accounts: SLASH_ACCOUNTS,
          },
          {
            programId: AEON_PROGRAM_ID_DEVNET,
            data: encodeIx("slash_bond", u64le(7)),
            accounts: SLASH_ACCOUNTS,
          },
        ],
      },
      [bondedAgent],
      AEON_PROGRAM_ID_DEVNET,
    );
    expect(events.map((e) => e.amountToken)).toEqual([100_000, 200_000]);
  });
});
