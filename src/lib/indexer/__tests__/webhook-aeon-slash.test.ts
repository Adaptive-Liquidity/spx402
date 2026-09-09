import { describe, expect, it } from "vitest";
import bs58 from "bs58";
import {
  AEON_IDL_ADDRESS,
  aeonEventDiscBytes,
  aeonInstructionDiscBytes,
  namedIssueAuthorityAccounts,
} from "../aeon-idl";
import {
  decodeAeonWebhookBatch,
  fetchAeonOwnershipEvents,
  resolveAeonOwnershipQuery,
  selectAeonMintsTouchedByPayload,
  shouldDecodeAeonBackfill,
  type AeonOwnershipEventRow,
} from "../aeon-lookup.server";
import { AEON_PROGRAM_ID_DEVNET } from "../../trust/config";
import { SPL_TOKEN_PROGRAM_ID, type HeliusEnhancedTx } from "../helius.server";
import { shouldRetryUnresolvedSlash } from "../aeon-pda.server";

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
const CRI = "CriPda111111111111111111111111111111111111111";
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

/** Full IDL-length list: absent parent_authority is the program ID sentinel, not omitted. */
const SENTINEL_ISSUE_ACCOUNTS = [
  BONDED_WALLET,
  CONFIG,
  IDENTITY,
  AEON_IDL_ADDRESS,
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
  {
    mint: SLASHER_MINT,
    category: "aeon_executor",
    aeon_cri_address: null,
    executor_wallet: SLASHER_WALLET,
    aeon_agent_identity: null,
    aeon_authority_addresses: [] as string[],
    aeon_bond_addresses: [] as string[],
  },
  {
    mint: BONDED_MINT,
    category: "aeon_executor",
    aeon_cri_address: CRI,
    executor_wallet: BONDED_WALLET,
    aeon_agent_identity: IDENTITY,
    aeon_authority_addresses: [] as string[],
    aeon_bond_addresses: [] as string[],
  },
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

function aeonInvokeLogs(inner: string[]): string[] {
  return [
    `Program ${AEON_PROGRAM_ID_DEVNET} invoke [1]`,
    `Program ${SPL_TOKEN_PROGRAM_ID} invoke [2]`,
    `Program ${SPL_TOKEN_PROGRAM_ID} success`,
    ...inner,
    `Program ${AEON_PROGRAM_ID_DEVNET} success`,
  ];
}

function slashTx(): HeliusEnhancedTx {
  return {
    signature: SLASH_SIG,
    slot: 22,
    timestamp: 1_700_000_200,
    logMessages: aeonInvokeLogs([bondSlashedLog(500_000)]),
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

  it("does not shift authority/bond when an optional parent_authority is a program-ID sentinel", () => {
    const named = namedIssueAuthorityAccounts(SENTINEL_ISSUE_ACCOUNTS, {
      parent_id: 0,
      bond_amount: 500,
    });
    expect(named.parent_authority).toBeUndefined();
    expect(named.authority).toBe(AUTHORITY_PDA);
    expect(named.bond).toBe(BOND_PDA);
    expect(named.agent).toBe(BONDED_WALLET);
    expect(named.authority).not.toBe(AEON_IDL_ADDRESS);
    expect(named.bond).not.toBe(AUTHORITY_PDA);
  });

  it("attributes BOND_SLASHED from persisted sentinel-form issue_authority accounts", () => {
    const events = decodeAeonWebhookBatch(
      [slashTx()],
      agentRows,
      [
        {
          mint: BONDED_MINT,
          type: "AEON_AUTHORITY_ISSUED",
          raw: {
            instruction: "issue_authority",
            accounts: SENTINEL_ISSUE_ACCOUNTS,
            parsedData: { parent_id: 0, bond_amount: 500 },
          },
        },
      ],
      AEON_PROGRAM_ID_DEVNET,
    );
    const slashed = events.filter((e) => e.type === "BOND_SLASHED");
    expect(slashed).toHaveLength(1);
    expect(slashed[0]?.mint).toBe(BONDED_MINT);
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

  it("attributes same-batch issue+slash for a CRI-primary row via agent_identity", () => {
    const criOnly = [
      {
        mint: CRI,
        category: "aeon_executor",
        aeon_cri_address: CRI,
        executor_wallet: null,
        aeon_agent_identity: IDENTITY,
        aeon_authority_addresses: [] as string[],
        aeon_bond_addresses: [] as string[],
      },
    ];
    const events = decodeAeonWebhookBatch(
      [issueTx(), slashTx()],
      criOnly,
      [],
      AEON_PROGRAM_ID_DEVNET,
    );
    const slashed = events.filter((e) => e.type === "BOND_SLASHED");
    expect(slashed).toHaveLength(1);
    expect(slashed[0]?.mint).toBe(CRI);
    expect(
      shouldRetryUnresolvedSlash([issueTx(), slashTx()], events, criOnly, AEON_PROGRAM_ID_DEVNET),
    ).toBe(false);
  });

  it("ignores x402 executor_wallet rows in AEON lookup", () => {
    const x402Only = [
      {
        mint: BONDED_MINT,
        category: "x402_executor",
        aeon_cri_address: null,
        executor_wallet: BONDED_WALLET,
        aeon_agent_identity: IDENTITY,
        aeon_authority_addresses: [AUTHORITY_PDA],
        aeon_bond_addresses: [BOND_PDA],
      },
    ];
    const events = decodeAeonWebhookBatch([slashTx()], x402Only, [], AEON_PROGRAM_ID_DEVNET);
    expect(events).toEqual([]);
    expect(shouldRetryUnresolvedSlash([slashTx()], events, x402Only, AEON_PROGRAM_ID_DEVNET)).toBe(
      false,
    );
  });

  it("retries unmatched slash only while an aeon_executor still has empty PDA arrays", () => {
    const pending = decodeAeonWebhookBatch([slashTx()], agentRows, [], AEON_PROGRAM_ID_DEVNET);
    expect(
      shouldRetryUnresolvedSlash([slashTx()], pending, agentRows, AEON_PROGRAM_ID_DEVNET),
    ).toBe(true);

    const knownPdas = agentRows.map((row) =>
      row.mint === BONDED_MINT
        ? {
            ...row,
            aeon_authority_addresses: [AUTHORITY_PDA],
            aeon_bond_addresses: [BOND_PDA],
          }
        : {
            ...row,
            aeon_authority_addresses: ["OtherAuth111111111111111111111111111111111"],
            aeon_bond_addresses: ["OtherBond111111111111111111111111111111111"],
          },
    );
    const unmatched = decodeAeonWebhookBatch(
      [slashTx()],
      [
        knownPdas[0],
        {
          ...knownPdas[1],
          aeon_authority_addresses: ["OtherAuth111111111111111111111111111111111"],
          aeon_bond_addresses: ["OtherBond111111111111111111111111111111111"],
        },
      ],
      [],
      AEON_PROGRAM_ID_DEVNET,
    );
    expect(unmatched.filter((e) => e.type === "BOND_SLASHED")).toEqual([]);
    expect(
      shouldRetryUnresolvedSlash(
        [slashTx()],
        unmatched,
        [
          knownPdas[0],
          {
            ...knownPdas[1],
            aeon_authority_addresses: ["OtherAuth111111111111111111111111111111111"],
            aeon_bond_addresses: ["OtherBond111111111111111111111111111111111"],
          },
        ],
        AEON_PROGRAM_ID_DEVNET,
      ),
    ).toBe(false);
  });

  it("matches slash_bond from persisted PDA arrays on the agent row", () => {
    const withPdas = [
      agentRows[0],
      {
        ...agentRows[1],
        aeon_authority_addresses: [AUTHORITY_PDA],
        aeon_bond_addresses: [BOND_PDA],
      },
    ];
    const events = decodeAeonWebhookBatch([slashTx()], withPdas, [], AEON_PROGRAM_ID_DEVNET);
    expect(events.filter((e) => e.type === "BOND_SLASHED")).toHaveLength(1);
    expect(events[0]?.mint).toBe(BONDED_MINT);
  });

  it("emits no success-path slash when the slash transaction reverted", () => {
    const failed = { ...slashTx(), transactionError: "InstructionError" };
    const events = decodeAeonWebhookBatch(
      [failed],
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
    expect(events.filter((e) => e.type === "BOND_SLASHED")).toEqual([]);
  });

  it("treats a successful empty ownership query as fail-closed, not an error", () => {
    const rows = [
      {
        mint: BONDED_MINT,
        type: "AEON_AUTHORITY_ISSUED",
        raw: { instruction: "issue_authority" },
      },
    ];
    expect(resolveAeonOwnershipQuery(null, null)).toEqual({ ok: true, rows: [] });
    expect(resolveAeonOwnershipQuery([], undefined)).toEqual({ ok: true, rows: [] });
    expect(resolveAeonOwnershipQuery(rows, null)).toEqual({ ok: true, rows });
  });

  it("treats a Supabase ownership query error as retryable, not empty", () => {
    const staleRows = [{ mint: BONDED_MINT, type: "AEON_AUTHORITY_ISSUED", raw: {} }];
    expect(resolveAeonOwnershipQuery(staleRows, { message: "connection refused" })).toEqual({
      ok: false,
    });
    expect(resolveAeonOwnershipQuery(null, { code: "PGRST301" })).toEqual({ ok: false });
  });
});

describe("fetchAeonOwnershipEvents", () => {
  const row = (i: number, extra: Partial<AeonOwnershipEventRow> = {}): AeonOwnershipEventRow => ({
    id: String(i).padStart(4, "0"),
    mint: BONDED_MINT,
    type: "AEON_AUTHORITY_ISSUED",
    raw: { i },
    ...extra,
  });

  const keysetPaged = (
    all: AeonOwnershipEventRow[],
    pageSize: number,
    opts: { errorOnPage?: number; count?: number | null } = {},
  ) => {
    let pageIndex = 0;
    return async (afterId: string | null) => {
      if (opts.errorOnPage !== undefined && pageIndex >= opts.errorOnPage) {
        return { data: null, error: { message: "connection reset" }, count: null };
      }
      pageIndex++;
      const remaining = afterId == null ? all : all.filter((r) => (r.id ?? "") > afterId);
      return {
        data: remaining.slice(0, pageSize),
        error: null,
        count: opts.count === undefined ? all.length : opts.count,
      };
    };
  };

  it("accumulates multiple pages until a short page", async () => {
    const all = [row(1), row(2), row(3), row(4), row(5)];
    let calls = 0;
    const res = await fetchAeonOwnershipEvents(async (afterId) => {
      calls++;
      return keysetPaged(all, 2)(afterId);
    }, 2);
    expect(res).toEqual({ ok: true, rows: all });
    expect(calls).toBe(3);
  });

  it("fails closed when any page errors", async () => {
    const all = [row(1), row(2), row(3)];
    const res = await fetchAeonOwnershipEvents(keysetPaged(all, 2, { errorOnPage: 1 }), 2);
    expect(res).toEqual({ ok: false });
  });

  it("fails closed when the exact count exceeds the accumulated rows (silent truncation)", async () => {
    // PostgREST db-max-rows cap: 1000 rows exist, one truncated page returned.
    const res = await fetchAeonOwnershipEvents(
      keysetPaged([row(1), row(2)], 1000, { count: 1000 }),
      1000,
    );
    expect(res).toEqual({ ok: false });
  });

  it("treats a successful empty first page as complete", async () => {
    const res = await fetchAeonOwnershipEvents(keysetPaged([], 1000), 1000);
    expect(res).toEqual({ ok: true, rows: [] });
  });

  it("fails closed when the page cap is exhausted without a short page", async () => {
    const res = await fetchAeonOwnershipEvents(
      async () => ({ data: [row(1), row(2)], error: null, count: null }),
      2,
      3,
    );
    expect(res).toEqual({ ok: false });
  });

  it("fails closed when a full page is missing the id cursor", async () => {
    const res = await fetchAeonOwnershipEvents(
      async () => ({
        data: [
          { mint: BONDED_MINT, type: "AEON_AUTHORITY_ISSUED", raw: { i: 1 } },
          { mint: BONDED_MINT, type: "AEON_AUTHORITY_ISSUED", raw: { i: 2 } },
        ],
        error: null,
        count: null,
      }),
      2,
      3,
    );
    expect(res).toEqual({ ok: false });
  });

  it("does not skip or duplicate rows when inserts land behind and ahead of the cursor", async () => {
    const store = [row(1), row(3), row(5), row(7)];
    const snapshotCount = store.length;
    let pages = 0;
    const res = await fetchAeonOwnershipEvents(async (afterId) => {
      pages++;
      const remaining = afterId == null ? [...store] : store.filter((r) => (r.id ?? "") > afterId);
      const data = remaining.slice(0, 2);
      if (pages === 1) {
        store.splice(1, 0, row(2));
        const aheadAt = store.findIndex((r) => r.id === "0005") + 1;
        store.splice(aheadAt, 0, row(6));
      }
      return { data, error: null, count: snapshotCount };
    }, 2);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const ids = res.rows.map((r) => r.id);
    expect(ids).toEqual(["0001", "0003", "0005", "0006", "0007"]);
    expect(ids.filter((id) => id === "0003")).toHaveLength(1);
    expect(ids).not.toContain("0002");
    expect(pages).toBe(3);
  });

  it("feeds page-2 ownership rows into slash attribution", async () => {
    const pdaRow = row(2, {
      raw: {
        instruction: "issue_authority",
        accounts: ISSUE_ACCOUNTS,
        parsedData: { parent_id: 0, bond_amount: 500 },
      },
    });
    const res = await fetchAeonOwnershipEvents(keysetPaged([row(1), pdaRow], 1), 1);
    if (!res.ok) throw new Error("lookup should succeed");
    const events = decodeAeonWebhookBatch([slashTx()], agentRows, res.rows, AEON_PROGRAM_ID_DEVNET);
    const slashed = events.filter((e) => e.type === "BOND_SLASHED");
    expect(slashed).toHaveLength(1);
    expect(slashed[0]?.mint).toBe(BONDED_MINT);
  });
});

describe("payload-touched AEON mint picking", () => {
  const unrelated = {
    mint: "UnrelatedMint1111111111111111111111111111111",
    category: "aeon_executor",
    aeon_cri_address: "UnrelatedCri111111111111111111111111111111",
    executor_wallet: "UnrelatedWall11111111111111111111111111111",
    aeon_agent_identity: null,
    aeon_authority_addresses: [] as string[],
    aeon_bond_addresses: [] as string[],
  };

  it("excludes unrelated AEON rows whose keys are absent from flattened accounts", () => {
    const mints = selectAeonMintsTouchedByPayload([slashTx()], [...agentRows, unrelated]);
    expect(mints).toContain(SLASHER_MINT);
    expect(mints).not.toContain(unrelated.mint);
    expect(mints).not.toContain(BONDED_MINT);
  });

  it("includes an AEON subject when a known PDA appears in flattened accounts", () => {
    const withPdas = [
      {
        ...agentRows[1],
        aeon_authority_addresses: [AUTHORITY_PDA],
        aeon_bond_addresses: [BOND_PDA],
      },
    ];
    const mints = selectAeonMintsTouchedByPayload([slashTx()], withPdas);
    expect(mints).toEqual([BONDED_MINT]);
  });

  it("treats an empty touched set as skip, not an ownership lookup failure", () => {
    const idle: HeliusEnhancedTx = {
      signature: "sigIdle11111111111111111111111111111111111111111111111111111",
      slot: 1,
      timestamp: 1_700_000_000,
      instructions: [{ programId: SYSTEM, accounts: [SYSTEM] }],
    };
    const touched = selectAeonMintsTouchedByPayload([idle], agentRows);
    expect(touched).toEqual([]);
    expect(
      shouldDecodeAeonBackfill({
        aeonEnabled: true,
        touchedMints: touched,
        ownershipOk: false,
      }),
    ).toBe(false);
    expect(
      shouldDecodeAeonBackfill({
        aeonEnabled: true,
        touchedMints: [],
        ownershipOk: true,
      }),
    ).toBe(false);
  });

  it("decodes AEON on backfill only when the address is an AEON subject and ownership loaded", () => {
    expect(
      shouldDecodeAeonBackfill({
        aeonEnabled: true,
        touchedMints: [BONDED_MINT],
        ownershipOk: true,
      }),
    ).toBe(true);
    expect(
      shouldDecodeAeonBackfill({
        aeonEnabled: true,
        touchedMints: [BONDED_MINT],
        ownershipOk: false,
      }),
    ).toBe(false);
  });
});
