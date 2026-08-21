import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { checkOcIngestAuth } from "@/lib/indexer/auth.server";
import {
  mapOcEvidenceToAgentEvent,
  validateOcEvidenceEnvelope,
} from "@/lib/indexer/oc-evidence.server";

// Auth: Authorization: Bearer <OC_INGEST_SECRET>
// This route is intentionally live before task_executor.decoderLive: it
// collects the evidence required to verify the decoder before the gate flips.
const MAX_BODY_BYTES = 64 * 1024;

export const Route = createFileRoute("/api/public/ingest-oc-evidence")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!checkOcIngestAuth(request)) {
          return errorJson(401, "unauthorized");
        }

        const declaredLength = Number(request.headers.get("content-length"));
        if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
          return errorJson(413, "payload_too_large");
        }

        const rawBody = await request.text();
        if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
          return errorJson(413, "payload_too_large");
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

        const { data: agent, error: agentError } = await supabaseAdmin
          .from("agents")
          .select("mint, category, identifier_kind, executor_wallet")
          .eq("mint", evidence.subject)
          .maybeSingle();
        if (agentError) {
          console.error("[oc-evidence] subject lookup failed:", agentError);
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

        const row = mapOcEvidenceToAgentEvent(evidence, new Date());
        const existing = await findExisting(row.signature);
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
            : idempotencyConflict(row.signature);
        }

        const { data: inserted, error: insertError } = await supabaseAdmin
          .from("agent_events")
          .insert({ ...row, raw: row.raw as never })
          .select("id")
          .maybeSingle();
        if (!insertError && inserted) {
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
        if (insertError?.code === "23505") {
          const raced = await findExisting(row.signature);
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
        }

        console.error("[oc-evidence] insert failed:", insertError);
        return errorJson(500, "internal_error");
      },
    },
  },
});

async function findExisting(signature: string): Promise<{
  id: string | null;
  hash: string | null;
  observedAt: string | null;
  error: boolean;
}> {
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
}

function idempotencyConflict(signature: string): Response {
  console.warn("[oc-evidence] idempotency conflict:", signature);
  return errorJson(409, "idempotency_conflict");
}

function errorJson(status: number, code: string): Response {
  return Response.json({ error: code }, { status });
}
