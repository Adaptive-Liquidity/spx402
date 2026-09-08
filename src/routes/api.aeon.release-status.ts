// GET /api/aeon/release-status — public, no auth.
// Reports the documented AEON v0.2 devnet program. Never claims mainnet.

import { createFileRoute } from "@tanstack/react-router";
import { getAeonReleaseStatus } from "@/lib/aeon-release.server";

export const Route = createFileRoute("/api/aeon/release-status")({
  server: {
    handlers: {
      GET: async () => Response.json(getAeonReleaseStatus()),
    },
  },
});
