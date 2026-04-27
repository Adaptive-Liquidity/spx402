// Wave 1c — Subject Evidence Bundle (Merkle root over the event window).
//
// GET /api/public/agent/:subject/evidence
//
// Returns the canonical, machine-readable evidence bundle for a subject —
// the rolling 30-day event window plus a Merkle root over the leaves.
// This `evidence_root` is what Wave 5 attestations sign. Once SAS goes
// live, an attestation MUST embed the `evidence_root` for the same
// window the score was computed over, so an external verifier can:
//
//   1. Fetch this bundle.
//   2. Re-hash each event with the same canonical-JSON algorithm.
//   3. Recompute the Merkle root.
//   4. Compare against the attestation's `evidence_root`.
//   5. If equal, the attestation is bound to a fixed, public set of
//      evidence — the issuer cannot quietly retract individual events.
//
// Order is deterministic: events are sorted by occurred_at ASC, then
// id ASC, before hashing. Any change to ordering invalidates roots, so
// downstream consumers must use the order returned by this endpoint.

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  canonicalJsonStringify,
  merkleRootHex,
  sha256Hex,
} from "@/lib/evidence/hash.server";

const WINDOW_DAYS = 30;
const MAX_LEAVES = 5_000; // hard cap — protects the worker

export const Route = createFileRoute("/api/public/agent/$subject/evidence")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const subject = params.subject;
        if (!subject || subject.length < 32 || subject.length > 64) {
          return errorJson(400, "invalid_subject");
        }

        // Resolve subject → agent row. We support the canonical mint id
        // (which is also used for registered_agent core_assets and
        // x402_executor wallets — see the agents-table identifier model).
        const { data: agent } = await supabaseAdmin
          .from("agents")
          .select(
            "mint, symbol, name, category, identifier_kind, executor_wallet, core_asset, operator_wallet, score, grade, confidence_score, methodology_version, confidence_model_version",
          )
          .eq("mint", subject)
          .maybeSingle();
        if (!agent) return errorJson(404, "subject_not_found");

        const since = new Date(
          Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000,
        ).toISOString();

        const { data: events, error } = await supabaseAdmin
          .from("agent_events")
          .select(
            "id, type, severity, signature, slot, occurred_at, amount_sol, amount_token, parser_version, raw",
          )
          .eq("mint", subject)
          .gte("occurred_at", since)
          .order("occurred_at", { ascending: true })
          .order("id", { ascending: true })
          .limit(MAX_LEAVES);
        if (error) {
          console.error("[api.public.agent.evidence] db_error:", error);
          return errorJson(500, "internal_error");
        }

        const rows = events ?? [];

        // Build deterministic leaf hashes. Each leaf = sha256 over the
        // canonical-JSON of the event's identifying + payload fields.
        // The `raw` column is included verbatim so tampering with it
        // invalidates the leaf.
        const leaves: string[] = [];
        const eventList: Array<{
          event_id: string;
          type: string;
          severity: string;
          occurred_at: string;
          tx_signature: string;
          slot: number | null;
          amount_sol: number;
          amount_token: number;
          parser_version: string;
          leaf_hash: string;
          permalink: string;
        }> = [];

        for (const ev of rows) {
          const canonical = canonicalJsonStringify({
            id: ev.id,
            mint: subject,
            type: ev.type,
            severity: ev.severity,
            signature: ev.signature,
            slot: ev.slot,
            occurred_at: ev.occurred_at,
            amount_sol: Number(ev.amount_sol ?? 0),
            amount_token: Number(ev.amount_token ?? 0),
            parser_version: ev.parser_version ?? null,
            raw: ev.raw ?? null,
          });
          const leaf = await sha256Hex(canonical);
          leaves.push(leaf);
          eventList.push({
            event_id: ev.id,
            type: ev.type,
            severity: ev.severity,
            occurred_at: ev.occurred_at,
            tx_signature: ev.signature,
            slot: ev.slot,
            amount_sol: Number(ev.amount_sol ?? 0),
            amount_token: Number(ev.amount_token ?? 0),
            parser_version: ev.parser_version ?? "spx-parser-v0.1.7",
            leaf_hash: `sha256:${leaf}`,
            permalink: `/tape/${ev.id}`,
          });
        }

        const root = await merkleRootHex(leaves);
        const subjectType = subjectTypeFor(agent.identifier_kind ?? "mint");

        const body = {
          schema: "spx.evidence-bundle.v1",
          subject: {
            type: subjectType,
            id: agent.mint,
            symbol: agent.symbol,
            name: agent.name,
            category: agent.category,
            executor_wallet: agent.executor_wallet,
            core_asset: agent.core_asset,
            operator_wallet: agent.operator_wallet,
          },
          window: {
            from: since,
            to: new Date().toISOString(),
            days: WINDOW_DAYS,
          },
          counts: {
            total: eventList.length,
            success: eventList.filter((e) => e.severity === "success").length,
            warn: eventList.filter((e) => e.severity === "warn").length,
            critical: eventList.filter((e) => e.severity === "critical").length,
            info: eventList.filter((e) => e.severity === "info").length,
            by_type: countBy(eventList, (e) => e.type),
          },
          score_at_publish: agent.score,
          grade_at_publish: agent.grade,
          confidence_at_publish: agent.confidence_score,
          methodology_version: agent.methodology_version,
          confidence_model_version: agent.confidence_model_version,
          // Merkle root over the leaves. Embeds in attestations from Wave 5.
          evidence_root: root ? `sha256:${root}` : null,
          truncated: rows.length === MAX_LEAVES,
          events: eventList,
          links: {
            dossier: `/agent/${agent.mint}`,
            tape: `/tape?subject=${agent.mint}`,
          },
        };

        return new Response(JSON.stringify(body, null, 2), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            // Subject evidence is a moving window; cache shorter than the
            // per-event endpoint.
            "Cache-Control":
              "public, max-age=60, s-maxage=300, stale-while-revalidate=3600",
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

function countBy<T>(items: T[], key: (x: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) {
    const k = key(item);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
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
