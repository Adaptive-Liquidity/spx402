import { afterEach, describe, expect, it } from "vitest";
import { canonicalJsonStringify, sha256Hex } from "@/lib/evidence/hash.server";
import { checkOcIngestAuth } from "@/lib/indexer/auth.server";
import {
  aggregateOutcomeContractCounters,
  isOcEventType,
  mapOcEvidenceToAgentEvent,
  OC_EVENT_TYPES,
  validateOcEvidenceEnvelope,
  type OcEventType,
} from "@/lib/indexer/oc-evidence.server";

const SUBJECT = "11111111111111111111111111111111";

async function envelope(type: OcEventType = "OC_FULFILLED") {
  const payload = {
    schema: "flok.oc-evidence.v1" as const,
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
  });

  it("derives OC counters without inventing an on-time signal", () => {
    const rows = [
      { type: "OC_OPENED", raw: {} },
      { type: "OC_AWARDED", raw: {} },
      { type: "OC_FULFILLED", raw: { capsule_id: "capsule-9" } },
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
      outcomeOnTimeRate: null,
      hasPublicCapsule: true,
    });
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
