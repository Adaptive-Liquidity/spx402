// Server-function boundary for AEON release status. TanStack Start route
// loaders are isomorphic: without this boundary the env-dependent read in
// aeon-release.server.ts would run in the browser on client-side navigation.

import { createServerFn } from "@tanstack/react-start";
import { getAeonReleaseStatus, type AeonReleaseStatus } from "@/lib/aeon-release.server";

/** GET the AEON release status, always resolved on the server. */
export const getReleaseStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<AeonReleaseStatus> => getAeonReleaseStatus(),
);
