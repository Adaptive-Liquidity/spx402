import { describe, expect, it } from "vitest";
import { decodeAeonTx, touchesAeon } from "../decode-aeon.server";
import { AEON_PROGRAM_ID_DEVNET } from "../../trust/config";
import type { HeliusEnhancedTx } from "../helius.server";

const CRI = "Cri1111111111111111111111111111111111111111111111111";
const MINT = "Mint11111111111111111111111111111111111111111111111";
const OTHER_PROGRAM = "Other11111111111111111111111111111111111111111111";

function txWithProgram(programId: string): HeliusEnhancedTx {
  return {
    signature: "sig11111111111111111111111111111111111111111111111111111111111111",
    slot: 1,
    timestamp: 1700000000,
    instructions: [{ programId, data: "00".repeat(32), accounts: [CRI] }],
  } as HeliusEnhancedTx;
}

const LOOKUP = [{ mint: MINT, aeonCriAddress: CRI }];

// NOTE: positive decode assertions live in decode-aeon-idl.test.ts and
// decode-aeon-golden.test.ts (IDL discs + documented devnet replay).
// These tests cover only program-ID routing.
describe("decodeAeonTx program-ID guard", () => {
  it("emits nothing for instructions under any non-configured program ID", () => {
    expect(decodeAeonTx(txWithProgram(OTHER_PROGRAM), LOOKUP, AEON_PROGRAM_ID_DEVNET)).toEqual([]);
  });

  it("emits nothing when the transaction touches no program at all", () => {
    const tx = txWithProgram(OTHER_PROGRAM);
    tx.instructions = [];
    expect(decodeAeonTx(tx, LOOKUP, AEON_PROGRAM_ID_DEVNET)).toEqual([]);
  });

  it("touchesAeon respects the passed program ID", () => {
    expect(touchesAeon(txWithProgram(AEON_PROGRAM_ID_DEVNET), AEON_PROGRAM_ID_DEVNET)).toBe(true);
    expect(touchesAeon(txWithProgram(OTHER_PROGRAM), AEON_PROGRAM_ID_DEVNET)).toBe(false);
  });
});
