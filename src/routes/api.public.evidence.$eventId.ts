// Wave 1c — Per-event Evidence Bundle.
//
// GET /api/public/evidence/:eventId
//
// Returns the canonical, machine-readable evidence record for a single
// agent_event row. This is the contract that makes every grade,
// attestation, and (later) slash explainable from the tape:
//
//   subject → declared intent → observed event → parser version
//          → raw evidence → score impact → attestation impact → bond impact
//
// `raw_tx_hash` is sha256(canonical_json(raw)). It lets a downstream
// verifier (an attestation issuer, a slashing authority, an external
// auditor) hash the raw payload locally and confirm we did not mutate
// the evidence after publishing the attestation.
//
// Deliberately public + cacheable: the row is immutable once written,
// so we mark it `public, max-age=300, s-maxage=3600, immutable`.

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { canonicalJsonStringify, sha256Hex } from "@/lib/evidence/hash.server";

export const Route = createFileRoute("/api/public/evidence/$eventId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const eventId = params.eventId;
        if (!isUuid(eventId)) {
          return errorJson(400, "invalid_event_id");
        }

        const { data: ev, error } = await supabaseAdmin
          .from("agent_events")
          .select(
            "id, mint, type, severity, signature, slot, occurred_at, amount_sol, amount_token, raw, parser_version",
          )
          .eq("id", eventId)
          .maybeSingle();
        if (error) {
          console.error("[api.public.evidence] db_error:", error);
          return errorJson(500, "internal_error");
        }
        if (!ev) return errorJson(404, "event_not_found");

        const { data: agent } = await supabaseAdmin
          .from("agents")
          .select(
            "mint, symbol, name, category, identifier_kind, executor_wallet, core_asset, operator_wallet, score, grade, confidence_score, methodology_version, confidence_model_version",
          )
          .eq("mint", ev.mint)
          .maybeSingle();

        const rawJson = canonicalJsonStringify(ev.raw ?? {});
        const rawTxHash = await sha256Hex(rawJson);

        const subjectType = subjectTypeFor(agent?.identifier_kind ?? "mint");

        const body = {
          schema: "spx.evidence.v1",
          event_id: ev.id,
          subject: {
            type: subjectType,
            id: ev.mint,
            symbol: agent?.symbol ?? null,
            name: agent?.name ?? null,
            category: agent?.category ?? null,
            executor_wallet: agent?.executor_wallet ?? null,
            core_asset: agent?.core_asset ?? null,
            operator_wallet: agent?.operator_wallet ?? null,
          },
          type: ev.type,
          severity: ev.severity,
          occurred_at: ev.occurred_at,
          tx_signature: ev.signature,
          slot: ev.slot,
          amount_sol: Number(ev.amount_sol ?? 0),
          amount_token: Number(ev.amount_token ?? 0),
          raw_tx_hash: `sha256:${rawTxHash}`,
          decoded_by: ev.parser_version ?? "spx-parser-v0.1.7",
          // Score / confidence impact: not yet snapshotted per-event (Wave 3
          // ships agent_score_snapshots which will let us compute deltas).
          // Until then we expose the *current* score so consumers can already
          // join evidence → score, just without the before/after delta.
          score_at_publish: agent?.score ?? null,
          grade_at_publish: agent?.grade ?? null,
          confidence_at_publish: agent?.confidence_score ?? null,
          methodology_version: agent?.methodology_version ?? null,
          confidence_model_version: agent?.confidence_model_version ?? null,
          score_impact: null, // Wave 3
          attestation_id: null, // Wave 5
          bond_impact: null,    // Wave 6
          links: {
            permalink: `/tape/${ev.id}`,
            subject_evidence: `/api/public/agent/${ev.mint}/evidence`,
            tx_explorer: ev.signature && !isDerivedSignature(ev.signature)
              ? `https://solscan.io/tx/${ev.signature}`
              : null,
          },
        };

        return new Response(JSON.stringify(body, null, 2), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            // Immutable evidence rows — safe to cache aggressively.
            "Cache-Control":
              "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }),
    },
  },
});

function subjectTypeFor(identifierKind: string): string {
  if (identifierKind === "core_asset") return "solana_mpl_asset";
  if (identifierKind === "executor_wallet") return "solana_wallet";
  return "solana_mint";
}

function isDerivedSignature(sig: string): boolean {
  return (
    sig.startsWith("fbw-") ||
    sig.startsWith("pbns-") ||
    sig.startsWith("x402rv-") ||
    sig.startsWith("failwin-")
  );
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function errorJson(status: number, code: string, detail?: string): Response {
  return new Response(
    JSON.stringify({ error: code, detail: detail ?? null }, null, 2),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}
