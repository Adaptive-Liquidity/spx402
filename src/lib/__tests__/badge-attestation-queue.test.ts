import { describe, expect, it } from "vitest";
import {
  activationGradeLabel,
  enqueueActivationRetry,
  processDueActivationRetries,
  retryDelayMs,
  type ActivationQueueStore,
  type PendingActivationRow,
} from "@/lib/badge-attestation-queue";

function memoryStore(seed: PendingActivationRow[] = []): ActivationQueueStore & {
  rows: Map<string, PendingActivationRow>;
} {
  const rows = new Map(seed.map((r) => [r.mint, { ...r }]));
  return {
    rows,
    async read(mint) {
      return rows.get(mint) ?? null;
    },
    async upsert(row) {
      rows.set(row.mint, { ...row });
    },
    async due(nowIso, limit) {
      return [...rows.values()]
        .filter((r) => r.next_retry_at <= nowIso)
        .sort((a, b) => (a.next_retry_at < b.next_retry_at ? -1 : 1))
        .slice(0, limit);
    },
    async remove(mint) {
      rows.delete(mint);
    },
  };
}

const MINT = "Mint11111111111111111111111111111111111111111111111";

describe("retryDelayMs", () => {
  it("starts at 5 minutes and doubles with a 24h cap", () => {
    expect(retryDelayMs(0)).toBe(5 * 60 * 1000);
    expect(retryDelayMs(1)).toBe(10 * 60 * 1000);
    expect(retryDelayMs(100)).toBe(24 * 60 * 60 * 1000);
  });

  it("treats negative attempts as first retry", () => {
    expect(retryDelayMs(-3)).toBe(5 * 60 * 1000);
  });
});

describe("activationGradeLabel", () => {
  it("stamps WITHHELD for withheld agents, never a stale grade", () => {
    expect(
      activationGradeLabel({ grade: "SPX AA", withheldReason: "aeon_pipeline_disabled" }),
    ).toBe("WITHHELD");
  });

  it("passes real grades through, SPX404 fallback only when genuinely ungraded", () => {
    expect(activationGradeLabel({ grade: "SPX A", withheldReason: null })).toBe("SPX A");
  });
});

describe("enqueueActivationRetry", () => {
  it("creates a pending row due immediately on first failure", async () => {
    const store = memoryStore();
    await enqueueActivationRetry(store, MINT, "boom", 1_000_000);
    const row = await store.read(MINT);
    expect(row).not.toBeNull();
    expect(row!.attempts).toBe(1);
    expect(row!.last_error).toBe("boom");
    expect(new Date(row!.next_retry_at).getTime()).toBe(1_000_000 + 10 * 60 * 1000);
  });

  it("increments attempts and backs off on repeat failures", async () => {
    const store = memoryStore();
    await enqueueActivationRetry(store, MINT, "e1", 0);
    await enqueueActivationRetry(store, MINT, "e2", 0);
    const row = await store.read(MINT);
    expect(row!.attempts).toBe(2);
    expect(row!.last_error).toBe("e2");
  });
});

describe("processDueActivationRetries", () => {
  const dueRow: PendingActivationRow = {
    mint: MINT,
    kind: "badge_activated",
    attempts: 1,
    next_retry_at: new Date(0).toISOString(),
    last_error: "boom",
  };

  it("mints, deletes the row, and stamps the fresh grade", async () => {
    const store = memoryStore([dueRow]);
    const seen: Array<{ mint: string; grade: string; score: number }> = [];
    const res = await processDueActivationRetries({
      store,
      readAgent: async () => ({ grade: "SPX AA", score: 82, withheldReason: null }),
      attest: async (mint, grade, score) => {
        seen.push({ mint, grade, score });
        return { ok: true };
      },
    });
    expect(res).toEqual({ processed: 1, minted: 1, rescheduled: 0 });
    expect(seen).toEqual([{ mint: MINT, grade: "SPX AA", score: 82 }]);
    expect(await store.read(MINT)).toBeNull();
  });

  it("stamps WITHHELD (not a stale grade) for withheld agents and clears the row", async () => {
    const store = memoryStore([dueRow]);
    const seen: Array<{ mint: string; grade: string; score: number }> = [];
    const res = await processDueActivationRetries({
      store,
      readAgent: async () => ({
        grade: "SPX AA",
        score: 82,
        withheldReason: "aeon_pipeline_disabled",
      }),
      attest: async (mint, grade, score) => {
        seen.push({ mint, grade, score });
        return { ok: true };
      },
    });
    expect(res.minted).toBe(1);
    expect(seen[0].grade).toBe("WITHHELD");
    expect(await store.read(MINT)).toBeNull();
  });

  it("reschedules with backoff when attestation fails and keeps the row", async () => {
    const store = memoryStore([dueRow]);
    const res = await processDueActivationRetries({
      store,
      readAgent: async () => ({ grade: "SPX A", score: 71, withheldReason: null }),
      attest: async () => ({ ok: false, error: "chain hiccup" }),
    });
    expect(res).toEqual({ processed: 1, minted: 0, rescheduled: 1 });
    const row = await store.read(MINT);
    expect(row!.attempts).toBe(2);
    expect(row!.last_error).toBe("chain hiccup");
  });

  it("drops rows whose agent no longer exists", async () => {
    const store = memoryStore([dueRow]);
    const res = await processDueActivationRetries({
      store,
      readAgent: async () => null,
      attest: async () => ({ ok: true }),
    });
    expect(res).toEqual({ processed: 1, minted: 0, rescheduled: 0 });
    expect(await store.read(MINT)).toBeNull();
  });

  it("ignores rows not yet due", async () => {
    const store = memoryStore([
      { ...dueRow, next_retry_at: new Date(Date.now() + 3600_000).toISOString() },
    ]);
    let called = false;
    const res = await processDueActivationRetries({
      store,
      readAgent: async () => {
        called = true;
        return null;
      },
      attest: async () => {
        called = true;
        return { ok: true };
      },
    });
    expect(res).toEqual({ processed: 0, minted: 0, rescheduled: 0 });
    expect(called).toBe(false);
  });
});
