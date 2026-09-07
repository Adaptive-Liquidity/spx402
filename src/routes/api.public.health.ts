import { createFileRoute } from "@tanstack/react-router";
import { resolveAeonProgramId } from "@/lib/trust/config";

// Public deployment health probe (no auth � safe to expose to load
// balancers). Reports AEON pipeline configuration state. Invalid
// production AEON config fails this check (non-200) instead of
// surfacing only as per-request webhook 500s.
export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        let aeon: { enabled: boolean; reason?: string };
        try {
          const state = resolveAeonProgramId();
          aeon = state.enabled ? { enabled: true } : { enabled: false, reason: state.reason };
        } catch (e) {
          return Response.json(
            {
              ok: false,
              aeon: {
                enabled: false,
                reason: "invalid_config",
                detail: e instanceof Error ? e.message : "invalid AEON config",
              },
            },
            { status: 500 },
          );
        }
        return Response.json({ ok: true, aeon });
      },
    },
  },
});
