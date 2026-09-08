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
});
