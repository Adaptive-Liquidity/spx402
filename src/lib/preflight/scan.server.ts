// SPX402 Preflight — the scan runner. SERVER ONLY.
//
// Runs the EXISTING free challenge tier twice against one URL, records what
// happened, and persists the row. No payment is ever made here: PROBER_ENABLED
// is irrelevant to this lane because the paid tier is not reachable from it.
//
// Nothing written here feeds scoring. Preflight rows are displayed, not scored.

import {
  classifyChallenge,
  PROBE_CAPS,
  PROBE_USER_AGENT,
  type ChallengeProbeResult,
} from "@/lib/prober/outcomes";
import {
  buildPreflightCard,
  comparePrice,
  compareQuotes,
  normalizePreflightUrl,
  preflightUrlKey,
  toPreflightOutcome,
  transportNote,
  type PreflightCardModel,
  type PriceSample,
} from "./model";

interface RawCall {
  status: number | null;
  timedOut: boolean;
  headers: Record<string, string>;
  body: string | null;
  transportError: string | null;
}

async function callOnce(url: string): Promise<RawCall> {
  const headers: Record<string, string> = {};
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "user-agent": PROBE_USER_AGENT,
        accept: "application/json, */*",
      },
      signal: AbortSignal.timeout(PROBE_CAPS.challengeTimeoutMs),
    });
    res.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });
    const body = (await res.text()).slice(0, 20_000);
    return { status: res.status, timedOut: false, headers, body, transportError: null };
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    const timedOut = name === "TimeoutError" || name === "AbortError";
    return {
      status: null,
      timedOut,
      headers,
      body: null,
      transportError: timedOut
        ? null
        : `${err instanceof Error ? err.message : "unknown transport error"}`.slice(0, 300),
    };
  }
}

function classify(call: RawCall): ChallengeProbeResult {
  return classifyChallenge({
    httpStatus: call.status,
    timedOut: call.timedOut,
    headers: call.headers,
    body: call.body,
  });
}

export interface PreflightScanResult {
  card: PreflightCardModel;
  outcome: string;
  scanId: string | null;
}

/**
 * Scan one endpoint and persist the observation.
 *
 * Two calls are made deliberately: the second one exists only so the quote can
 * be compared with the first. A difference is recorded as "quote changed".
 */
export async function runPreflightScan(rawUrl: string): Promise<PreflightScanResult> {
  const normalized = normalizePreflightUrl(rawUrl);
  if (!normalized) {
    throw new Error("Enter a full endpoint address, for example https://api.example.com/v1/thing");
  }
  const { url, host } = normalized;
  const scannedAtIso = new Date().toISOString();

  const firstCall = await callOnce(url);
  const first = classify(firstCall);

  // Second call is only useful when the first one produced a usable quote.
  let secondCall: RawCall | null = null;
  let second: ChallengeProbeResult | null = null;
  if (first.outcome === "challenge_valid") {
    secondCall = await callOnce(url);
    second = classify(secondCall);
  }

  const outcome = toPreflightOutcome(first.outcome);
  const quote = compareQuotes(
    first.outcome === "challenge_valid" ? first.challenge : null,
    second?.outcome === "challenge_valid" ? second.challenge : null,
  );

  const sample = await loadPriceSample(preflightUrlKey(url));
  const price = comparePrice(first.challenge.amountUsd, sample);
  const transport = transportNote(first.outcome === "challenge_valid" ? first.challenge : null);

  const card = buildPreflightCard({
    url,
    host,
    scannedAtIso,
    outcome,
    httpStatus: firstCall.status,
    secondHttpStatus: secondCall?.status ?? null,
    challengeValid: first.challengeValid,
    network: first.challenge.network,
    asset: first.challenge.asset,
    payTo: first.challenge.payTo,
    amountUsd: first.challenge.amountUsd,
    x402Version: first.challenge.x402Version,
    quote,
    price,
    transportNote: transport,
  });

  const notes = firstCall.transportError ?? first.notes;
  const scanId = await persist({
    url,
    host,
    url_key: preflightUrlKey(url),
    scanned_at: scannedAtIso,
    probe_kind: "challenge",
    outcome,
    http_status: firstCall.status,
    challenge_valid: first.challengeValid,
    challenge_json: (first.challenge.raw ?? null) as never,
    second_http_status: secondCall?.status ?? null,
    price_changed: quote.priceChanged,
    pay_to_changed: quote.payToChanged,
    pay_to: first.challenge.payTo,
    network: first.challenge.network,
    asset: first.challenge.asset,
    amount_usd: first.challenge.amountUsd,
    x402_version: first.challenge.x402Version,
    transport_note: transport,
    peer_sample_size: price.sampleSize,
    peer_median_usd: price.medianUsd,
    price_outlier: price.outlier,
    notes: notes ? notes.slice(0, 500) : null,
  });

  return { card, outcome, scanId };
}

/**
 * The prices we have actually recorded on other endpoints. Never an external
 * or borrowed statistic — this sample is only our own scans.
 */
async function loadPriceSample(excludeUrlKey: string): Promise<PriceSample> {
  const takenAt = new Date().toISOString();
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("preflight_scan")
      .select("url_key, amount_usd")
      .not("amount_usd", "is", null)
      .neq("url_key", excludeUrlKey)
      .order("scanned_at", { ascending: false })
      .limit(500);
    if (error || !data) return { amountsUsd: [], takenAt };

    // One price per endpoint — the most recent — so a repeatedly scanned
    // endpoint cannot skew the sample.
    const latest = new Map<string, number>();
    for (const row of data) {
      const key = String(row.url_key);
      if (latest.has(key)) continue;
      const n = Number(row.amount_usd);
      if (Number.isFinite(n) && n > 0) latest.set(key, n);
    }
    return { amountsUsd: [...latest.values()], takenAt };
  } catch {
    return { amountsUsd: [], takenAt };
  }
}

async function persist(row: Record<string, unknown>): Promise<string | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("preflight_scan")
      .insert(row as never)
      .select("id")
      .single();
    if (error || !data) return null;
    return (data as { id: string }).id;
  } catch {
    return null;
  }
}
