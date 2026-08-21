import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { canonicalJsonStringify, sha256Hex } from "@/lib/evidence/hash.server";
import {
  OC_EVIDENCE_SCHEMA,
  type OcAgentEventInsert,
  type OcEventType,
} from "@/lib/indexer/oc-evidence.server";
import {
  handleOcEvidenceIngest,
  type OcEvidenceRepository,
} from "@/routes/api.public.ingest-oc-evidence";

const SUBJECT = "11111111111111111111111111111111";
const OBSERVED_AT = new Date("2026-08-20T20:00:00.000Z");

async function envelope(
  type: OcEventType,
  overrides: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const payload = {
    schema: OC_EVIDENCE_SCHEMA,
    event_id: `oc_${await sha256Hex(
      canonicalJsonStringify({
        contract_id: "contract-42",
        type,
        idempotency_key: "attempt-1",
      }),
    )}`,
    category: "task_executor",
    subject: SUBJECT,
    handle: "growthops",
    contract_id: "contract-42",
    cluster_id: "cluster-7",
    cluster_slug: "outbound",
    type,
    occurred_at: "2026-08-20T19:00:00.000Z",
    ...(type === "OC_OPENED" || type === "OC_AWARDED"
      ? { deadline_at: "2026-08-21T19:00:00.000Z" }
      : {}),
    idempotency_key: "attempt-1",
    ...(type === "OC_FULFILLED" ? { capsule_id: "capsule-9" } : {}),
    severity:
      type === "OC_FULFILLED"
        ? "success"
        : type === "OC_FAILED" || type === "OC_SLASHED"
          ? "critical"
          : "info",
    ...overrides,
  };
  return {
    ...payload,
    evidence_hash: `sha256:${await sha256Hex(canonicalJsonStringify(payload))}`,
  };
}

function request(body: Record<string, unknown>): Request {
  return new Request("https://spx402.example/api/public/ingest-oc-evidence", {
    method: "POST",
    headers: {
      authorization: "Bearer test-secret",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

class MemoryOcRepository implements OcEvidenceRepository {
  private readonly rows = new Map<string, { id: string; row: OcAgentEventInsert }>();
  raceNextInsert = false;

  async findSubject(subject: string) {
    return {
      data:
        subject === SUBJECT
          ? {
              mint: SUBJECT,
              category: "task_executor",
              identifier_kind: "executor_wallet",
              executor_wallet: SUBJECT,
            }
          : null,
      error: false,
    };
  }

  async findExisting(signature: string) {
    const existing = this.rows.get(signature);
    return existing
      ? {
          id: existing.id,
          hash: String(existing.row.raw.source_evidence_hash),
          observedAt: existing.row.occurred_at,
          error: false,
        }
      : { id: null, hash: null, observedAt: null, error: false };
  }

  async findOpenedDeadlines(subject: string, contractId: string) {
    const deadlines = [...this.rows.values()].flatMap(({ row }) =>
      row.mint === subject &&
      row.type === "OC_OPENED" &&
      row.raw.contract_id === contractId &&
      typeof row.raw.deadline_at === "string"
        ? [row.raw.deadline_at]
        : [],
    );
    return { deadlines, error: false };
  }

  async insert(row: OcAgentEventInsert) {
    const id = `event-${this.rows.size + 1}`;
    if (this.raceNextInsert) {
      this.raceNextInsert = false;
      this.rows.set(row.signature, { id, row });
      return { id: null, errorCode: "23505", error: { code: "23505" } };
    }
    if (this.rows.has(row.signature)) {
      return { id: null, errorCode: "23505", error: { code: "23505" } };
    }
    this.rows.set(row.signature, { id, row });
    return { id, errorCode: null, error: null };
  }
}

beforeEach(() => {
  process.env.OC_INGEST_SECRET = "test-secret";
});

afterEach(() => {
  delete process.env.OC_INGEST_SECRET;
});

describe("Outcome Contract durable ingest behavior", () => {
  it("returns 200 for an exact replay", async () => {
    const repository = new MemoryOcRepository();
    const body = await envelope("OC_OPENED");
    expect(
      (await handleOcEvidenceIngest(request(body), repository, () => OBSERVED_AT)).status,
    ).toBe(201);

    const replay = await handleOcEvidenceIngest(request(body), repository, () => OBSERVED_AT);
    expect(replay.status).toBe(200);
    expect(await replay.json()).toMatchObject({ inserted: false, duplicate: true });
  });

  it("returns 409 when the same idempotency key carries a different hash", async () => {
    const repository = new MemoryOcRepository();
    const first = await envelope("OC_OPENED");
    expect(
      (await handleOcEvidenceIngest(request(first), repository, () => OBSERVED_AT)).status,
    ).toBe(201);

    const conflicting = await envelope("OC_OPENED", {
      occurred_at: "2026-08-20T19:00:01.000Z",
    });
    const response = await handleOcEvidenceIngest(
      request(conflicting),
      repository,
      () => OBSERVED_AT,
    );
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "idempotency_conflict" });
  });

  it("classifies a unique-violation race as a successful replay", async () => {
    const repository = new MemoryOcRepository();
    repository.raceNextInsert = true;
    const response = await handleOcEvidenceIngest(
      request(await envelope("OC_OPENED")),
      repository,
      () => OBSERVED_AT,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ inserted: false, duplicate: true });
  });

  it("rejects AWARDED when its deadline differs from stored OPENED evidence", async () => {
    const repository = new MemoryOcRepository();
    expect(
      (
        await handleOcEvidenceIngest(
          request(await envelope("OC_OPENED")),
          repository,
          () => OBSERVED_AT,
        )
      ).status,
    ).toBe(201);

    const response = await handleOcEvidenceIngest(
      request(
        await envelope("OC_AWARDED", {
          deadline_at: "2026-08-22T19:00:00.000Z",
        }),
      ),
      repository,
      () => OBSERVED_AT,
    );
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "deadline_mismatch" });
  });

  it("accepts AWARDED only when it echoes the stored OPENED deadline", async () => {
    const repository = new MemoryOcRepository();
    await handleOcEvidenceIngest(
      request(await envelope("OC_OPENED")),
      repository,
      () => OBSERVED_AT,
    );
    const response = await handleOcEvidenceIngest(
      request(await envelope("OC_AWARDED")),
      repository,
      () => OBSERVED_AT,
    );
    expect(response.status).toBe(201);
  });

  it("rejects a v1 envelope at the route boundary", async () => {
    const repository = new MemoryOcRepository();
    const body = await envelope("OC_OPENED", { schema: "flok.oc-evidence.v1" });
    const response = await handleOcEvidenceIngest(request(body), repository, () => OBSERVED_AT);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_evidence" });
  });
});
