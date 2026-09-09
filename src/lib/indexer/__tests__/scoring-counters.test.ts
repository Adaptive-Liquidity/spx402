import { describe, expect, it } from "vitest";
import { aggregateCounters, CountersQueryError } from "../scoring-counters.server";

interface Res {
  data: unknown;
  error: { message: string } | null;
  count: number | null;
}

interface AeonRow {
  id: string;
  type: string;
  amount_token: number | null;
}

const AEON_PAGE_SIZE = 1000;

const ok = (data: unknown, count: number | null = null): Res => ({ data, error: null, count });

function thenable(res: Res) {
  const proxy: unknown = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === "then") return (resolve: (v: Res) => void) => resolve(res);
        return () => proxy;
      },
    },
  );
  return proxy;
}

/** Minimal thenable supabase-js stub: each from() call dequeues one result. */
function fakeClient(results: Res[]) {
  let i = 0;
  return {
    from: () => {
      const res = results[Math.min(i++, results.length - 1)];
      return thenable(res);
    },
  };
}

/**
 * First three from() calls are the 30-day / latest / first queries.
 * Later from() calls are AEON keyset pages (id > cursor, limit 1000).
 */
function aeonKeysetClient(opts: {
  window?: Res;
  latest?: Res;
  first?: Res;
  aeonRows: AeonRow[];
  aeonErrorAtPage?: number;
  onFirstAeonPage?: (rows: AeonRow[]) => void;
}) {
  let fromCount = 0;
  let aeonPage = 0;
  return {
    from: () => {
      const n = fromCount++;
      if (n === 0) return thenable(opts.window ?? ok([], 0));
      if (n === 1) return thenable(opts.latest ?? ok(null));
      if (n === 2) return thenable(opts.first ?? ok(null));
      const page = aeonPage++;
      const chain = { afterId: null as string | null };
      const proxy: unknown = new Proxy(
        {},
        {
          get(_t, prop) {
            if (prop === "then") {
              return (resolve: (v: Res) => void) => {
                if (opts.aeonErrorAtPage !== undefined && page === opts.aeonErrorAtPage) {
                  resolve({ data: null, error: { message: "connection reset" }, count: null });
                  return;
                }
                let rows = opts.aeonRows;
                if (chain.afterId) rows = rows.filter((r) => r.id > chain.afterId!);
                const batch = rows.slice(0, AEON_PAGE_SIZE);
                if (page === 0) opts.onFirstAeonPage?.(opts.aeonRows);
                resolve(ok(batch));
              };
            }
            if (prop === "gt") {
              return (_col: string, val: string) => {
                chain.afterId = val;
                return proxy;
              };
            }
            return () => proxy;
          },
        },
      );
      return proxy;
    },
  };
}

function aeonRow(i: number, amount = 1_000_000): AeonRow {
  return { id: String(i).padStart(4, "0"), type: "BOND_DEPOSITED", amount_token: amount };
}

interface WindowRow {
  id: string;
  type: string;
  severity: string;
  amount_sol: number;
  amount_token: number;
  occurred_at: string;
  raw: Record<string, unknown>;
}

function windowRow(i: number, type = "DEPOSIT_RECEIVED", amountSol = 1): WindowRow {
  return {
    id: String(i).padStart(4, "0"),
    type,
    severity: "info",
    amount_sol: amountSol,
    amount_token: 0,
    occurred_at: new Date().toISOString(),
    raw: {},
  };
}

/**
 * Sequential stub: all 30-day window pages first, then latest / first / AEON.
 * Matches aggregateCounters fetching the window to completion before the rest.
 */
function windowKeysetClient(opts: {
  windowRows: WindowRow[];
  latest?: Res;
  first?: Res;
  aeonRows?: AeonRow[];
  windowCount?: number | null;
}) {
  let windowDone = false;
  let restCount = 0;
  let aeonPage = 0;
  return {
    from: () => {
      if (!windowDone) {
        const chain = { afterId: null as string | null };
        const proxy: unknown = new Proxy(
          {},
          {
            get(_t, prop) {
              if (prop === "then") {
                return (resolve: (v: Res) => void) => {
                  let rows = opts.windowRows;
                  if (chain.afterId) rows = rows.filter((r) => r.id > chain.afterId!);
                  const batch = rows.slice(0, AEON_PAGE_SIZE);
                  if (batch.length < AEON_PAGE_SIZE) windowDone = true;
                  const count =
                    opts.windowCount === undefined ? opts.windowRows.length : opts.windowCount;
                  resolve(ok(batch, count));
                };
              }
              if (prop === "gt") {
                return (_col: string, val: string) => {
                  chain.afterId = val;
                  return proxy;
                };
              }
              return () => proxy;
            },
          },
        );
        return proxy;
      }
      const n = restCount++;
      if (n === 0) return thenable(opts.latest ?? ok(null));
      if (n === 1) return thenable(opts.first ?? ok(null));
      const page = aeonPage++;
      const chain = { afterId: null as string | null };
      const aeonRows = opts.aeonRows ?? [];
      const proxy: unknown = new Proxy(
        {},
        {
          get(_t, prop) {
            if (prop === "then") {
              return (resolve: (v: Res) => void) => {
                let rows = aeonRows;
                if (chain.afterId) rows = rows.filter((r) => r.id > chain.afterId!);
                resolve(ok(rows.slice(0, AEON_PAGE_SIZE)));
              };
            }
            if (prop === "gt") {
              return (_col: string, val: string) => {
                chain.afterId = val;
                return proxy;
              };
            }
            return () => proxy;
          },
        },
      );
      void page;
      return proxy;
    },
  };
}

describe("aggregateCounters fail-closed behavior", () => {
  it("throws CountersQueryError when the AEON lifetime query errors", async () => {
    const client = fakeClient([
      ok([], 0),
      ok(null),
      ok(null),
      { data: null, error: { message: "connection reset" }, count: null },
    ]);
    await expect(aggregateCounters(client as never, "mint1")).rejects.toBeInstanceOf(
      CountersQueryError,
    );
  });

  it("throws when the 30-day window query errors", async () => {
    const client = fakeClient([
      { data: null, error: { message: "statement timeout" }, count: null },
      ok(null),
      ok(null),
      ok([], 0),
    ]);
    await expect(aggregateCounters(client as never, "mint1")).rejects.toBeInstanceOf(
      CountersQueryError,
    );
  });

  it("throws when the 30-day window exact count exceeds returned rows (silent truncation)", async () => {
    const client = fakeClient([
      // PostgREST db-max-rows cap: count says 2, only 1 row came back.
      ok(
        [
          {
            type: "DEPOSIT_RECEIVED",
            severity: "info",
            amount_sol: 1,
            amount_token: 0,
            occurred_at: new Date().toISOString(),
            raw: {},
          },
        ],
        2,
      ),
      ok(null),
      ok(null),
      ok([], 0),
    ]);
    await expect(aggregateCounters(client as never, "mint1")).rejects.toThrow(
      /30-day event window truncated/,
    );
  });

  it("aggregates counters across multiple AEON keyset pages", async () => {
    const aeonRows = Array.from({ length: AEON_PAGE_SIZE + 2 }, (_, i) => aeonRow(i, 1_000_000));
    const client = aeonKeysetClient({ aeonRows });
    const c = await aggregateCounters(client as never, "mint1");
    expect(c.activeBondAmount).toBe(AEON_PAGE_SIZE + 2);
  });

  it("includes AEON rows inserted ahead of the cursor once and never shifts already-seen ids", async () => {
    const aeonRows = Array.from({ length: AEON_PAGE_SIZE + 3 }, (_, i) => aeonRow(i, 1_000_000));
    const behind = { id: "0000a", type: "BOND_SLASHED", amount_token: 1_000_000 };
    const ahead = {
      id: `${String(AEON_PAGE_SIZE - 1).padStart(4, "0")}a`,
      type: "BOND_SLASHED",
      amount_token: 1_000_000,
    };
    const client = aeonKeysetClient({
      aeonRows,
      onFirstAeonPage: (rows) => {
        rows.splice(1, 0, behind);
        rows.push(ahead);
      },
    });
    const c = await aggregateCounters(client as never, "mint1");
    // Original deposits stay; behind-cursor slash is excluded; ahead-cursor slash is included once.
    expect(c.activeBondAmount).toBe(AEON_PAGE_SIZE + 3 - 1);
    expect(c.totalSlashedUsd).toBe(1);
  });

  it("throws when AEON pagination exceeds the page cap without a short page", async () => {
    const fullPage = Array.from({ length: AEON_PAGE_SIZE }, (_, i) => aeonRow(i));
    const client = fakeClient([ok([], 0), ok(null), ok(null), ok(fullPage)]);
    await expect(aggregateCounters(client as never, "mint1")).rejects.toThrow(/page cap/);
  });

  it("throws when a full AEON page is missing the id cursor", async () => {
    const fullPage = Array.from({ length: AEON_PAGE_SIZE }, () => ({
      type: "BOND_DEPOSITED",
      amount_token: 1_000_000,
    }));
    const client = fakeClient([ok([], 0), ok(null), ok(null), ok(fullPage)]);
    await expect(aggregateCounters(client as never, "mint1")).rejects.toThrow(/id cursor/);
  });

  it("aggregates counters unchanged when all queries succeed", async () => {
    const now = new Date().toISOString();
    const client = fakeClient([
      ok(
        [
          {
            type: "DEPOSIT_RECEIVED",
            severity: "info",
            amount_sol: 2,
            amount_token: 0,
            occurred_at: now,
            raw: {},
          },
          {
            type: "BUYBACK_EXECUTED",
            severity: "info",
            amount_sol: 1,
            amount_token: 0,
            occurred_at: now,
            raw: {},
          },
        ],
        2,
      ),
      ok({ occurred_at: now }),
      ok({ occurred_at: new Date(Date.now() - 3_600_000).toISOString() }),
      ok(
        [
          { type: "BOND_DEPOSITED", amount_token: 5_000_000 },
          { type: "BOND_SLASHED", amount_token: 1_000_000 },
        ],
        2,
      ),
    ]);
    const c = await aggregateCounters(client as never, "mint1");
    expect(c.totalDepositsCount).toBe(1);
    expect(c.totalBuybacksCount).toBe(1);
    expect(c.buybackExecutionRate).toBe(1);
    expect(c.activeBondAmount).toBe(4);
    expect(c.totalSlashedUsd).toBe(1);
    expect(c.observationWindowSeconds).toBeGreaterThanOrEqual(3_599);
  });

  it("aggregates counters across multiple 30-day window keyset pages", async () => {
    const windowRows = [
      ...Array.from({ length: AEON_PAGE_SIZE }, (_, i) => windowRow(i, "DEPOSIT_RECEIVED", 1)),
      windowRow(AEON_PAGE_SIZE, "DEPOSIT_RECEIVED", 1),
      windowRow(AEON_PAGE_SIZE + 1, "BUYBACK_EXECUTED", 1),
    ];
    const client = windowKeysetClient({ windowRows });
    const c = await aggregateCounters(client as never, "mint1");
    expect(c.totalDepositsCount).toBe(AEON_PAGE_SIZE + 1);
    expect(c.totalBuybacksCount).toBe(1);
    expect(c.buybackExecutionRate).toBeCloseTo(1 / (AEON_PAGE_SIZE + 1));
  });

  it("throws when 30-day window pagination exceeds the page cap without a short page", async () => {
    const fullPage = Array.from({ length: AEON_PAGE_SIZE }, (_, i) =>
      windowRow(i, "DEPOSIT_RECEIVED", 1),
    );
    const client = fakeClient([ok(fullPage, AEON_PAGE_SIZE)]);
    await expect(aggregateCounters(client as never, "mint1")).rejects.toThrow(/page cap/);
  });

  it("throws when a full 30-day window page is missing the id cursor", async () => {
    const fullPage = Array.from({ length: AEON_PAGE_SIZE }, () => ({
      type: "DEPOSIT_RECEIVED",
      severity: "info",
      amount_sol: 1,
      amount_token: 0,
      occurred_at: new Date().toISOString(),
      raw: {},
    }));
    const client = fakeClient([ok(fullPage, AEON_PAGE_SIZE)]);
    await expect(aggregateCounters(client as never, "mint1")).rejects.toThrow(/id cursor/);
  });

  it("keeps lifetime AEON on grade counters and 30-day AEON on confidence inputs", async () => {
    const now = new Date().toISOString();
    const client = fakeClient([
      ok(
        [
          {
            id: "w1",
            type: "DEPOSIT_RECEIVED",
            severity: "info",
            amount_sol: 1,
            amount_token: 0,
            occurred_at: now,
            raw: {},
          },
          {
            id: "w2",
            type: "ESCROW_RELEASED",
            severity: "info",
            amount_sol: 0,
            amount_token: 0,
            occurred_at: now,
            raw: {},
          },
        ],
        2,
      ),
      ok({ occurred_at: now }),
      ok({ occurred_at: now }),
      ok(
        [
          { type: "BOND_DEPOSITED", amount_token: 5_000_000 },
          { type: "ESCROW_RELEASED", amount_token: 0 },
          { type: "ESCROW_RELEASED", amount_token: 0 },
          { type: "ESCROW_RELEASED", amount_token: 0 },
        ],
        4,
      ),
    ]);
    const c = await aggregateCounters(client as never, "mint1");
    expect(c.totalEscrowsCompleted).toBe(3);
    expect(c.activeBondAmount).toBe(5);
    expect(c.windowAeon.totalEscrowsCompleted).toBe(1);
    expect(c.windowAeon.totalReceipts).toBe(0);
    expect(c.distinctEventTypes).toBe(2);
  });
});
