import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { BodyTooLargeError, readBodyWithLimit } from "@/lib/http/read-body.server";
import { checkOcIngestAuth } from "@/lib/indexer/auth.server";
import {
  mapOcEvidenceToAgentEvent,
  validateOcEvidenceEnvelope,
  type OcAgentEventInsert,
  type OcEvidenceEnvelope,
} from "@/lib/indexer/oc-evidence.server";

// Auth: Authorization: Bearer <OC_INGEST_SECRET>
// This route is intentionally live before task_executor.decoderLive: it
// collects the evidence required to verify the decoder before the gate flips.
const MAX_BODY_BYTES = 64 * 1024;

export const Route = createFileRoute("/api/public/ingest-oc-evidence")({
  server: {
    handlers: {
      POST: async ({ request }) => handleOcEvidenceIngest(request),
    },
  },
});

interface ExistingOcEvent {
  id: string | null;
  hash: string | null;
  observedAt: string | null;
  error: boolean;
}

interface OcSubject {
  mint: string;
  category: string | null;
  identifier_kind: string | null;
  executor_wallet: string | null;
}

export interface OcEvidenceRepository {
  findSubject(subject: string): Promise<{ data: OcSubject | null; error: boolean }>;
  findExisting(signature: string): Promise<ExistingOcEvent>;
  findOpenedDeadlines(
    subject: string,
    contractId: string,
  ): Promise<{
    deadlines: string[];
    error: boolean;
  }>;
  insert(row: OcAgentEventInsert): Promise<{
    id: string | null;
    errorCode: string | null;
    error: unknown;
  }>;
}

/** Process one authenticated OC evidence request against the durable repository. */
export async function handleOcEvidenceIngest(
  request: Request,
  repository: OcEvidenceRepository = supabaseOcEvidenceRepository,
  now: () => Date = () => new Date(),
): Promise<Response> {
  if (!checkOcIngestAuth(request)) {
    return errorJson(401, "unauthorized");
  }
  const receivedAt = now();

  let rawBody: string;
  try {
    rawBody = await readBodyWithLimit(request, MAX_BODY_BYTES);
  } catch (error) {
    return error instanceof BodyTooLargeError
      ? errorJson(413, "payload_too_large")
      : errorJson(400, "invalid_json");
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return errorJson(400, "invalid_json");
  }

  let evidence;
  try {
    evidence = await validateOcEvidenceEnvelope(body);
  } catch {
    return errorJson(400, "invalid_evidence");
  }

  const subjectResult = await repository.findSubject(evidence.subject);
  const agent = subjectResult.data;
  if (subjectResult.error) {
    console.error("[oc-evidence] subject lookup failed");
    return errorJson(500, "internal_error");
  }
  if (
    !agent ||
    agent.category !== "task_executor" ||
    agent.identifier_kind !== "executor_wallet" ||
    agent.executor_wallet !== evidence.subject
  ) {
    return errorJson(404, "task_executor_subject_not_found");
  }

  const candidateRow = mapOcEvidenceToAgentEvent(evidence, receivedAt);
  const existing = await repository.findExisting(candidateRow.signature);
  if (existing.error) return errorJson(500, "internal_error");
  if (existing.hash !== null) {
    return existing.hash === evidence.evidence_hash
      ? Response.json({
          ok: true,
          inserted: false,
          duplicate: true,
          event_id: existing.id,
          observed_at: existing.observedAt,
        })
      : idempotencyConflict(candidateRow.signature);
  }

  const deadlineResolution = await resolveCommittedDeadline(evidence, repository);
  if (deadlineResolution.response) return deadlineResolution.response;
  const row = mapOcEvidenceToAgentEvent(evidence, receivedAt, deadlineResolution.deadline);

  const inserted = await repository.insert(row);
  if (!inserted.error && inserted.id) {
    return Response.json(
      {
        ok: true,
        inserted: true,
        duplicate: false,
        event_id: inserted.id,
        observed_at: row.occurred_at,
      },
      { status: 201 },
    );
  }

  // A concurrent retry can win the unique-signature race. Re-read and
  // classify it instead of returning a spurious failure.
  if (inserted.errorCode === "23505") {
    const raced = await repository.findExisting(row.signature);
    if (!raced.error && raced.hash === evidence.evidence_hash) {
      return Response.json({
        ok: true,
        inserted: false,
        duplicate: true,
        event_id: raced.id,
        observed_at: raced.observedAt,
      });
    }
    if (!raced.error && raced.hash !== null) {
      return idempotencyConflict(row.signature);
    }
    if (!raced.error) return errorJson(409, "contract_event_conflict");
  }

  console.error("[oc-evidence] insert failed:", inserted.error);
  return errorJson(500, "internal_error");
}

async function resolveCommittedDeadline(
  evidence: OcEvidenceEnvelope,
  repository: OcEvidenceRepository,
): Promise<{ deadline?: string; response: Response | null }> {
  const opened = await repository.findOpenedDeadlines(evidence.subject, evidence.contract_id);
  if (opened.error) return { response: errorJson(500, "internal_error") };
  const committed = [...new Set(opened.deadlines)];

  if (evidence.type === "OC_OPENED") {
    if (committed.length > 1 || committed.some((deadline) => deadline !== evidence.deadline_at)) {
      return { response: errorJson(409, "deadline_mismatch") };
    }
    return { deadline: evidence.deadline_at, response: null };
  }

  if (committed.length === 0) {
    return { response: errorJson(409, "opened_deadline_not_found") };
  }
  if (committed.length > 1) {
    return { response: errorJson(409, "deadline_mismatch") };
  }
  const [deadline] = committed;
  if (evidence.type === "OC_AWARDED" && deadline !== evidence.deadline_at) {
    return { response: errorJson(409, "deadline_mismatch") };
  }
  return { deadline, response: null };
}

const supabaseOcEvidenceRepository: OcEvidenceRepository = {
  async findSubject(subject) {
    const { data, error } = await supabaseAdmin
      .from("agents")
      .select("mint, category, identifier_kind, executor_wallet")
      .eq("mint", subject)
      .maybeSingle();
    return { data, error: Boolean(error) };
  },
  async findExisting(signature) {
    const { data, error } = await supabaseAdmin
      .from("agent_events")
      .select("id, occurred_at, raw")
      .eq("signature", signature)
      .maybeSingle();
    if (error) {
      console.error("[oc-evidence] idempotency lookup failed:", error);
      return { id: null, hash: null, observedAt: null, error: true };
    }
    const raw =
      data?.raw && typeof data.raw === "object" && !Array.isArray(data.raw) ? data.raw : null;
    return {
      id: data?.id ?? null,
      hash:
        raw && typeof raw.source_evidence_hash === "string"
          ? raw.source_evidence_hash
          : data
            ? ""
            : null,
      observedAt: data?.occurred_at ?? null,
      error: false,
    };
  },
  async findOpenedDeadlines(subject, contractId) {
    const { data, error } = await supabaseAdmin
      .from("agent_events")
      .select("raw")
      .eq("mint", subject)
      .eq("type", "OC_OPENED")
      .eq("raw->>contract_id", contractId);
    if (error) {
      console.error("[oc-evidence] opened deadline lookup failed:", error);
      return { deadlines: [], error: true };
    }
    const deadlines = (data ?? []).flatMap(({ raw }) => {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
      const deadline = (raw as Record<string, unknown>).deadline_at;
      return typeof deadline === "string" ? [deadline] : [];
    });
    return { deadlines, error: false };
  },
  async insert(row) {
    const { data, error } = await supabaseAdmin
      .from("agent_events")
      .insert({ ...row, raw: row.raw as never })
      .select("id")
      .maybeSingle();
    return {
      id: data?.id ?? null,
      errorCode: error?.code ?? null,
      error,
    };
  },
};

function idempotencyConflict(signature: string): Response {
  console.warn("[oc-evidence] idempotency conflict:", signature);
  return errorJson(409, "idempotency_conflict");
}

function errorJson(status: number, code: string): Response {
  return Response.json({ error: code }, { status });
}
