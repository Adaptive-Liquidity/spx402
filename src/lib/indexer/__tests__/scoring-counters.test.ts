import { describe, expect, it } from "vitest";
import { aggregateCounters, CountersQueryError } from "../scoring-counters.server";

interface Res {
  data: unknown;
  error: { message: string } | null;
  count: number | null;
}

const ok = (data: unknown, count: number | null = null): Res => ({ data, error: null, count });

/** Minimal thenable supabase-js stub: each from() call dequeues one result. */
function fakeClient(results: Res[]) {
  let i = 0;
  return {
    from: () => {
      const res = results[Math.min(i++, results.length - 1)];
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

  it("throws when the AEON exact count exceeds returned rows (silent truncation)", async () => {
    const client = fakeClient([
      ok([], 0),
      ok(null),
      ok(null),
      // PostgREST db-max-rows cap: count says 2, only 1 row came back.
      ok([{ type: "BOND_DEPOSITED", amount_token: 5_000_000 }], 2),
    ]);
    await expect(aggregateCounters(client as never, "mint1")).rejects.toThrow(/truncated/);
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
