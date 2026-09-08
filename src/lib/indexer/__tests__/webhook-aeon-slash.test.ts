import { describe, expect, it } from "vitest";
import bs58 from "bs58";
import {
  aeonEventDiscBytes,
  aeonInstructionDiscBytes,
  namedIssueAuthorityAccounts,
} from "../aeon-idl";
import { decodeAeonWebhookBatch } from "../aeon-lookup.server";
import { AEON_PROGRAM_ID_DEVNET } from "../../trust/config";
import { SPL_TOKEN_PROGRAM_ID, type HeliusEnhancedTx } from "../helius.server";

const SLASH_SIG = "sigSlashWh11111111111111111111111111111111111111111111111111111";
const ISSUE_SIG = "sigIssueWh11111111111111111111111111111111111111111111111111111";
const SLASHER_MINT = "SlasherMint11111111111111111111111111111111111";
const SLASHER_WALLET = "SlasherWall1111111111111111111111111111111111";
const BONDED_MINT = "BondedMint11111111111111111111111111111111111";
const BONDED_WALLET = "BondedWall11111111111111111111111111111111111";
const AUTHORITY_PDA = "AuthPda1111111111111111111111111111111111111";
const BOND_PDA = "BondPda11111111111111111111111111111111111111";
const BOND_VAULT = "BondVault11111111111111111111111111111111111";
const DESTINATION = "Dest11111111111111111111111111111111111111111";
const CONFIG = "Config111111111111111111111111111111111111111";
const IDENTITY = "Identity111111111111111111111111111111111111";
const AGENT_VAULT = "AgentVault1111111111111111111111111111111111";
const AEON_MINT = "AeonMint1111111111111111111111111111111111111";
const ATA = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
const SYSTEM = "11111111111111111111111111111111";

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

const ISSUE_ACCOUNTS = [
  BONDED_WALLET,
  CONFIG,
  IDENTITY,
  AUTHORITY_PDA,
  BOND_PDA,
  AGENT_VAULT,
  BOND_VAULT,
  AEON_MINT,
  SPL_TOKEN_PROGRAM_ID,
  ATA,
  SYSTEM,
];

const agentRows = [
  { mint: SLASHER_MINT, aeon_cri_address: null, executor_wallet: SLASHER_WALLET },
  { mint: BONDED_MINT, aeon_cri_address: null, executor_wallet: BONDED_WALLET },
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

function issueAuthorityArgs(bondAmount: number): Buffer {
  return Buffer.concat([
    u64le(7),
    u64le(0),
    u64le(0),
    u64le(0),
    Buffer.alloc(4),
    u64le(0),
    u64le(0),
    u64le(bondAmount),
  ]);
}

function bondSlashedLog(amount: number): string {
  const disc = aeonEventDiscBytes("BondSlashed");
  if (!disc) throw new Error("missing BondSlashed event");
  const payload = Buffer.concat([Buffer.from(disc), u64le(7), u64le(amount), Buffer.alloc(32, 2)]);
  return `Program data: ${payload.toString("base64")}`;
}

function slashTx(): HeliusEnhancedTx {
  return {
    signature: SLASH_SIG,
    slot: 22,
    timestamp: 1_700_000_200,
    logMessages: [bondSlashedLog(500_000)],
    instructions: [
      {
        programId: AEON_PROGRAM_ID_DEVNET,
        data: encodeIx("slash_bond", u64le(7)),
        accounts: SLASH_ACCOUNTS,
      },
    ],
  };
}

function issueTx(): HeliusEnhancedTx {
  return {
    signature: ISSUE_SIG,
    slot: 21,
    timestamp: 1_700_000_100,
    instructions: [
      {
        programId: AEON_PROGRAM_ID_DEVNET,
        data: encodeIx("issue_authority", issueAuthorityArgs(500)),
        accounts: ISSUE_ACCOUNTS,
      },
    ],
  };
}

describe("webhook AEON lookup for slash_bond", () => {
  it("maps issue_authority accounts with parent_id=0 skipped from the IDL", () => {
    const named = namedIssueAuthorityAccounts(ISSUE_ACCOUNTS, {
      parent_id: 0,
      bond_amount: 500,
    });
    expect(named.authority).toBe(AUTHORITY_PDA);
    expect(named.bond).toBe(BOND_PDA);
    expect(named.agent).toBe(BONDED_WALLET);
  });

  it("attributes BOND_SLASHED to the bonded agent from persisted issue_authority PDAs", () => {
    const events = decodeAeonWebhookBatch(
      [slashTx()],
      agentRows,
      [
        {
          mint: BONDED_MINT,
          type: "AEON_AUTHORITY_ISSUED",
          raw: {
            instruction: "issue_authority",
            accounts: ISSUE_ACCOUNTS,
            parsedData: { parent_id: 0, bond_amount: 500 },
          },
        },
      ],
      AEON_PROGRAM_ID_DEVNET,
    );
    expect(events).toHaveLength(1);
    expect(events[0]?.mint).toBe(BONDED_MINT);
    expect(events[0]?.type).toBe("BOND_SLASHED");
    expect(events[0]?.amountToken).toBe(500_000);
    expect(events.map((e) => e.mint)).not.toContain(SLASHER_MINT);
  });

  it("enriches lookup from issue_authority in the same webhook batch", () => {
    const events = decodeAeonWebhookBatch(
      [issueTx(), slashTx()],
      agentRows,
      [],
      AEON_PROGRAM_ID_DEVNET,
    );
    const slashed = events.filter((e) => e.type === "BOND_SLASHED");
    expect(slashed).toHaveLength(1);
    expect(slashed[0]?.mint).toBe(BONDED_MINT);
    expect(slashed[0]?.amountToken).toBe(500_000);
    expect(slashed.map((e) => e.mint)).not.toContain(SLASHER_MINT);
  });

  it("fails closed when ownership PDAs are unknown", () => {
    const events = decodeAeonWebhookBatch([slashTx()], agentRows, [], AEON_PROGRAM_ID_DEVNET);
    expect(events.filter((e) => e.type === "BOND_SLASHED")).toEqual([]);
    expect(events.map((e) => e.mint)).not.toContain(SLASHER_MINT);
  });
});
