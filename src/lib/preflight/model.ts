// SPX402 Preflight — pure model.
//
// Preflight is a SECONDARY lane. It records what an endpoint did when we
// called it. It never says "safe", never says "verified safe", never calls
// anything a scam or a honeypot. Every field is an observation with a
// timestamp attached, or NONE.
//
// Probe kind is always `challenge` here: the free tier. No money is spent.
// This file is deterministic and dependency-free so it can be unit-tested
// without network or database.

import type { ParsedChallenge } from "@/lib/prober/outcomes";

export const PREFLIGHT_VERSION = "spx-preflight-v1.0.0";

/**
 * Machine-readable outcomes an agent can branch on. Deliberately descriptive,
 * never a verdict — there is no "safe" boolean anywhere in this lane.
 */
export type PreflightOutcome = "unreachable" | "timeout" | "no_402" | "parse_fail" | "challenge_ok";

export const ALL_PREFLIGHT_OUTCOMES: readonly PreflightOutcome[] = [
  "unreachable",
  "timeout",
  "no_402",
  "parse_fail",
  "challenge_ok",
] as const;

/** Map the shared prober outcome ladder onto the preflight vocabulary. */
export function toPreflightOutcome(proberOutcome: string): PreflightOutcome {
  switch (proberOutcome) {
    case "timeout":
      return "timeout";
    case "no_402":
      return "no_402";
    case "malformed_challenge":
    case "config_drift":
      return "parse_fail";
    case "challenge_valid":
      return "challenge_ok";
    default:
      return "unreachable";
  }
}

export function preflightOutcomeLabel(outcome: string): string {
  switch (outcome) {
    case "unreachable":
      return "Unreachable";
    case "timeout":
      return "Timed out";
    case "no_402":
      return "No 402 challenge";
    case "parse_fail":
      return "Challenge did not parse";
    case "challenge_ok":
      return "Challenge parsed";
    default:
      return outcome;
  }
}

export function preflightOutcomeTone(outcome: string): "verified" | "amber" | "critical" | "muted" {
  switch (outcome) {
    case "challenge_ok":
      return "verified";
    case "parse_fail":
      return "amber";
    case "unreachable":
    case "timeout":
    case "no_402":
      return "critical";
    default:
      return "muted";
  }
}

// ---------------------------------------------------------------------------
// Quote stability across two calls
// ---------------------------------------------------------------------------

export interface QuoteComparison {
  /** null when we could not compare (one of the two calls produced no quote). */
  comparable: boolean;
  priceChanged: boolean | null;
  payToChanged: boolean | null;
  /** Neutral label. A change is a fact we report, not a verdict. */
  label: string;
}

function sameAddress(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  if (a.startsWith("0x") && b.startsWith("0x")) return a.toLowerCase() === b.toLowerCase();
  return a === b;
}

/**
 * Compare the quote returned by two consecutive challenge calls.
 *
 * A different price or a different payTo is reported as "quote changed" —
 * nothing more. Services legitimately rotate receiving addresses and vary
 * pricing, so this is never treated as evidence of bad behaviour.
 */
export function compareQuotes(
  first: ParsedChallenge | null,
  second: ParsedChallenge | null,
): QuoteComparison {
  if (!first || !second || first.payTo == null || second.payTo == null) {
    return { comparable: false, priceChanged: null, payToChanged: null, label: "NONE" };
  }

  const priceChanged = first.amountAtomic !== second.amountAtomic;
  const payToChanged = !sameAddress(first.payTo, second.payTo);

  if (!priceChanged && !payToChanged) {
    return { comparable: true, priceChanged: false, payToChanged: false, label: "STABLE" };
  }
  const parts: string[] = [];
  if (priceChanged) parts.push("price");
  if (payToChanged) parts.push("payTo");
  return {
    comparable: true,
    priceChanged,
    payToChanged,
    label: `QUOTE CHANGED — ${parts.join(" + ")}`,
  };
}

// ---------------------------------------------------------------------------
// Transport / version mismatch
// ---------------------------------------------------------------------------

/**
 * A mismatch between the declared protocol version and where the payment
 * requirements actually appeared can stop a standard client from paying.
 * Returns null when nothing notable was observed.
 */
export function transportNote(challenge: ParsedChallenge | null): string | null {
  if (!challenge || challenge.source == null) return null;
  if (challenge.x402Version == null) {
    return "Protocol version not declared in the challenge";
  }
  if (challenge.x402Version >= 2 && challenge.source === "body") {
    return "Declares v2 but the requirements were only found in the response body";
  }
  if (challenge.x402Version === 1 && challenge.source === "header") {
    return "Declares v1 but the requirements were only found in the response header";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Listed price vs sample (optional, always with N and date)
// ---------------------------------------------------------------------------

export interface PriceSample {
  /** Listed prices, in USD, observed on other endpoints we have scanned. */
  amountsUsd: number[];
  /** Date the sample was taken, ISO. */
  takenAt: string;
}

export interface PriceComparison {
  /** null when the sample is too small to say anything. */
  outlier: boolean | null;
  sampleSize: number;
  medianUsd: number | null;
  label: string;
}

const PRICE_SAMPLE_MIN = 5;
const PRICE_OUTLIER_FACTOR = 10;

/**
 * Compare this endpoint's listed price against the sample of listed prices we
 * have recorded. Reported as "outlier vs sample" with the sample size and the
 * date — never as "predatory" or "gouging".
 */
export function comparePrice(amountUsd: number | null, sample: PriceSample): PriceComparison {
  const values = sample.amountsUsd.filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
  const n = values.length;

  if (amountUsd == null || !Number.isFinite(amountUsd) || n < PRICE_SAMPLE_MIN) {
    return { outlier: null, sampleSize: n, medianUsd: null, label: "NONE" };
  }

  const mid = Math.floor(n / 2);
  const median =
    n % 2 === 0 ? ((values[mid - 1] ?? 0) + (values[mid] ?? 0)) / 2 : (values[mid] ?? 0);
  if (!(median > 0)) {
    return { outlier: null, sampleSize: n, medianUsd: null, label: "NONE" };
  }

  const ratio = amountUsd / median;
  const outlier = ratio >= PRICE_OUTLIER_FACTOR || ratio <= 1 / PRICE_OUTLIER_FACTOR;
  const day = sample.takenAt.slice(0, 10);
  return {
    outlier,
    sampleSize: n,
    medianUsd: median,
    label: `${outlier ? "OUTLIER" : "WITHIN"} VS SAMPLE (N=${n}, ${day})`,
  };
}

// ---------------------------------------------------------------------------
// The card
// ---------------------------------------------------------------------------

export interface PreflightRow {
  label: string;
  value: string;
}

export interface PreflightCardModel {
  /** The exact question this card answers. Never "safe to pay". */
  question: string;
  url: string;
  host: string;
  probeKind: "CHALLENGE";
  outcome: PreflightOutcome;
  outcomeLabel: string;
  tone: "verified" | "amber" | "critical" | "muted";
  danger: boolean;
  scannedAtIso: string;
  scannedLabel: string;
  /** The observed facts. Absent facts print NONE. */
  rows: PreflightRow[];
  /** Exactly which checks ran, in order, so nothing is implied. */
  checksRun: string[];
}

export const PREFLIGHT_QUESTION = "What did this endpoint do when we called it?";

/** "2026-09-06 02:58 UTC" — scan time is always visible on the card. */
export function scanTimeLabel(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "NONE";
  return `${new Date(t).toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

function money(amountUsd: number | null | undefined): string {
  if (amountUsd == null || !Number.isFinite(amountUsd)) return "NONE";
  return `$${amountUsd < 0.01 ? amountUsd.toFixed(6) : amountUsd.toFixed(4)} USD`;
}

function shortAddress(addr: string | null | undefined): string {
  const v = (addr ?? "").trim();
  if (!v) return "NONE";
  if (v.length <= 18) return v;
  return `${v.slice(0, 8)}…${v.slice(-6)}`;
}

function orNone(v: string | null | undefined): string {
  const s = (v ?? "").trim();
  return s ? s.toUpperCase() : "NONE";
}

export interface PreflightObservation {
  url: string;
  host: string;
  scannedAtIso: string;
  outcome: PreflightOutcome;
  httpStatus: number | null;
  secondHttpStatus: number | null;
  challengeValid: boolean | null;
  network: string | null;
  asset: string | null;
  payTo: string | null;
  amountUsd: number | null;
  x402Version: number | null;
  quote: QuoteComparison;
  price: PriceComparison;
  transportNote: string | null;
}

/**
 * Build the Preflight card. This is a NEW model — endpoint facts never go
 * through the Pump mint grade card (`buildGradeCard`).
 */
export function buildPreflightCard(obs: PreflightObservation): PreflightCardModel {
  const rows: PreflightRow[] = [
    { label: "HTTP status", value: obs.httpStatus == null ? "NONE" : String(obs.httpStatus) },
    {
      label: "Challenge",
      value: obs.challengeValid == null ? "NONE" : obs.challengeValid ? "PARSED" : "DID NOT PARSE",
    },
    { label: "Quote across 2 calls", value: obs.quote.label },
    { label: "Network", value: orNone(obs.network) },
    { label: "Asset", value: orNone(obs.asset) },
    { label: "Listed price", value: money(obs.amountUsd) },
    { label: "Pay to", value: shortAddress(obs.payTo) },
    { label: "Price vs sample", value: obs.price.label },
    { label: "Transport", value: obs.transportNote ? obs.transportNote.toUpperCase() : "NONE" },
  ];

  const checksRun = [
    "Reachable, and returns HTTP 402",
    "Payment challenge parses (version, accepts, network, asset, payTo, amount)",
    "Challenge requested a second time; price and payTo compared across the two calls",
    "Listed price compared against the sample of prices we have recorded",
    "Transport and protocol-version mismatch that would stop a standard client paying",
  ];

  return {
    question: PREFLIGHT_QUESTION,
    url: obs.url,
    host: obs.host,
    probeKind: "CHALLENGE",
    outcome: obs.outcome,
    outcomeLabel: preflightOutcomeLabel(obs.outcome),
    tone: preflightOutcomeTone(obs.outcome),
    danger: preflightOutcomeTone(obs.outcome) === "critical",
    scannedAtIso: obs.scannedAtIso,
    scannedLabel: scanTimeLabel(obs.scannedAtIso),
    rows,
    checksRun,
  };
}

/** Group key for one endpoint: host + path, lowercased. Query strings dropped. */
export function preflightUrlKey(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    const path = u.pathname.replace(/\/+$/, "");
    return `${u.hostname.toLowerCase()}${path}`;
  } catch {
    return rawUrl.trim().toLowerCase().slice(0, 200);
  }
}

/** Accept only absolute http(s) URLs. Returns null when the input is unusable. */
export function normalizePreflightUrl(rawUrl: string): { url: string; host: string } | null {
  const trimmed = (rawUrl ?? "").trim();
  if (!trimmed) return null;
  const withScheme = /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let u: URL;
  try {
    u = new URL(withScheme);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  if (!u.hostname.includes(".")) return null;
  return { url: u.toString().slice(0, 2000), host: u.hostname.toLowerCase() };
}
