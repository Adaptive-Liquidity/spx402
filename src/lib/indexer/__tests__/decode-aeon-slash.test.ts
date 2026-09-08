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

function bondSlashedLog(amount: number): string {
  const disc = aeonEventDiscBytes("BondSlashed");
  if (!disc) throw new Error("missing BondSlashed event");
  const payload = Buffer.concat([Buffer.from(disc), u64le(7), u64le(amount), Buffer.alloc(32, 2)]);
  return `Program data: ${payload.toString("base64")}`;
}

function slashTx(overrides: Partial<HeliusEnhancedTx> = {}): HeliusEnhancedTx {
  return {
    signature: SIG,
    slot: 11,
    timestamp: 1_700_000_100,
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
  aeonCriAddress: null,
  executorWallet: BONDED_WALLET,
  aeonAuthorityAddress: AUTHORITY_PDA,
  aeonBondAddress: BOND_PDA,
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
    const events = decodeAeonTx(
      slashTx({
        logMessages: [bondSlashedLog(500_000)],
      }),
      [slasherAgent, bondedAgent],
      AEON_PROGRAM_ID_DEVNET,
    );
    expect(events).toHaveLength(1);
    expect(events[0]?.mint).toBe(BONDED_MINT);
    expect(events[0]?.type).toBe("BOND_SLASHED");
    expect(events.map((e) => e.mint)).not.toContain(SLASHER_MINT);
  });

  it("emits nothing when only the slasher wallet is tracked", () => {
    const events = decodeAeonTx(
      slashTx({ logMessages: [bondSlashedLog(500_000)] }),
      [slasherAgent],
      AEON_PROGRAM_ID_DEVNET,
    );
    expect(events).toEqual([]);
  });

  it("records the slashed amount from the BondSlashed program event, not ix args", () => {
    const events = decodeAeonTx(
      slashTx({ logMessages: [bondSlashedLog(500_000)] }),
      [slasherAgent, bondedAgent],
      AEON_PROGRAM_ID_DEVNET,
    );
    expect(events[0]?.amountToken).toBe(500_000);
    expect(events[0]?.raw.parsedData).toEqual({ authority_id: 7 });
  });

  it("records the slashed amount from the bond vault raw token delta", () => {
    const events = decodeAeonTx(
      slashTx({
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
    expect(events[0]?.amountToken).toBe(250_000);
  });

  it("emits no success-path AEON events when transactionError is present", () => {
    const events = decodeAeonTx(
      slashTx({
        logMessages: [bondSlashedLog(500_000)],
        transactionError: "InstructionError",
      }),
      [slasherAgent, bondedAgent],
      AEON_PROGRAM_ID_DEVNET,
    );
    expect(events).toEqual([]);
  });

  it("still emits BOND_SLASHED when transactionError is null", () => {
    const events = decodeAeonTx(
      slashTx({
        logMessages: [bondSlashedLog(500_000)],
        transactionError: null,
      }),
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
});
