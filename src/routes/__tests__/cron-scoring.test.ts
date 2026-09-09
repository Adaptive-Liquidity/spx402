// Fail-closed scoring: a counter-query error must skip the agent without
// persisting zeroed counters, flipping a grade, or attesting.

import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  queue: [] as Array<{ data: unknown; error: unknown; count?: number | null }>,
  calls: [] as Array<{ table: string; method: string; args: unknown[] }>,
}));

vi.mock("@/lib/indexer/auth.server", () => ({ checkCronAuth: async () => true }));

vi.mock("@/lib/trust/config", () => ({
  resolveAeonProgramId: () => ({ enabled: false, reason: "not_configured" }),
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      const res = h.queue.shift() ?? { data: null, error: null, count: null };
      const proxy: unknown = new Proxy(
        {},
        {
          get(_t, prop) {
            if (prop === "then") return (resolve: (v: unknown) => void) => resolve(res);
            return (...args: unknown[]) => {
              h.calls.push({ table, method: String(prop), args });
              return proxy;
            };
          },
        },
      );
      return proxy;
    },
  },
}));

import { Route } from "../api.public.cron-scoring";

const AGENT = {
  mint: "M1",
  operator_verified: false,
  grade: null,
  name: null,
  tagline: null,
  category: "tokenized_buyback",
  identifier_kind: null,
  executor_wallet: null,
  core_asset: null,
  aeon_cri_address: null,
  total_slashed_usd: null,
  active_bond_amount: null,
  escrow_success_rate: null,
  total_escrows_completed: null,
  total_escrows_failed: null,
};

function post() {
  const handler = (
    Route.options as unknown as {
      server: { handlers: { POST: (arg: { request: Request }) => Promise<Response> } };
    }
  ).server.handlers.POST;
  return handler({
    request: new Request("https://test.local/api/public/cron-scoring", { method: "POST" }),
  });
}

const ok = (data: unknown, count: number | null = null) => ({ data, error: null, count });

beforeEach(() => {
  h.queue.length = 0;
  h.calls.length = 0;
});

const AEON_AGENT = { ...AGENT, category: "aeon_executor", grade: "SPX401" };

describe("cron-scoring fail-closed skip", () => {
  it("withholds an aeon_executor before counter aggregation when the pipeline is disabled", async () => {
    h.queue.push(
      ok([AEON_AGENT]), // agents list
      ok([]), // badge_subscriptions
      ok(null), // withheld agents update — must run before any counter query
      ok(null), // heartbeat insert
    );
    const res = await post();
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      scored: number;
      skipped: number;
      withheld: number;
      attested: number;
    };
    expect(body.scored).toBe(0);
    expect(body.skipped).toBe(0);
    expect(body.withheld).toBe(1);
    expect(body.attested).toBe(0);
    expect(h.calls.some((c) => c.table === "agent_events")).toBe(false);
    const withheldUpdate = h.calls.find((c) => c.table === "agents" && c.method === "update");
    expect(JSON.stringify(withheldUpdate?.args)).toContain("aeon_pipeline_disabled");
    expect(JSON.stringify(withheldUpdate?.args)).toContain('"grade":null');
  });

  it("skips the agent without any agents update when the AEON counter query errors", async () => {
    h.queue.push(
      ok([AGENT]), // agents list
      ok([]), // badge_subscriptions
      ok([], 0), // 30-day window
      ok(null), // latest
      ok(null), // first
      { data: null, error: { message: "connection reset" } }, // AEON lifetime query fails
      ok(null), // heartbeat insert
    );
    const res = await post();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { scored: number; skipped: number; attested: number };
    expect(body.scored).toBe(0);
    expect(body.skipped).toBe(1);
    expect(body.attested).toBe(0);
    // No write to agents at all — the previous grade stays untouched.
    expect(h.calls.some((c) => c.table === "agents" && c.method === "update")).toBe(false);
    const heartbeat = h.calls.find((c) => c.table === "indexer_runs" && c.method === "insert");
    expect(JSON.stringify(heartbeat?.args)).toContain("skipped=1");
  });

  it("scores and persists when every counter query succeeds", async () => {
    h.queue.push(
      ok([AGENT]),
      ok([]),
      ok([], 0),
      ok(null),
      ok(null),
      ok([], 0),
      ok(null), // agents update
      ok(null), // heartbeat insert
    );
    const res = await post();
    const body = (await res.json()) as { scored: number; skipped: number };
    expect(body.scored).toBe(1);
    expect(body.skipped).toBe(0);
    expect(h.calls.some((c) => c.table === "agents" && c.method === "update")).toBe(true);
  });
});
