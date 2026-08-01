// Active Prober — the mystery shopper.
//
// SERVER ONLY. Imports the official x402 client SDK; no hand-rolled signing.
//
// Two probe tiers:
//   challenge  (free)  GET the endpoint, expect 402, parse + validate the
//                      challenge, cross-check payTo against the dossier.
//   settlement (paid)  let the official SDK sign and pay, measure verify/settle
//                      latency, then confirm delivery.
//
// The prober always identifies itself via User-Agent. No covert probing.
// Nothing here writes to scoring: probe data is collected and displayed only.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  classifyChallenge,
  classifySettlement,
  exceedsPerProbeCap,
  PROBE_CAPS,
  PROBE_USER_AGENT,
  type ChallengeProbeResult,
  type ProbeOutcome,
} from "./outcomes";
import { affordable, proberWalletFor, settlementEnabled, type BudgetState } from "./config.server";
import { confirmProberSettlement } from "./loop-closure.server";

export interface ServiceRow {
  id: string;
  url: string | null;
  slug: string | null;
  chain: string;
  pay_to: string | null;
  facilitator: string | null;
  probe_tier: string;
  advertised_amount_usd: number | null;
  active: boolean;
  last_probe_at: string | null;
  last_challenge_probe_at: string | null;
  last_settlement_probe_at: string | null;
}

export interface ProbeRecord {
  serviceId: string;
  probeKind: "challenge" | "settlement";
  chain: string;
  outcome: ProbeOutcome;
  httpStatus: number | null;
  challengeValid: boolean | null;
  challengeJson: unknown | null;
  paidAmountUsd: number | null;
  txSignature: string | null;
  verifyMs: number | null;
  settleMs: number | null;
  delivered: boolean | null;
  proberWallet: string | null;
  notes: string;
}

function headerBag(res: Response): Record<string, string> {
  const bag: Record<string, string> = {};
  res.headers.forEach((value, key) => {
    bag[key.toLowerCase()] = value;
  });
  return bag;
}

// ---------------------------------------------------------------------------
// Challenge probe (free)
// ---------------------------------------------------------------------------

export async function runChallengeProbe(service: ServiceRow): Promise<{
  record: ProbeRecord;
  result: ChallengeProbeResult | null;
}> {
  if (!service.url) {
    return {
      record: base(service, "challenge", "probe_error", "no url — address-only service"),
      result: null,
    };
  }

  let status: number | null = null;
  let timedOut = false;
  let headers: Record<string, string> = {};
  let body: string | null = null;

  try {
    const res = await fetch(service.url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "user-agent": PROBE_USER_AGENT,
        accept: "application/json, */*",
      },
      signal: AbortSignal.timeout(PROBE_CAPS.challengeTimeoutMs),
    });
    status = res.status;
    headers = headerBag(res);
    body = (await res.text()).slice(0, 20_000);
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    timedOut = name === "TimeoutError" || name === "AbortError";
    if (!timedOut) {
      return {
        record: base(
          service,
          "challenge",
          "probe_error",
          `transport: ${err instanceof Error ? err.message : "unknown"}`.slice(0, 300),
        ),
        result: null,
      };
    }
  }

  const result = classifyChallenge({
    httpStatus: status,
    timedOut,
    headers,
    body,
    expectedPayTo: service.pay_to,
  });

  const record: ProbeRecord = {
    ...base(service, "challenge", result.outcome, result.notes),
    httpStatus: status,
    challengeValid: result.challengeValid,
    challengeJson: result.challenge.raw ?? null,
  };

  return { record, result };
}

// ---------------------------------------------------------------------------
// Settlement probe (paid)
// ---------------------------------------------------------------------------

/**
 * Pays the advertised price with the official x402 client SDK and follows the
 * outcome ladder. Refuses to run unless every gate is green:
 *   flag enabled → key present → price known → under per-probe cap → in budget.
 */
export async function runSettlementProbe(
  service: ServiceRow,
  challenge: ChallengeProbeResult,
  budget: BudgetState,
): Promise<ProbeRecord> {
  const chain = service.chain;
  const amountUsd = challenge.challenge.amountUsd;
  const wallet = proberWalletFor(chain);

  if (exceedsPerProbeCap(amountUsd)) {
    return {
      ...base(service, "settlement", "over_cap", `price ${amountUsd ?? "unknown"} > cap ${PROBE_CAPS.perProbeUsd}`),
      challengeJson: challenge.challenge.raw ?? null,
    };
  }
  if (!affordable(budget, amountUsd ?? Number.POSITIVE_INFINITY)) {
    return {
      ...base(
        service,
        "settlement",
        "over_cap",
        budget.halted
          ? "PROBER_BUDGET_HALT: daily budget exhausted"
          : `daily budget remaining $${budget.remainingUsd} < price $${amountUsd}`,
      ),
      challengeJson: challenge.challenge.raw ?? null,
    };
  }
  if (!settlementEnabled(chain)) {
    return {
      ...base(service, "settlement", "probe_error", `settlement disabled for ${chain} (flag or key missing)`),
      challengeJson: challenge.challenge.raw ?? null,
    };
  }

  const key =
    chain === "solana" ? process.env["PROBER_SOLANA_KEY"] : process.env["PROBER_BASE_KEY"];
  if (!key) {
    return base(service, "settlement", "probe_error", `missing prober key for ${chain}`);
  }

  const startedAt = Date.now();
  let verifyMs: number | null = null;
  let status: number | null = null;
  let bodyBytes = 0;
  let txSignature: string | null = null;

  try {
    // Loaded lazily so the SDK never enters a request path that isn't paying.
    const [{ wrapFetchWithPayment, decodeXPaymentResponse }, { createSigner }] =
      await Promise.all([import("x402-fetch"), import("x402/types")]);

    const signer = await createSigner(challenge.challenge.network ?? chain, key);
    const maxAtomic = BigInt(Math.ceil(PROBE_CAPS.perProbeUsd * 1_000_000)); // USDC base units
    const payFetch = wrapFetchWithPayment(globalThis.fetch, signer, maxAtomic);

    const res = await payFetch(service.url!, {
      method: "GET",
      headers: {
        "user-agent": PROBE_USER_AGENT,
        accept: "application/json, */*",
      },
      signal: AbortSignal.timeout(PROBE_CAPS.settlementTimeoutMs),
    });

    verifyMs = Date.now() - startedAt;
    status = res.status;
    const text = await res.text();
    bodyBytes = new TextEncoder().encode(text).length;

    const paymentResponse = res.headers.get("x-payment-response");
    if (paymentResponse) {
      try {
        const decoded = decodeXPaymentResponse(paymentResponse) as
          | { transaction?: string; txHash?: string }
          | undefined;
        txSignature = decoded?.transaction ?? decoded?.txHash ?? null;
      } catch {
        /* keep txSignature null — loop closure falls back to a wallet scan */
      }
    }
  } catch (err) {
    return {
      ...base(
        service,
        "settlement",
        "payment_rejected",
        `sdk: ${err instanceof Error ? err.message : "unknown"}`.slice(0, 300),
      ),
      paidAmountUsd: 0,
      verifyMs: Date.now() - startedAt,
      proberWallet: wallet,
      challengeJson: challenge.challenge.raw ?? null,
    };
  }

  // Loop closure: the prober's own payment must show up in agent_events via
  // the same facilitator lanes every other settlement flows through.
  const closure =
    status === 200 && txSignature
      ? await confirmProberSettlement({
          txSignature,
          chain,
          payTo: challenge.challenge.payTo,
        })
      : { confirmed: false, settleMs: null, indexerGap: false, notes: "no tx signature returned" };

  const { outcome, delivered } = classifySettlement({
    httpStatus: status,
    settlementConfirmed: closure.confirmed,
    bodyBytes,
  });

  const paid = outcome === "payment_rejected" ? 0 : (amountUsd ?? 0);

  return {
    ...base(
      service,
      "settlement",
      outcome,
      [
        `bytes=${bodyBytes}`,
        closure.notes,
        closure.indexerGap ? "INDEXER_GAP: settled on-chain but absent from agent_events" : "",
      ]
        .filter(Boolean)
        .join(" | ")
        .slice(0, 500),
    ),
    httpStatus: status,
    challengeValid: true,
    challengeJson: challenge.challenge.raw ?? null,
    paidAmountUsd: paid,
    txSignature,
    verifyMs,
    settleMs: closure.settleMs,
    delivered,
    proberWallet: wallet,
  };
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

function base(
  service: ServiceRow,
  kind: "challenge" | "settlement",
  outcome: ProbeOutcome,
  notes: string,
): ProbeRecord {
  return {
    serviceId: service.id,
    probeKind: kind,
    chain: service.chain,
    outcome,
    httpStatus: null,
    challengeValid: null,
    challengeJson: null,
    paidAmountUsd: null,
    txSignature: null,
    verifyMs: null,
    settleMs: null,
    delivered: null,
    proberWallet: null,
    notes,
  };
}

export async function recordProbe(record: ProbeRecord): Promise<void> {
  await supabaseAdmin.from("probe_run").insert({
    service_id: record.serviceId,
    probe_kind: record.probeKind,
    chain: record.chain,
    outcome: record.outcome,
    http_status: record.httpStatus,
    challenge_valid: record.challengeValid,
    challenge_json: (record.challengeJson ?? null) as never,
    paid_amount_usd: record.paidAmountUsd,
    tx_signature: record.txSignature,
    verify_ms: record.verifyMs,
    settle_ms: record.settleMs,
    delivered: record.delivered,
    prober_wallet: record.proberWallet,
    notes: record.notes,
  });

  const now = new Date().toISOString();
  await supabaseAdmin
    .from("x402_service")
    .update(
      record.probeKind === "challenge"
        ? { last_probe_at: now, last_challenge_probe_at: now }
        : { last_probe_at: now, last_settlement_probe_at: now },
    )
    .eq("id", record.serviceId);

}

/** Persist what a valid challenge told us about the service's own config. */
export async function applyChallengeFacts(
  service: ServiceRow,
  result: ChallengeProbeResult,
): Promise<void> {
  if (result.outcome !== "challenge_valid") return;
  const c = result.challenge;
  await supabaseAdmin
    .from("x402_service")
    .update({
      pay_to: service.pay_to ?? c.payTo,
      facilitator: c.facilitator ?? service.facilitator,
      advertised_amount_usd: c.amountUsd,
      advertised_asset: c.asset,
      chain: c.network === "base" ? "base" : c.network === "solana" ? "solana" : service.chain,
    })
    .eq("id", service.id);
}
