import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, rateLimitResponse, rateLimitHeaders } from "@/lib/rate-limiter";
import { handleOptions, corsHeaders } from "@/lib/cors";
import {
  canonicalJson,
  sha256Hex,
  merkleRoot,
  EMPTY_ROOT,
  type EvidenceEventV1,
  type EvidenceBundleV1,
} from "@/lib/evidence";
import { SCORING_VERSION } from "@/lib/versions";

function getServerSupabase() {
  return createClient(
    process.env["VITE_SUPABASE_URL"]!,
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"]!,
    { auth: { persistSession: false } },
  );
}

// Columns the bundle body needs from the subject agent row.
const AGENT_EMBED =
  "agents(mint, symbol, name, category, identifier_kind, executor_wallet, core_asset, operator_wallet, score, grade, confidence_score, methodology_version, confidence_model_version)";

export const Route = createFileRoute("/api/public/evidence/$eventId")({
  server: {
    handlers: {
      OPTIONS: async () => handleOptions(),
      GET: async ({ params, request }) => {
        // Rate limit before any database work — evidence payloads are the
        // heaviest public responses we serve.
        const rl = await checkRateLimit(request, "evidence");
        if (!rl.allowed) return rateLimitResponse(rl);

        const supabase = getServerSupabase();

        // One round-trip: the event row with its subject agent embedded
        // (many-to-one on agent_events.mint → agents.mint). The agent is
        // optional — a subject may have been removed while its events stay.
        const { data: ev, error: evErr } = await supabase
          .from("agent_events")
          .select(
            `id, mint, type, severity, signature, slot, occurred_at, amount_sol, amount_token, raw, parser_version, ${AGENT_EMBED}`,
          )
          .eq("id", params.eventId)
          .maybeSingle();
        if (evErr) return Response.json({ error: "internal_error" }, { status: 500 });
        if (!ev) return Response.json({ error: "not_found" }, { status: 404 });

        const agentRow = (ev as unknown as { agents: Record<string, unknown> | null }).agents;
        const agent = agentRow
          ? {
              mint: agentRow.mint as string,
              symbol: (agentRow.symbol as string | null) ?? null,
              name: (agentRow.name as string | null) ?? null,
              category: (agentRow.category as string | null) ?? null,
              identifier_kind: (agentRow.identifier_kind as string | null) ?? null,
              executor_wallet: (agentRow.executor_wallet as string | null) ?? null,
              core_asset: (agentRow.core_asset as string | null) ?? null,
              operator_wallet: (agentRow.operator_wallet as string | null) ?? null,
              score: agentRow.score == null ? null : Number(agentRow.score),
              grade: (agentRow.grade as string | null) ?? null,
              confidence_score:
                agentRow.confidence_score == null ? null : Number(agentRow.confidence_score),
              methodology_version: (agentRow.methodology_version as string | null) ?? null,
              confidence_model_version:
                (agentRow.confidence_model_version as string | null) ?? null,
            }
          : null;

        const evidenceEvent: EvidenceEventV1 = {
          id: ev.id,
          mint: ev.mint,
          type: ev.type,
          severity: ev.severity,
          signature: ev.signature,
          slot: ev.slot ?? null,
          occurred_at: ev.occurred_at,
          amount_sol: ev.amount_sol == null ? null : Number(ev.amount_sol),
          amount_token: ev.amount_token == null ? null : Number(ev.amount_token),
          parser_version: ev.parser_version ?? null,
        };

        const subjectRoot = agent
          ? await merkleRoot([
              await sha256Hex(
                canonicalJson({
                  mint: agent.mint,
                  score: agent.score,
                  grade: agent.grade,
                  confidence_score: agent.confidence_score,
                  methodology_version: agent.methodology_version,
                  confidence_model_version: agent.confidence_model_version,
                }),
              ),
            ])
          : EMPTY_ROOT;

        const bundleBody = {
          spec: "spx.evidence.v1" as const,
          event: evidenceEvent,
          subject: agent,
          subject_state_root: subjectRoot,
          scoring_version: SCORING_VERSION,
          raw: (ev.raw ?? {}) as Record<string, unknown>,
        };
        const bundleHash = await sha256Hex(canonicalJson(bundleBody));
        const bundle: EvidenceBundleV1 = { ...bundleBody, bundle_hash: bundleHash };

        return Response.json(bundle, {
          headers: { ...corsHeaders(request), ...rateLimitHeaders(rl) },
        });
      },
    },
  },
});
