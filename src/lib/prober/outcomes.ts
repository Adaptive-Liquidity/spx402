// Active Prober — pure classification core.
//
// Everything in this file is deterministic and dependency-free so the whole
// outcome ladder can be unit-tested without network, wallets, or a database.
// The server module (prober.server.ts) does the I/O and delegates every
// judgement call to the functions here.
//
// SCORING BOUNDARY: nothing in this file is consumed by scoring.server.ts.
// Probe data is collected and displayed, never scored, in this wave.

export const PROBER_VERSION = "spx-prober-v1.0.0";

/** User-Agent the prober always identifies itself with. No covert probing. */
export const PROBE_USER_AGENT =
  "SPX402-Probe/1.0 (+https://spx402.com/methodology)";

export const PROBE_CAPS = {
  /** Skip any advertised amount above this and record `over_cap`. */
  perProbeUsd: 0.05,
  /** Hard circuit breaker across all probes, per UTC day. */
  dailyBudgetUsd: 10,
  /** Wallet balance drop without matching probe_run rows → critical anomaly. */
  walletDrainPct: 0.2,
  /** How long we wait for a settlement to appear after a 200. */
  settlementWindowMs: 90_000,
  /** Challenge probe network timeout. */
  challengeTimeoutMs: 15_000,
  /** Settlement probe network timeout (verify + settle round trip). */
  settlementTimeoutMs: 60_000,
} as const;

export type ProbeKind = "challenge" | "settlement";

/**
 * The outcome ladder, exactly as specced. `config_drift` is the challenge-tier
 * extension: the challenge parsed cleanly but its payTo disagrees with the
 * dossier wallet we hold for the service.
 */
export type ProbeOutcome =
  // challenge tier (free)
  | "no_402"
  | "timeout"
  | "malformed_challenge"
  | "config_drift"
  | "challenge_valid"
  // settlement tier (paid)
  | "over_cap"
  | "payment_rejected"
  | "settled_no_delivery"
  | "delivery_unverified"
  | "settled"
  // operational
  | "probe_error";

export const ALL_PROBE_OUTCOMES: readonly ProbeOutcome[] = [
  "no_402",
  "timeout",
  "malformed_challenge",
  "config_drift",
  "challenge_valid",
  "over_cap",
  "payment_rejected",
  "settled_no_delivery",
  "delivery_unverified",
  "settled",
  "probe_error",
] as const;

export function isPaidOutcome(outcome: ProbeOutcome): boolean {
  return (
    outcome === "payment_rejected" ||
    outcome === "settled_no_delivery" ||
    outcome === "delivery_unverified" ||
    outcome === "settled"
  );
}

// ---------------------------------------------------------------------------
// Challenge parsing
// ---------------------------------------------------------------------------

export interface ParsedChallenge {
  x402Version: number | null;
  scheme: string | null;
  network: string | null;
  asset: string | null;
  payTo: string | null;
  /** Advertised amount in the asset's base units, as a string (no precision loss). */
  amountAtomic: string | null;
  /** Best-effort USD conversion using the advertised decimals (USDC-class assets). */
  amountUsd: number | null;
  facilitator: string | null;
  resource: string | null;
  /** Where the requirements came from: v2 header or v1 JSON body. */
  source: "header" | "body" | null;
  raw: unknown;
}

const EMPTY_CHALLENGE: ParsedChallenge = {
  x402Version: null,
  scheme: null,
  network: null,
  asset: null,
  payTo: null,
  amountAtomic: null,
  amountUsd: null,
  facilitator: null,
  resource: null,
  source: null,
  raw: null,
};

function decodeMaybeBase64(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return trimmed;
  try {
    // atob is available in the Worker runtime and in Node 18+.
    const decoded = atob(trimmed);
    if (decoded.trim().startsWith("{") || decoded.trim().startsWith("[")) {
      return decoded;
    }
  } catch {
    /* not base64 — fall through */
  }
  return trimmed;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function str(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  if (typeof value === "number") return String(value);
  return null;
}

/**
 * Normalize one `accepts[]` entry (identical shape in v1 body and v2 header).
 */
function fromRequirement(req: Record<string, unknown>): Omit<ParsedChallenge, "source" | "raw" | "x402Version"> {
  const extra = asRecord(req.extra) ?? {};
  const decimalsRaw = extra.decimals ?? req.decimals;
  const decimals =
    typeof decimalsRaw === "number"
      ? decimalsRaw
      : typeof decimalsRaw === "string" && decimalsRaw.trim() !== ""
        ? Number(decimalsRaw)
        : 6; // USDC-class default; x402 amounts are USDC base units in practice.

  const amountAtomic =
    str(req.maxAmountRequired) ?? str(req.amount) ?? str(req.maxAmount) ?? null;

  let amountUsd: number | null = null;
  if (amountAtomic != null && Number.isFinite(decimals)) {
    const n = Number(amountAtomic);
    if (Number.isFinite(n)) amountUsd = n / 10 ** decimals;
  }

  return {
    scheme: str(req.scheme),
    network: str(req.network),
    asset: str(req.asset),
    payTo: str(req.payTo) ?? str(req.pay_to) ?? str(req.payToAddress),
    amountAtomic,
    amountUsd,
    facilitator:
      str(req.facilitator) ?? str((asRecord(req.extra) ?? {}).facilitator) ?? null,
    resource: str(req.resource),
  };
}

/**
 * Parse a 402 response into normalized payment requirements.
 *
 * v2: the `PAYMENT-REQUIRED` response header (raw or base64 JSON).
 * v1: the JSON response body `{ x402Version, accepts: [...] }`.
 *
 * When several requirements are advertised we take the cheapest one — the
 * prober always buys the smallest unit of truth available.
 */
export function parseChallenge(input: {
  headers: Record<string, string>;
  body: string | null;
}): ParsedChallenge {
  const headerValue =
    input.headers["payment-required"] ??
    input.headers["PAYMENT-REQUIRED"] ??
    input.headers["x-payment-required"] ??
    null;

  const tryPayload = (
    payload: unknown,
    source: "header" | "body",
  ): ParsedChallenge | null => {
    const root = asRecord(payload);
    if (!root) return null;
    const accepts = Array.isArray(root.accepts)
      ? (root.accepts as unknown[])
      : Array.isArray(root.paymentRequirements)
        ? (root.paymentRequirements as unknown[])
        : null;

    const candidates = (accepts ?? [root])
      .map((entry) => asRecord(entry))
      .filter((entry): entry is Record<string, unknown> => entry != null)
      .map((entry) => fromRequirement(entry));

    if (candidates.length === 0) return null;

    const cheapest = candidates.reduce((best, next) => {
      const a = best.amountUsd ?? Number.POSITIVE_INFINITY;
      const b = next.amountUsd ?? Number.POSITIVE_INFINITY;
      return b < a ? next : best;
    });

    const versionRaw = root.x402Version;
    return {
      ...cheapest,
      x402Version:
        typeof versionRaw === "number"
          ? versionRaw
          : typeof versionRaw === "string" && versionRaw.trim() !== ""
            ? Number(versionRaw)
            : source === "header"
              ? 2
              : null,
      source,
      raw: payload,
    };
  };

  if (headerValue) {
    try {
      const parsed = tryPayload(JSON.parse(decodeMaybeBase64(headerValue)), "header");
      if (parsed) return parsed;
    } catch {
      /* malformed header — fall through to the body */
    }
  }

  if (input.body) {
    try {
      const parsed = tryPayload(JSON.parse(input.body), "body");
      if (parsed) return parsed;
    } catch {
      /* malformed body */
    }
  }

  return { ...EMPTY_CHALLENGE };
}

export interface ChallengeValidation {
  valid: boolean;
  missing: string[];
}

/** A challenge is valid when every field a buyer needs is present and sane. */
export function validateChallenge(c: ParsedChallenge): ChallengeValidation {
  const missing: string[] = [];
  if (!c.scheme) missing.push("scheme");
  if (!c.network) missing.push("network");
  if (!c.asset) missing.push("asset");
  if (!c.payTo) missing.push("payTo");
  if (c.amountAtomic == null || !(Number(c.amountAtomic) > 0)) {
    missing.push("amount");
  }
  return { valid: missing.length === 0, missing };
}

/** Chain-aware wallet comparison: EVM is case-insensitive, base58 is not. */
export function walletsMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (!a || !b) return false;
  if (a.startsWith("0x") && b.startsWith("0x")) {
    return a.toLowerCase() === b.toLowerCase();
  }
  return a === b;
}

// ---------------------------------------------------------------------------
// Outcome ladder
// ---------------------------------------------------------------------------

export interface ChallengeProbeInput {
  /** null when the request never completed (network error / abort). */
  httpStatus: number | null;
  timedOut: boolean;
  headers: Record<string, string>;
  body: string | null;
  /** The payTo we already hold for this service, if any (drift cross-check). */
  expectedPayTo?: string | null;
}

export interface ChallengeProbeResult {
  outcome: ProbeOutcome;
  challengeValid: boolean | null;
  challenge: ParsedChallenge;
  validation: ChallengeValidation;
  /** True when the challenge parsed but payTo disagrees with the dossier. */
  configDrift: boolean;
  notes: string;
}

export function classifyChallenge(input: ChallengeProbeInput): ChallengeProbeResult {
  const empty = { ...EMPTY_CHALLENGE };

  if (input.timedOut) {
    return {
      outcome: "timeout",
      challengeValid: null,
      challenge: empty,
      validation: { valid: false, missing: ["*"] },
      configDrift: false,
      notes: "no response within timeout",
    };
  }

  if (input.httpStatus !== 402) {
    return {
      outcome: "no_402",
      challengeValid: null,
      challenge: empty,
      validation: { valid: false, missing: ["*"] },
      configDrift: false,
      notes: `expected 402, got ${input.httpStatus ?? "no response"}`,
    };
  }

  const challenge = parseChallenge({ headers: input.headers, body: input.body });
  const validation = validateChallenge(challenge);

  if (!validation.valid) {
    return {
      outcome: "malformed_challenge",
      challengeValid: false,
      challenge,
      validation,
      configDrift: false,
      notes: `missing: ${validation.missing.join(",")}`,
    };
  }

  if (input.expectedPayTo && !walletsMatch(challenge.payTo, input.expectedPayTo)) {
    return {
      outcome: "config_drift",
      challengeValid: false,
      challenge,
      validation,
      configDrift: true,
      notes: `payTo drift: challenge=${challenge.payTo} dossier=${input.expectedPayTo}`,
    };
  }

  return {
    outcome: "challenge_valid",
    challengeValid: true,
    challenge,
    validation,
    configDrift: false,
    notes: `${challenge.scheme}/${challenge.network} ${challenge.amountUsd ?? "?"} USD`,
  };
}

export interface SettlementProbeInput {
  /** null when the paid request never completed. */
  httpStatus: number | null;
  /** True when the settlement was observed on-chain within the window. */
  settlementConfirmed: boolean;
  /** Byte length of the response body after payment. */
  bodyBytes: number;
}

/**
 * The paid half of the ladder:
 *   non-200                          → payment_rejected
 *   200, no settlement within 90s    → settled_no_delivery
 *   settlement confirmed, body empty → delivery_unverified
 *   200 + settlement confirmed       → settled
 */
export function classifySettlement(input: SettlementProbeInput): {
  outcome: ProbeOutcome;
  delivered: boolean;
} {
  if (input.httpStatus !== 200) {
    return { outcome: "payment_rejected", delivered: false };
  }
  if (!input.settlementConfirmed) {
    return { outcome: "settled_no_delivery", delivered: input.bodyBytes > 0 };
  }
  if (input.bodyBytes <= 0) {
    return { outcome: "delivery_unverified", delivered: false };
  }
  return { outcome: "settled", delivered: true };
}

/** Per-probe spend cap. Amounts above the cap are skipped, never paid. */
export function exceedsPerProbeCap(amountUsd: number | null): boolean {
  if (amountUsd == null) return true; // unknown price is never paid
  return amountUsd > PROBE_CAPS.perProbeUsd;
}

// ---------------------------------------------------------------------------
// PROBE_DIVERGENCE — the Goodhart guard
// ---------------------------------------------------------------------------

export interface DivergenceInput {
  /** Settled probes / settlement probes attempted, 0..1. */
  probeSettleRate: number;
  /** Organic settled payments / organic attempts observed by the lanes, 0..1. */
  organicSettleRate: number;
  /** Days of overlapping observation. */
  windowDays: number;
  probeSamples: number;
  organicSamples: number;
}

export interface DivergenceResult {
  diverged: boolean;
  delta: number;
  reason: string;
}

export const DIVERGENCE_THRESHOLD = 0.25;
export const DIVERGENCE_MIN_DAYS = 14;
export const DIVERGENCE_MIN_SAMPLES = 5;

/**
 * A service performing for the prober settles noticeably more reliably for us
 * than it does for organic buyers. Requires BOTH datasets — nobody outside
 * SPX402 can compute this.
 */
export function probeDivergence(input: DivergenceInput): DivergenceResult {
  const delta = round4(input.probeSettleRate - input.organicSettleRate);

  if (input.windowDays < DIVERGENCE_MIN_DAYS) {
    return {
      diverged: false,
      delta,
      reason: `window ${input.windowDays}d < ${DIVERGENCE_MIN_DAYS}d minimum`,
    };
  }
  if (
    input.probeSamples < DIVERGENCE_MIN_SAMPLES ||
    input.organicSamples < DIVERGENCE_MIN_SAMPLES
  ) {
    return {
      diverged: false,
      delta,
      reason: `insufficient samples (probe=${input.probeSamples} organic=${input.organicSamples})`,
    };
  }
  if (delta > DIVERGENCE_THRESHOLD) {
    return {
      diverged: true,
      delta,
      reason: `probe settle-rate exceeds organic by ${(delta * 100).toFixed(1)}pp over ${input.windowDays}d`,
    };
  }
  return { diverged: false, delta, reason: "within tolerance" };
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

// ---------------------------------------------------------------------------
// Service addressing
// ---------------------------------------------------------------------------

/**
 * Encoded host+path slug used by /service/$slug.
 * https://api.example.com/v1/weather?x=1 → api.example.com~v1~weather
 */
export function serviceSlug(rawUrl: string): string {
  let host = "";
  let path = "";
  try {
    const u = new URL(rawUrl);
    host = u.hostname.toLowerCase();
    path = u.pathname;
  } catch {
    const stripped = rawUrl.replace(/^[a-z]+:\/\//i, "");
    const slash = stripped.indexOf("/");
    host = (slash === -1 ? stripped : stripped.slice(0, slash)).toLowerCase();
    path = slash === -1 ? "" : stripped.slice(slash);
  }

  const segments = path
    .split("/")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const slug = [host, ...segments]
    .join("~")
    .replace(/[^a-z0-9.~_-]/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.~]+|[-.~]+$/g, "");

  return slug.slice(0, 120);
}

/**
 * Base slug for an address-only service (no endpoint known yet).
 * Mirrors public.x402_service_base_slug() in the database.
 */
export function payeeSlug(payTo: string): string {
  const cleaned = `payee~${payTo}`
    .replace(/[^a-z0-9.~_-]/gi, "-")
    .toLowerCase()
    .replace(/-+/g, "-")
    .replace(/^[-.~]+|[-.~]+$/g, "");
  return cleaned.slice(0, 120);
}


/** Human label for an outcome, used across the UI. */
export function outcomeLabel(outcome: string): string {
  switch (outcome) {
    case "no_402":
      return "No 402 challenge";
    case "timeout":
      return "Timed out";
    case "malformed_challenge":
      return "Malformed challenge";
    case "config_drift":
      return "Config drift";
    case "challenge_valid":
      return "Challenge valid";
    case "over_cap":
      return "Over cap — skipped";
    case "payment_rejected":
      return "Payment rejected";
    case "settled_no_delivery":
      return "Settlement not observed";
    case "delivery_unverified":
      return "Delivery unverified";
    case "settled":
      return "Settled + delivered";
    case "probe_error":
      return "Probe error";
    default:
      return outcome;
  }
}

/** UI tone for an outcome. */
export function outcomeTone(
  outcome: string,
): "verified" | "amber" | "critical" | "muted" {
  switch (outcome) {
    case "settled":
    case "challenge_valid":
      return "verified";
    case "delivery_unverified":
    case "over_cap":
      return "amber";
    case "no_402":
    case "timeout":
    case "malformed_challenge":
    case "config_drift":
    case "payment_rejected":
    case "settled_no_delivery":
      return "critical";
    default:
      return "muted";
  }
}
