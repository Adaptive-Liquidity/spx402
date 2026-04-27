// Verify pending candidate_agents rows. Promote those that pass the strict
// bar to the agents table. Reject those that fail repeatedly.

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyCandidate } from "@/lib/indexer/verifier.server";
import { checkCronAuth } from "@/lib/indexer/auth.server";
import type { Json } from "@/integrations/supabase/types";

const MAX_PER_RUN = 10;
const MAX_ATTEMPTS = 5;

export const Route = createFileRoute("/api/public/cron-verify-candidates")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const started = Date.now();
        if (!checkCronAuth(request)) {
          return new Response("unauthorized", { status: 401 });
        }

        const { data: queue } = await supabaseAdmin
          .from("candidate_agents")
          .select("mint, check_attempts, signals")
          .in("status", ["pending", "verifying"])
          .order("last_checked_at", { ascending: true, nullsFirst: true })
          .limit(MAX_PER_RUN);

        let promoted = 0;
        let rejected = 0;
        let stillPending = 0;

        for (const c of queue ?? []) {
          const result = await verifyCandidate(c.mint);
          const attempts = (c.check_attempts ?? 0) + 1;

          if (result.passed) {
            await supabaseAdmin.from("agents").upsert(
              {
                mint: c.mint,
                symbol: result.symbol ?? c.mint.slice(0, 4).toUpperCase(),
                name: result.name ?? "Unnamed agent",
                grade: "SPX404",
                status: "active",
                metadata_uri: result.metadataUri,
                confidence: "medium",
                parser_version: "v0.1.7",
              },
              { onConflict: "mint" },
            );
            await supabaseAdmin
              .from("candidate_agents")
              .update({
                status: "verified",
                signals: result.signals as unknown as Json,
                check_attempts: attempts,
                last_checked_at: new Date().toISOString(),
                notes: result.notes,
              })
              .eq("mint", c.mint);
            promoted += 1;
          } else if (attempts >= MAX_ATTEMPTS) {
            await supabaseAdmin
              .from("candidate_agents")
              .update({
                status: "rejected",
                signals: result.signals as unknown as Json,
                rejection_reason: "Failed verification bar after max attempts",
                check_attempts: attempts,
                last_checked_at: new Date().toISOString(),
                notes: result.notes,
              })
              .eq("mint", c.mint);
            rejected += 1;
          } else {
            await supabaseAdmin
              .from("candidate_agents")
              .update({
                status: "verifying",
                signals: result.signals as unknown as Json,
                check_attempts: attempts,
                last_checked_at: new Date().toISOString(),
                notes: result.notes,
              })
              .eq("mint", c.mint);
            stillPending += 1;
          }
        }

        const duration = Date.now() - started;
        await supabaseAdmin.from("indexer_runs").insert({
          worker: "verifier",
          ok: true,
          duration_ms: duration,
          notes: `checked=${queue?.length ?? 0} promoted=${promoted} rejected=${rejected} pending=${stillPending}`,
        });

        return Response.json({
          ok: true,
          checked: queue?.length ?? 0,
          promoted,
          rejected,
          stillPending,
          duration_ms: duration,
        });
      },
    },
  },
});
