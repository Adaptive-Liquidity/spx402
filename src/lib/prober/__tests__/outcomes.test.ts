import { describe, expect, it } from "vitest";
import {
  ALL_PROBE_OUTCOMES,
  classifyChallenge,
  classifySettlement,
  exceedsPerProbeCap,
  parseChallenge,
  probeDivergence,
  serviceSlug,
  validateChallenge,
  walletsMatch,
  PROBE_CAPS,
  type ProbeOutcome,
} from "../outcomes";

// ---------------------------------------------------------------------------
// Synthetic challenge payloads
// ---------------------------------------------------------------------------

const V1_BODY = JSON.stringify({
  x402Version: 1,
  accepts: [
    {
      scheme: "exact",
      network: "solana",
      asset: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      payTo: "2wKupLR9q6wXYppw8Gr2NvWxKBUqm4PPJKkQfoxHDBg4",
      maxAmountRequired: "1000",
      resource: "https://api.example.com/v1/weather",
      extra: { decimals: 6, facilitator: "https://facilitator.payai.network" },
    },
  ],
});

const V2_HEADER_JSON = JSON.stringify({
  x402Version: 2,
  accepts: [
    {
      scheme: "exact",
      network: "base",
      asset: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
      payTo: "0xAbCdEf0123456789AbCdEf0123456789AbCdEf01",
      maxAmountRequired: "5000",
      extra: { decimals: 6 },
    },
  ],
});

function b64(s: string): string {
  return Buffer.from(s, "utf-8").toString("base64");
}

describe("challenge parsing", () => {
  it("parses a v1 JSON body", () => {
    const c = parseChallenge({ headers: {}, body: V1_BODY });
    expect(c.source).toBe("body");
    expect(c.x402Version).toBe(1);
    expect(c.scheme).toBe("exact");
    expect(c.network).toBe("solana");
    expect(c.payTo).toBe("2wKupLR9q6wXYppw8Gr2NvWxKBUqm4PPJKkQfoxHDBg4");
    expect(c.amountAtomic).toBe("1000");
    expect(c.amountUsd).toBeCloseTo(0.001, 9);
    expect(c.facilitator).toBe("https://facilitator.payai.network");
  });

  it("parses a v2 PAYMENT-REQUIRED header, base64 or raw", () => {
    for (const value of [V2_HEADER_JSON, b64(V2_HEADER_JSON)]) {
      const c = parseChallenge({
        headers: { "payment-required": value },
        body: null,
      });
      expect(c.source).toBe("header");
      expect(c.network).toBe("base");
      expect(c.amountUsd).toBeCloseTo(0.005, 9);
    }
  });

  it("prefers the header over the body when both are present", () => {
    const c = parseChallenge({
      headers: { "payment-required": V2_HEADER_JSON },
      body: V1_BODY,
    });
    expect(c.source).toBe("header");
    expect(c.network).toBe("base");
  });

  it("selects the cheapest advertised requirement", () => {
    const body = JSON.stringify({
      x402Version: 1,
      accepts: [
        { scheme: "exact", network: "base", asset: "0xa", payTo: "0xb", maxAmountRequired: "50000" },
        { scheme: "exact", network: "solana", asset: "So1", payTo: "Pay1", maxAmountRequired: "1000" },
      ],
    });
    const c = parseChallenge({ headers: {}, body });
    expect(c.amountAtomic).toBe("1000");
    expect(c.network).toBe("solana");
  });

  it("flags missing fields", () => {
    const c = parseChallenge({
      headers: {},
      body: JSON.stringify({ x402Version: 1, accepts: [{ scheme: "exact" }] }),
    });
    const v = validateChallenge(c);
    expect(v.valid).toBe(false);
    expect(v.missing).toEqual(expect.arrayContaining(["network", "asset", "payTo", "amount"]));
  });
});

describe("wallet comparison", () => {
  it("is case-insensitive for EVM and case-sensitive for base58", () => {
    expect(walletsMatch("0xABC", "0xabc")).toBe(true);
    expect(walletsMatch("Pay1", "pay1")).toBe(false);
    expect(walletsMatch("Pay1", "Pay1")).toBe(true);
    expect(walletsMatch(null, "Pay1")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Outcome ladder — one test per value
// ---------------------------------------------------------------------------

describe("outcome ladder — challenge tier", () => {
  it("timeout", () => {
    const r = classifyChallenge({ httpStatus: null, timedOut: true, headers: {}, body: null });
    expect(r.outcome).toBe<ProbeOutcome>("timeout");
    expect(r.challengeValid).toBeNull();
  });

  it("no_402 for a 200", () => {
    const r = classifyChallenge({ httpStatus: 200, timedOut: false, headers: {}, body: "ok" });
    expect(r.outcome).toBe<ProbeOutcome>("no_402");
  });

  it("no_402 for a 500", () => {
    const r = classifyChallenge({ httpStatus: 500, timedOut: false, headers: {}, body: null });
    expect(r.outcome).toBe<ProbeOutcome>("no_402");
  });

  it("malformed_challenge when the 402 carries nothing parseable", () => {
    const r = classifyChallenge({
      httpStatus: 402,
      timedOut: false,
      headers: {},
      body: "payment required",
    });
    expect(r.outcome).toBe<ProbeOutcome>("malformed_challenge");
    expect(r.challengeValid).toBe(false);
  });

  it("malformed_challenge when required fields are absent", () => {
    const r = classifyChallenge({
      httpStatus: 402,
      timedOut: false,
      headers: {},
      body: JSON.stringify({ x402Version: 1, accepts: [{ scheme: "exact", network: "solana" }] }),
    });
    expect(r.outcome).toBe<ProbeOutcome>("malformed_challenge");
    expect(r.notes).toContain("payTo");
  });

  it("config_drift when payTo disagrees with the dossier wallet", () => {
    const r = classifyChallenge({
      httpStatus: 402,
      timedOut: false,
      headers: {},
      body: V1_BODY,
      expectedPayTo: "SomeOtherWalletAddress1111111111111111111",
    });
    expect(r.outcome).toBe<ProbeOutcome>("config_drift");
    expect(r.configDrift).toBe(true);
    expect(r.challengeValid).toBe(false);
  });

  it("challenge_valid when payTo matches the dossier wallet", () => {
    const r = classifyChallenge({
      httpStatus: 402,
      timedOut: false,
      headers: {},
      body: V1_BODY,
      expectedPayTo: "2wKupLR9q6wXYppw8Gr2NvWxKBUqm4PPJKkQfoxHDBg4",
    });
    expect(r.outcome).toBe<ProbeOutcome>("challenge_valid");
    expect(r.challengeValid).toBe(true);
    expect(r.configDrift).toBe(false);
  });

  it("challenge_valid when no dossier wallet is known yet", () => {
    const r = classifyChallenge({ httpStatus: 402, timedOut: false, headers: {}, body: V1_BODY });
    expect(r.outcome).toBe<ProbeOutcome>("challenge_valid");
  });
});

describe("outcome ladder — settlement tier", () => {
  it("payment_rejected on non-200", () => {
    expect(
      classifySettlement({ httpStatus: 402, settlementConfirmed: false, bodyBytes: 0 }).outcome,
    ).toBe<ProbeOutcome>("payment_rejected");
    expect(
      classifySettlement({ httpStatus: 500, settlementConfirmed: true, bodyBytes: 100 }).outcome,
    ).toBe<ProbeOutcome>("payment_rejected");
    expect(
      classifySettlement({ httpStatus: null, settlementConfirmed: false, bodyBytes: 0 }).outcome,
    ).toBe<ProbeOutcome>("payment_rejected");
  });

  it("settled_no_delivery on 200 with no observed settlement", () => {
    const r = classifySettlement({ httpStatus: 200, settlementConfirmed: false, bodyBytes: 42 });
    expect(r.outcome).toBe<ProbeOutcome>("settled_no_delivery");
  });

  it("delivery_unverified on confirmed settlement with an empty body", () => {
    const r = classifySettlement({ httpStatus: 200, settlementConfirmed: true, bodyBytes: 0 });
    expect(r.outcome).toBe<ProbeOutcome>("delivery_unverified");
    expect(r.delivered).toBe(false);
  });

  it("settled on 200 + confirmed settlement + non-empty body", () => {
    const r = classifySettlement({ httpStatus: 200, settlementConfirmed: true, bodyBytes: 512 });
    expect(r.outcome).toBe<ProbeOutcome>("settled");
    expect(r.delivered).toBe(true);
  });
});

describe("spend caps", () => {
  it("over_cap boundary is inclusive of the cap itself", () => {
    expect(exceedsPerProbeCap(PROBE_CAPS.perProbeUsd)).toBe(false);
    expect(exceedsPerProbeCap(PROBE_CAPS.perProbeUsd + 0.0001)).toBe(true);
    expect(exceedsPerProbeCap(0.001)).toBe(false);
  });

  it("never pays an unknown price", () => {
    expect(exceedsPerProbeCap(null)).toBe(true);
  });
});

describe("every outcome value is covered by the ladder", () => {
  it("enumerates 11 outcomes including the operational fallback", () => {
    expect(new Set(ALL_PROBE_OUTCOMES).size).toBe(ALL_PROBE_OUTCOMES.length);
    expect(ALL_PROBE_OUTCOMES).toContain("over_cap");
    expect(ALL_PROBE_OUTCOMES).toContain("probe_error");
  });
});

// ---------------------------------------------------------------------------
// PROBE_DIVERGENCE
// ---------------------------------------------------------------------------

describe("PROBE_DIVERGENCE", () => {
  const base = { windowDays: 30, probeSamples: 40, organicSamples: 40 };

  it("fires when probe settle-rate exceeds organic by more than 0.25", () => {
    const r = probeDivergence({ ...base, probeSettleRate: 0.98, organicSettleRate: 0.6 });
    expect(r.diverged).toBe(true);
    expect(r.delta).toBeCloseTo(0.38, 6);
  });

  it("does not fire exactly at the 0.25 threshold", () => {
    const r = probeDivergence({ ...base, probeSettleRate: 0.85, organicSettleRate: 0.6 });
    expect(r.diverged).toBe(false);
    expect(r.reason).toBe("within tolerance");
  });

  it("does not fire when the prober fares worse than organic buyers", () => {
    const r = probeDivergence({ ...base, probeSettleRate: 0.3, organicSettleRate: 0.9 });
    expect(r.diverged).toBe(false);
    expect(r.delta).toBeCloseTo(-0.6, 6);
  });

  it("requires a 14-day window", () => {
    const r = probeDivergence({
      ...base,
      windowDays: 13,
      probeSettleRate: 1,
      organicSettleRate: 0,
    });
    expect(r.diverged).toBe(false);
    expect(r.reason).toContain("13d");
  });

  it("requires samples on both sides", () => {
    const r = probeDivergence({
      ...base,
      organicSamples: 1,
      probeSettleRate: 1,
      organicSettleRate: 0,
    });
    expect(r.diverged).toBe(false);
    expect(r.reason).toContain("insufficient samples");
  });
});

// ---------------------------------------------------------------------------
// Slugs
// ---------------------------------------------------------------------------

describe("serviceSlug", () => {
  it("encodes host and path", () => {
    expect(serviceSlug("https://api.example.com/v1/weather")).toBe(
      "api.example.com~v1~weather",
    );
  });

  it("drops query strings and trailing slashes", () => {
    expect(serviceSlug("https://api.example.com/v1/weather/?x=1")).toBe(
      "api.example.com~v1~weather",
    );
  });

  it("handles a bare host and a protocol-less URL", () => {
    expect(serviceSlug("https://api.example.com")).toBe("api.example.com");
    expect(serviceSlug("api.example.com/paid")).toBe("api.example.com~paid");
  });

  it("sanitizes unsafe characters and is stable", () => {
    const slug = serviceSlug("https://API.Example.com/v1/wea ther!");
    expect(slug).toMatch(/^[a-z0-9.~_-]+$/);
    expect(serviceSlug("https://API.Example.com/v1/wea ther!")).toBe(slug);
  });
});
