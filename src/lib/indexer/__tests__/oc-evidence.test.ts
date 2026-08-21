import { afterEach, describe, expect, it } from "vitest";
import { canonicalJsonStringify, sha256Hex } from "@/lib/evidence/hash.server";
import { checkOcIngestAuth } from "@/lib/indexer/auth.server";
import { score } from "@/lib/indexer/scoring.server";
import {
  aggregateOutcomeContractCounters,
  isOcEventType,
  mapOcEvidenceToAgentEvent,
  OC_EVIDENCE_SCHEMA,
  OC_FULFILLMENT_SKEW_MS,
  OC_EVENT_TYPES,
  validateOcEvidenceEnvelope,
  type OcEventType,
} from "@/lib/indexer/oc-evidence.server";

const SUBJECT = "11111111111111111111111111111111";

async function envelope(type: OcEventType = "OC_FULFILLED") {
  const payload = {
    schema: OC_EVIDENCE_SCHEMA,
    event_id: `oc_${await sha256Hex(
      canonicalJsonStringify({
        contract_id: "contract-42",
        type,
        idempotency_key: "attempt-1",
      }),
    )}`,
    category: "task_executor" as const,
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
        ? ("success" as const)
        : type === "OC_FAILED" || type === "OC_SLASHED"
          ? ("critical" as const)
          : ("info" as const),
  };
  return {
    ...payload,
    evidence_hash: `sha256:${await sha256Hex(canonicalJsonStringify(payload))}`,
  };
}

async function resign(
  evidence: Awaited<ReturnType<typeof envelope>>,
  overrides: Record<string, unknown>,
) {
  const { evidence_hash: _hash, ...payload } = { ...evidence, ...overrides };
  return {
    ...payload,
    evidence_hash: `sha256:${await sha256Hex(canonicalJsonStringify(payload))}`,
  };
}

afterEach(() => {
  delete process.env.OC_INGEST_SECRET;
});

describe("Outcome Contract evidence ingestion", () => {
  it("pins the exact OC taxonomy without TASK_COMPLETED", () => {
    expect(OC_EVENT_TYPES).toEqual([
      "OC_OPENED",
      "OC_AWARDED",
      "OC_FULFILLED",
      "OC_FAILED",
      "OC_SLASHED",
    ]);
    expect(OC_EVENT_TYPES).not.toContain("TASK_COMPLETED");
    expect(isOcEventType("OC_FULFILLED")).toBe(true);
    expect(isOcEventType("OC_UNRECOGNIZED")).toBe(false);
  });

  it("validates the Flok envelope and rejects tampering", async () => {
    const valid = await envelope();
    await expect(validateOcEvidenceEnvelope(valid)).resolves.toEqual(valid);
    await expect(validateOcEvidenceEnvelope({ ...valid, severity: "info" })).rejects.toThrow();
    await expect(
      validateOcEvidenceEnvelope({ ...valid, capsule_id: "capsule-other" }),
    ).rejects.toThrow();
  });

  it("hard-cuts over to v2 and enforces deadline horizons", async () => {
    const opened = await envelope("OC_OPENED");
    await expect(validateOcEvidenceEnvelope(opened)).resolves.toEqual(opened);
    await expect(
      validateOcEvidenceEnvelope({ ...opened, schema: "flok.oc-evidence.v1" }),
    ).rejects.toThrow();
    await expect(
      validateOcEvidenceEnvelope({ ...opened, deadline_at: undefined }),
    ).rejects.toThrow();

    const maxDeadline = "2026-09-19T19:00:00.000Z";
    await expect(
      validateOcEvidenceEnvelope(await resign(opened, { deadline_at: maxDeadline })),
    ).resolves.toMatchObject({ deadline_at: maxDeadline });
    const tooLong = await resign(opened, { deadline_at: "2026-09-19T19:00:00.001Z" });
    await expect(validateOcEvidenceEnvelope(tooLong)).rejects.toThrow();

    const awarded = await envelope("OC_AWARDED");
    await expect(
      validateOcEvidenceEnvelope(await resign(awarded, { occurred_at: awarded.deadline_at })),
    ).rejects.toThrow();
  });

  it("rejects invalid taxonomy, identity, shape, and fulfillment evidence", async () => {
    const valid = await envelope();
    const { capsule_id: _capsule, ...withoutCapsule } = valid;
    await expect(validateOcEvidenceEnvelope(withoutCapsule)).rejects.toThrow();
    await expect(validateOcEvidenceEnvelope({ ...valid, unexpected: true })).rejects.toThrow();
    await expect(
      validateOcEvidenceEnvelope({ ...valid, type: "TASK_COMPLETED" }),
    ).rejects.toThrow();
    await expect(
      validateOcEvidenceEnvelope({
        ...valid,
        event_id: `oc_${"0".repeat(64)}`,
      }),
    ).rejects.toThrow();
  });

  it("uses the upstream observation time for scoring", async () => {
    const valid = await validateOcEvidenceEnvelope(await envelope());
    const observedAt = new Date("2026-08-21T03:04:05.000Z");
    const row = mapOcEvidenceToAgentEvent(valid, observedAt);
    expect(row.occurred_at).toBe(observedAt.toISOString());
    expect(row.occurred_at).not.toBe(valid.occurred_at);
    expect(row.chain).toBe("flok");
    expect(row.signature).toBe(`oc-${SUBJECT}-${valid.event_id}`);
    expect(row.raw.source_occurred_at).toBe(valid.occurred_at);
    expect(row.raw.observed_at).toBe(observedAt.toISOString());
    expect(row.parser_version).toBe("spx-oc-v0.2.0");
  });

  it("derives a non-null on-time rate from persisted v2 deadlines", () => {
    const deadline = "2026-08-21T19:00:00.000Z";
    const rows = [
      {
        type: "OC_OPENED",
        raw: {
          source_schema: OC_EVIDENCE_SCHEMA,
          contract_id: "contract-42",
          deadline_at: deadline,
        },
      },
      { type: "OC_AWARDED", raw: { contract_id: "contract-42", deadline_at: deadline } },
      {
        type: "OC_FULFILLED",
        raw: {
          source_schema: OC_EVIDENCE_SCHEMA,
          contract_id: "contract-42",
          capsule_id: "capsule-9",
          observed_at: new Date(Date.parse(deadline) + OC_FULFILLMENT_SKEW_MS).toISOString(),
        },
      },
      { type: "OC_FAILED", raw: {} },
      { type: "OC_SLASHED", raw: {} },
    ];
    expect(aggregateOutcomeContractCounters(rows)).toEqual({
      totalOutcomeOpened: 1,
      totalOutcomeAwarded: 1,
      totalOutcomeFulfilled: 1,
      totalOutcomeFailed: 1,
      totalOutcomeSlashed: 1,
      outcomeFulfillmentRate: 1,
      outcomeAwardDensity: 0.05,
      outcomeOnTimeRate: 1,
      hasPublicCapsule: true,
    });
  });

  it("returns null when fulfilled evidence lacks a unique v2 OPENED deadline", () => {
    expect(
      aggregateOutcomeContractCounters([
        {
          type: "OC_FULFILLED",
          raw: {
            source_schema: OC_EVIDENCE_SCHEMA,
            contract_id: "contract-42",
            observed_at: "2026-08-21T19:00:00.000Z",
          },
        },
      ]).outcomeOnTimeRate,
    ).toBeNull();
  });

  it("uses the persisted OPENED commitment carried onto an in-window fulfillment", () => {
    const deadline = "2026-08-21T19:00:00.000Z";
    expect(
      aggregateOutcomeContractCounters([
        {
          type: "OC_FULFILLED",
          raw: {
            source_schema: OC_EVIDENCE_SCHEMA,
            contract_id: "contract-42",
            deadline_at: deadline,
            observed_at: new Date(Date.parse(deadline) + OC_FULFILLMENT_SKEW_MS + 1).toISOString(),
          },
        },
      ]).outcomeOnTimeRate,
    ).toBe(0);
  });

  it("feeds complete v2 deadline evidence into a non-SPX404 score", () => {
    const deadline = "2026-08-21T19:00:00.000Z";
    const counters = aggregateOutcomeContractCounters([
      {
        type: "OC_OPENED",
        raw: {
          source_schema: OC_EVIDENCE_SCHEMA,
          contract_id: "contract-42",
          deadline_at: deadline,
        },
      },
      { type: "OC_AWARDED", raw: { contract_id: "contract-42", deadline_at: deadline } },
      {
        type: "OC_FULFILLED",
        raw: {
          source_schema: OC_EVIDENCE_SCHEMA,
          contract_id: "contract-42",
          capsule_id: "capsule-9",
          observed_at: deadline,
        },
      },
    ]);
    const result = score({
      totalDepositsCount: 0,
      totalBuybacksCount: 0,
      totalBurnsCount: 0,
      failedWindows: 0,
      buybackExecutionRate: 0,
      burnConfirmationRate: 0,
      lastIndexedSeconds: 0,
      operatorVerified: false,
      hasMetadata: false,
      category: "task_executor",
      ...counters,
      outcomeOnTimeRate: counters.outcomeOnTimeRate ?? undefined,
      outcomeEvidenceComplete: true,
    });
    expect(counters.outcomeOnTimeRate).toBe(1);
    expect(result.grade).not.toBe("SPX404");
  });

  it("fails closed when the dedicated ingest secret is absent or wrong", () => {
    const request = (token?: string) =>
      new Request("https://spx402.example/api/public/ingest-oc-evidence", {
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
    expect(checkOcIngestAuth(request("secret"))).toBe(false);
    process.env.OC_INGEST_SECRET = "secret";
    expect(checkOcIngestAuth(request())).toBe(false);
    expect(checkOcIngestAuth(request("wrong"))).toBe(false);
    expect(
      checkOcIngestAuth(
        new Request("https://spx402.example/api/public/ingest-oc-evidence", {
          headers: { authorization: "secret" },
        }),
      ),
    ).toBe(false);
    expect(checkOcIngestAuth(request("secret"))).toBe(true);
  });
});
