import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { decodeAeonTx } from "../decode-aeon.server";
import { AEON_PROGRAM_ID_DEVNET } from "../../trust/config";
import type { HeliusEnhancedTx, HeliusInstruction } from "../helius.server";

const FIXTURE = join(process.cwd(), "src/lib/indexer/__tests__/fixtures/aeon-devnet-pay.json");

const PAYER_CRI = "8QaxxWzTSp4ensq71fYr8SbhaLYDuhzTsGNLEcCW87t8";
const PAYER = "4bpiP5ddQhEbYxtJJL1qTecvMzzqw38NafoqfUF6R6CY";
const DOCUMENTED_PAY_SIG =
  "5y6UGJMUyN4bFVLxriWMiP9gPJVZs8qM6XcbZ5tLa47s38wP9kyxvc2jnEwc6eApj5GZWkhmqNY53BFFuLMue7Sz";

interface RpcCompiledIx {
  accounts: number[];
  data: string;
  programIdIndex: number;
}

interface RpcTx {
  blockTime?: number | null;
  slot?: number;
  meta?: {
    innerInstructions?: Array<{ index: number; instructions: RpcCompiledIx[] }>;
  };
  transaction?: {
    message?: {
      accountKeys: string[];
      instructions: RpcCompiledIx[];
    };
    signatures?: string[];
  };
}

function rpcToHelius(rpc: RpcTx): HeliusEnhancedTx {
  const keys = rpc.transaction?.message?.accountKeys ?? [];
  const inners = rpc.meta?.innerInstructions ?? [];
  const compiled = rpc.transaction?.message?.instructions ?? [];
  const instructions: HeliusInstruction[] = compiled.map((ix, i) => ({
    programId: keys[ix.programIdIndex],
    data: ix.data,
    accounts: ix.accounts.map((a) => keys[a]),
    innerInstructions: inners
      .filter((inner) => inner.index === i)
      .flatMap((inner) =>
        inner.instructions.map(
          (innerIx): HeliusInstruction => ({
            programId: keys[innerIx.programIdIndex],
            data: innerIx.data,
            accounts: innerIx.accounts.map((a) => keys[a]),
          }),
        ),
      ),
  }));
  return {
    signature: rpc.transaction?.signatures?.[0],
    slot: rpc.slot,
    timestamp: rpc.blockTime ?? undefined,
    instructions,
  };
}

describe("AEON golden replay — documented devnet pay", () => {
  it("decodes the live v0.2 pay smoke as AEON_PAYMENT with the transferred amount", () => {
    const fixture = JSON.parse(readFileSync(FIXTURE, "utf8")) as {
      signature: string;
      rpc: RpcTx;
    };
    expect(fixture.signature).toBe(DOCUMENTED_PAY_SIG);
    const tx = rpcToHelius(fixture.rpc);
    expect(tx.signature).toBe(DOCUMENTED_PAY_SIG);

    const events = decodeAeonTx(
      tx,
      [{ mint: PAYER, aeonCriAddress: PAYER_CRI, executorWallet: PAYER }],
      AEON_PROGRAM_ID_DEVNET,
    );

    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("AEON_PAYMENT");
    expect(events[0]?.amountToken).toBe(10_000_000);
    expect(events[0]?.raw.instruction).toBe("pay");
    expect(events[0]?.eventUid).toContain(DOCUMENTED_PAY_SIG);
    expect(events[0]?.eventUid).toContain("AEON_PAYMENT");
  });
});
