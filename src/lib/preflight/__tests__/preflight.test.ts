import { describe, expect, it } from "vitest";
import type { ParsedChallenge } from "@/lib/prober/outcomes";
import {
  ALL_PREFLIGHT_OUTCOMES,
  buildPreflightCard,
  comparePrice,
  compareQuotes,
  normalizePreflightUrl,
  preflightOutcomeLabel,
  preflightUrlKey,
  PREFLIGHT_QUESTION,
  scanTimeLabel,
  toPreflightOutcome,
  transportNote,
} from "../model";

function challenge(over: Partial<ParsedChallenge> = {}): ParsedChallenge {
  return {
    x402Version: 1,
    scheme: "exact",
    network: "solana",
    asset: "USDC",
    payTo: "8xLpAaVcQ2VDkGhqUZTx1sQ6bqLpWJqTn7uJ8P2mDaBc",
    amountAtomic: "10000",
    amountUsd: 0.01,
    facilitator: null,
    resource: null,
    source: "body",
    raw: {},
    ...over,
  };
}

describe("preflight outcomes", () => {
  it("maps the prober ladder onto explicit outcomes", () => {
    expect(toPreflightOutcome("challenge_valid")).toBe("challenge_ok");
    expect(toPreflightOutcome("no_402")).toBe("no_402");
    expect(toPreflightOutcome("timeout")).toBe("timeout");
    expect(toPreflightOutcome("malformed_challenge")).toBe("parse_fail");
    expect(toPreflightOutcome("probe_error")).toBe("unreachable");
  });

  it("never labels an outcome as safe or a scam", () => {
    const words = ALL_PREFLIGHT_OUTCOMES.map((o) => preflightOutcomeLabel(o).toLowerCase()).join(
      " ",
    );
    for (const banned of ["safe", "scam", "honeypot", "verified safe", "trusted"]) {
      expect(words).not.toContain(banned);
    }
  });
});

describe("quote comparison", () => {
  it("reports STABLE when both calls quote the same thing", () => {
    expect(compareQuotes(challenge(), challenge()).label).toBe("STABLE");
  });

  it("reports a price difference as 'quote changed', never as fraud", () => {
    const c = compareQuotes(challenge(), challenge({ amountAtomic: "50000" }));
    expect(c.priceChanged).toBe(true);
    expect(c.label).toBe("QUOTE CHANGED — price");
    expect(c.label.toLowerCase()).not.toMatch(/scam|honeypot|unsafe/);
  });

  it("reports a rotated receiving address as 'quote changed'", () => {
    const c = compareQuotes(challenge(), challenge({ payTo: "9zQqRt5VmEeFf1122334455667788990011AaBbCc" }));
    expect(c.payToChanged).toBe(true);
    expect(c.label).toBe("QUOTE CHANGED — payTo");
  });

  it("treats EVM addresses case-insensitively", () => {
    const a = challenge({ payTo: "0xAbCdEf0000000000000000000000000000000001" });
    const b = challenge({ payTo: "0xabcdef0000000000000000000000000000000001" });
    expect(compareQuotes(a, b).label).toBe("STABLE");
  });

  it("prints NONE when the second call produced no quote", () => {
    expect(compareQuotes(challenge(), null).label).toBe("NONE");
    expect(compareQuotes(challenge(), null).comparable).toBe(false);
  });
});

describe("transport / version mismatch", () => {
  it("is silent when version and source agree", () => {
    expect(transportNote(challenge({ x402Version: 1, source: "body" }))).toBeNull();
    expect(transportNote(challenge({ x402Version: 2, source: "header" }))).toBeNull();
  });

  it("notes a v2 declaration served only in the body", () => {
    expect(transportNote(challenge({ x402Version: 2, source: "body" }))).toMatch(/v2/);
  });

  it("notes an undeclared protocol version", () => {
    expect(transportNote(challenge({ x402Version: null }))).toMatch(/not declared/);
  });

  it("says nothing when there was no challenge at all", () => {
    expect(transportNote(null)).toBeNull();
  });
});

describe("price vs sample", () => {
  const takenAt = "2026-09-06T02:58:00.000Z";

  it("refuses to compare against a sample that is too small", () => {
    const r = comparePrice(0.01, { amountsUsd: [0.01, 0.02], takenAt });
    expect(r.outlier).toBeNull();
    expect(r.label).toBe("NONE");
  });

  it("always names the sample size and the date", () => {
    const r = comparePrice(0.01, { amountsUsd: [0.01, 0.01, 0.02, 0.01, 0.03], takenAt });
    expect(r.sampleSize).toBe(5);
    expect(r.label).toBe("WITHIN VS SAMPLE (N=5, 2026-09-06)");
  });

  it("flags an outlier without judging it", () => {
    const r = comparePrice(5, { amountsUsd: [0.01, 0.01, 0.02, 0.01, 0.03], takenAt });
    expect(r.outlier).toBe(true);
    expect(r.label).toBe("OUTLIER VS SAMPLE (N=5, 2026-09-06)");
    expect(r.label.toLowerCase()).not.toMatch(/gouging|predatory|rip/);
  });

  it("prints NONE when the endpoint listed no price", () => {
    expect(comparePrice(null, { amountsUsd: [1, 1, 1, 1, 1], takenAt }).label).toBe("NONE");
  });
});

describe("url handling", () => {
  it("accepts a bare host and defaults to https", () => {
    expect(normalizePreflightUrl("api.example.com/x")?.url).toBe("https://api.example.com/x");
  });

  it("rejects junk", () => {
    expect(normalizePreflightUrl("")).toBeNull();
    expect(normalizePreflightUrl("localhost")).toBeNull();
    expect(normalizePreflightUrl("ftp://example.com")).toBeNull();
  });

  it("groups an endpoint by host and path, ignoring the query", () => {
    expect(preflightUrlKey("https://API.Example.com/v1/thing/?a=1")).toBe(
      "api.example.com/v1/thing",
    );
  });
});

describe("the card", () => {
  const base = {
    url: "https://api.example.com/v1/thing",
    host: "api.example.com",
    scannedAtIso: "2026-09-06T02:58:11.000Z",
    quote: compareQuotes(challenge(), challenge()),
    price: comparePrice(null, { amountsUsd: [], takenAt: "2026-09-06T02:58:11.000Z" }),
    transportNote: null,
  };

  it("asks the exact question and always shows the scan time", () => {
    const card = buildPreflightCard({
      ...base,
      outcome: "challenge_ok",
      httpStatus: 402,
      secondHttpStatus: 402,
      challengeValid: true,
      network: "solana",
      asset: "USDC",
      payTo: "8xLpAaVcQ2VDkGhqUZTx1sQ6bqLpWJqTn7uJ8P2mDaBc",
      amountUsd: 0.01,
      x402Version: 1,
    });
    expect(card.question).toBe("What did this endpoint do when we called it?");
    expect(card.question).toBe(PREFLIGHT_QUESTION);
    expect(card.scannedLabel).toBe("2026-09-06 02:58 UTC");
    expect(card.probeKind).toBe("CHALLENGE");
  });

  it("prints NONE for every fact it does not have", () => {
    const card = buildPreflightCard({
      ...base,
      outcome: "unreachable",
      httpStatus: null,
      secondHttpStatus: null,
      challengeValid: null,
      network: null,
      asset: null,
      payTo: null,
      amountUsd: null,
      x402Version: null,
      quote: compareQuotes(null, null),
    });
    const values = card.rows.map((r) => r.value);
    expect(values.filter((v) => v === "NONE").length).toBeGreaterThanOrEqual(7);
    expect(values).not.toContain("");
    expect(values).not.toContain("undefined");
    expect(card.danger).toBe(true);
  });

  it("carries no safety claim anywhere in its text", () => {
    const card = buildPreflightCard({
      ...base,
      outcome: "challenge_ok",
      httpStatus: 402,
      secondHttpStatus: 402,
      challengeValid: true,
      network: "solana",
      asset: "USDC",
      payTo: "8xLpAaVcQ2VDkGhqUZTx1sQ6bqLpWJqTn7uJ8P2mDaBc",
      amountUsd: 0.01,
      x402Version: 1,
    });
    const text = JSON.stringify(card).toLowerCase();
    for (const banned of ["safe to pay", "verified safe", "scam", "honeypot", "guaranteed"]) {
      expect(text).not.toContain(banned);
    }
  });

  it("lists exactly the five checks that ran", () => {
    const card = buildPreflightCard({
      ...base,
      outcome: "no_402",
      httpStatus: 200,
      secondHttpStatus: null,
      challengeValid: false,
      network: null,
      asset: null,
      payTo: null,
      amountUsd: null,
      x402Version: null,
      quote: compareQuotes(null, null),
    });
    expect(card.checksRun).toHaveLength(5);
    expect(card.outcomeLabel).toBe("No 402 challenge");
  });

  it("formats an unparsable timestamp as NONE", () => {
    expect(scanTimeLabel("not-a-date")).toBe("NONE");
  });
});
