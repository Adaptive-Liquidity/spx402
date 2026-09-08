import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import bs58 from "bs58";
import {
  AEON_IDL_ADDRESS,
  AEON_IDL_INSTRUCTION_COUNT,
  AEON_INSTRUCTION_BY_DISC,
  aeonInstructionDiscBytes,
  aeonInstructionName,
  decodeAeonArgs,
} from "../aeon-idl";
import { decodeAeonTx } from "../decode-aeon.server";
import { makeEventUid } from "../event-uid";
import { AEON_PROGRAM_ID_DEVNET } from "../../trust/config";
import type { HeliusEnhancedTx } from "../helius.server";

const CRI = "Cri11111111111111111111111111111111111111111111111";
const MINT = "Mint111111111111111111111111111111111111111111111";
const WALLET = "Wall1111111111111111111111111111111111111111111";
const SIG = "sigAeon111111111111111111111111111111111111111111111111111111111";

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

function txWithData(data: string, accounts: string[]): HeliusEnhancedTx {
  return {
    signature: SIG,
    slot: 9,
    timestamp: 1_700_000_000,
    instructions: [
      {
        programId: AEON_PROGRAM_ID_DEVNET,
        data,
        accounts,
      },
    ],
  };
}

describe("AEON IDL pin", () => {
  it("vendors the canonical 20-instruction IDL at the live devnet address", () => {
    expect(AEON_IDL_ADDRESS).toBe(AEON_PROGRAM_ID_DEVNET);
    expect(AEON_IDL_INSTRUCTION_COUNT).toBe(20);
    expect(AEON_INSTRUCTION_BY_DISC.size).toBe(20);
  });

  it("does not recognize the former placeholder discriminator table", () => {
    expect(aeonInstructionName("a8c2e9f4b1d3e7f0")).toBeNull();
    expect(aeonInstructionName("f1e2d3c4b5a69788")).toBeNull();
  });

  it("maps pay from the IDL discriminator, not a hardcoded guess", () => {
    const disc = aeonInstructionDiscBytes("pay");
    expect(disc).toBeTruthy();
    expect(aeonInstructionName(Buffer.from(disc!).toString("hex"))).toBe("pay");
  });
});

describe("IDL-derived AEON decode", () => {
  const lookup = [{ mint: MINT, aeonCriAddress: CRI, executorWallet: WALLET }];

  it("decodes pay amount from instruction args (not nativeTransfers)", () => {
    const data = encodeIx("pay", Buffer.concat([u64le(10_000_000), u64le(1), Buffer.alloc(16)]));
    const events = decodeAeonTx(txWithData(data, [WALLET, CRI]), lookup, AEON_PROGRAM_ID_DEVNET);
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("AEON_PAYMENT");
    expect(events[0]?.amountToken).toBe(10_000_000);
    expect(events[0]?.amountSol).toBe(0);
    expect(events[0]?.raw.instruction).toBe("pay");
    expect(events[0]?.eventUid).toBe(
      makeEventUid({
        signature: SIG,
        type: "AEON_PAYMENT",
        mint: MINT,
        ixIndex: 0,
        discHex: Buffer.from(aeonInstructionDiscBytes("pay")!).toString("hex"),
      }),
    );
  });

  it("does not conflate AEON pay with X402_PAYMENT_RECEIVED", () => {
    const data = encodeIx("pay", Buffer.concat([u64le(1), u64le(0), Buffer.alloc(16)]));
    const events = decodeAeonTx(txWithData(data, [CRI]), lookup, AEON_PROGRAM_ID_DEVNET);
    expect(events.map((e) => e.type)).toEqual(["AEON_PAYMENT"]);
  });

  it("decodes create_escrow as ESCROW_CREATED with the IDL amount", () => {
    const args = Buffer.concat([
      u64le(7),
      u64le(42),
      u64le(1),
      Buffer.alloc(16),
      Buffer.from([0]),
      Buffer.alloc(64),
      u64le(0),
    ]);
    const events = decodeAeonTx(
      txWithData(encodeIx("create_escrow", args), [CRI]),
      lookup,
      AEON_PROGRAM_ID_DEVNET,
    );
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("ESCROW_CREATED");
    expect(events[0]?.amountToken).toBe(42);
    expect(events[0]?.raw.parsedData).toMatchObject({ escrow_id: 7, amount: 42 });
  });

  it("emits AEON_AUTHORITY_ISSUED and BOND_DEPOSITED when bond_amount > 0", () => {
    const args = Buffer.concat([
      u64le(3),
      u64le(0),
      u64le(0),
      u64le(0),
      Buffer.alloc(4), // empty categories vec
      u64le(0),
      u64le(0),
      u64le(500),
    ]);
    const events = decodeAeonTx(
      txWithData(encodeIx("issue_authority", args), [WALLET]),
      lookup,
      AEON_PROGRAM_ID_DEVNET,
    );
    expect(events.map((e) => e.type)).toEqual(["AEON_AUTHORITY_ISSUED", "BOND_DEPOSITED"]);
    expect(events[1]?.amountToken).toBe(500);
    expect(events[0]?.eventUid).not.toBe(events[1]?.eventUid);
  });

  it("matches executor wallet when CRI is absent", () => {
    const data = encodeIx("register_agent", Buffer.alloc(0));
    const events = decodeAeonTx(
      txWithData(data, [WALLET]),
      [{ mint: MINT, aeonCriAddress: null, executorWallet: WALLET }],
      AEON_PROGRAM_ID_DEVNET,
    );
    expect(events.map((e) => e.type)).toEqual(["AEON_AGENT_REGISTERED"]);
  });

  it("skips unknown agents even when the instruction is real", () => {
    const data = encodeIx("slash_bond", u64le(1));
    const events = decodeAeonTx(
      txWithData(data, ["Unrelated11111111111111111111111111111111111"]),
      lookup,
      AEON_PROGRAM_ID_DEVNET,
    );
    expect(events).toEqual([]);
  });

  it("walks inner instructions", () => {
    const data = encodeIx("pay", Buffer.concat([u64le(9), u64le(0), Buffer.alloc(16)]));
    const tx: HeliusEnhancedTx = {
      signature: SIG,
      slot: 1,
      timestamp: 1_700_000_000,
      instructions: [
        {
          programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
          data: "00",
          accounts: [],
          innerInstructions: [
            {
              programId: AEON_PROGRAM_ID_DEVNET,
              data,
              accounts: [CRI],
            },
          ],
        },
      ],
    };
    const events = decodeAeonTx(tx, lookup, AEON_PROGRAM_ID_DEVNET);
    expect(events).toHaveLength(1);
    expect(events[0]?.raw.ixIndex).toBe(1);
  });
});

describe("decodeAeonArgs", () => {
  it("round-trips pay args from IDL types", () => {
    const disc = aeonInstructionDiscBytes("pay")!;
    const buf = Buffer.concat([Buffer.from(disc), u64le(99), u64le(2), Buffer.alloc(16, 7)]);
    expect(decodeAeonArgs("pay", buf)).toEqual({
      amount: 99,
      authority_id: 2,
      category: Buffer.alloc(16, 7).toString("hex"),
    });
  });
});

describe("makeEventUid", () => {
  it("lets deposit and AEON events from the same signature coexist", () => {
    const deposit = makeEventUid({ signature: SIG, type: "DEPOSIT_RECEIVED", mint: MINT });
    const pay = makeEventUid({
      signature: SIG,
      type: "AEON_PAYMENT",
      mint: MINT,
      ixIndex: 0,
      discHex: "7712d841c0757adc",
    });
    expect(deposit).not.toBe(pay);
  });
});

describe("vendored IDL file", () => {
  it("is parseable JSON with 20 instructions", () => {
    const raw = readFileSync(join(process.cwd(), "src/lib/indexer/idl/aeon.json"), "utf8");
    const idl = JSON.parse(raw) as { instructions: unknown[] };
    expect(idl.instructions).toHaveLength(20);
  });
});
