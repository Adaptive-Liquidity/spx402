// Shared timing-safe bearer-token auth for internal endpoints.
// We keep three distinct secrets so a leak of one does not compromise
// every server-side surface:
//   - CRON_SECRET            : 5 cron workers (read+mutate via service role)
//   - HELIUS_WEBHOOK_SECRET  : webhook ingest only (also HMAC key)
//   - HELIUS_ADMIN_SECRET    : webhook setup/list/delete (reconfigures Helius)
//   - OC_INGEST_SECRET       : Outcome Contract evidence ingest only
//
// During the rollout window we accept the legacy HELIUS_WEBHOOK_SECRET as a
// fallback for cron/admin so that an unconfigured CRON_SECRET / HELIUS_ADMIN_SECRET
// does not break pg_cron jobs in flight. Once both new secrets are set in
// production, those fallbacks become no-ops.

import { timingSafeEqual } from "node:crypto";

function safeEq(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  try {
    return timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

function extractBearer(headerValue: string | null): string | null {
  if (!headerValue) return null;
  const trimmed = headerValue.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.toLowerCase().startsWith("bearer ")) {
    return trimmed.slice(7).trim();
  }
  return trimmed;
}

function authHeaderMatches(req: Request, secret: string): boolean {
  const presented = extractBearer(req.headers.get("authorization"));
  if (!presented) return false;
  return safeEq(presented, secret);
}

/**
 * Check cron auth: requires CRON_SECRET. The legacy HELIUS_WEBHOOK_SECRET
 * fallback was removed in the security-hardening pass (April 2026) — that
 * value was hardcoded in a migration and is treated as compromised.
 */
export async function checkCronAuth(req: Request): Promise<boolean> {
  const presented = extractBearer(req.headers.get("authorization"));
  if (!presented || presented.length < 16) return false;

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && safeEq(presented, cronSecret)) return true;

  // Fallback: pg_cron signs its calls with the bearer stored in the database
  // vault. Ask the database whether the presented token matches, so the two
  // copies of the credential can never drift out of sync.
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("verify_cron_bearer" as never, {
      p_token: presented,
    } as never);
    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
}

/**
 * Check admin auth for the Helius webhook setup/list/delete endpoints.
 * Requires HELIUS_ADMIN_SECRET. The HELIUS_WEBHOOK_SECRET fallback was
 * removed in the September 2026 hardening pass — the vault is seeded, the
 * one-shot seeder route is deleted, and the webhook ingest credential must
 * not be able to reconfigure Helius. Fails closed when unset.
 */
export function checkAdminAuth(req: Request): boolean {
  const adminSecret = process.env.HELIUS_ADMIN_SECRET;
  if (!adminSecret || adminSecret.length < 16) return false;
  return authHeaderMatches(req, adminSecret);
}

/** Check the dedicated Outcome Contract evidence ingestion credential. */
export function checkOcIngestAuth(req: Request): boolean {
  const ingestSecret = process.env.OC_INGEST_SECRET;
  if (!ingestSecret) return false;
  const authorization = req.headers.get("authorization")?.trim();
  if (!authorization?.toLowerCase().startsWith("bearer ")) return false;
  return authHeaderMatches(req, ingestSecret);
}
