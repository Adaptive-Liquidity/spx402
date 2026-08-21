import { z } from "zod";
import { canonicalJsonStringify, sha256Hex } from "@/lib/evidence/hash.server";

export const OC_EVENT_TYPES = [
  "OC_OPENED",
  "OC_AWARDED",
  "OC_FULFILLED",
  "OC_FAILED",
  "OC_SLASHED",
] as const;

export type OcEventType = (typeof OC_EVENT_TYPES)[number];
export type OcSeverity = "info" | "success" | "critical";

export function isOcEventType(value: string): value is OcEventType {
  return (OC_EVENT_TYPES as readonly string[]).includes(value);
}

const EVENT_SEVERITY: Record<OcEventType, OcSeverity> = {
  OC_OPENED: "info",
  OC_AWARDED: "info",
  OC_FULFILLED: "success",
  OC_FAILED: "critical",
  OC_SLASHED: "critical",
};

const identifier = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9._:-]+$/);

const ocEvidenceSchema = z
  .object({
    schema: z.literal("flok.oc-evidence.v1"),
    event_id: z.string().regex(/^oc_[a-f0-9]{64}$/),
    category: z.literal("task_executor"),
    subject: z
      .string()
      .trim()
      .regex(/^[1-9A-HJ-NP-Za-km-z]{32,64}$/),
    handle: z
      .string()
      .trim()
      .min(1)
      .max(40)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    contract_id: identifier,
    cluster_id: identifier,
    cluster_slug: z
      .string()
      .trim()
      .min(1)
      .max(40)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    type: z.enum(OC_EVENT_TYPES),
    occurred_at: z.string().datetime({ offset: true }),
    idempotency_key: identifier,
    capsule_id: identifier.optional(),
    severity: z.enum(["info", "success", "critical"]),
    evidence_hash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  })
  .strict()
  .refine((evidence) => evidence.type !== "OC_FULFILLED" || evidence.capsule_id !== undefined, {
    message: "OC_FULFILLED requires capsule_id",
    path: ["capsule_id"],
  });

export type OcEvidenceEnvelope = z.infer<typeof ocEvidenceSchema>;

export async function validateOcEvidenceEnvelope(input: unknown): Promise<OcEvidenceEnvelope> {
  const evidence = ocEvidenceSchema.parse(input);
  if (evidence.severity !== EVENT_SEVERITY[evidence.type]) {
    throw new Error("invalid_oc_severity");
  }

  const expectedEventId = `oc_${await sha256Hex(
    canonicalJsonStringify({
      contract_id: evidence.contract_id,
      type: evidence.type,
      idempotency_key: evidence.idempotency_key,
    }),
  )}`;
  if (evidence.event_id !== expectedEventId) {
    throw new Error("invalid_oc_event_id");
  }

  const { evidence_hash: _providedHash, ...hashPayload } = evidence;
  const expectedHash = `sha256:${await sha256Hex(canonicalJsonStringify(hashPayload))}`;
  if (evidence.evidence_hash !== expectedHash) {
    throw new Error("invalid_oc_evidence_hash");
  }
  return evidence;
}

export interface OcAgentEventInsert {
  mint: string;
  chain: "flok";
  type: OcEventType;
  severity: OcSeverity;
  signature: string;
  occurred_at: string;
  parser_version: string;
  raw: Record<string, unknown>;
}

export function mapOcEvidenceToAgentEvent(
  evidence: OcEvidenceEnvelope,
  observedAt: Date,
): OcAgentEventInsert {
  if (!Number.isFinite(observedAt.getTime())) {
    throw new Error("invalid_observed_at");
  }
  const observedAtIso = observedAt.toISOString();
  return {
    mint: evidence.subject,
    chain: "flok",
    type: evidence.type,
    severity: evidence.severity,
    // agent_events.signature is globally unique, while Flok event_id is
    // scoped only by contract/type/idempotency key. Include the bound subject
    // so two executors cannot suppress each other's evidence.
    signature: `oc-${evidence.subject}-${evidence.event_id}`,
    // Scoring windows and recency use this server-owned timestamp. The
    // producer timestamp remains in raw.source_occurred_at for audit.
    occurred_at: observedAtIso,
    parser_version: "spx-oc-v0.1.0",
    raw: {
      source_schema: evidence.schema,
      evidence_source: "flok",
      source_event_id: evidence.event_id,
      source_evidence_hash: evidence.evidence_hash,
      source_occurred_at: evidence.occurred_at,
      observed_at: observedAtIso,
      contract_id: evidence.contract_id,
      cluster_id: evidence.cluster_id,
      cluster_slug: evidence.cluster_slug,
      handle: evidence.handle,
      idempotency_key: evidence.idempotency_key,
      ...(evidence.capsule_id ? { capsule_id: evidence.capsule_id } : {}),
    },
  };
}

export interface OutcomeContractEventRow {
  type: string;
  raw: unknown;
}

export interface OutcomeContractCounters {
  totalOutcomeOpened: number;
  totalOutcomeAwarded: number;
  totalOutcomeFulfilled: number;
  totalOutcomeFailed: number;
  totalOutcomeSlashed: number;
  outcomeFulfillmentRate: number;
  outcomeAwardDensity: number;
  outcomeOnTimeRate: number | null;
  hasPublicCapsule: boolean;
}

export function aggregateOutcomeContractCounters(
  rows: OutcomeContractEventRow[],
): OutcomeContractCounters {
  const count = (type: OcEventType) => rows.filter((row) => row.type === type).length;
  const totalOutcomeOpened = count("OC_OPENED");
  const totalOutcomeAwarded = count("OC_AWARDED");
  const totalOutcomeFulfilled = count("OC_FULFILLED");
  const totalOutcomeFailed = count("OC_FAILED");
  const totalOutcomeSlashed = count("OC_SLASHED");

  return {
    totalOutcomeOpened,
    totalOutcomeAwarded,
    totalOutcomeFulfilled,
    totalOutcomeFailed,
    totalOutcomeSlashed,
    outcomeFulfillmentRate:
      totalOutcomeAwarded === 0 ? 0 : Math.min(1, totalOutcomeFulfilled / totalOutcomeAwarded),
    outcomeAwardDensity: Math.min(1, totalOutcomeAwarded / 20),
    // The v1 Flok envelope does not carry a server-verifiable deadline.
    // Keep this signal absent instead of inferring punctuality.
    outcomeOnTimeRate: null,
    hasPublicCapsule: rows.some(
      (row) =>
        row.type === "OC_FULFILLED" &&
        isRecord(row.raw) &&
        typeof row.raw.capsule_id === "string" &&
        row.raw.capsule_id.length > 0,
    ),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
