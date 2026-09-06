// Public, no-account entry point to the Preflight lane.
//
// Free challenge tier only. Rate limited per caller because it makes an
// outbound request on the caller's behalf.

import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { checkRateLimit, type RateLimitRule } from "@/lib/http/rate-limit.server";

const PREFLIGHT_LIMIT: RateLimitRule = { name: "preflight", limit: 12, windowSeconds: 300 };

export const scanEndpoint = createServerFn({ method: "POST" })
  .inputValidator((input: { url?: string }) => ({
    url: (input?.url ?? "").toString().slice(0, 2000),
  }))
  .handler(async ({ data }) => {
    const request = getRequest();
    const decision = await checkRateLimit(request, PREFLIGHT_LIMIT);
    if (!decision.allowed) {
      throw new Error("Too many scans from this address. Try again in a few minutes.");
    }

    const { runPreflightScan } = await import("@/lib/preflight/scan.server");
    const { card, outcome, scanId } = await runPreflightScan(data.url);
    return { card, outcome, scanId };
  });

export interface RecentScanRow {
  id: string;
  url: string;
  host: string;
  outcome: string;
  http_status: number | null;
  scanned_at: string;
}

export const recentScans = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("preflight_scan_public")
    .select("id, url, host, outcome, http_status, scanned_at")
    .order("scanned_at", { ascending: false })
    .limit(12);
  if (error || !data) return { scans: [] as RecentScanRow[] };
  return { scans: data as unknown as RecentScanRow[] };
});
