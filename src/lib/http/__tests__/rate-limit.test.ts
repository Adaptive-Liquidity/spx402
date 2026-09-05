import { describe, expect, it } from "vitest";
import {
  RATE_LIMITS,
  bucketKey,
  callerKey,
  rateLimitHeaders,
} from "@/lib/http/rate-limit.server";

function req(headers: Record<string, string>): Request {
  return new Request("https://spx402.com/api/public/verified", { headers });
}

describe("callerKey", () => {
  it("prefers the Cloudflare connecting IP", () => {
    expect(callerKey(req({ "cf-connecting-ip": "1.2.3.4", "x-forwarded-for": "9.9.9.9" }))).toBe(
      "1.2.3.4",
    );
  });

  it("falls back to the left-most forwarded hop", () => {
    expect(callerKey(req({ "x-forwarded-for": "5.6.7.8, 10.0.0.1" }))).toBe("5.6.7.8");
  });

  it("falls back to x-real-ip", () => {
    expect(callerKey(req({ "x-real-ip": "8.8.8.8" }))).toBe("8.8.8.8");
  });

  it("buckets header-less callers together rather than exempting them", () => {
    expect(callerKey(req({}))).toBe("unknown");
  });
});

describe("bucketKey", () => {
  it("namespaces the counter per endpoint", () => {
    expect(bucketKey(RATE_LIMITS.badge, "1.2.3.4")).toBe("badge:1.2.3.4");
    expect(bucketKey(RATE_LIMITS.verifiedFeed, "1.2.3.4")).toBe("verified:1.2.3.4");
  });
});

describe("rateLimitHeaders", () => {
  it("reports remaining budget without Retry-After when allowed", () => {
    const headers = rateLimitHeaders({
      allowed: true,
      limit: 60,
      remaining: 59,
      resetAt: new Date(Date.now() + 30_000),
    });
    expect(headers["X-RateLimit-Limit"]).toBe("60");
    expect(headers["X-RateLimit-Remaining"]).toBe("59");
    expect(headers["Retry-After"]).toBeUndefined();
  });

  it("adds Retry-After when the caller is over the limit", () => {
    const headers = rateLimitHeaders({
      allowed: false,
      limit: 60,
      remaining: -3,
      resetAt: new Date(Date.now() + 20_000),
    });
    expect(headers["X-RateLimit-Remaining"]).toBe("0");
    expect(Number(headers["Retry-After"])).toBeGreaterThan(0);
    expect(Number(headers["Retry-After"])).toBeLessThanOrEqual(20);
  });

  it("omits reset headers when the limiter failed open", () => {
    const headers = rateLimitHeaders({ allowed: true, limit: 10, remaining: 10, resetAt: null });
    expect(headers["X-RateLimit-Reset"]).toBeUndefined();
  });
});
