// Shared per-caller rate limiting for the free, unauthenticated public
// endpoints (badge SVG, evidence bundles, verified feed).
//
// Design notes:
//   - The counter lives in Postgres so every edge instance shares one view.
//   - Windows are fixed (floor(now / window)), which is cheap and adequate
//     for abuse control; API-key traffic keeps its own daily quota.
//   - We fail OPEN on any database error. A rate limiter that takes the
//     public surface down when the DB hiccups is worse than no limiter.

export interface RateLimitRule {
  /** Stable name for the endpoint, used as the counter key prefix. */
  name: string;
  /** Max requests allowed per caller per window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date | null;
}

/**
 * Best-effort caller identity. Cloudflare sets `cf-connecting-ip`; we fall
 * back to the left-most `x-forwarded-for` hop and finally to a constant so a
 * caller that strips every header still shares one bucket instead of none.
 */
export function callerKey(request: Request): string {
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

/** Build the counter key for a rule + caller. */
export function bucketKey(rule: RateLimitRule, caller: string): string {
  return `${rule.name}:${caller}`;
}

/** Standard headers describing the current limit state. */
export function rateLimitHeaders(decision: RateLimitDecision): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(decision.limit),
    "X-RateLimit-Remaining": String(Math.max(0, decision.remaining)),
  };
  if (decision.resetAt) {
    headers["X-RateLimit-Reset"] = String(Math.floor(decision.resetAt.getTime() / 1000));
    if (!decision.allowed) {
      const retry = Math.max(1, Math.ceil((decision.resetAt.getTime() - Date.now()) / 1000));
      headers["Retry-After"] = String(retry);
    }
  }
  return headers;
}

/** Record one hit and report whether the caller is within the limit. */
export async function checkRateLimit(
  request: Request,
  rule: RateLimitRule,
): Promise<RateLimitDecision> {
  const key = bucketKey(rule, callerKey(request));
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("rate_limit_hit" as never, {
      p_bucket: key,
      p_window_seconds: rule.windowSeconds,
      p_limit: rule.limit,
    } as never);
    if (error || !data) {
      return { allowed: true, limit: rule.limit, remaining: rule.limit, resetAt: null };
    }
    const row = Array.isArray(data) ? data[0] : data;
    const hits = Number((row as { hits?: number } | null)?.hits ?? 0);
    const allowed = Boolean((row as { allowed?: boolean } | null)?.allowed ?? true);
    const resetRaw = (row as { reset_at?: string } | null)?.reset_at;
    return {
      allowed,
      limit: rule.limit,
      remaining: Math.max(0, rule.limit - hits),
      resetAt: resetRaw ? new Date(resetRaw) : null,
    };
  } catch {
    return { allowed: true, limit: rule.limit, remaining: rule.limit, resetAt: null };
  }
}

/**
 * Enforce a rule. Returns a 429 `Response` when the caller is over the limit,
 * otherwise the headers to merge into the successful response.
 */
export async function enforceRateLimit(
  request: Request,
  rule: RateLimitRule,
): Promise<{ response: Response | null; headers: Record<string, string> }> {
  const decision = await checkRateLimit(request, rule);
  const headers = rateLimitHeaders(decision);
  if (decision.allowed) return { response: null, headers };
  return {
    response: new Response(
      JSON.stringify({ ok: false, error: "rate_limited", limit: rule.limit }),
      {
        status: 429,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
      },
    ),
    headers,
  };
}

/** Shared rules so limits stay consistent (and documented) across endpoints. */
export const RATE_LIMITS = {
  badge: { name: "badge", limit: 240, windowSeconds: 60 },
  verifiedFeed: { name: "verified", limit: 60, windowSeconds: 60 },
  evidence: { name: "evidence", limit: 120, windowSeconds: 60 },
  selfTest: { name: "selftest", limit: 10, windowSeconds: 300 },
} as const satisfies Record<string, RateLimitRule>;
