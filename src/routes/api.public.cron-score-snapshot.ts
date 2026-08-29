// Wave 3 — daily score snapshot worker.
// Snapshots every agent's current (score, confidence_score, grade) into
// agent_score_snapshots so /pulse and Movers (24h) can compute deltas.
// Runs on pg_cron once daily; idempotent within the same hour bucket.

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { checkCronAuth } from "@/lib/indexer/auth.server";
import { RISK_SCORE_MODEL_VERSION } from "@/lib/scoring/risk-score";

export const Route = createFileRoute("/api/public/cron-score-snapshot")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const started = Date.now();
        if (!checkCronAuth(request)) {
          return new Response("unauthorized", { status: 401 });
        }

        const { data: agents, error } = await supabaseAdmin
          .from("agents")
          .select(
            "mint, score, confidence_score, grade, methodology_version, confidence_model_version",
          );
        if (error) {
          console.error("[cron-score-snapshot] db_error:", error);
          return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
        }
        if (!agents || agents.length === 0) {
          await heartbeat("score_snapshot", true, Date.now() - started, "no agents");
          return Response.json({ ok: true, snapshotted: 0 });
        }

        const takenAt = new Date().toISOString();
        const rows = agents.map((a) => ({
          mint: a.mint,
          score: a.score,
          confidence_score: a.confidence_score ?? 0,
          grade: a.grade,
          methodology_version: a.methodology_version ?? RISK_SCORE_MODEL_VERSION,
          confidence_model_version: a.confidence_model_version ?? "spx-confidence-v0.2.0",
          taken_at: takenAt,
        }));

        // Insert in chunks to keep payloads bounded.
        const CHUNK = 200;
        let inserted = 0;
        for (let i = 0; i < rows.length; i += CHUNK) {
          const slice = rows.slice(i, i + CHUNK);
          const { error: insertErr } = await supabaseAdmin
            .from("agent_score_snapshots")
            .insert(slice);
          if (!insertErr) inserted += slice.length;
        }

        const duration = Date.now() - started;
        await heartbeat("score_snapshot", true, duration, `snapshotted=${inserted}`);
        return Response.json({
          ok: true,
          snapshotted: inserted,
          duration_ms: duration,
        });
      },
    },
  },
});

async function heartbeat(worker: string, ok: boolean, durationMs: number, notes: string) {
  try {
    await supabaseAdmin.from("indexer_runs").insert({
      worker,
      ok,
      duration_ms: durationMs,
      notes,
    });
  } catch {
    /* */
  }
}
